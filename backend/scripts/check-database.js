import 'dotenv/config';
import { database } from '../src/config/database.js';

try {
  const [rows] = await database.execute(
    'SELECT 1 AS connected, DATABASE() AS databaseName'
  );

  console.log(`MySQL connection OK (${rows[0].databaseName}).`);
} catch (error) {
  console.error(`MySQL connection failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await database.end();
}
