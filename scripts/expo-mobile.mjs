#!/usr/bin/env node
/**
 * Ejecuta Expo desde apps/mobile (no desde la raíz del monorepo).
 * Uso: node scripts/expo-mobile.mjs start --ios
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileDir = path.resolve(__dirname, '../apps/mobile');
const args = process.argv.slice(2);

const child = spawn('npx', ['expo', ...args], {
  cwd: mobileDir,
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => process.exit(code ?? 0));
