// src/web/app.js
// VerseCraft Creator — Phase 1 Web Viewer (no-build)

import { normalize_story, list_scene_ids } from "../core/normalize_story.js";
import { audit_story } from "../core/audit_story.js";

const APP_VERSION = "0.1.5";
const APP_PHASE = "Phase 1.5";

const $ = (sel) => document.querySelector(sel);

const el = {
  fileInput: $("#fileInput"),
  metaId: $("#metaId"),
  metaTitle: $("#metaTitle"),
  metaRoute: $("#metaRoute"),
  metaSchema: $("#metaSchema"),
  metaBlurb: $("#metaBlurb"),
  dropzone: $("#dropzone"),
  btnNewTemplate: $("#btnNewTemplate"),
  btnSample: $("#btnSample"),
  btnExport: $("#btnExport"),
  btnAddScene: $("#btnAddScene"),
  btnClear: $("#btnClear"),
  summary: $("#summary"),
  issues: $("#issues"),
  scenesList: $("#scenesList"),
  sceneDetail: $("#sceneDetail"),
};

let STATE = {
  raw: null,
  story: null,
  audit: null,
  activeSceneId: null,
};

function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setMuted(node, muted) {
  if (!node) return;
  node.classList.toggle("muted", !!muted);
}

function renderSummary() {
  const a = STATE.audit?.summary;
  if (!a) {
    el.summary.textContent = "No story loaded.";
    setMuted(el.summary, true);
    return;
  }
  setMuted(el.summary, false);
  el.summary.innerHTML = `
    <div><strong>Scenes</strong>: ${a.scenes} &nbsp; <strong>Reachable</strong>: ${a.reachable} &nbsp; <strong>Cycles</strong>: ${a.cycles}</div>
    <div><strong style="color:var(--err)">Errors</strong>: ${a.errors} &nbsp; <strong style="color:var(--warn)">Warnings</strong>: ${a.warnings} &nbsp; <strong style="color:var(--accent)">Info</strong>: ${a.infos}</div>
  `;
}

function renderIssues() {
  const issues = STATE.audit?.issues ?? [];
  el.issues.innerHTML = "";
  if (!issues.length) {
    el.issues.innerHTML = `<div class="summary">No issues found.</div>`;
    return;
  }
  const order = { error: 0, warn: 1, info: 2 };
  const sorted = [...issues].sort((a,b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));

  for (const it of sorted) {
    const badgeClass = it.severity === "error" ? "err" : it.severity === "warn" ? "warn" : "info";
    const where = [it.scene ? `scene=${it.scene}` : null, it.choice ? `choice=${it.choice}` : null].filter(Boolean).join(", ");
    const div = document.createElement("div");
    div.className = "issue";
    div.style.borderLeftColor = it.severity === "error" ? "var(--err)" : it.severity === "warn" ? "var(--warn)" : "var(--accent)";
    div.innerHTML = `
      <div class="hdr">
        <span class="badge ${badgeClass}">${it.severity.toUpperCase()}</span>
        <span class="code">${escapeHtml(it.code)}</span>
      </div>
      <div class="msg">${escapeHtml(it.message)}</div>
      ${where ? `<div class="where">${escapeHtml(where)}</div>` : ""}
    `;
    el.issues.appendChild(div);
  }
}

