// Simple Jest tests for `src/services/api.js` to exercise environment-resolution
// branches (import.meta via eval, process.env, globalThis, default) and the
// console logging path. These tests are intentionally small and only touch
// the module under test; they do not modify other source files.

describe('services/api environment resolution', () => {
  const modulePath = './api';
  let originalEval;
  let originalWindow;
  let originalGlobalVite;
  let originalProcessEnv;

  beforeAll(() => {
    originalEval = global.eval;
    originalWindow = global.window;
    originalGlobalVite = global.VITE_API_ROOT;
    originalProcessEnv = { ...process.env };
  });

  afterEach(() => {
    // restore eval
    global.eval = originalEval;

    // restore window
    if (typeof originalWindow === 'undefined') delete global.window;
    else global.window = originalWindow;

    // restore global VITE_API_ROOT
    if (typeof originalGlobalVite === 'undefined') delete global.VITE_API_ROOT;
    else global.VITE_API_ROOT = originalGlobalVite;

    // restore process.env
    Object.keys(process.env).forEach(k => {
      if (!(k in originalProcessEnv)) delete process.env[k];
    });
    Object.keys(originalProcessEnv).forEach(k => {
      process.env[k] = originalProcessEnv[k];
    });

    jest.resetModules();
  });

  test('uses import.meta via eval when available', () => {
    global.eval = jest.fn(() => 'http://importmeta:1234');
    delete process.env.VITE_API_ROOT;
    delete global.VITE_API_ROOT;
    delete global.window;

    const mod = require(modulePath);
    expect(mod.API_ROOT).toBe('http://importmeta:1234');
    expect(mod.API).toBe('http://importmeta:1234/api');
  });

  test('falls back to process.env when eval throws', () => {
    global.eval = jest.fn(() => { throw new Error('no import.meta'); });
    process.env.VITE_API_ROOT = 'http://processenv:5001';
    delete global.VITE_API_ROOT;
    delete global.window;

    const mod = require(modulePath);
    expect(mod.API_ROOT).toBe('http://processenv:5001');
    expect(mod.API).toBe('http://processenv:5001/api');
  });

  test('uses globalThis when process.env absent and eval throws', () => {
    global.eval = jest.fn(() => { throw new Error('no import.meta'); });
    delete process.env.VITE_API_ROOT;
    global.VITE_API_ROOT = 'http://globalthis:6000';
    delete global.window;

    const mod = require(modulePath);
    expect(mod.API_ROOT).toBe('http://globalthis:6000');
    expect(mod.API).toBe('http://globalthis:6000/api');
  });

  test('defaults to localhost:5000 when no sources', () => {
    global.eval = jest.fn(() => { throw new Error('no import.meta'); });
    delete process.env.VITE_API_ROOT;
    delete global.VITE_API_ROOT;
    delete global.window;

    const mod = require(modulePath);
    expect(mod.API_ROOT).toBe('http://localhost:5000');
    expect(mod.API).toBe('http://localhost:5000/api');
  });

  test('logs API_ROOT to window.console.log when window exists', () => {
    global.eval = jest.fn(() => 'http://logged:7000');
    delete process.env.VITE_API_ROOT;
    delete global.VITE_API_ROOT;
    const mockLog = jest.fn();
    global.window = { console: { log: mockLog } };

    const mod = require(modulePath);
    expect(mod.API_ROOT).toBe('http://logged:7000');
    expect(mockLog).toHaveBeenCalledWith('[API] Using API_ROOT =', 'http://logged:7000');
  });
});
