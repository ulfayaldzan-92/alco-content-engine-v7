const http = require('http');
const path = require('path');
const fs = require('fs');
const Module = require('module');

function configureModulePaths(appDir) {
  const candidates = [];
  if (appDir) {
    candidates.push(path.join(appDir, 'node_modules'));
  }
  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules'));
    candidates.push(path.join(process.resourcesPath, 'app', 'node_modules'));
  }
  candidates.push(path.resolve(__dirname, '..', 'node_modules'));
  candidates.push(path.resolve(__dirname, 'node_modules'));

  for (const dir of candidates) {
    if (fs.existsSync(dir) && !Module.globalPaths.includes(dir)) {
      Module.globalPaths.push(dir);
    }
  }
}

function log(msg) {
  const timestamp = new Date().toISOString();
  console.log(`[ALCO-SERVER ${timestamp}] ${msg}`);
}

function errorLog(msg, err) {
  const timestamp = new Date().toISOString();
  console.error(`[ALCO-SERVER-ERROR ${timestamp}] ${msg}`, err ? err.stack || err : '');
}

let activeHttpServer = null;
let activeNextApp = null;

function resolveServerAppDir(dirArg) {
  if (dirArg) {
    const cleaned = dirArg.trim();
    if (fs.existsSync(path.join(cleaned, '.next'))) {
      return cleaned;
    }
  }
  if (process.env.APP_DIR && fs.existsSync(path.join(process.env.APP_DIR, '.next'))) {
    return process.env.APP_DIR;
  }

  const candidates = [];
  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, 'app.asar.unpacked'));
    candidates.push(path.join(process.resourcesPath, 'app'));
  }
  candidates.push(path.resolve(__dirname, '..'));
  candidates.push(path.resolve(__dirname));

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, '.next'))) {
      return candidate;
    }
  }

  return path.resolve(__dirname, '..');
}

async function startServer(options = {}) {
  const port = options.port || 3000;
  const host = options.host || '127.0.0.1';
  const appDir = resolveServerAppDir(options.appDir);

  log(`[RESOURCE PATH] Initializing Next.js production server from directory: ${appDir} on ${host}:${port}`);

  process.env.NODE_ENV = 'production';
  process.env.PORT = String(port);
  process.env.HOSTNAME = host;

  // Validate .next directory
  const dotNextDir = path.join(appDir, '.next');
  if (!fs.existsSync(dotNextDir)) {
    const errorMsg = `Production build directory (.next) not found at: ${dotNextDir}. Ensure Next.js build has completed.`;
    errorLog(errorMsg);
    throw new Error(errorMsg);
  }

  // Ensure node_modules from app directory and unpacked resources are in globalPaths
  configureModulePaths(appDir);

  log(`Loading Next.js engine from ${appDir}...`);
  const next = require('next');
  const app = next({
    dev: false,
    dir: appDir,
    hostname: host,
    port: port,
  });

  activeNextApp = app;
  const handle = app.getRequestHandler();

  log('Preparing Next.js app routes and assets...');
  await app.prepare();
  log('Next.js preparation complete.');

  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  activeHttpServer = server;

  return new Promise((resolve, reject) => {
    server.on('error', (err) => {
      errorLog(`Server socket error on port ${port}:`, err);
      reject(err);
    });

    server.listen(port, host, () => {
      log(`ALCO Content Engine production server listening on http://${host}:${port}`);
      resolve({ server, port, host });
    });
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (activeHttpServer) {
      log('Stopping active HTTP server...');
      activeHttpServer.close((err) => {
        if (err) {
          errorLog('Error while closing HTTP server:', err);
        } else {
          log('HTTP server closed successfully.');
        }
        activeHttpServer = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// Clean shutdown listeners when executed as standalone or child process
function setupGracefulShutdown() {
  const shutdown = async (signal) => {
    log(`Received shutdown signal: ${signal}`);
    try {
      await stopServer();
    } catch (err) {
      errorLog('Error during graceful shutdown:', err);
    }
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('disconnect', () => shutdown('IPC_DISCONNECT'));
}

if (require.main === module) {
  setupGracefulShutdown();

  const args = process.argv.slice(2);
  const portArg = args.find((a) => a.startsWith('--port='));
  const dirArg = args.find((a) => a.startsWith('--dir='));

  const port = portArg
    ? parseInt(portArg.split('=')[1], 10)
    : parseInt(process.env.PORT || '3000', 10);
  const appDirArg = dirArg ? dirArg.split('=')[1] : undefined;

  startServer({ port, appDir: appDirArg })
    .then(({ port, host }) => {
      log(`Production server ready on http://${host}:${port}`);
      if (process.send) {
        process.send({ type: 'ready', port, host });
      }
    })
    .catch((err) => {
      errorLog('Fatal error during production server start:', err);
      if (process.send) {
        process.send({ type: 'error', error: err.message || String(err) });
      }
      process.exit(1);
    });
}

module.exports = {
  startServer,
  stopServer,
};
