import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import bcrypt from 'bcryptjs';
import { database } from '../src/config/database.js';

const emailPattern = /^\S+@\S+\.\S+$/;

async function readHiddenPassword(prompt) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new Error('Run this command in an interactive terminal to enter the admin password securely.');
  }

  stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();

  return new Promise((resolve, reject) => {
    let password = '';

    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      stdout.write('\n');
    };

    const onData = (chunk) => {
      for (const character of chunk.toString('utf8')) {
        if (character === '\u0003') {
          cleanup();
          reject(new Error('Admin account setup cancelled.'));
          return;
        }

        if (character === '\r' || character === '\n') {
          cleanup();
          resolve(password);
          return;
        }

        if (character === '\u007f' || character === '\b') {
          password = password.slice(0, -1);
        } else if (character >= ' ') {
          password += character;
        }
      }
    };

    stdin.on('data', onData);
  });
}

async function main() {
  const prompt = createInterface({ input: stdin, output: stdout });
  let fullName;
  let email;

  try {
    fullName = (await prompt.question('Administrator full name: ')).trim();
    email = (await prompt.question('Administrator email: ')).trim().toLowerCase();
  } finally {
    prompt.close();
  }

  if (fullName.length < 2 || fullName.length > 120) {
    throw new Error('Name must be between 2 and 120 characters.');
  }

  if (!emailPattern.test(email) || email.length > 254) {
    throw new Error('Enter a valid email address.');
  }

  const password = await readHiddenPassword('Administrator password (8–128 characters): ');
  if (password.length < 8 || password.length > 128) {
    throw new Error('Password must be between 8 and 128 characters.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [result] = await database.execute(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES (?, ?, ?, 'ADMIN')`,
    [fullName, email, passwordHash]
  );

  stdout.write(`Administrator account created for ${email} (user ${result.insertId}).\n`);
}

try {
  await main();
} catch (error) {
  if (error.code === 'ER_DUP_ENTRY') {
    stdout.write('An account with that email already exists. Use a different email or promote the account through an authorized database administrator.\n');
    process.exitCode = 1;
  } else {
    stdout.write(`${error.message}\n`);
    process.exitCode = 1;
  }
} finally {
  await database.end();
}
