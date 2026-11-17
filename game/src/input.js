// NEON TIDE — keyboard and mouse input.
// Tracks held keys, the mouse position over the canvas and clicks.

export function createInput(canvas) {
  const input = {
    keys: {},
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    clicked: false,
    anyKey: false,
  };

  window.addEventListener('keydown', (e) => {
    input.keys[e.code] = true;
    input.anyKey = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    input.keys[e.code] = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouseX = e.clientX - r.left;
    input.mouseY = e.clientY - r.top;
  });

  canvas.addEventListener('mousedown', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouseX = e.clientX - r.left;
    input.mouseY = e.clientY - r.top;
    input.mouseDown = true;
    input.clicked = true;
  });

  window.addEventListener('mouseup', () => {
    input.mouseDown = false;
  });

  window.addEventListener('blur', () => {
    input.keys = {};
    input.mouseDown = false;
  });

  return input;
}

export function keyDown(input, code) {
  return !!input.keys[code];
}
