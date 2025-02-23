const { TOOL_PEN, TOOL_SCRIBBLE_PALLET, TOOL_BRUSH_SIZE, TOOL_BRUSH_COLOR, TOOL_UNDO, TOOL_REDO, TOOL_ERASER, TOOL_CLEAR_CANVAS } = require('./constants.js');
const utility = require('./utility.js')
const {
  ipcRenderer, app
} = require('electron');
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const hoverSound = new Audio('audio/mouse-click.mp3'); // Replace with your sound file
const toolsMenu = document.querySelector('.tools-menu');
const toolPen = toolsMenu.querySelector('.tool.pen');
const toolScribbleBackground = toolsMenu.querySelector('.tool.scribble-background');
const toolBrushWidth = toolsMenu.querySelector('.tool.brush-size');
const toolBrushColor = toolsMenu.querySelector('.tool.brush-color');
const toolUndo = toolsMenu.querySelector('.tool.undo');
const toolRedo = toolsMenu.querySelector('.tool.redo');
const toolEraser = toolsMenu.querySelector('.tool.eraser');
const toolClearCanvas = toolsMenu.querySelector('.tool.clear-canvas');
const toolExit = toolsMenu.querySelector('.tool.exit');

const colorPickerModel = document.getElementById('colorModal');
const colorPreview = colorPickerModel.querySelector('#colorPreview');
const colorInput = colorPickerModel.querySelector('input[type=color]');
const opacityRange = colorPickerModel.querySelector('input[type=range]');
const btnSelectColor = colorPickerModel.querySelector('#selectColor');
const btnCancelColor = colorPickerModel.querySelector('#cancelColor');


const brushSizeModel = document.getElementById('brushSizeModel');
const brushSizePreview = brushSizeModel.querySelector('#brush-size-preview')
const btnSelectSize = brushSizeModel.querySelector('#selectSize');
const btnCancelSize = brushSizeModel.querySelector('#cancelSize');
const brushSizeRange = brushSizeModel.querySelector('input[type=range]');

// scribble background color
let dynamicBackgroundColor = 'rgb(255,0,0)';
let selectedBackgroundColor = 'rgb(255,0,0)';
let dynamicBackgroundOpacity = 0.5;
let selectedBackgroundOpacity = 0.5;

// brush color
let dynamicBrushColor = 'rgb(0,255,0)';
let selectedBrushColor = 'rgb(0,255,0)';
let dynamicBrushOpacity = 0.5;
let selectedBrushOpacity = 0.5;

// brush size
let brushSizePx = 24;
let brushDynamicSizePx = 24;

// selected tool
let selectedTool = null
selectUnselectTool(TOOL_PEN);

function selectUnselectTool(tool, select = true) {
  unselectedAllTool();

  if (![TOOL_SCRIBBLE_PALLET, TOOL_BRUSH_COLOR].includes(tool)) {
    colorPickerModel.classList.add('hide');
  }

  selectedTool = select ? tool : null;
  if (tool === TOOL_PEN) {
    debugger
    select && toolPen.classList.add('selected');
    !select && toolPen.classList.remove('selected')
  } else if (tool === TOOL_SCRIBBLE_PALLET) {
    debugger
    select && toolScribbleBackground.classList.add('selected')
    !select && toolScribbleBackground.classList.remove('selected')
  } else if (tool === TOOL_BRUSH_SIZE) {
    select && toolBrushWidth.classList.add('selected')
    !select && toolBrushWidth.classList.remove('selected')
  } else if (tool === TOOL_BRUSH_COLOR) {
    select && toolBrushColor.classList.add('selected')
    !select && toolBrushColor.classList.remove('selected')
  } else if (tool === TOOL_UNDO) {
    select && toolUndo.classList.add('selected')
    !select && toolUndo.classList.remove('selected')
  } else if (tool === TOOL_REDO) {
    select && toolRedo.classList.add('selected')
    !select && toolRedo.classList.remove('selected')
  } else if (tool === TOOL_ERASER) {
    select && toolEraser.classList.add('selected')
    !select && toolEraser.classList.remove('selected')
  }
}

