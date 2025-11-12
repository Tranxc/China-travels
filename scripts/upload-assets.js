#!/usr/bin/env node
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const sourceArg = process.argv[2] || 'assets';
const bucketArg = process.argv[3];
const bucket = bucketArg || process.env.R2_BUCKET || process.env.R2_BUCKET_NAME || 'china-travels';
const prefix = process.env.R2_PREFIX || '';
const wranglerBin = process.env.WRANGLER_BIN || 'wrangler';
const prefixNormalized = prefix.replace(/\\/g, '/').replace(/\/+$/, '');
const withPrefix = prefixNormalized ? prefixNormalized + '/' : '';
const sourceDir = path.resolve(root, sourceArg);
const isWindows = process.platform === 'win32';
const forceShell = process.env.WRANGLER_USE_SHELL === '1';
const extraFlags = (process.env.WRANGLER_FLAGS || '')
    .split(/\s+/)
    .map(flag => flag.trim())
    .filter(Boolean);
if (process.env.R2_REMOTE === '1' && !extraFlags.includes('--remote')) {
    extraFlags.push('--remote');
}

function buildCommandArgs(args) {
    if (isWindows && !forceShell) {
        return { command: 'cmd', args: ['/c', wranglerBin, ...args], shell: false };
    }
    return { command: wranglerBin, args, shell: forceShell };
}

async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const resolved = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...await walk(resolved));
        } else if (entry.isFile()) {
            files.push(resolved);
        }
    }
    return files;
}

function uploadFile(filePath, key) {
    const target = bucket + '/' + key;
    console.log('[upload-assets] -> ' + target);
    const args = ['r2', 'object', 'put', target, '--file', filePath, ...extraFlags];
    const { command, args: fullArgs, shell } = buildCommandArgs(args);
    console.log('[upload-assets] exec:', command, fullArgs.join(' '));
    const result = spawnSync(command, fullArgs, {
        stdio: 'inherit',
        shell,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
        throw new Error('wrangler exited with code ' + result.status + ' while uploading ' + key);
    }
}

async function main() {
    console.log('[upload-assets] Source: ' + sourceDir);
    console.log('[upload-assets] Bucket: ' + bucket);
    const files = await walk(sourceDir);
    if (!files.length) {
        console.log('[upload-assets] No files found, exiting.');
        return;
    }
    for (const file of files) {
        const rel = path.relative(sourceDir, file).replace(/\\/g, '/');
        const key = withPrefix + rel;
        uploadFile(file, key);
    }
    console.log('[upload-assets] Uploaded ' + files.length + ' files.');
}

main().catch((error) => {
    console.error('[upload-assets] Failed:', error && error.message ? error.message : error);
    process.exit(1);
});
