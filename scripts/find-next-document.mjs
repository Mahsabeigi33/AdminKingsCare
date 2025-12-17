// scripts/find-next-document.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const exts = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const dirs = ["src", "app", "pages", "components", "lib"]; // adjust if needed

let found = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (exts.has(path.extname(entry.name))) {
      const txt = fs.readFileSync(full, "utf8");
      if (txt.includes("next/document")) {
        const lines = txt.split("\n");
        lines.forEach((line, i) => {
          if (line.includes("next/document")) {
            found.push(`${full}:${i + 1} -> ${line.trim()}`);
          }
        });
      }
    }
  }
}

for (const d of dirs) {
  const p = path.join(ROOT, d);
  if (fs.existsSync(p)) walk(p);
}

if (found.length) {
  console.error("❌ Found forbidden import 'next/document' in:");
  for (const f of found) console.error("   ", f);
  process.exit(1);
} else {
  console.log("✅ No 'next/document' import found.");
}
