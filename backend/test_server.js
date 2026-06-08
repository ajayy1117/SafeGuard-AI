const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = 5001;
const BASE_URL = `http://localhost:${PORT}`;
const DB_FILE = path.join(__dirname, 'database_test.sqlite');

test('Backend Integration Tests', async (t) => {
  let serverProcess;

  // 1. Setup Phase: Start Backend Server
  await t.test('Start server on port 5001', async () => {
    // Ensure clean DB before test
    if (fs.existsSync(DB_FILE)) {
      fs.unlinkSync(DB_FILE);
    }

    serverProcess = spawn('node', ['server.js'], {
      cwd: __dirname,
      env: {
        ...process.env,
        PORT: PORT.toString(),
        NODE_ENV: 'test',
        JWT_SECRET: 'test_super_secret_key_987'
      }
    });

    // Wait for server to start by checking socket or simple delay
    await new Promise((resolve, reject) => {
      let started = false;
      const timeout = setTimeout(() => {
        if (!started) {
          serverProcess.kill();
          reject(new Error('Server start timeout'));
        }
      }, 5000);

      serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`[Server stdout]: ${output.trim()}`);
        if (output.includes('Server running on port')) {
          started = true;
          clearTimeout(timeout);
          resolve();
        }
      });

      serverProcess.stderr.on('data', (data) => {
        console.error(`[Server stderr]: ${data.toString().trim()}`);
      });
    });
  });

  let token = '';
  const testUser = {
    username: `testuser_${Date.now()}`,
    password: 'testpassword123'
  };

  // 2. Test User Registration
  await t.test('POST /api/auth/register - success', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.userId);
  });

  await t.test('POST /api/auth/register - duplicate user fails', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'Username already exists');
  });

  // 3. Test User Login
  await t.test('POST /api/auth/login - valid credentials', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.token);
    assert.strictEqual(data.username, testUser.username);
    token = data.token; // Save token for authenticated requests
  });

  await t.test('POST /api/auth/login - invalid credentials', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUser.username,
        password: 'wrongpassword'
      })
    });
    
    assert.strictEqual(res.status, 401);
  });

  // 4. Test Unauthenticated Requests
  await t.test('GET /api/violations - fails without auth token', async () => {
    const res = await fetch(`${BASE_URL}/api/violations`);
    assert.strictEqual(res.status, 401);
  });

  await t.test('POST /api/violations - fails without auth token', async () => {
    const res = await fetch(`${BASE_URL}/api/violations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_data: 'data:image/png;base64,mockImage',
        confidence: 0.85,
        description: 'Test violation log'
      })
    });
    assert.strictEqual(res.status, 401);
  });

  // 5. Test Authenticated Violation Operations
  let createdViolationId;
  await t.test('POST /api/violations - success with token', async () => {
    const res = await fetch(`${BASE_URL}/api/violations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        image_data: 'data:image/png;base64,mockImage',
        confidence: 0.92,
        description: 'Test violation log with token'
      })
    });
    
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.id);
    assert.strictEqual(data.confidence, 0.92);
    assert.strictEqual(data.description, 'Test violation log with token');
    createdViolationId = data.id;
  });

  await t.test('GET /api/violations - success with token and contains new violation', async () => {
    const res = await fetch(`${BASE_URL}/api/violations`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    const violation = data.find(v => v.id === createdViolationId);
    assert.ok(violation);
    assert.strictEqual(violation.confidence, 0.92);
  });

  // 6. Tear Down Phase: Stop Server and Cleanup Files
  t.after(() => {
    if (serverProcess) {
      serverProcess.kill();
      console.log('Backend server process killed.');
    }
    
    // Attempt to delete test database file after a short delay to release handles
    setTimeout(() => {
      try {
        if (fs.existsSync(DB_FILE)) {
          fs.unlinkSync(DB_FILE);
          console.log('Test database file database_test.sqlite deleted.');
        }
      } catch (err) {
        console.error('Failed to clean up test database file:', err.message);
      }
    }, 1000);
  });
});
