"use strict";

/**
 * Initializes a WebGL 1 context.
 * @param {HTMLCanvasElement} canvas
 * @param {object} flags
 */
function initGL(canvas, flags) {
  let gl = canvas.getContext("webgl2", flags);
  if (!gl) {
    alert("Your browser or device does not seem to support WebGL 2.");
    return null;
  }
  
  canvas.style.cursor = "none";
  gl.disable(gl.CULL_FACE);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  
  Utils.resizeCanvas(gl, false);
  
  return gl;
}

function checkRequirements(gl) {
  const vertexUnits = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
  const fragmentUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
  if (vertexUnits < 0 || fragmentUnits < 2) {
    alert("Your device does not meet the requirements for this simulation.");
    return false;
  }

  const mediump = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT);
  if (mediump.precision < 23) {
    alert("Your device only supports low precision float in fragment shader.\n" +
      "The simulation will not run.");
    return false;
  }
  
  return true;
}

function main() {
  const canvas = document.getElementById("glcanvas");
  const gl = initGL(canvas, {alpha:false});
  if (!gl)
    return;

  if (!checkRequirements(gl)) {
    return;
  }
  
  const ratio = gl.drawingBufferWidth / gl.drawingBufferHeight;

  const particles = new Particles(gl, 16*16);
  const obstacles = new ObstacleMap(gl);
  const fluidifier = new Fluidify(gl);
  
  /* The default rendering mode is blurred. */
  let fluidMode = true;
  Controls.setFluidMode = (bool) => {
    fluidMode = bool;
    Controls.showFluidSection(bool);
  };
  Controls.setFluidMode(true);

  /* Bind the HTML inputs to the simulation */
  Controls.bind(gl, canvas, particles, obstacles, fluidifier);
  
  /* Update the FPS indicator every second. */
  let instantFPS;
  const fpsText = document.getElementById("fps-text");
  const updateFpsText = function() {
    fpsText.textContent = instantFPS.toFixed(0);
    };
  setInterval(updateFpsText, 1000);
  
  let lastUpdate = 0;
  function mainLoop(time) {
    time *= 0.001; //dt is now in seconds
    let dt = time - lastUpdate;
    instantFPS = 1 / dt;
    lastUpdate = time;
    
    /* If the javascript was paused (tab lost focus), the dt may be too big.
     * In that case we adjust it so the simulation resumes correctly. */
    dt = Math.min(dt, 1 / 10);
    particles.update(gl, obstacles, dt);
        
    /* Drawing */
    if (fluidMode) {
      fluidifier.bindFBO(gl);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      particles.draw(gl);
      
      fluidifier.process(gl);
      
      FBO.bindDefault(gl);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      fluidifier.draw(gl);
      obstacles.draw(gl);
    } else {
      FBO.bindDefault(gl);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      particles.draw(gl);
      obstacles.draw(gl);
    }
    
    requestAnimationFrame(mainLoop);
  }
  
  requestAnimationFrame(mainLoop);
}

main();