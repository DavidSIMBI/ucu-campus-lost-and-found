import mysql from 'mysql2/promise';

// Create this pool when a service needs the database; importing it does not connect.
export const database = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'ucu_lost_and_found',
  user: process.env.DB_USER || 'your_mysql_user',
  password: process.env.DB_PASSWORD || 'your_mysql_password',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
