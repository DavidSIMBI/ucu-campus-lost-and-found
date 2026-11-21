import assert from 'node:assert/strict';
import test from 'node:test';
import app from '../src/app.js';

test('CORS allows the configured frontend origin and required API headers only', async (context) => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  context.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const allowedPreflight = await fetch(`${baseUrl}/api/admin/dashboard`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:5173',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'authorization,content-type'
    }
  });

  assert.equal(allowedPreflight.status, 204);
  assert.equal(allowedPreflight.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  assert.match(allowedPreflight.headers.get('access-control-allow-methods') || '', /GET/);
  assert.match(allowedPreflight.headers.get('access-control-allow-headers') || '', /authorization/i);
  assert.match(allowedPreflight.headers.get('access-control-allow-headers') || '', /content-type/i);
  assert.equal(allowedPreflight.headers.get('access-control-allow-credentials'), null);

  const unapprovedPreflight = await fetch(`${baseUrl}/api/admin/dashboard`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://unapproved.example',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'authorization'
    }
  });

  assert.equal(unapprovedPreflight.headers.get('access-control-allow-origin'), null);
});
