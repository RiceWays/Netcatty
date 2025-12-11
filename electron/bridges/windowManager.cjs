/**
 * Window Manager - Handles Electron window creation and management
 * Extracted from main.cjs for single responsibility
 */

const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");

// Theme colors configuration
const THEME_COLORS = {
  dark: {
    background: "#0b1220",
    titleBarColor: "#0b1220",
    symbolColor: "#ffffff",
  },
  light: {
    background: "#ffffff",
    titleBarColor: "#f8fafc",
    symbolColor: "#1e293b",
  },
};

// MIME types for production server
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.wasm': 'application/wasm',
};

// State
let mainWindow = null;
let productionServer = null;
let productionServerUrl = null;
let currentTheme = "light";

/**
 * Start a local HTTP server for production (WebAuthn requires secure context)
 */
async function startProductionServer(electronDir) {
  const distPath = path.join(electronDir, "../dist");
  
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(distPath, req.url === '/' ? 'index.html' : req.url);
      
      // Security: prevent directory traversal
      if (!filePath.startsWith(distPath)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      
      // Handle SPA routing
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(distPath, 'index.html');
      }
      
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
      
      fs.readFile(filePath, (err, data) => {
        if (err) {
          if (err.code === 'ENOENT') {
            fs.readFile(path.join(distPath, 'index.html'), (err2, data2) => {
              if (err2) {
                res.writeHead(404);
                res.end('Not Found');
                return;
              }
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(data2);
            });
            return;
          }
          res.writeHead(500);
          res.end('Server Error');
          return;
        }
        res.writeHead(200, { 'Content-Type': mimeType });
        res.end(data);
      });
    });
    
    const tryPort = (port) => {
      server.listen(port, '127.0.0.1', () => {
        productionServer = server;
        productionServerUrl = `http://127.0.0.1:${port}`;
        console.log(`Production server started at ${productionServerUrl}`);
        resolve(productionServerUrl);
      }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          tryPort(port + 1);
        } else {
          reject(err);
        }
      });
    };
    
    tryPort(17789);
  });
}

/**
 * Close the production server
 */
function closeProductionServer() {
  if (productionServer) {
    productionServer.close();
    productionServer = null;
    productionServerUrl = null;
  }
}

/**
 * Create the main application window
 */
async function createWindow(electronModule, options) {
  const { BrowserWindow, nativeTheme } = electronModule;
  const { preload, devServerUrl, isDev, appIcon, isMac, electronDir, onRegisterBridge } = options;
  
  const themeConfig = THEME_COLORS[currentTheme];
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: themeConfig.background,
    icon: appIcon,
    frame: isMac,
    titleBarStyle: isMac ? "hiddenInset" : undefined,
    trafficLightPosition: isMac ? { x: 12, y: 12 } : undefined,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow = win;

  // Register window control handlers
  registerWindowHandlers(electronModule.ipcMain, nativeTheme);

  if (isDev) {
    try {
      await win.loadURL(devServerUrl);
      win.webContents.openDevTools({ mode: "detach" });
      onRegisterBridge?.(win);
      return win;
    } catch (e) {
      console.warn("Dev server not reachable, falling back to bundled dist.", e);
    }
  }

  // Production mode - use local HTTP server for WebAuthn support
  try {
    if (!productionServerUrl) {
      await startProductionServer(electronDir);
    }
    await win.loadURL(productionServerUrl);
  } catch (e) {
    console.warn("Failed to start production server, falling back to file://", e);
    const indexPath = path.join(electronDir, "../dist/index.html");
    await win.loadFile(indexPath);
  }
  
  onRegisterBridge?.(win);
  return win;
}

/**
 * Register window control IPC handlers
 */
function registerWindowHandlers(ipcMain, nativeTheme) {
  ipcMain.handle("netcatty:window:minimize", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize();
    }
  });

  ipcMain.handle("netcatty:window:maximize", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
        return false;
      } else {
        mainWindow.maximize();
        return true;
      }
    }
    return false;
  });

  ipcMain.handle("netcatty:window:close", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
    }
  });

  ipcMain.handle("netcatty:window:isMaximized", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      return mainWindow.isMaximized();
    }
    return false;
  });

  ipcMain.handle("netcatty:setTheme", (_event, theme) => {
    currentTheme = theme;
    nativeTheme.themeSource = theme;
    const themeConfig = THEME_COLORS[theme] || THEME_COLORS.light;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setBackgroundColor(themeConfig.background);
    }
    return true;
  });
}

/**
 * Build the application menu
 */
function buildAppMenu(Menu, app, isMac) {
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(isMac
          ? [{ type: "separator" }, { role: "front" }]
          : [{ role: "close" }]),
      ],
    },
  ];
  
  return Menu.buildFromTemplate(template);
}

/**
 * Get the main window instance
 */
function getMainWindow() {
  return mainWindow;
}

module.exports = {
  createWindow,
  closeProductionServer,
  buildAppMenu,
  getMainWindow,
  THEME_COLORS,
};
