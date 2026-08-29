#!/usr/bin/env node
// Validate skills/ against the same rules the hubsidian server enforces at
// build time (hubsidian repo: scripts/build-skills.mjs, mirroring
// src/skills/store.ts) plus the Agent Skills frontmatter spec. This repo is
// the single source of truth for distributed skills; the server vendors it as
// a git submodule, so a violation here would otherwise only surface at server
// deploy time. Run in CI and before bumping the submodule.
//
//   node scripts/validate-skills.mjs

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = join(ROOT, "skills");

const SKILL_NAME_RE = /^[a-z0-9][a-z0-9_-]*$/;
const MAX_SKILL_NAME_LEN = 64;
const MAX_SKILL_FILE_BYTES = 1024 * 1024;
const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "pdf",
  "zip", "gz", "tar", "woff", "woff2", "ttf", "otf",
  "mp3", "mp4", "mov", "webm", "wasm",
]);
const IGNORED_FILES = new Set([".DS_Store", "Thumbs.db", ".gitkeep"]);

// Top-level frontmatter keys the Agent Skills spec allows. Anything else is a
// hard error when publishing through the Skills API, so it is a hard error
// here too. Custom flags belong under `metadata:`.
const ALLOWED_FRONTMATTER_KEYS = new Set([
  "name", "description", "metadata", "license", "compatibility", "allowed-tools",
]);

const problems = [];

function extOf(path) {
  const i = path.lastIndexOf(".");
  return i === -1 ? "" : path.slice(i + 1).toLowerCase();
}

// Minimal top-level YAML key scan — enough to enforce the spec allowlist
// without a YAML dependency. Frontmatter must be the first thing in the file.
function checkFrontmatter(name, content) {
  const lines = content.split("\n");
  if (lines[0] !== "---") {
    problems.push(`skills/${name}/SKILL.md: missing YAML frontmatter`);
    return;
  }
  const end = lines.indexOf("---", 1);
  if (end === -1) {
    problems.push(`skills/${name}/SKILL.md: unterminated frontmatter`);
    return;
  }
  const keys = [];
  for (const line of lines.slice(1, end)) {
    const m = /^([A-Za-z0-9_-]+):/.exec(line);
    if (m) keys.push(m[1]);
  }
  for (const key of keys) {
    if (!ALLOWED_FRONTMATTER_KEYS.has(key)) {
      problems.push(
        `skills/${name}/SKILL.md: top-level frontmatter key "${key}" is outside the Agent Skills spec — move it under metadata:`,
      );
    }
  }
  if (!keys.includes("name")) problems.push(`skills/${name}/SKILL.md: frontmatter has no name`);
  if (!keys.includes("description")) problems.push(`skills/${name}/SKILL.md: frontmatter has no description`);
  const nameLine = lines.slice(1, end).find((l) => l.startsWith("name:"));
  if (nameLine) {
    const declared = nameLine.slice("name:".length).trim();
    if (declared && declared !== name) {
      problems.push(`skills/${name}/SKILL.md: frontmatter name "${declared}" does not match directory name`);
    }
  }
}

if (!existsSync(SKILLS_DIR)) {
  console.error("error: skills/ directory not found");
  process.exit(1);
}

let skillCount = 0;
for (const entry of readdirSync(SKILLS_DIR, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
  // Top-level files (e.g. skills/README.md) document the directory itself.
  if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
  const name = entry.name;
  if (!SKILL_NAME_RE.test(name) || name.length > MAX_SKILL_NAME_LEN) {
    problems.push(`skills/${name}: invalid skill name (allowed: ${SKILL_NAME_RE}, max ${MAX_SKILL_NAME_LEN} chars)`);
    continue;
  }

  const skillDir = join(SKILLS_DIR, name);
  let hasSkillMd = false;
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (e.name.startsWith(".") || IGNORED_FILES.has(e.name)) continue;
      const abs = join(dir, e.name);
      if (e.isDirectory()) { walk(abs); continue; }
      if (!e.isFile()) continue;
      const path = relative(skillDir, abs).split("\\").join("/");
      const size = statSync(abs).size;
      if (BINARY_EXTENSIONS.has(extOf(path))) {
        problems.push(`skills/${name}/${path}: binary file types are not served by the hub yet`);
        continue;
      }
      if (size > MAX_SKILL_FILE_BYTES) {
        problems.push(`skills/${name}/${path}: ${size} bytes exceeds the ${MAX_SKILL_FILE_BYTES}-byte cap`);
        continue;
      }
      if (path === "SKILL.md") {
        hasSkillMd = true;
        checkFrontmatter(name, readFileSync(abs, "utf8"));
      }
    }
  };
  walk(skillDir);

  if (!hasSkillMd) {
    problems.push(`skills/${name}: no SKILL.md — a directory without one is not a skill`);
    continue;
  }
  skillCount += 1;
}

if (skillCount === 0) {
  problems.push("skills/: no skills found — an empty plugin is almost certainly a mistake");
}

if (problems.length) {
  for (const p of problems) console.error(`error: ${p}`);
  process.exit(1);
}
console.log(`skills: ok (${skillCount} skill(s))`);
