#!/usr/bin/env node
/**
 * React Router CLI wrapper.
 *
 * Why this exists:
 * - Some CI/build environments can end up without `node_modules/.bin` binaries on PATH
 *   (or without bin links at all), which causes `react-router` to be "not found".
 * - We DO NOT import or `require.resolve()` deep paths like `@react-router/dev/bin.js`
 *   because modern packages frequently use "exports" maps that intentionally block
 *   those subpaths (causing ERR_PACKAGE_PATH_NOT_EXPORTED).
 *
 * Instead, we:
 * 1) resolve the package entry,
 * 2) locate the package root (its on-disk package.json),
 * 3) read its "bin" field,
 * 4) execute the declared CLI file via `node`.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import process from "node:process";

const require = createRequire(import.meta.url);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function findPackageRootFromEntry(entryFile, expectedName) {
  let dir = path.dirname(entryFile);
  // Walk up until we find a package.json that matches the expected name.
  while (true) {
    const pkgJsonPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgJsonPath)) {
      const pkg = readJson(pkgJsonPath);
      if (!expectedName || pkg?.name === expectedName) {
        return { rootDir: dir, pkg };
      }
    }

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`Unable to locate package.json for ${expectedName ?? "package"}`);
}

function resolveBinFile(pkgName, preferredBinName) {
  // Fast path: read directly from ./node_modules/<pkg>/package.json.
  // This avoids any ESM/CJS export condition mismatches and bypasses exports maps entirely.
  const pkgParts = pkgName.startsWith("@") ? pkgName.split("/") : [pkgName];
  const directRoot = path.join(process.cwd(), "node_modules", ...pkgParts);
  const directPkgJson = path.join(directRoot, "package.json");

  let rootDir;
  let pkg;
  if (fs.existsSync(directPkgJson)) {
    rootDir = directRoot;
    pkg = readJson(directPkgJson);
  } else {
    // Fallback: resolve the package's exported entry (allowed even with exports maps)
    // and walk up to its on-disk package.json.
    const entry = require.resolve(pkgName);
    const found = findPackageRootFromEntry(entry, pkgName);
    rootDir = found.rootDir;
    pkg = found.pkg;
  }

  const bin = pkg?.bin;
  let rel;
  if (typeof bin === "string") {
    rel = bin;
  } else if (bin && typeof bin === "object") {
    if (preferredBinName && typeof bin[preferredBinName] === "string") {
      rel = bin[preferredBinName];
    } else {
      const keys = Object.keys(bin);
      if (keys.length === 0) {
        throw new Error(`${pkgName} package.json has an empty \"bin\" object.`);
      }
      rel = bin[keys[0]];
    }
  } else {
    throw new Error(`${pkgName} does not declare a \"bin\" entry in package.json.`);
  }

  const abs = path.resolve(rootDir, rel);
  if (!fs.existsSync(abs)) {
    throw new Error(
      `${pkgName} declares bin ${JSON.stringify(rel)} but it does not exist on disk: ${abs}`,
    );
  }
  return abs;
}

// React Router has moved pieces around across versions; the `react-router` CLI
// is typically provided by `@react-router/dev`, but we keep a small fallback
// list to be resilient.
const candidateBins = [
  { pkg: "@react-router/dev", bin: "react-router" },
  { pkg: "react-router", bin: "react-router" },
];

let cliPath;
let lastErr;
for (const c of candidateBins) {
  try {
    cliPath = resolveBinFile(c.pkg, c.bin);
    break;
  } catch (err) {
    lastErr = err;
  }
}

if (!cliPath) {
  console.error(
    "\n[react-router-cli] Unable to locate the React Router CLI.\n" +
      "Tried: " +
      candidateBins.map((c) => `${c.pkg} (bin: ${c.bin})`).join(", ") +
      "\n",
  );
  if (lastErr) console.error(lastErr);
  process.exit(1);
}

const args = process.argv.slice(2);

const child = spawn(process.execPath, [cliPath, ...args], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