function renderScenesList() {
  const story = STATE.story;
  if (!story) {
    el.scenesList.textContent = "Load a story to see scenes.";
    setMuted(el.scenesList, true);
    return;
  }
  setMuted(el.scenesList, false);

  const ids = list_scene_ids(story);
  if (!ids.length) {
    el.scenesList.textContent = "No scenes found.";
    setMuted(el.scenesList, true);
    return;
  }

  el.scenesList.innerHTML = "";
  for (const id of ids) {
    const node = story.scenes[id];
    const opts = Array.isArray(node?.options) ? node.options : [];
    const stype = String(node?.type ?? "normal").toLowerCase();
    const endingTag = stype.startsWith("ending") ? ` • ${stype}` : "";
    const item = document.createElement("div");
    item.className = "item" + (STATE.activeSceneId === id ? " active" : "");
    item.innerHTML = `
      <div class="id">${escapeHtml(id)}</div>
      <div class="meta">choices: ${opts.length}${endingTag} ${id === story.start ? " • start" : ""}</div>
      <div style="margin-top:8px;display:flex;gap:8px;align-items:center;">
        <button class="btn tiny danger jsDeleteSceneItem" type="button">Delete</button>
      </div>
    `;
    item.addEventListener("click", () => {
      STATE.activeSceneId = id;
      renderScenesList();
      renderSceneDetail();
    });
    const delBtn = item.querySelector('.jsDeleteSceneItem');
    if (delBtn) {
      delBtn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        deleteScene(id);
        renderScenesList();
        renderSceneDetail();
      });
    }
    el.scenesList.appendChild(item);
  }
}


function goToScene(targetId) {
  const story = STATE.story;
  const id = String(targetId ?? "").trim();
  if (!story || !id) return;

  if (!story.scenes?.[id]) {
    alert(`Target scene not found: ${id}`);
    return;
  }

  STATE.activeSceneId = id;
  renderScenesList();
  renderSceneDetail();

  // Scroll to top of detail for quick reading
  try { el.sceneDetail.scrollTop = 0; } catch (_) {}
}

function updateAuditAndPanels() {
  if (!STATE.story) return;
  STATE.audit = audit_story(STATE.story);
  renderSummary();
  renderIssues();
}

