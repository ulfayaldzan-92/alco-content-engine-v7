const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const net = require('net');
const { spawn, execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');

let mainWindow = null;
let serverProcess = null;
let activePort = null;
let cachedDeviceId = null;
let isShuttingDown = false;

function log(msg) {
  const timestamp = new Date().toISOString();
  console.log(`[ALCO-MAIN ${timestamp}] ${msg}`);
}

function errorLog(msg, err) {
  const timestamp = new Date().toISOString();
  console.error(`[ALCO-MAIN-ERROR ${timestamp}] ${msg}`, err ? err.stack || err : '');
}

/* ==========================================================================
   1. DEVICE ID SYSTEM (Windows MachineGuid Standard)
   ========================================================================== */

/**
 * Reads Windows MachineGuid from registry.
 * This is the primary hardware identity for ALCO devices on Windows.
 */
function getWindowsMachineGuid() {
  if (process.platform === 'win32') {
    try {
      const stdout = execSync(
        'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid',
        { encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] }
      );
      const match = stdout.match(/MachineGuid\s+REG_\w+\s+([a-zA-Z0-9{}-]+)/i);
      if (match && match[1]) {
        return match[1].replace(/[{}]/g, '').trim().toLowerCase();
      }
    } catch (err) {
      console.warn('[ALCO Device] Could not query Windows MachineGuid:', err.message);
    }
  }
  return null;
}

/**
 * Generates the standardized ALCO Device ID (ALCO-DEV-XXXX-XXXX-XXXX)
 * bound permanently to the Windows MachineGuid.
 */
function getAlcoProductionDeviceId() {
  if (cachedDeviceId) return cachedDeviceId;

  const machineGuid = getWindowsMachineGuid();
  let hardwareSeed = '';

  if (machineGuid) {
    // Primary Production hardware source: Windows MachineGuid
    hardwareSeed = `alco:contentengine:device::win::${machineGuid}`;
  } else {
    // Fallback for development/testing on non-Windows platforms (macOS/Linux)
    const os = require('os');
    const hostname = os.hostname() || 'localhost';
    const homedir = os.homedir() || '';
    hardwareSeed = `alco:contentengine:device::${process.platform}::${process.arch}::${hostname}::${homedir}`;
  }

  const hash = crypto.createHash('sha256').update(hardwareSeed).digest('hex');
  const rawHex = hash.slice(0, 12).toUpperCase().padEnd(12, '0');
  const part1 = rawHex.slice(0, 4);
  const part2 = rawHex.slice(4, 8);
  const part3 = rawHex.slice(8, 12);

  cachedDeviceId = `ALCO-DEV-${part1}-${part2}-${part3}`;
  return cachedDeviceId;
}

// Register IPC handler for renderer asking for Device ID
ipcMain.handle('alco:get-device-id', async () => {
  return getAlcoProductionDeviceId();
});

/* ==========================================================================
   2. PRODUCTION RUNTIME & SERVER LIFECYCLE (ALCO APP STANDARD v2.9)
   ========================================================================== */

/**
 * Resolves the application root directory containing .next build.
 * ALCO APP STANDARD v2.9 Section 6: Production Resource Path Contract
 * Never relies on process.cwd() or working directory assumptions.
 */
function resolveAppDirectory() {
  const candidates = [];

  if (app.isPackaged) {
    const resourcesPath = process.resourcesPath;
    if (resourcesPath) {
      candidates.push(path.join(resourcesPath, 'app.asar.unpacked'));
      candidates.push(path.join(resourcesPath, 'app'));
    }
    try {
      if (typeof app.getAppPath === 'function') {
        const appPath = app.getAppPath();
        candidates.push(appPath);
        candidates.push(path.join(path.dirname(appPath), 'app.asar.unpacked'));
      }
    } catch {}
  }

  candidates.push(path.resolve(__dirname, '..'));
  candidates.push(path.resolve(__dirname));

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(path.join(candidate, '.next'))) {
      log(`[RESOURCE PATH] Resolved production app directory: ${candidate}`);
      return candidate;
    }
  }

  const fallback = path.resolve(__dirname, '..');
  log(`[RESOURCE PATH] Falling back to default app directory: ${fallback}`);
  return fallback;
}

/**
 * Resolves the server.cjs script path.
 */
function resolveServerScript() {
  const candidates = [
    path.join(__dirname, 'server.cjs'),
  ];
  if (app.isPackaged && process.resourcesPath) {
    candidates.unshift(path.join(process.resourcesPath, 'app.asar.unpacked', 'electron', 'server.cjs'));
    candidates.unshift(path.join(process.resourcesPath, 'app', 'electron', 'server.cjs'));
  }
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return path.join(__dirname, 'server.cjs');
}

