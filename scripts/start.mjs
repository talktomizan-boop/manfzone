#!/usr/bin/env node
/**
 * Render-friendly start script.
 *
 * Why this exists:
 * - Render always injects PORT, but local environments sometimes don't.
 * - Using a Node script avoids shell-specific env expansion differences.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import process from "node:process";

const port = Number.parseInt(process.env.PORT || "3000", 10);
const host = process.env.HOST || "0.0.0.0";

const args = [
  "./build/server/index.js",
  "--host",
  host,
  "--port",
  String(Number.isFinite(port) ? port : 3000),
];

// Resolve the CLI entry directly instead of relying on `node_modules/.bin`.
// IMPORTANT: Do not deep-resolve `@react-router/serve/bin.js` because it may be
// blocked by the package "exports" map (ERR_PACKAGE_PATH_NOT_EXPORTED). Instead,
// read the on-disk package.json "bin" field and execute the declared file.
const require = createRequire(import.meta.url);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function findPackageRootFromEntry(entryFile, expectedName) {
  let dir = path.dirname(entryFile);
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
        throw new Error(`${pkgName} package.json has an empty "bin" object.`);
      }
      rel = bin[keys[0]];
    }
  } else {
    throw new Error(`${pkgName} does not declare a "bin" entry in package.json.`);
  }

  const abs = path.resolve(rootDir, rel);
  if (!fs.existsSync(abs)) {
    throw new Error(
      `${pkgName} declares bin ${JSON.stringify(rel)} but it does not exist on disk: ${abs}`,
    );
  }
  return abs;
}

let serveBin;
try {
  serveBin = resolveBinFile("@react-router/serve", "react-router-serve");
} catch (err) {
  console.error(
    "\n[start] Unable to locate the React Router serve CLI from @react-router/serve.\n" +
      "Make sure dependencies are installed correctly.\n",
  );
  console.error(err);
  process.exit(1);
}

const child = spawn(process.execPath, [serveBin, ...args], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
