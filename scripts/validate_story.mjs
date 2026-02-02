// scripts/validate_story.mjs
// VerseCraft Creator — Phase 1 CLI
//
// Usage:
//   node scripts/validate_story.mjs path/to/story.json
//   npm run validate -- path/to/story.json

import fs from "node:fs";
import path from "node:path";
import { normalize_story } from "../src/core/normalize_story.js";
import { audit_story } from "../src/core/audit_story.js";

function usage() {
  console.log("Usage: npm run validate -- path/to/story.json");
}

function read_json_file(fp) {
  const raw = fs.readFileSync(fp, "utf8");
  return JSON.parse(raw);
}

function print_summary(summary) {
  console.log("");
  console.log("Summary");
  console.log("-------");
  console.log(`Scenes:      ${summary.scenes}`);
  console.log(`Reachable:   ${summary.reachable}`);
  console.log(`Cycles:      ${summary.cycles}`);
  console.log(`Errors:      ${summary.errors}`);
  console.log(`Warnings:    ${summary.warnings}`);
  console.log(`Info:        ${summary.infos}`);
  console.log("");
}

function print_issues(issues) {
  if (!issues.length) {
    console.log("No issues found.");
    return;
  }

  const order = { error: 0, warn: 1, info: 2 };
  const sorted = [...issues].sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));

  for (const it of sorted) {
    const whereParts = [];
    if (it.scene) whereParts.push(`scene=${it.scene}`);
    if (it.choice) whereParts.push(`choice=${it.choice}`);
    const where = whereParts.length ? ` (${whereParts.join(", ")})` : "";
    console.log(`[${it.severity.toUpperCase()}] ${it.code}${where}: ${it.message}`);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const fileArg = argv[0];

  if (!fileArg) {
    usage();
    process.exit(2);
  }

  const fp = path.resolve(process.cwd(), fileArg);

  if (!fs.existsSync(fp)) {
    console.error(`File not found: ${fp}`);
    process.exit(2);
  }

  let raw;
  try {
    raw = read_json_file(fp);
  } catch (e) {
    console.error("Failed to read/parse JSON:", e?.message || e);
    process.exit(2);
  }

  const normalized = normalize_story(raw);
  if (!normalized) {
    console.error("Normalization failed: story is not an object.");
    process.exit(1);
  }

  const { issues, summary } = audit_story(normalized);

  console.log(`VerseCraft Creator — Validate Story`);
  console.log(`File: ${fp}`);

  print_issues(issues);
  print_summary(summary);

  const hasErrors = issues.some((i) => i.severity === "error");
  process.exit(hasErrors ? 1 : 0);
}

main().catch((e) => {
  console.error("Unexpected failure:", e?.message || e);
  process.exit(2);
});
