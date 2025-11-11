import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SCENES } from './scenes-data.js';

const USE_REMOTE = process.argv.includes('--remote') || process.env.D1_REMOTE === '1';
const D1_DATABASE = process.env.D1_DATABASE || 'china_travel_db';

function escapeSql(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildInsertSql(rows) {
  const columns = ['slug', 'name', 'summary', 'cover_url', 'province'];
  const values = rows
    .map(row => {
      const tuple = columns.map(col => escapeSql(row[col] ?? null)).join(', ');
      return `(${tuple})`;
    })
    .join(',\n');

  return `
    INSERT INTO scenes (${columns.join(', ')})
    VALUES ${values}
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      summary = excluded.summary,
      cover_url = excluded.cover_url,
      province = excluded.province;
    `.trim();
}

function executeSqlFromFile(sql) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seed-scenes-'));
  const tmpFile = path.join(tmpDir, `batch-${Date.now()}.sql`);
  fs.writeFileSync(tmpFile, sql, { encoding: 'utf8' });

  const cli = process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler';
  const args = ['d1', 'execute', D1_DATABASE, '--file', tmpFile];
  if (USE_REMOTE) args.push('--remote');
  const result = spawnSync(cli, args, {
    stdio: 'inherit',
    // 在 Windows 下通过 shell 执行 .cmd 可更稳定
    shell: process.platform === 'win32',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`wrangler exited with code ${result.status}`);
  }

  try {
    fs.unlinkSync(tmpFile);
    fs.rmdirSync(tmpDir);
  } catch {
    // ignore cleanup errors
  }
}

function executeSqlRemoteByCommand(sql) {
  // 逐条通过 --command 执行（远端更稳定）
  const cli = process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler';
  const args = ['d1', 'execute', D1_DATABASE, '--remote', '--yes', '--command', sql];
  const result = spawnSync(cli, args, {
    stdio: 'inherit',
    // 在 Windows 下通过 shell 执行 .cmd 更稳定
    shell: process.platform === 'win32',
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`wrangler exited with code ${result.status}`);
  }
}

function main() {
  if (!SCENES.length) {
    console.log('No scenes to seed, exiting.');
    return;
  }

  // 批量写入，避免命令过长
  const BATCH_SIZE = 60;
  console.log(`[seed-scenes] Seeding ${SCENES.length} scenes into ${D1_DATABASE} ${USE_REMOTE ? '(remote)' : '(local)'} (batch size: ${BATCH_SIZE})`);
  for (let i = 0; i < SCENES.length; i += BATCH_SIZE) {
    const batch = SCENES.slice(i, i + BATCH_SIZE);

    if (USE_REMOTE) {
      console.log(`[seed-scenes] Executing batch ${Math.floor(i / BATCH_SIZE) + 1} with ${batch.length} rows (remote, per-file per-row)...`);
      for (const row of batch) {
        const stmt = buildInsertSql([row]); 
        executeSqlFromFile(stmt);
      }
    } else {
      const sql = ['BEGIN TRANSACTION;', buildInsertSql(batch), 'COMMIT;'].join('\n');
      console.log(`[seed-scenes] Executing batch ${Math.floor(i / BATCH_SIZE) + 1} with ${batch.length} rows...`);
      executeSqlFromFile(sql);
    }
  }
  console.log('[seed-scenes] Done.');
}

main();



