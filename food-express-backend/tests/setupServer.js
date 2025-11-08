// tests/setupServer.js
const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn } = require('child_process');
const path = require('path');

let mongoServer = null;
let serverProcess = null;
let baseUrl = null;

async function startTestServer(options = {}) {
  if (serverProcess) return { baseUrl }; // already started

  // start in-memory mongo
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // pick a port for the test server (allow override)
  const port = options.port || process.env.TEST_PORT || 5500;

  // spawn server.js (cwd is backend root — adjust if tests are run from root)
  const backendRoot = path.resolve(__dirname, '..'); // tests/.. => backend root
  // spawn node server.js with MONGO_URI and PORT in env
  serverProcess = spawn(
    process.execPath,
    ['server.js'],
    {
      cwd: backendRoot,
      env: { ...process.env, MONGO_URI: mongoUri, PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  // forward server logs to test stdout (optional)
  serverProcess.stdout.on('data', (d) => {
    process.stdout.write(`[server] ${d.toString()}`);
  });
  serverProcess.stderr.on('data', (d) => {
    process.stderr.write(`[server][err] ${d.toString()}`);
  });

  // wait for the server to print "Server started" (or similar)
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timed out waiting for server to start (10s)'));
    }, 10000);

    function onData(chunk) {
      const s = chunk.toString();
      // look for the typical startup line — tweak if your server prints something else
      if (
        s.includes('Server started') ||
        s.includes('Server started on') ||
        s.includes('🚀 Server started') ||
        s.toLowerCase().includes('listening')
      ) {
        clearTimeout(timeout);
        serverProcess.stdout.removeListener('data', onData);
        resolve();
      }
    }

    serverProcess.stdout.on('data', onData);
    serverProcess.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  baseUrl = `http://127.0.0.1:${port}`;
  return { baseUrl, mongoUri, port };
}

async function stopTestServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
  baseUrl = null;
}

module.exports = { startTestServer, stopTestServer };
