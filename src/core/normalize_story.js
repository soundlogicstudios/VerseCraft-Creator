// src/core/normalize_story.js
// VerseCraft Creator — Phase 1
// Normalizes multiple input schemas into the VerseCraft runtime-friendly shape.
// Output shape: { ...raw, start: "S01", scenes: { [id]: { id, text, options:[{label,to}] } } }

function pick_text(node) {
  return node?.text ?? node?.body ?? node?.narrative ?? node?.content ?? "";
}

function normalize_choice(ch) {
  if (typeof ch === "string") {
    const label = ch.trim();
    return label ? { label, to: "" } : null;
  }
  if (!ch || typeof ch !== "object") return null;

  const label = String(ch.label ?? ch.text ?? ch.title ?? ch.name ?? "").trim();
  const to = String(ch.to ?? ch.next ?? ch.go ?? ch.target ?? ch.id ?? "").trim();

  if (!label && !to) return null;
  return { label: label || "Continue", to };
}

function normalize_node(id, node) {
  const text = pick_text(node);
  const rawChoices = node?.options ?? node?.choices ?? node?.choice ?? node?.links ?? [];
  const arr = Array.isArray(rawChoices) ? rawChoices : [];
  const options = arr.map(normalize_choice).filter(Boolean);
  return { id, text, options, _raw: node ?? null };
}

function normalize_from_scenes_object(raw, scenesObj) {
  const scenes = {};
  for (const [id, node] of Object.entries(scenesObj || {})) {
    const sid = String(id || "").trim();
    if (!sid) continue;
    scenes[sid] = normalize_node(sid, node);
  }
  const start = String(raw.start ?? raw.entry ?? raw.begin ?? raw.root ?? "S01").trim() || "S01";
  return { ...raw, start, scenes };
}

function normalize_from_sections_array(raw, sectionsArr) {
  const scenes = {};
  for (const sec of (Array.isArray(sectionsArr) ? sectionsArr : [])) {
    const id = String(sec?.id ?? sec?.key ?? sec?.name ?? "").trim();
    if (!id) continue;
    scenes[id] = normalize_node(id, sec);
  }
  const start = String(raw.start ?? raw.entry ?? raw.begin ?? raw.root ?? "S01").trim() || "S01";
  return { ...raw, start, scenes };
}

/**
 * Normalize a raw story object into VerseCraft runtime-friendly structure.
 * @param {any} raw
 * @returns {{start:string, scenes: Record<string, any>}|null}
 */
export function normalize_story(raw) {
  if (!raw || typeof raw !== "object") return null;

  if (raw.scenes && typeof raw.scenes === "object" && !Array.isArray(raw.scenes)) {
    return normalize_from_scenes_object(raw, raw.scenes);
  }

  if (raw.nodes && typeof raw.nodes === "object" && !Array.isArray(raw.nodes)) {
    return normalize_from_scenes_object(raw, raw.nodes);
  }

  if (Array.isArray(raw.sections)) {
    return normalize_from_sections_array(raw, raw.sections);
  }

  // Fallback: still provide a valid shape
  const start = String(raw.start ?? raw.entry ?? raw.begin ?? raw.root ?? "S01").trim() || "S01";
  return { ...raw, start, scenes: {} };
}

/**
 * Convenience: normalize and also return a stable array of scene IDs.
 */
export function list_scene_ids(normalized) {
  const scenes = normalized?.scenes && typeof normalized.scenes === "object" ? normalized.scenes : {};
  return Object.keys(scenes).sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
}