function unselectedAllTool() {
  toolsMenu.querySelectorAll('.tool').forEach((tool) => tool.classList.remove('selected'));
}

function closeAllModels() {
  colorPickerModel.classList.add('hide');
  brushSizeModel.classList.add('hide');
}

// Resize canvas to match Electron window
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  console.log("Canvas Resized:", canvas.width, canvas.height);
}

// Resize when window loads or resizes
window.onload = resizeCanvas;
window.onresize = resizeCanvas;

ipcRenderer.on("status-update", (event, message) => {
  // document.getElementById("status-bar").innerText = message;
});


// instructions
const instructions = document.querySelector('.instructions');
window.addEventListener("keydown", (event) => {
  console.log(event);
  if (!(event.shiftKey && event.key.toUpperCase() === "I")) return;
  instructions.classList.toggle("hide");
});

instructions.addEventListener("mouseover", (event) => {
  if (!event.target.closest('img.keyboard-button')) return;
  hoverSound.currentTime = 0; // Restart sound if already playing
  hoverSound.play().catch(error => console.error("Error playing sound:", error));
});
instructions.addEventListener("mouseleave", (event) => {
  hoverSound.pause();
  hoverSound.currentTime = 0;
});



// scribble mode
ipcRenderer.on("scribble-mode", (event, active) => {
  const element = document.querySelector(".scribble-mode");

  if (element) {
    element.style.backgroundColor = active ? "green" : "red";
    // Now log after the update
    ipcRenderer.send("log", `Updated backgroundColor: ${element.style.backgroundColor}`);
  } else {
    ipcRenderer.send("log", "Error: .scribble-mode element not found");
  }
});


// tools draggable logic
let isToolsDragable = false;

let offsetX = 0, offsetY = 0;
toolsMenu.addEventListener("mousedown", (event) => {
  isToolsDragable = true;
  // Calculate offset from the element's current position
  offsetX = event.clientX - toolsMenu.offsetLeft;
  offsetY = event.clientY - toolsMenu.offsetTop;
  // ipcRenderer.send("log", `drag activated`);
});

toolsMenu.addEventListener("mousemove", (event) => {
  if (!isToolsDragable) return;

  // Update position based on mouse movement
  toolsMenu.style.left = `${event.clientX - offsetX}px`;
  toolsMenu.style.top = `${event.clientY - offsetY}px`;

  // ipcRenderer.send("log", `dragging ${toolsMenu.style.left},${toolsMenu.style.top}`);
});

document.addEventListener("mouseup", (event) => {
  isToolsDragable = false;
  // ipcRenderer.send("log", `drag de-activated`);
});


// Scibble background color changer
toolScribbleBackground.addEventListener('click', (event) => {
  colorPreview.style.backgroundColor = utility.modifyAlpha(selectedBackgroundColor, selectedBackgroundOpacity);
  colorInput.value = utility.trimAlphaFromHex(utility.rgbaToHex(selectedBackgroundColor));
  opacityRange.value = selectedBackgroundOpacity;
  selectUnselectTool(TOOL_SCRIBBLE_PALLET, selectedTool !== TOOL_SCRIBBLE_PALLET || colorPickerModel.classList.contains('hide'));
  openCloseColorPicker(selectedTool);
})

toolBrushColor.addEventListener('click', (event) => {
  colorPreview.style.backgroundColor = utility.modifyAlpha(selectedBrushColor, selectedBrushOpacity);
  colorInput.value = utility.trimAlphaFromHex(utility.rgbaToHex(selectedBrushColor));
  opacityRange.value = selectedBrushOpacity;
  selectUnselectTool(TOOL_BRUSH_COLOR, selectedTool !== TOOL_BRUSH_COLOR || colorPickerModel.classList.contains('hide'));
  openCloseColorPicker(selectedTool);
})