/**
 * Finds an available TCP port starting from defaultPort.
 */
function findAvailablePort(defaultPort = 3000) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(findAvailablePort(defaultPort + 1));
      } else {
        reject(err);
      }
    });

    server.listen(defaultPort, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => {
        resolve(port);
      });
    });
  });
}

/**
 * Performs HTTP GET health check against /api/health with timeout.
 * ALCO APP STANDARD v2.9 Section 4 Requirement:
 * Health check MUST validate application identity (e.g. app: "alco-content-engine").
 * If the response belongs to another application or fails identity check, do not reuse the server.
 */
function checkServerHealth(port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const req = http.get(
      {
        hostname: '127.0.0.1',
        port: port,
        path: '/api/health',
        timeout: timeoutMs,
      },
      (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          let rawData = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            rawData += chunk;
          });
          res.on('end', () => {
            try {
              const data = JSON.parse(rawData);
              if (data && data.status === 'ok' && data.app === 'alco-content-engine') {
                resolve(true);
              } else {
                log(`Health check on port ${port} returned unexpected app identity: "${data?.app}" (expected "alco-content-engine")`);
                resolve(false);
              }
            } catch {
              log(`Health check on port ${port} returned non-JSON response`);
              resolve(false);
            }
          });
        } else {
          resolve(false);
        }
      }
    );

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Verifies that GET / returns HTTP 200 (or redirect).
 * ALCO APP STANDARD v2.9 Section 6 Requirement:
 * Packaged App -> Start Local Server -> GET / -> UI Entry Point ditemukan -> HTTP 200 -> UI tampil
 * Health endpoint yang PASS tidak cukup bila route utama aplikasi (/) gagal menampilkan UI (404).
 */
