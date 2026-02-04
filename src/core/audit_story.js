// src/core/audit_story.js
// VerseCraft Creator — Phase 1
// Audits normalized stories for common issues.
// Designed to match your current runtime constraints:
// - only 4 choice pills render (warn if >4 options)
// - choices advance node state; navigation is outside runtime

import { list_scene_ids } from "./normalize_story.js";

/**
 * @typedef {Object} AuditIssue
 * @property {"error"|"warn"|"info"} severity
 * @property {string} code
 * @property {string} message
 * @property {string=} scene
 * @property {string=} choice
 */

function is_nonempty_string(s) {
  return typeof s === "string" && s.trim().length > 0;
}

function push(issues, severity, code, message, extra = {}) {
  issues.push({ severity, code, message, ...extra });
}

function bfs_reachable(startId, scenes) {
  const q = [];
  const seen = new Set();

  if (is_nonempty_string(startId) && scenes[startId]) {
    q.push(startId);
    seen.add(startId);
  }

  while (q.length) {
    const id = q.shift();
    const node = scenes[id];
    const opts = Array.isArray(node?.options) ? node.options : [];
    for (const opt of opts) {
      const to = String(opt?.to ?? "").trim();
      if (!to) continue;
      if (!scenes[to]) continue;
      if (seen.has(to)) continue;
      seen.add(to);
      q.push(to);
    }
  }
  return seen;
}

function detect_cycles(scenes, startId) {
  const reachable = bfs_reachable(startId, scenes);
  const visited = new Set();
  const stack = new Set();
  const cycles = [];

  function dfs(id, path) {
    visited.add(id);
    stack.add(id);

    const opts = Array.isArray(scenes[id]?.options) ? scenes[id].options : [];
    for (const opt of opts) {
      const to = String(opt?.to ?? "").trim();
      if (!to || !scenes[to] || !reachable.has(to)) continue;

      if (!visited.has(to)) {
        dfs(to, path.concat([to]));
      } else if (stack.has(to)) {
        const idx = path.indexOf(to);
        const cyc = idx >= 0 ? path.slice(idx).concat([to]) : [id, to];
        cycles.push(cyc);
      }
    }

    stack.delete(id);
  }

  if (reachable.has(startId)) dfs(startId, [startId]);
  return { reachable, cycles };
}

/**
 * Audit a normalized story.
 * @param {{start:string, scenes: Record<string, any>}} story
 * @returns {{ issues: AuditIssue[], summary: any }}
 */
const MAX_CYCLES_TO_REPORT = 10;

function isEndingType(node){
  const t = String(node?.type ?? "").trim().toLowerCase();
  return t.startsWith("ending");
}

export function audit_story(story) {
  const issues = [];
  const scenes = story?.scenes && typeof story.scenes === "object" ? story.scenes : {};
  const ids = list_scene_ids(story);

  if (!story || typeof story !== "object") {
    push(issues, "error", "E_STORY_NOT_OBJECT", "Story is not an object.");
    return { issues, summary: { scenes: 0, errors: 1, warnings: 0, infos: 0 } };
  }

  if (!is_nonempty_string(story.start)) {
    push(issues, "error", "E_MISSING_START", "Missing or invalid `start` scene id.");
  }

  if (ids.length === 0) {
    push(issues, "error", "E_NO_SCENES", "No scenes found after normalization.");
  }

  if (is_nonempty_string(story.start) && ids.length > 0 && !scenes[story.start]) {
    push(issues, "error", "E_START_NOT_FOUND", "`start` does not exist in scenes.", { scene: story.start });
  }

  for (const id of ids) {
    const node = scenes[id] || {};
    const text = String(node?.text ?? "").trim();
    const opts = Array.isArray(node?.options) ? node.options : [];

    if (!text) push(issues, "warn", "W_EMPTY_TEXT", "Scene text is empty.", { scene: id });

    if (opts.length > 4) {
      push(issues, "warn", "W_TOO_MANY_CHOICES",
        `Scene has ${opts.length} choices; runtime renders only the first 4 pills.`, { scene: id });
    }

    let hasAnyTo = false;
    opts.forEach((opt, idx) => {
      const label = String(opt?.label ?? "").trim();
      const to = String(opt?.to ?? "").trim();
      const choiceRef = `${id}.choice${idx}`;

      if (!label) push(issues, "warn", "W_EMPTY_CHOICE_LABEL", "Choice label is empty.", { scene: id, choice: choiceRef });

      if (to) {
        hasAnyTo = true;
        if (!scenes[to]) {
          push(issues, "error", "E_DANGLING_TO", `Choice points to missing scene "${to}".`, { scene: id, choice: choiceRef });
        }
      }
    });

    if (!hasAnyTo) {
      push(issues, "warn", "W_DEAD_END",
        "Scene has no choices with targets (`to`). If this is an ending, you can ignore this warning for now.",
        { scene: id });
    }
  }

  const startId = String(story.start || "").trim();
  const { reachable, cycles } = detect_cycles(scenes, startId);

  if (is_nonempty_string(startId) && scenes[startId]) {
    for (const id of ids) {
      if (!reachable.has(id)) push(issues, "warn", "W_UNREACHABLE_SCENE", "Scene is unreachable from `start`.", { scene: id });
    }
  }

  if (cycles.length) {
    const preview = cycles.slice(0, MAX_CYCLES_TO_REPORT).map((c) => c.join(" -> "));
    push(issues, "info", "I_CYCLES_DETECTED", `Cycles detected (up to 3 shown): ${preview.join(" | ")}`);
  }

  const summary = {
    scenes: ids.length,
    reachable: reachable.size,
    cycles: cycles.length,
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warn").length,
    infos: issues.filter((i) => i.severity === "info").length,
  };

  return { issues, summary };
}
