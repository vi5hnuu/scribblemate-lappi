const { app, BrowserWindow, ipcMain, screen, globalShortcut } = require('electron');
const net = require('net');
const { exec } = require('child_process'); // ✅ Import exec
const path = require('path')

let mainWindow;


const toggleWindowEvents = (() => {
  let ignoreMouseEvents = true;
  return (mainWindow) => {
    ignoreMouseEvents = !ignoreMouseEvents

    //notify 
    mainWindow.webContents.send('scribble-mode', !ignoreMouseEvents)
    // 

    mainWindow.setIgnoreMouseEvents(ignoreMouseEvents, { forward: true })
  };
})();

app.whenReady().then(() => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize; // Get screen size

  mainWindow = new BrowserWindow({
    icon: path.join(__dirname, 'icon.ico'),
    width: width,
    height: height,
    transparent: true,
    frame: false,       // ✅ Keeps window border, minimize/maximize buttons
    alwaysOnTop: true, // ❌ Set to true if you want it floating
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    roundedCorners: true,
    resizable: true,
    closable: true,
    opacity: 1,
    fullscreenable: true,
  });
  mainWindow.setIgnoreMouseEvents(true, { forward: true });  // Pass all events to macOs
  mainWindow.loadFile("index.html");

  // Register ESC key to toggle ignoreMouseEvents
  globalShortcut.register("Escape+Shift", () => {
    toggleWindowEvents(mainWindow);
  });

  let isDevToolsOpen = false;
  globalShortcut.register("Ctrl+Shift+H", () => {
    isDevToolsOpen = !isDevToolsOpen;
    if (isDevToolsOpen) {
      mainWindow.webContents.openDevTools()
      toggleWindowEvents(mainWindow);
    } else {
      mainWindow.webContents.closeDevTools()
    }
  });

  globalShortcut.register("Ctrl+Shift+Q", () => {
    app.quit();
  });

  ipcMain.on("log", (event, message) => {
    console.log("Renderer:", message);
  });

  ipcMain.on("QUIT_APP", (event, message) => {
    app.quit();
  });

  checkAndStartADB();
});


// ✅ Send status updates to renderer
function updateStatus(message) {
  if (mainWindow) {
    mainWindow.webContents.send("status-update", message);
  }
}

function checkAndStartADB() {
  exec("adb devices", (error, stdout) => {
    if (error) {
      console.log("ADB not found! Please install ADB.")
      updateStatus("ADB not found! Please install ADB.");
      return;
    }

    const devices = stdout.split("\n").slice(1).filter(line => line.trim() && !line.includes("unauthorized"));

    if (devices.length === 0) {
      console.log("No device detected. Waiting...");
      updateStatus("No device detected. Waiting...");
      setTimeout(checkAndStartADB, 5000);
    } else {
      updateStatus("Device connected! Ready to draw.");
      console.log("Device connected! Ready to draw.");
      startADBEventListener();
    }
  });
}

let inputMinX = 0, inputMaxX = 1;  // Placeholder, will be updated dynamically
let inputMinY = 0, inputMaxY = 1;

// ✅ Function to start ADB touch event forwarding automatically
// Function to get screen resolutions
function getScreenSizes(callback) {
  exec("adb shell wm size", (error, androidOutput) => {
    if (error) {
      console.error("Error getting Android screen size:", error);
      return;
    }

    // Extract Android resolution (e.g., "Physical size: 1080x2340")
    const androidMatch = androidOutput.match(/Physical size: (\d+)x(\d+)/);
    if (!androidMatch) {
      console.error("Could not determine Android screen size.");
      return;
    }
    const [androidWidth, androidHeight] = [parseInt(androidMatch[1]), parseInt(androidMatch[2])];

    // Get macOS screen size
    exec("system_profiler SPDisplaysDataType | grep Resolution", (error, macOutput) => {
      if (error) {
        console.error("Error getting Mac screen size:", error);
        return;
      }

      // Extract macOS resolution (e.g., "Resolution: 2560 x 1440")
      const macMatch = macOutput.match(/Resolution: (\d+) x (\d+)/);
      if (!macMatch) {
        console.error("Could not determine Mac screen size.");
        return;
      }
      const [macWidth, macHeight] = [parseInt(macMatch[1]), parseInt(macMatch[2])];

      console.log(`Android Screen: ${androidWidth}x${androidHeight}`);
      console.log(`Mac Screen: ${macWidth}x${macHeight}`);

      callback({ androidWidth, androidHeight, macWidth, macHeight });
    });
  });
}