function renderSceneDetail() {
  const story = STATE.story;
  const id = STATE.activeSceneId;
  if (!story || !id || !story.scenes[id]) {
    el.sceneDetail.textContent = "Select a scene.";
    setMuted(el.sceneDetail, true);
    return;
  }
  setMuted(el.sceneDetail, false);

  const node = story.scenes[id];
  const text = String(node?.text ?? "");
  const opts = Array.isArray(node?.options) ? node.options : [];
    const stype = String(node?.type ?? "normal").toLowerCase();
    const endingTag = stype.startsWith("ending") ? ` • ${stype}` : "";
  const ids = list_scene_ids(story);

  // Ensure up to 4 editable slots (runtime constraint)
  const slots = [0, 1, 2, 3].map((i) => opts[i] ?? null);

  const choiceRowsHtml = slots.map((opt, idx) => {
    const label = opt ? String(opt.label ?? "").trim() : "";
    const to = opt ? String(opt.to ?? "").trim() : "";
    const exists = to ? !!story.scenes?.[to] : true;

    const targetOptions = [
      `<option value="">(no target)</option>`,
      ...ids.map((sid) => `<option value="${escapeHtml(sid)}"${sid === to ? " selected" : ""}>${escapeHtml(sid)}</option>`),
      `<option value="__NEW__">+ Create New Scene…</option>`
    ].join("");

    return `
      <div class="choice-row" data-idx="${idx}">
        <div class="field">
          <div class="slot">Choice ${idx + 1} (pill ${idx + 1})</div>
          <input class="input jsChoiceLabel" type="text" value="${escapeHtml(label)}" placeholder="Choice label (4–5 words max)" />
        </div>
        <div class="field">
          <div class="slot">Target</div>
          <select class="select jsChoiceTo">
            ${targetOptions}
          </select>
        </div>
        <div class="field">
          <div class="slot">Actions</div>
          <button class="btn tiny danger jsDeleteChoice" type="button" ${opt ? "" : "disabled"}>Delete</button>
        </div>
        ${to && !exists ? `<div class="hint">Warning: target scene "${escapeHtml(to)}" does not exist.</div>` : ""}
      </div>
    `;
  }).join("");

  el.sceneDetail.innerHTML = `
    <div class="sid">${escapeHtml(id)} ${id === story.start ? '<span class="badge info">START</span>' : ""}</div>
    <div class="small">Total choices: ${opts.length} (editor supports 4 pills)</div>
    <div class="small">Scene type: <select id="sceneType" class="select" style="max-width:240px;display:inline-block;vertical-align:middle;">
      <option value="normal">normal</option>
      <option value="ending">ending</option>
      <option value="ending_special">ending_special</option>
      <option value="ending_bad">ending_bad</option>
      <option value="ending_loop">ending_loop</option>
    </select></div>

    <div class="editor">
      <div class="editor-hd">
        <div class="editor-title">Scene Text</div>
        <div class="editor-actions">
          <button id="btnAddChoice" class="btn tiny" type="button">Add Choice</button>
          <button id="btnReaudit" class="btn tiny" type="button">Re-audit</button>
        </div>
      </div>
      <textarea id="sceneTextEditor" class="textarea" spellcheck="true"></textarea>
      <div class="editor-foot">
        <div class="hint">Edits update the in-memory story. Use “Download JSON” to export.</div>
      </div>
    </div>

    <div class="panel-hd" style="margin-top:12px;border-radius:12px;">Choices Editor</div>
    <div class="choice-editor">
      ${choiceRowsHtml}
      <div class="muted" style="font-size:12px;">Tip: Select “+ Create New Scene…” to auto-create and link a new target.</div>
    </div>
  `;

  // Set initial textarea value
  const ta = el.sceneDetail.querySelector("#sceneTextEditor");
  if (ta) ta.value = text;

  // Debounced audit refresh
  const debouncedAudit = debounce(() => updateAuditAndPanels(), 200);

  // Scene type binding
  const typeSel = el.sceneDetail.querySelector("#sceneType");
  if (typeSel) {
    typeSel.value = String(story.scenes[id].type ?? "normal");
    typeSel.addEventListener("change", () => {
      story.scenes[id].type = String(typeSel.value || "normal");
      updateAuditAndPanels();
      renderScenesList();
      renderSceneDetail();
    });
  }


  // Text editor binding
  if (ta) {
    ta.addEventListener("input", () => {
      story.scenes[id].text = ta.value;
      debouncedAudit();
    });
  }

  // Add Choice: if less than 4, adds a blank choice (no target yet)
  const btnAddChoice = el.sceneDetail.querySelector("#btnAddChoice");
  if (btnAddChoice) btnAddChoice.addEventListener("click", () => {
    const cur = story.scenes[id];
    const curOpts = Array.isArray(cur.options) ? cur.options : [];
    if (curOpts.length >= 4) {
      alert("This scene already has 4 choices. Runtime only supports 4 pills.");
      return;
    }
    curOpts.push({ label: "New Choice", to: "" });
    cur.options = curOpts;
    updateAuditAndPanels();
    renderScenesList();
    renderSceneDetail();
  });


  const btnReaudit = el.sceneDetail.querySelector("#btnReaudit");
  if (btnReaudit) btnReaudit.addEventListener("click", () => updateAuditAndPanels());

  // Choice editor bindings
  el.sceneDetail.querySelectorAll(".choice-row").forEach((row) => {
    const idx = Number(row.getAttribute("data-idx"));
    const inp = row.querySelector(".jsChoiceLabel");
    const sel = row.querySelector(".jsChoiceTo");
    const del = row.querySelector(".jsDeleteChoice");

    const ensureOpt = () => {
      const cur = story.scenes[id];
      const curOpts = Array.isArray(cur.options) ? cur.options : [];
      // Ensure option exists at idx
      while (curOpts.length <= idx) curOpts.push({ label: "New Choice", to: "" });
      cur.options = curOpts;
      return curOpts[idx];
    };

    if (inp) {
      inp.addEventListener("input", () => {
        const opt = ensureOpt();
        opt.label = inp.value;
        debouncedAudit();
        // scene list meta doesn't need immediate rerender
      });
    }

    if (sel) {
      sel.addEventListener("change", () => {
        const v = String(sel.value || "").trim();
        const opt = ensureOpt();

        if (v === "__NEW__") {
          const newId = addScene();
          opt.to = newId || "";
          updateAuditAndPanels();
          renderScenesList();
          renderSceneDetail();
          return;
        }

        opt.to = v;
        debouncedAudit();
        // If the target exists, allow quick navigation by clicking the row (optional)
      });
    }

    if (del) {
      del.addEventListener("click", () => {
        deleteChoice(id, idx);
        renderScenesList();
        renderSceneDetail();
      });
    }

    // Optional: click row to jump to target if set + exists
    row.addEventListener("dblclick", () => {
      const cur = story.scenes[id];
      const curOpts = Array.isArray(cur.options) ? cur.options : [];
      const opt = curOpts[idx];
      const to = String(opt?.to ?? "").trim();
      if (to && story.scenes?.[to]) goToScene(to);
    });
  });
}