function checkUiEntryPoint(port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const req = http.get(
      {
        hostname: '127.0.0.1',
        port: port,
        path: '/',
        timeout: timeoutMs,
        headers: {
          Accept: 'text/html,application/xhtml+xml',
        },
      },
      (res) => {
        const statusCode = res.statusCode || 0;
        res.resume(); // drain response
        if (statusCode >= 200 && statusCode < 400) {
          resolve(true);
        } else {
          log(`UI entry point check on port ${port} returned HTTP status ${statusCode} (expected 200)`);
          resolve(false);
        }
      }
    );

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Polls both health check and UI entry point endpoints with retry until healthy or max retries exceeded.
 */
async function waitForServerHealthy(port, maxAttempts = 30, intervalMs = 1000) {
  log(`Waiting for production server at port ${port} to pass health check and UI entry point check...`);
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (isShuttingDown) return false;
    const isHealthy = await checkServerHealth(port, 1500);
    if (isHealthy) {
      const isUiReady = await checkUiEntryPoint(port, 1500);
      if (isUiReady) {
        log(`Server passed health check AND UI entry point check on attempt ${attempt}.`);
        return true;
      }
      log(`Health check passed, but UI entry point (GET /) not yet ready (attempt ${attempt}). Retrying...`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

/**
 * Starts the internal Next.js production server using electron/server.cjs.
 */
async function startProductionServer() {
  const port = await findAvailablePort(3000);
  const appDir = resolveAppDirectory();
  const serverScript = resolveServerScript();

  log(`Starting internal production server process... (Port: ${port}, AppDir: ${appDir}, Script: ${serverScript})`);

  const nodePaths = [
    path.join(appDir, 'node_modules'),
    path.join(path.dirname(appDir), 'app.asar.unpacked', 'node_modules'),
  ];
  if (process.resourcesPath) {
    nodePaths.push(path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules'));
    nodePaths.push(path.join(process.resourcesPath, 'app', 'node_modules'));
  }
  const existingNodePath = process.env.NODE_PATH || '';
  const combinedNodePath = [
    ...nodePaths,
    ...(existingNodePath ? existingNodePath.split(path.delimiter) : []),
  ].filter(Boolean).join(path.delimiter);

  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    NODE_ENV: 'production',
    PORT: String(port),
    HOSTNAME: '127.0.0.1',
    APP_DIR: appDir,
    NODE_PATH: combinedNodePath,
  };

  serverProcess = spawn(process.execPath, [serverScript, `--port=${port}`, `--dir=${appDir}`], {
    env,
    cwd: appDir,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  serverProcess.stdout.on('data', (data) => {
    const text = data.toString().trim();
    if (text) log(`[SRV-OUT] ${text}`);
  });

  serverProcess.stderr.on('data', (data) => {
    const text = data.toString().trim();
    if (text) errorLog(`[SRV-ERR] ${text}`);
  });

  serverProcess.on('exit', (code, signal) => {
    log(`Production server exited with code: ${code}, signal: ${signal}`);
    serverProcess = null;
    if (!isShuttingDown && mainWindow && !mainWindow.isDestroyed()) {
      errorLog('Production server exited unexpectedly while application was running.');
    }
  });

  const healthy = await waitForServerHealthy(port, 30, 1000);
  if (!healthy) {
    throw new Error(`Production server failed to report healthy on port ${port} within timeout.`);
  }

  activePort = port;
  return port;
}

/**
 * Stops the internal production server process gracefully with force kill fallback.
 */
async function stopProductionServer() {
  if (!serverProcess) return;

  isShuttingDown = true;
  log('Stopping production server process...');

  const proc = serverProcess;
  serverProcess = null;

  return new Promise((resolve) => {
    let forceKillTimeout = null;

    const cleanup = () => {
      if (forceKillTimeout) clearTimeout(forceKillTimeout);
      resolve();
    };

    proc.once('exit', () => {
      log('Production server stopped gracefully.');
      cleanup();
    });

    try {
      proc.kill('SIGTERM');
    } catch (e) {
      log(`SIGTERM failed: ${e.message}`);
    }

    forceKillTimeout = setTimeout(() => {
      try {
        log('Server did not exit in time, sending SIGKILL...');
        proc.kill('SIGKILL');
      } catch (err) {
        // Ignore
      }
      cleanup();
    }, 4000);
  });
}

/* ==========================================================================
   3. BROWSER WINDOW CREATION & LIFECYCLE
   ========================================================================== */

function resolveWindowIcon() {
  const icoCandidates = [
    path.join(__dirname, '../assets/icon.ico'),
    path.join(__dirname, 'assets/icon.ico'),
  ];
  const pngCandidates = [
    path.join(__dirname, '../assets/icon.png'),
    path.join(__dirname, 'assets/icon.png'),
  ];

  if (process.resourcesPath) {
    icoCandidates.unshift(path.join(process.resourcesPath, 'app.asar.unpacked', 'assets', 'icon.ico'));
    icoCandidates.unshift(path.join(process.resourcesPath, 'assets', 'icon.ico'));
    pngCandidates.unshift(path.join(process.resourcesPath, 'app.asar.unpacked', 'assets', 'icon.png'));
    pngCandidates.unshift(path.join(process.resourcesPath, 'assets', 'icon.png'));
  }

  if (process.platform === 'win32') {
    for (const p of icoCandidates) {
      if (fs.existsSync(p)) return p;
    }
  }
  for (const p of pngCandidates) {
    if (fs.existsSync(p)) return p;
  }
  for (const p of icoCandidates) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

function createWindow(port) {
  const windowIcon = resolveWindowIcon();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'ALCO Content Engine',
    ...(windowIcon ? { icon: windowIcon } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  const targetUrl = `http://127.0.0.1:${port}`;
  log(`Loading application main window at: ${targetUrl}`);

  mainWindow.loadURL(targetUrl).catch((err) => {
    errorLog('Failed to load window URL:', err);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/* ==========================================================================
   4. APP INITIALIZATION & SINGLE INSTANCE LOCK
   ========================================================================== */

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  log('Another instance is already running. Quitting duplicate instance.');
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      const isDev = !app.isPackaged;
      let port = 3102;

      if (isDev) {
        let isDevHealthy = await checkServerHealth(3102, 800);
        if (isDevHealthy) {
          log('Connected to existing development server on port 3102.');
          port = 3102;
        } else {
          isDevHealthy = await checkServerHealth(3000, 800);
          if (isDevHealthy) {
            log('Connected to existing development server on port 3000.');
            port = 3000;
          } else {
            log('Dev server not detected on port 3102 or 3000, starting production server runtime...');
            port = await startProductionServer();
          }
        }
      } else {
        port = await startProductionServer();
      }

      activePort = port;
      createWindow(port);
    } catch (err) {
      errorLog('Fatal error during application startup:', err);
      app.quit();
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0 && activePort) {
        createWindow(activePort);
      }
    });
  });

  app.on('before-quit', async (event) => {
    if (serverProcess) {
      event.preventDefault();
      await stopProductionServer();
      app.quit();
    }
  });

  app.on('window-all-closed', async () => {
    if (process.platform !== 'darwin') {
      await stopProductionServer();
      app.quit();
    }
  });
}

