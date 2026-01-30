#!/usr/bin/env node
/**
 * CI-style verification runner.
 *
 * Runs:
 *  1) Deployment validation (health/env/supabase connectivity)
 *  2) End-to-end smoke tests (login/cart/wishlist/checkout/order/invoice)
 *
 * Exits non-zero on any failure.
 *
 * Flags:
 *  --skip-validate   Skip deployment validation
 *  --skip-smoke      Skip smoke tests
 *  --validate-only   Run only validation
 *  --smoke-only      Run only smoke tests
 */

import { spawn } from 'node:child_process';
import process from 'node:process';

function run(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: false,
      env: process.env,
    });

    child.on('error', () => resolve(1));
    child.on('close', (code) => resolve(code ?? 1));
  });
}

function usage() {
  console.log(
    'Usage: node scripts/ci-verify.mjs [--skip-validate] [--skip-smoke] [--validate-only] [--smoke-only]'
  );
}

const flags = new Set(process.argv.slice(2));
if (flags.has('-h') || flags.has('--help')) {
  usage();
  process.exit(0);
}

const skipValidate = flags.has('--skip-validate') || flags.has('--smoke-only');
const skipSmoke = flags.has('--skip-smoke') || flags.has('--validate-only');

const node = process.execPath;

let code = 0;

if (!skipValidate) {
  console.log('\n==> Running deploy validation...');
  code = await run(node, ['scripts/validate-deploy.mjs']);
  if (code !== 0) {
    console.error(`Deploy validation failed with exit code ${code}`);
    process.exit(code);
  }
}

if (!skipSmoke) {
  console.log('\n==> Running smoke tests...');
  code = await run(node, ['scripts/smoke-tests.mjs']);
  if (code !== 0) {
    console.error(`Smoke tests failed with exit code ${code}`);
    process.exit(code);
  }
}

console.log('\n✅ Verification complete: all checks passed.');
process.exit(0);
