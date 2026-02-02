// src/web/app.js
// VerseCraft Creator — Phase 1 Web Viewer (no-build)

import { normalize_story, list_scene_ids } from "../core/normalize_story.js";
import { audit_story } from "../core/audit_story.js";

const $ = (sel) => document.querySelector(sel);

const el = {
  fileInput: $("#fileInput"),
  dropzone: $("#dropzone"),
  btnSample: $("#btnSample"),
  btnExport: $("#btnExport"),
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
    const item = document.createElement("div");
    item.className = "item" + (STATE.activeSceneId === id ? " active" : "");
    item.innerHTML = `
      <div class="id">${escapeHtml(id)}</div>
      <div class="meta">choices: ${opts.length} ${id === story.start ? " • start" : ""}</div>
    `;
    item.addEventListener("click", () => {
      STATE.activeSceneId = id;
      renderScenesList();
      renderSceneDetail();
    });
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
  const first4 = [0, 1, 2, 3].map((i) => opts[i] ?? null);

  const choicesHtml = first4
    .map((opt, idx) => {
      const pill = idx + 1;

      if (!opt) {
        return `
          <button class="choice choice-btn" type="button" data-to="" disabled aria-disabled="true">
            <div class="lbl">(empty)</div>
            <div class="to">pill ${pill}</div>
          </button>
        `;
      }

      const label = String(opt.label ?? "").trim() || `(no label)`;
      const to = String(opt.to ?? "").trim();

      const exists = to && !!story.scenes?.[to];
      const disabled = !to || !exists;

      const toLabel = !to
        ? "(no target)"
        : exists
          ? to
          : `${to} (missing)`;

      return `
        <button class="choice choice-btn" type="button" data-to="${escapeHtml(to)}"
          ${disabled ? 'disabled aria-disabled="true"' : 'aria-disabled="false"'}>
          <div class="lbl">${escapeHtml(label)}</div>
          <div class="to">to: ${escapeHtml(toLabel)} • pill ${pill}</div>
        </button>
      `;
    })
    .join("");

  el.sceneDetail.innerHTML = `
    <div class="sid">${escapeHtml(id)} ${id === story.start ? '<span class="badge info">START</span>' : ""}</div>
    <div class="small">Total choices: ${opts.length} (viewer shows first 4 pills)</div>

    <div class="editor">
      <div class="editor-hd">
        <div class="editor-title">Scene Text</div>
        <div class="editor-actions">
          <button id="btnReaudit" class="btn tiny" type="button">Re-audit</button>
        </div>
      </div>
      <textarea id="sceneTextEditor" class="textarea" spellcheck="true"></textarea>
      <div class="editor-foot">
        <div class="hint">Edits update the in-memory story. Export/download comes later (Phase 2).</div>
      </div>
    </div>

    <div class="panel-hd" style="margin-top:12px;border-radius:12px;">Choices</div>
    <div class="choices">${choicesHtml}</div>
  `;

  // Set initial textarea value without HTML escaping
  const ta = el.sceneDetail.querySelector("#sceneTextEditor");
  if (ta) ta.value = text;

  // Bind choice navigation (buttons)
  el.sceneDetail.querySelectorAll(".choice-btn").forEach((btn) => {
    const to = btn.getAttribute("data-to") || "";
    if (!to) return;
    btn.addEventListener("click", () => goToScene(to));
  });

  // Bind editor: update story text in-place + refresh audit panels (debounced)
  const debouncedAudit = debounce(() => updateAuditAndPanels(), 200);

  if (ta) {
    ta.addEventListener("input", () => {
      // Update normalized story node text
      story.scenes[id].text = ta.value;
      debouncedAudit();
    });
  }

  const btnReaudit = el.sceneDetail.querySelector("#btnReaudit");
  if (btnReaudit) btnReaudit.addEventListener("click", () => updateAuditAndPanels());
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
        text: "Your voice echoes. The air turns cold.\n\n(No choices here—this will warn as a dead end.)",
        choices: []
      },
      S04: {
        text: "You step into light. Ending.",
        choices: []
      }
    }
  };
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
    const choices = opts.map((o) => ({
      label: String(o?.label ?? "").trim() || "Continue",
      to: String(o?.to ?? "").trim()
    }));
    scenesOut[id] = { text, choices };
  }

  return {
    meta,
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


// Wire up UI events
el.fileInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  loadFile(file);
  e.target.value = "";
});

el.btnSample.addEventListener("click", () => setStoryFromRaw(sampleStory()));
if (el.btnExport) el.btnExport.addEventListener("click", () => exportDownload());
el.btnClear.addEventListener("click", () => clearAll());

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

// Initial render
clearAll();