function setStoryFromRaw(raw) {
  const normalized = normalize_story(raw);
  if (!normalized) {
    alert("Invalid JSON: expected an object at root.");
    return;
  }
  const audit = audit_story(normalized);

  STATE.raw = raw;
  STATE.story = normalized;
  STATE.audit = audit;
  STATE.activeSceneId = normalized.start && normalized.scenes?.[normalized.start] ? normalized.start : (list_scene_ids(normalized)[0] ?? null);

  renderSummary();
  renderIssues();
  renderScenesList();
  renderSceneDetail();
}

async function loadFile(file) {
  if (!file) return;
  const text = await file.text();
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    alert("JSON parse error: " + (e?.message || e));
    return;
  }
  setStoryFromRaw(raw);
}

function clearAll() {
  STATE = { raw: null, story: null, audit: null, activeSceneId: null };
  renderSummary();
  renderIssues();
  renderScenesList();
  renderSceneDetail();
}


function ensureMetaDefaults(story) {
  if (!story) return;
  if (!story.meta || typeof story.meta !== "object") story.meta = {};
  const m = story.meta;

  if (!m.schema) m.schema = "versecraft.story.v1";
  if (!m.id) m.id = "story";
  if (!m.title) m.title = "Untitled Story";
  if (!m.route) m.route = `story_${slugifyId(m.id)}`;
  if (m.blurb == null) m.blurb = "";
}

function syncMetaUiFromStory() {
  const story = STATE.story;
  if (!story) return;

  ensureMetaDefaults(story);
  const m = story.meta;

  if (el.metaId) el.metaId.value = String(m.id ?? "");
  if (el.metaTitle) el.metaTitle.value = String(m.title ?? "");
  if (el.metaRoute) el.metaRoute.value = String(m.route ?? "");
  if (el.metaSchema) el.metaSchema.value = String(m.schema ?? "versecraft.story.v1");
  if (el.metaBlurb) el.metaBlurb.value = String(m.blurb ?? "");
}

function bindMetaUi() {
  const story = STATE.story;
  if (!story) return;

  const onChange = () => {
    ensureMetaDefaults(story);
    const m = story.meta;

    if (el.metaId) m.id = slugifyId(el.metaId.value || "story");
    if (el.metaTitle) m.title = String(el.metaTitle.value || "Untitled Story");
    if (el.metaRoute) m.route = String(el.metaRoute.value || `story_${slugifyId(m.id)}`);
    if (el.metaSchema) m.schema = String(el.metaSchema.value || "versecraft.story.v1");
    if (el.metaBlurb) m.blurb = toAsciiSafe(el.metaBlurb.value || "");

    syncMetaUiFromStory();
  };

  [el.metaId, el.metaTitle, el.metaRoute, el.metaSchema, el.metaBlurb].forEach((x) => {
    if (!x) return;
    x.addEventListener("input", debounce(onChange, 150));
    x.addEventListener("change", onChange);
  });
}

