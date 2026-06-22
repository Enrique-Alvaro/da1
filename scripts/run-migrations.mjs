#!/usr/bin/env node
/**
 * Applies database/migrations/*.sql in numeric order via sqlcmd.
 * Connection: SQLSERVER_CONNECTION_STRING in apps/api/.env, or env vars / CLI flags.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const migrationsDir = join(repoRoot, 'database', 'migrations');

function parseArgs(argv) {
  const out = { dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') out.dryRun = true;
    else if (arg === '-S' || arg === '--server') out.server = argv[++i];
    else if (arg === '-d' || arg === '--database') out.database = argv[++i];
    else if (arg === '-U' || arg === '--user') out.user = argv[++i];
    else if (arg === '-P' || arg === '--password') out.password = argv[++i];
    else if (arg === '-h' || arg === '--help') out.help = true;
  }
  return out;
}

function loadDotEnv(path) {
  if (!existsSync(path)) return {};
  const vars = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return vars;
}

function parseConnectionString(raw) {
  const parts = Object.fromEntries(
    raw
      .split(';')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const eq = p.indexOf('=');
        return [p.slice(0, eq).trim().toLowerCase(), p.slice(eq + 1).trim()];
      })
  );
  const server = parts.server ?? parts['data source'];
  const database = parts.database ?? parts['initial catalog'];
  const user = parts['user id'] ?? parts.uid ?? parts.user;
  const password = parts.password ?? parts.pwd;
  if (!server || !database || !user || !password) {
    throw new Error('SQLSERVER_CONNECTION_STRING is missing Server, Database, User Id, or Password.');
  }
  return { server, database, user, password };
}

function resolveConfig(args) {
  const envFile = loadDotEnv(join(repoRoot, 'apps', 'api', '.env'));
  const fromString = process.env.SQLSERVER_CONNECTION_STRING ?? envFile.SQLSERVER_CONNECTION_STRING;
  const parsed = fromString ? parseConnectionString(fromString) : {};

  return {
    server: args.server ?? process.env.DB_HOST ?? parsed.server ?? 'localhost,1433',
    database: args.database ?? process.env.DB_NAME ?? parsed.database ?? 'CrownBid',
    user: args.user ?? process.env.DB_USER ?? parsed.user ?? 'sa',
    password: args.password ?? process.env.DB_PASSWORD ?? parsed.password,
  };
}

function listMigrationFiles() {
  return readdirSync(migrationsDir)
    .filter((name) => /^\d{3}_.+\.sql$/i.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((name) => join(migrationsDir, name));
}

function runSqlcmd(config, inputFile) {
  const result = spawnSync(
    'sqlcmd',
    ['-S', config.server, '-d', config.database, '-U', config.user, '-P', config.password, '-C', '-i', inputFile],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  );
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(`sqlcmd failed for ${inputFile}${detail ? `:\n${detail}` : ''}`);
  }
  return [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
}

function printHelp() {
  console.log(`Usage: node scripts/run-migrations.mjs [options]

Applies database/migrations/*.sql in order (idempotent scripts).

Options:
  -S, --server     SQL Server host (default: from apps/api/.env)
  -d, --database   Database name
  -U, --user       Login user
  -P, --password   Login password
  --dry-run        List files without executing
  -h, --help       Show this help
`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const config = resolveConfig(args);
  const files = listMigrationFiles();
  if (files.length === 0) {
    console.error('No migration files found in database/migrations/');
    process.exit(1);
  }

  console.log(`Target: ${config.server} / ${config.database} (${files.length} migration file(s))`);
  for (const file of files) {
    const label = file.replace(`${repoRoot}/`, '');
    if (args.dryRun) {
      console.log(`[dry-run] ${label}`);
      continue;
    }
    process.stdout.write(`Applying ${label}... `);
    const output = runSqlcmd(config, file);
    console.log('ok');
    if (output) console.log(output);
  }
  if (!args.dryRun) {
    console.log('Migrations complete.');
  }
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