function openCloseColorPicker(tool) {
  if (tool !== selectedTool || ![TOOL_BRUSH_COLOR, TOOL_SCRIBBLE_PALLET].includes(tool)) {
    colorPickerModel.classList.add('hide');
  } else {
    closeAllModels();
    colorPickerModel.classList.remove('hide');
  }
}

~
  colorInput.addEventListener('change', (event) => {
    const rgba = utility.hexToRgba(event.target.value, selectedTool === TOOL_BRUSH_COLOR ? dynamicBrushOpacity : dynamicBackgroundOpacity);
    if (selectedTool === TOOL_BRUSH_COLOR) {
      dynamicBrushColor = rgba;
    } else if (selectedTool === TOOL_SCRIBBLE_PALLET) {
      dynamicBackgroundColor = rgba;
    }
    colorPreview.style.backgroundColor = rgba;
  });
opacityRange.addEventListener('input', (event) => {
  if (selectedTool === TOOL_BRUSH_COLOR) {
    dynamicBrushOpacity = event.target.value;
    colorPreview.style.backgroundColor = utility.modifyAlpha(dynamicBrushColor, dynamicBrushOpacity);
  } else if (selectedTool === TOOL_SCRIBBLE_PALLET) {
    dynamicBackgroundOpacity = event.target.value;
    colorPreview.style.backgroundColor = utility.modifyAlpha(dynamicBackgroundColor, dynamicBackgroundOpacity);
  }
});

btnSelectColor.addEventListener('click', (event) => {
  if (selectedTool === TOOL_BRUSH_COLOR) {
    selectedBrushColor = utility.modifyAlpha(dynamicBrushColor, selectedBrushOpacity = dynamicBrushOpacity);
    ctx.strokeStyle = selectedBrushColor
  } else if (selectedTool === TOOL_SCRIBBLE_PALLET) {
    canvas.style.backgroundColor = selectedBackgroundColor = utility.modifyAlpha(dynamicBackgroundColor, selectedBackgroundOpacity = dynamicBackgroundOpacity);
  }
  colorPickerModel.classList.add('hide');
  selectUnselectTool(selectedTool === TOOL_BRUSH_COLOR ? TOOL_BRUSH_COLOR : TOOL_SCRIBBLE_PALLET, false);
})
btnCancelColor.addEventListener('click', (event) => {
  colorPickerModel.classList.add('hide');
  selectUnselectTool(selectedTool === TOOL_BRUSH_COLOR ? TOOL_BRUSH_COLOR : TOOL_SCRIBBLE_PALLET, false);
})

toolEraser.addEventListener('click', (event) => {
  selectUnselectTool(TOOL_ERASER, !toolEraser.classList.contains('selected'));
})

toolBrushWidth.addEventListener('click', (event) => {
  debugger;
  brushSizeRange.value = brushSizePx;
  brushSizePreview.style.backgroundColor = utility.modifyAlpha(selectedBrushColor, selectedBrushOpacity);
  brushSizePreview.style.height = `${brushSizePx}px`;

  selectUnselectTool(TOOL_BRUSH_SIZE, selectedTool !== TOOL_BRUSH_SIZE || brushSizeModel.classList.contains('hide'));
  if (selectedTool === TOOL_BRUSH_SIZE) {
    closeAllModels();
    brushSizeModel.classList.remove('hide');
  } else {
    brushSizeModel.classList.add('hide');
  }
})

brushSizeRange.addEventListener('input', (event) => {
  debugger
  brushDynamicSizePx = event.target.value;
  brushSizePreview.style.height = `${brushDynamicSizePx}px`;
});

btnSelectSize.addEventListener('click', (event) => {
  brushSizePx = brushDynamicSizePx;
  debugger
  //canvas line width
  ctx.lineWidth = brushSizePx;

  closeAllModels();
});