// Function to fetch input event bounds
function getInputBounds(callback) {
  exec("adb shell getevent -p /dev/input/event4", (error, stdout) => {
    if (error) {
      console.error("Error getting input device properties:", error);
      return;
    }

    console.log('Extracting bounds...');

    // Extract min-max values from event codes (not explicit names)
    const xMatch = stdout.match(/0035\s+:\s+value \d+, min (\d+), max (\d+)/);
    const yMatch = stdout.match(/0036\s+:\s+value \d+, min (\d+), max (\d+)/);

    if (xMatch && yMatch) {
      inputMinX = parseInt(xMatch[1]);
      inputMaxX = parseInt(xMatch[2]);
      inputMinY = parseInt(yMatch[1]);
      inputMaxY = parseInt(yMatch[2]);

      console.log(`✅ Input Bounds - X: ${inputMinX} to ${inputMaxX}, Y: ${inputMinY} to ${inputMaxY}`);

      if (callback) callback();
    } else {
      console.error("❌ Could not determine input bounds! Check if the correct device is being used.");
    }
  });
}


ipcMain.on("canvas-size", (event, data) => {
  macWidth = data.width;
  macHeight = data.height;
  console.log(`Canvas Dimensions: ${macWidth}x${macHeight}`);
});

//
function startADBEventListener() {
  getScreenSizes(({ androidWidth, androidHeight, macWidth, macHeight }) => {

    console.log(`android : ${androidWidth}x${androidHeight}, mac : ${macWidth}x${macHeight}`);

    getInputBounds(() => {
      console.log("Starting event connection...");

      const adbCommand = `adb shell getevent -lt /dev/input/event6`;
      const adbProcess = exec(adbCommand);

      if (adbProcess.stderr) {
        adbProcess.stderr.on('data', (data) => console.error(`ADB Error: ${data}`));
      }

      adbProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');

        lines.forEach(line => {
          if (line.trim() !== '') {
            try {
              const event = parseEventLine(line);

              if (event) {
                console.log("Raw Event:", event);

                // Handle "finger lift" case
                if (event.x === null || event.y === null) {
                  mainWindow.webContents.send("drawing-data", null);
                  return;
                }

                // Step 1: Normalize raw touch values based on actual input event bounds
                const normalizedX = (event.x - inputMinX) / (inputMaxX - inputMinX);
                const normalizedY = (event.y - inputMinY) / (inputMaxY - inputMinY);

                // Step 2: Map directly to Mac screen size
                const mappedX = normalizedX;
                const mappedY = (1 - normalizedY); // Flip Y-axis


                console.log("Mapped Event:", { x: mappedX, y: mappedY, pressure: event.pressure });

                if (mainWindow && !mainWindow.isDestroyed()) {
                  console.log('draw at', {
                    x: mappedX, // Scale down
                    y: mappedY,
                    pressure: event.pressure
                  })
                  mainWindow.webContents.send("drawing-data", {
                    x: mappedX, // Scale down
                    y: mappedY,
                    pressure: event.pressure
                  });
                }
              }
            } catch (e) {
              console.error("Error parsing event line:", line, e);
            }
          }
        });
      });

      adbProcess.on('exit', (code) => {
        console.log(`ADB process exited with code ${code}`);
      });

      adbProcess.on('error', (err) => {
        console.error('ADB process could not be started:', err);
      });
    });
  });
}

// Normalize function to scale raw input within bounds
function normalize(value, minInput, maxInput, minOutput, maxOutput) {
  console.log('normalizing', value, minInput, maxInput, minOutput, maxOutput, (((value - minInput) / (maxInput - minInput)) * (maxOutput - minOutput) + minOutput));
  return ((value - minInput) / (maxInput - minInput)) * (maxOutput - minOutput) + minOutput;
}

// Maps a value from Android resolution to macOS resolution
function mapToMac(value, fromMax, toMax) {
  console.log('mapping to mac', value, fromMax, toMax, Math.round((value / fromMax) * toMax));
  return Math.round((value / fromMax) * toMax);
}


const eventState = {
  x: null,
  y: null,
  pressure: null
};

function parseEventLine(line) {
  const match = line.match(/EV_ABS\s+(ABS_MT_POSITION_X|ABS_MT_POSITION_Y|ABS_MT_PRESSURE)\s+([0-9a-f]+)/);

  if (match) {
    const [, eventType, valueHex] = match;
    const value = parseInt(valueHex, 16); // Convert hex to decimal

    if (eventType === "ABS_MT_POSITION_X") {
      eventState.x = value;
    } else if (eventType === "ABS_MT_POSITION_Y") {
      eventState.y = value;
    } else if (eventType === "ABS_MT_PRESSURE") {
      eventState.pressure = value;
    }
  }

  // If SYN_REPORT is found, emit the complete event
  if (line.includes("EV_SYN") && line.includes("SYN_REPORT")) {
    const event = { ...eventState };
    return event; // You can emit/send this event
  }

  return null; // No complete event yet
}