function newStoryTemplate() {
  const id = slugifyId(prompt("Story Title ID (lowercase):", "cosmos") || "story");
  const title = String(prompt("Story Title (display):", "Creation Of The Cosmos") || "Untitled Story");
  const blurb = toAsciiSafe(String(prompt("Launcher blurb (ASCII-only):", "A short cosmic creation tale...") || ""));

  const scenes = {};
  for (let i = 1; i <= 10; i++) {
    const sid = "S" + String(i).padStart(2, "0");
    scenes[sid] = {
      text: i === 1
        ? `**${title}**\n\nWrite your opening scene here.\n\n**CHOICES**\n\nFIRST CHOICE — ...\n\nSECOND CHOICE — ...`
        : `Scene ${sid} text...\n\n**CHOICES**\n\nFIRST CHOICE — ...\n\nSECOND CHOICE — ...`,
      choices: [],
      type: "normal"
    };
  }

  scenes["S11"] = {
    text: "Ending (Normal)\n\nWrap up this path.\n\n**CHOICES**\n\nRESTART — Return to the beginning.",
    choices: [{ label: "Restart", to: "S01" }],
    type: "ending"
  };
  scenes["S12"] = {
    text: "Ending (Special)\n\nA rarer outcome.\n\n**CHOICES**\n\nRESTART — Return to the beginning.",
    choices: [{ label: "Restart", to: "S01" }],
    type: "ending_special"
  };
  scenes["S13"] = {
    text: "Ending (Bad)\n\nA grim conclusion.\n\n**CHOICES**\n\nRESTART — Return to the beginning.",
    choices: [{ label: "Restart", to: "S01" }],
    type: "ending_bad"
  };

  scenes["S01"].choices = [
    { label: "First Choice", to: "S02" },
    { label: "Second Choice", to: "S03" }
  ];
  scenes["S02"].choices = [
    { label: "Toward Ending", to: "S11" },
    { label: "Continue", to: "S04" }
  ];

  return {
    meta: { id, title, route: `story_${id}`, schema: "versecraft.story.v1", blurb },
    start: "S01",
    scenes
  };
}


function sampleStory() {
  return {
    meta: { id: "sample", title: "Sample" },
    start: "S01",
    scenes: {
      S01: {
        text: "You wake up in a silent corridor.\n\n**CHOICES**\n\nSNEAK FORWARD — You move carefully, trying not to be heard.\n\nCALL OUT — You risk revealing your position.",
        choices: [
          { label: "Sneak Forward", to: "S02" },
          { label: "Call Out", to: "S03" },
          { label: "Wait", to: "" }
        ]
      },
      S02: {
        text: "A door clicks open. Something watches.\n\n**CHOICES**\n\nOPEN THE DOOR — You commit.\n\nBACK AWAY — You retreat.",
        choices: [
          { label: "Open The Door", to: "S04" },
          { label: "Back Away", to: "S03" }
        ]
      },
      S03: {
        text: "Your voice echoes. The air turns cold.\n\n**CHOICES**\n\nRESTART — You try again from the beginning.\n\nEND — You leave this run here.",
        choices: [
          { label: "Restart", to: "S01" },
          { label: "End", to: "" }
        ]
      },
      S04: {
        text: "You step into light. Ending.\n\n**CHOICES**\n\nRESTART — You try again from the beginning.\n\nEND — You leave this run here.",
        choices: [
          { label: "Restart", to: "S01" },
          { label: "End", to: "" }
        ]
      }
    }
  };
}



