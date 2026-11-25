import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { database } from '../src/config/database.js';
import app from '../src/app.js';

test('public report listings include Lost and Found reports without private fields', async () => {
  const reports = [
    {
      id: 11,
      report_type: 'LOST',
      title: 'Lost calculator',
      description: 'Black scientific calculator.',
      category: 'Electronics',
      location: 'Science Building',
      event_date: '2026-11-18',
      photo_path: null,
      status: 'OPEN',
      created_at: '2026-11-18T12:00:00.000Z'
    },
    {
      id: 12,
      report_type: 'FOUND',
      title: 'Found notebook',
      description: 'A lined notebook.',
      category: 'Books',
      location: 'Main Library',
      event_date: '2026-11-17',
      photo_path: null,
      status: 'RETURNED',
      created_at: '2026-11-18T11:00:00.000Z'
    }
  ];
  let listingQuery = '';
  const executeMock = mock.method(database, 'execute', async (sql, values = []) => {
    listingQuery = sql;
    assert.deepEqual(values, []);
    return [reports, []];
  });

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    const response = await fetch(`${base}/api/reports/public`);
    assert.equal(response.status, 200);

    const payload = await response.json();
    assert.deepEqual(payload.reports.map((report) => report.report_type), ['LOST', 'FOUND']);
    assert.deepEqual(payload.reports[0], reports[0]);
    assert.match(listingQuery, /WHERE r\.status <> 'CLOSED'/);
    assert.match(listingQuery, /DATE_FORMAT\(r\.event_date, '%Y-%m-%d'\) AS event_date/);
    assert.doesNotMatch(listingQuery, /reporter_name|identifying_details/);

    const privateResponse = await fetch(`${base}/api/reports/mine`);
    assert.equal(privateResponse.status, 401, 'existing private report routes remain authenticated');
    assert.equal(executeMock.mock.callCount(), 2, 'public listing checks photo-column compatibility before querying reports');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    mock.restoreAll();
  }
});

test('public report details return the requested open report without authentication', async () => {
  const report = {
    id: 21,
    report_type: 'LOST',
    title: 'Lost student card',
    description: 'Blue student card.',
    category: 'Accessories',
    location: 'Library',
    event_date: '2026-11-20',
    photo_path: null,
    status: 'OPEN',
    created_at: '2026-11-20T12:00:00.000Z'
  };
  const executeMock = mock.method(database, 'execute', async (sql, values = []) => {
    if (String(sql).includes('information_schema.COLUMNS')) return [[{ present: 1 }], []];
    assert.deepEqual(values, [21]);
    assert.match(sql, /WHERE r\.id = \? AND r\.status <> 'CLOSED'/);
    assert.doesNotMatch(sql, /reporter_name|full_name|JOIN users/i);
    return [[report], []];
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    const response = await fetch(`${base}/api/reports/public/21`);
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).report, report);
    assert.equal(executeMock.mock.callCount(), 2);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    mock.restoreAll();
  }
});
