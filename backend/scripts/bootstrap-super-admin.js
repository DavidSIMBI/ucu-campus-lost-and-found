import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { database } from '../src/config/database.js';
import { bootstrapFirstSuperAdmin } from '../src/services/admin-management.service.js';

async function readHiddenPassword(prompt) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new Error('Run this command in an interactive terminal to enter the password securely.');
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
          reject(new Error('Super Admin bootstrap cancelled.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          cleanup();
          resolve(password);
          return;
        }
        if (character === '\u007f' || character === '\b') password = password.slice(0, -1);
        else if (character >= ' ') password += character;
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
    fullName = (await prompt.question('First Super Admin full name: ')).trim();
    email = (await prompt.question('First Super Admin email: ')).trim().toLowerCase();
  } finally {
    prompt.close();
  }

  const password = await readHiddenPassword('Super Admin password (8-128 characters): ');
  const admin = await bootstrapFirstSuperAdmin({ fullName, email, password });
  stdout.write(`First Super Admin account created (user ${admin.id}).\n`);
}

try {
  await main();
} catch (error) {
  if (error.code === 'ER_DUP_ENTRY') {
    stdout.write('An account with that email already exists. No existing account was changed.\n');
  } else {
    stdout.write(`${error.message}\n`);
  }
  process.exitCode = 1;
} finally {
  await database.end();
}