function parseSceneNumber(id) {
  const m = String(id ?? "").trim().match(/^S(\d+)$/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function formatSceneId(n, width = 2) {
  const s = String(Math.max(0, n));
  const w = Math.max(width, s.length, 2);
  return "S" + s.padStart(w, "0");
}

function nextSceneId(story) {
  const scenes = story?.scenes && typeof story.scenes === "object" ? story.scenes : {};
  let maxN = 0;
  let width = 2;

  for (const id of Object.keys(scenes)) {
    const m = String(id).match(/^S(\d+)$/i);
    if (m) width = Math.max(width, m[1].length);
    const n = parseSceneNumber(id);
    if (n !== null) maxN = Math.max(maxN, n);
  }
  // next sequential
  let candidate = maxN + 1;
  // ensure uniqueness even if non-sequential IDs exist
  while (scenes[formatSceneId(candidate, width)]) candidate++;
  return formatSceneId(candidate, width);
}

function ensureStoryLoaded() {
  if (!STATE.story) {
    alert("Load a story first.");
    return false;
  }
  return true;
}

function addScene({ linkFromSceneId = null, linkLabel = "New Choice" } = {}) {
  if (!ensureStoryLoaded()) return null;
  const story = STATE.story;

  const newId = nextSceneId(story);
  story.scenes[newId] = {
    id: newId,
    text: "New scene text…",
    options: [],
    _raw: null
  };

  if (linkFromSceneId && story.scenes[linkFromSceneId]) {
    const src = story.scenes[linkFromSceneId];
    const opts = Array.isArray(src.options) ? src.options : [];
    if (opts.length >= 4) {
      alert("This scene already has 4 choices. Runtime only supports 4 pills.");
    } else {
      opts.push({ label: linkLabel, to: newId });
      src.options = opts;
    }
  }

  // If story.start is missing or invalid, set it
  if (!story.start || !story.scenes[story.start]) {
    story.start = newId;
  }

  updateAuditAndPanels();
  return newId;
}



function confirmDanger(msg) {
  return window.confirm(msg);
}

function deleteChoice(sceneId, index) {
  if (!ensureStoryLoaded()) return;
  const story = STATE.story;
  const sid = String(sceneId ?? "").trim();
  const idx = Number(index);
  if (!story.scenes?.[sid]) return;
  const node = story.scenes[sid];
  const opts = Array.isArray(node.options) ? node.options : [];
  if (!Number.isFinite(idx) || idx < 0 || idx >= opts.length) return;

  opts.splice(idx, 1);
  node.options = opts;

  updateAuditAndPanels();
}

function deleteScene(sceneId) {
  if (!ensureStoryLoaded()) return;
  const story = STATE.story;
  const sid = String(sceneId ?? "").trim();
  if (!sid || !story.scenes?.[sid]) return;

  const keys = Object.keys(story.scenes);
  if (keys.length <= 1) {
    alert("Cannot delete the last remaining scene.");
    return;
  }

  // Safety: show how many inbound links point to this scene
  let inbound = 0;
  for (const [id, node] of Object.entries(story.scenes)) {
    const opts = Array.isArray(node?.options) ? node.options : [];
    const stype = String(node?.type ?? "normal").toLowerCase();
    const endingTag = stype.startsWith("ending") ? ` • ${stype}` : "";
    for (const opt of opts) {
      if (String(opt?.to ?? "").trim() === sid) inbound++;
    }
  }

  const msg = inbound
    ? `Delete scene ${sid}?\\n\\nWarning: ${inbound} choice(s) point to it. Those choices will be cleared.`
    : `Delete scene ${sid}?`;

  if (!confirmDanger(msg)) return;

  // Remove references to this scene from all choices
  for (const [id, node] of Object.entries(story.scenes)) {
    const opts = Array.isArray(node?.options) ? node.options : [];
    const stype = String(node?.type ?? "normal").toLowerCase();
    const endingTag = stype.startsWith("ending") ? ` • ${stype}` : "";
    for (const opt of opts) {
      if (String(opt?.to ?? "").trim() === sid) opt.to = "";
    }
    node.options = opts;
  }

  delete story.scenes[sid];

  // Fix start if needed
  if (String(story.start ?? "").trim() === sid || !story.scenes?.[story.start]) {
    const first = Object.keys(story.scenes).sort((a,b)=>a.localeCompare(b,"en",{numeric:true}))[0];
    story.start = first || "S01";
  }

  // Fix active scene if needed
  if (STATE.activeSceneId === sid) {
    STATE.activeSceneId = story.start;
  }

  updateAuditAndPanels();
}

function addChoiceAndScene() {
  if (!ensureStoryLoaded()) return;
  const from = STATE.activeSceneId;
  if (!from || !STATE.story.scenes[from]) {
    alert("Select a scene first.");
    return;
  }
  const newId = addScene({ linkFromSceneId: from, linkLabel: "New Choice" });
  if (newId) goToScene(newId);
}

function toAsciiSafe(s) {
  return String(s ?? "").replace(/[^\x00-\x7F]/g, "");
}

function slugifyId(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "story";
}

function buildExportJson() {
  const story = STATE.story;
  if (!story) return null;

  // Prefer meta from raw if present; otherwise create minimal meta
  const rawMeta = (STATE.raw && typeof STATE.raw === "object") ? (STATE.raw.meta ?? null) : null;

  const meta = rawMeta && typeof rawMeta === "object" ? { ...rawMeta } : {
    id: slugifyId(STATE.raw?.meta?.id ?? "story"),
    title: String(STATE.raw?.meta?.title ?? "Untitled Story"),
    schema: "versecraft.story.v1"
  };

  // Canonical export shape for VerseCraft runtime:
  // { meta, start, scenes: { S01: { text, choices:[{label,to}] } } }
  const scenesOut = {};
  const scenes = story.scenes && typeof story.scenes === "object" ? story.scenes : {};
  for (const [id, node] of Object.entries(scenes)) {
    const text = String(node?.text ?? "");
    const opts = Array.isArray(node?.options) ? node.options : [];
    const stype = String(node?.type ?? "normal").toLowerCase();
    const endingTag = stype.startsWith("ending") ? ` • ${stype}` : "";
    const choices = opts.map((o) => ({
      label: String(o?.label ?? "").trim() || "Continue",
      to: String(o?.to ?? "").trim()
    }));
    scenesOut[id] = { text, choices, type: String(node?.type ?? "normal") };
  }

  return {
    meta: (story.meta && typeof story.meta === "object") ? { ...story.meta } : meta,
    start: String(story.start ?? "S01").trim() || "S01",
    scenes: scenesOut
  };
}

function downloadJsonObject(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function exportDownload() {
  const out = buildExportJson();
  if (!out) {
    alert("No story loaded to export.");
    return;
  }
  const id = slugifyId(out?.meta?.id ?? "story");
  const stamp = new Date().toISOString().slice(0, 10);
  downloadJsonObject(out, `${id}_${stamp}.json`);
}



function bindButton(btn, handler) {
  if (!btn) return;
  // Bind both click and pointerup; some setups can miss click after drag/drop.
  btn.addEventListener("click", (e) => handler(e));
  btn.addEventListener("pointerup", (e) => {
    try { e.preventDefault(); } catch (_) {}
    handler(e);
  }, { passive: false });
}


// Wire up UI events
window.addEventListener("DOMContentLoaded", () => {
el.fileInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  loadFile(file);
  e.target.value = "";
});

bindButton(el.btnNewTemplate, () => setStoryFromRaw(newStoryTemplate()));
  bindButton(el.btnSample, () => setStoryFromRaw(sampleStory()));
bindButton(el.btnExport, () => exportDownload());
bindButton(el.btnClear, () => clearAll());

["dragenter", "dragover"].forEach((evt) => {
  el.dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    el.dropzone.classList.add("dragover");
  });
});
["dragleave", "drop"].forEach((evt) => {
  el.dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    el.dropzone.classList.remove("dragover");
  });
});
el.dropzone.addEventListener("drop", (e) => {
  const file = e.dataTransfer?.files?.[0];
  loadFile(file);
});
el.dropzone.addEventListener("click", () => el.fileInput.click());

// Set version/phase label
try {
  const metaEl = document.querySelector("#appMeta");
  if (metaEl) metaEl.textContent = `${APP_PHASE} • v${APP_VERSION}`;
} catch (_) {}

// Lock global scroll so panels scroll independently

});

function applyLayoutSizing() {
  try {
    const vh = window.innerHeight || 0;
    const topbar = document.querySelector(".topbar");
    const footer = document.querySelector(".footer");
    const topH = topbar ? topbar.getBoundingClientRect().height : 64;
    const footH = footer ? footer.getBoundingClientRect().height : 46;

    document.documentElement.style.setProperty("--vc-vh", `${vh}px`);
    document.documentElement.style.setProperty("--vc-topbar-h", `${Math.round(topH)}px`);
    document.documentElement.style.setProperty("--vc-footer-h", `${Math.round(footH)}px`);
  } catch (_) {}
}

try {
  applyLayoutSizing();
  window.addEventListener("resize", () => applyLayoutSizing(), { passive: true });
  window.addEventListener("orientationchange", () => setTimeout(applyLayoutSizing, 50), { passive: true });
} catch (_) {}


// Initial render
clearAll();
