import 'dotenv/config';
import app from './src/app.js';

const requiredEnvironment = [
  'PORT',
  'FRONTEND_ORIGIN',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET'
];
const missingEnvironment = requiredEnvironment.filter(
  (name) => !process.env[name]?.trim()
);

if (missingEnvironment.length > 0) {
  console.error(
    `Missing required environment variables: ${missingEnvironment.join(', ')}`
  );
  process.exit(1);
}

const port = Number(process.env.PORT);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('PORT must be an integer between 1 and 65535.');
  process.exit(1);
}

app.listen(port, '0.0.0.0', () => {
  console.log(`UCU Lost and Found API listening on port ${port}`);
});