btnCancelSize.addEventListener('click', (event) => {
  closeAllModels();
  selectUnselectTool(TOOL_BRUSH_SIZE, false);
});

toolClearCanvas.addEventListener('click', (event) => {
  clearCanvas();
})

toolPen.addEventListener('click', (event) => {
  selectUnselectTool(TOOL_PEN, !toolPen.classList.contains('selected'));
})

toolExit.addEventListener('click', (event) => {
  ipcRenderer.send('QUIT_APP', true);
})

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// canvas drawing
const history = [];
let redoStack = [];
const maxHistory = 50; // Limit history to avoid memory issues

// Function to save canvas state
const saveState = () => {
  sanitizeUndoRedo(); // Remove oldest if limit is reached
  history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  redoStack = []; // Clear redo history when new action is taken
};

function sanitizeUndoRedo() {
  if (history.length >= maxHistory) history.shift(); // Remove oldest if limit is reached
  if (redoStack.length >= maxHistory) redoStack.shift(); // Remove oldest if limit is reached
}

let x = 0, y = 0;
let isMouseDown = false;
const stopDrawing = () => { isMouseDown = false; }
const startDrawing = (event) => {
  isMouseDown = true;
  [x, y] = [event.offsetX, event.offsetY];
}

const drawLine = (event) => {
  if (isMouseDown && [TOOL_ERASER, TOOL_PEN].includes(selectedTool)) {
    saveState();
    ctx.lineWidth = brushSizePx;
    ctx.strokeStyle = selectedBrushColor
    ctx.lineCap = "round";

    const newX = event.offsetX;
    const newY = event.offsetY;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(newX, newY);

    // Check if eraser is selected
    if (selectedTool == TOOL_ERASER) {
      ctx.globalCompositeOperation = "destination-out"; // Erase mode
    } else {
      ctx.globalCompositeOperation = "source-over"; // Normal drawing mode
      ctx.strokeStyle = selectedBrushColor;
    }

    ctx.stroke();
    x = newX;
    y = newY;
  }
}

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', drawLine);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

// Undo function
const undo = () => {
  if (history.length > 0) {
    redoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height)); // Save current state for redo
    sanitizeUndoRedo();
    const previousState = history.pop(); // Get last saved state
    ctx.putImageData(previousState, 0, 0);
  }
};

// Redo function
const redo = () => {
  if (redoStack.length > 0) {
    history.push(ctx.getImageData(0, 0, canvas.width, canvas.height)); // Save current state before redoing
    sanitizeUndoRedo();
    const nextState = redoStack.pop(); // Get last undone state
    ctx.putImageData(nextState, 0, 0);
  }
};

toolUndo.addEventListener('click', (event) => {
  undo();
  enableDisableUndoRedo();
})
toolRedo.addEventListener('click', (event) => {
  redo();
  enableDisableUndoRedo();
})

function enableDisableUndoRedo() {
  if (!history.length) {
    toolUndo.classList.add('disabled');
  } else {
    toolUndo.classList.remove('disabled');
  }
  if (!redoStack.length) {
    toolRedo.classList.add('disabled');
  } else {
    toolRedo.classList.remove('disabled');
  }
}

// reset color
document.addEventListener('keydown', (event) => {
  if (!(event.shiftKey && event.ctrlKey)) return;
  if (event.key.toUpperCase() === "R") {
    selectedBackgroundColor = 'rgba(0,0,0,0)';
    canvas.style.backgroundColor = selectedBackgroundColor;
  } else if (event.key.toUpperCase() === "P") {
    selectUnselectTool(TOOL_PEN);
  } else if (event.key.toUpperCase() === "E") {
    selectUnselectTool(TOOL_ERASER);
  } else if (event.key.toUpperCase() === "C") {
    clearCanvas();
  }
})