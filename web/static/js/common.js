/* =====================================================================
   common.js — shared helpers for every page.
   Fetch wrappers, toasts, modals, the job log stream, table rendering
   and the distribution-token handoff between pages.
   ===================================================================== */

/* ------------------------------------------------------------ REQUESTS */
async function api(url, options = {}) {
  const res = await fetch(url, options);
  let json;
  try {
    json = await res.json();
  } catch (err) {
    throw new Error(`${res.status} ${res.statusText} — the server did not return JSON.`);
  }
  if (!res.ok || json.ok === false) {
    throw new Error(json.error || `${res.status} ${res.statusText}`);
  }
  return json;
}

const apiGet = (url) => api(url);

const apiJson = (url, payload, method = "POST") =>
  api(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });

const apiForm = (url, formData) => api(url, { method: "POST", body: formData });

/* -------------------------------------------------------------- ESCAPING */
function esc(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const num = (value) => Number(value || 0).toLocaleString();

/* --------------------------------------------------------------- TOASTS */
function toast(message, type = "info", ms = 4200) {
  let host = document.querySelector(".toasts");
  if (!host) {
    host = document.createElement("div");
    host.className = "toasts";
    document.body.appendChild(host);
  }
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

/* --------------------------------------------------------------- STATUS */
function setStatus(id, message, type = "idle") {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `status ${type === "idle" ? "" : type}`.trim();
  const spinner = type === "busy" ? '<span class="spinner"></span>' : "";
  el.innerHTML = `${spinner}<span>${esc(message)}</span>`;
  el.classList.remove("hidden");
}

/* --------------------------------------------------------------- MODALS */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("hidden");
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("hidden");
}
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  document.querySelectorAll(".modal-backdrop:not(.hidden)").forEach((m) => m.classList.add("hidden"));
});

/* ------------------------------------------------------------ RUN TOKEN
   The distribution writes three files under one token. Keeping it in
   sessionStorage is what lets the MCube, Acefone and LeadSquared pages
   pick up the same run without the operator re-uploading anything. */
const RUN_KEY = "leadsConsole.run";

function saveRun(run) {
  sessionStorage.setItem(RUN_KEY, JSON.stringify(run));
}
function loadRun() {
  try {
    return JSON.parse(sessionStorage.getItem(RUN_KEY) || "null");
  } catch (err) {
    return null;
  }
}
function clearRun() {
  sessionStorage.removeItem(RUN_KEY);
}

/** Show whether this page has a distributed file waiting for it. */
async function renderSourceChip(chipId, which, label) {
  const chip = document.getElementById(chipId);
  if (!chip) return null;
  const run = loadRun();

  if (!run || !run.token) {
    chip.className = "source-chip";
    chip.textContent = "No distribution in this session — run one on the Distribute page, or upload a file below.";
    return null;
  }

  try {
    const res = await apiGet(`/api/runs/${encodeURIComponent(run.token)}`);
    // Leads Analysis writes the same files for its breached leads.
    const origin = run.source === "analysis"
      ? `from Leads Analysis (${run.label || "breached leads"})`
      : "from this session's distribution";
    if (!res.files[which]) {
      chip.className = "source-chip warn";
      chip.textContent = run.source === "analysis"
        ? `The files made in Leads Analysis have no ${label}. Upload a file below.`
        : `The last distribution produced no ${label}. Upload a file below.`;
      return null;
    }
    chip.className = "source-chip ready";
    const rows = run.counts && run.counts[which] !== undefined ? ` — ${num(run.counts[which])} rows` : "";
    chip.innerHTML = `<span class="dot"></span><span>Using <strong>${esc(label)}</strong> ${esc(origin)}${esc(rows)}.</span>`;
    return run.token;
  } catch (err) {
    chip.className = "source-chip warn";
    chip.textContent = "The last distribution has expired. Run it again, or upload a file below.";
    clearRun();
    return null;
  }
}

/* ----------------------------------------------------------- JOB STREAMS
   Jobs report over SSE. Log lines arrive as plain text; progress arrives
   as "__PROGRESS__ pct done total", the current step as "__STEP__ text";
   "__DONE__" closes the stream.

   A job that has already finished is replayed from its log when a page
   attaches to it. Its old "page 179…" and step lines must not repaint the
   status — that is what left "Fetching — 178,123 leads, page 179…" spinning
   under a disabled Stop button after the job had long finished. So a replay
   writes the log only, and onDone(jobId) always runs at the end, letting
   the page set the final Done / Failed / Stopped status from the server. */
class JobStream {
  constructor({ logId, progressId, progressTextId, stopId, onDone, onCount, onStep }) {
    this.logEl = document.getElementById(logId);
    this.progressEl = progressId ? document.getElementById(progressId) : null;
    this.progressTextEl = progressTextId ? document.getElementById(progressTextId) : null;
    this.stopEl = stopId ? document.getElementById(stopId) : null;
    this.onDone = onDone || (() => {});
    this.onCount = onCount || (() => {});
    this.onStep = onStep || (() => {});
    this.replay = false;
    this.source = null;
    this.jobId = null;

    if (this.stopEl) {
      this.stopEl.addEventListener("click", () => this.stop());
    }
  }

  clear() {
    if (this.logEl) this.logEl.innerHTML = "";
    this.setProgress(0, 0, 0);
  }

  write(text, kind = "") {
    if (!this.logEl) return;
    const line = document.createElement("div");
    line.className = `log-line ${kind}`.trim();
    const stamp = new Date().toLocaleTimeString();
    line.textContent = `[${stamp}] ${text}`;
    this.logEl.appendChild(line);
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  setProgress(pct, done, total) {
    if (this.progressEl) this.progressEl.style.width = `${pct}%`;
    if (this.progressTextEl) {
      this.progressTextEl.textContent = total
        ? `${pct}% — ${num(done)} of ${num(total)}`
        : `${pct}%`;
    }
  }

  attach(jobId, { replay = false } = {}) {
    this.detach();
    this.jobId = jobId;
    this.replay = replay;
    if (this.stopEl) this.stopEl.disabled = replay;

    this.source = new EventSource(`/api/jobs/${encodeURIComponent(jobId)}/logs`);

    this.source.onmessage = (event) => {
      const data = event.data;

      if (data === "__DONE__") {
        const id = this.jobId;
        this.detach();
        this.onDone(id);
        return;
      }

      // Rows fetched so far, with no known total.
      if (data.startsWith("__COUNT__")) {
        if (this.replay) return;
        const [, rows, page] = data.split(" ");
        this.onCount(Number(rows) || 0, Number(page) || 0);
        return;
      }

      if (data.startsWith("__STEP__")) {
        if (!this.replay) this.onStep(data.slice(9));
        return;
      }

      if (data.startsWith("__PROGRESS__")) {
        const [, pct, done, total] = data.split(" ");
        this.setProgress(Number(pct) || 0, Number(done) || 0, Number(total) || 0);
        return;
      }

      const lower = data.toLowerCase();
      let kind = "";
      if (lower.includes("error") || lower.includes("failed") || lower.includes("rejected")) kind = "err";
      else if (lower.includes("deleted") || lower.includes("pushed") || lower.includes("imported")) kind = "good";
      else if (lower.includes("skipped") || lower.includes("unrouted") || lower.includes("stopped")
               || lower.includes("warning") || lower.includes("left blank") || lower.includes("slow down")) kind = "warn";
      else if (lower.startsWith("done") || lower.includes("users loaded")) kind = "good";
      this.write(data, kind);
    };

    this.source.onerror = () => {
      // The stream closes normally once a job finishes; only report a drop
      // while we still believe the job is live.
      if (this.source && this.source.readyState === EventSource.CLOSED && this.jobId) {
        const id = this.jobId;
        this.write("Log stream closed.", "warn");
        this.detach();
        this.onDone(id);
      }
    };
  }

  detach() {
    if (this.source) {
      this.source.close();
      this.source = null;
    }
    this.jobId = null;
    this.replay = false;
    if (this.stopEl) this.stopEl.disabled = true;
  }

  async stop() {
    if (!this.jobId) return;
    try {
      await apiJson(`/api/jobs/${encodeURIComponent(this.jobId)}/stop`, {});
      this.write("Stop requested — finishing the current batch.", "warn");
    } catch (err) {
      toast(err.message, "error");
    }
  }
}

/* ------------------------------------------------------- JOB RE-ATTACH
   A job outlives the page that started it. Navigating from Reports to
   Analysis and back used to leave an empty log box beside a fetch that was
   still running, because the log only ever existed in the dropped stream.
   The server now keeps each job's whole log, so a page that has just loaded
   asks what is running and picks straight back up. */
async function reattachJob(stream, kinds, onFound) {
  try {
    const res = await apiGet("/api/jobs");
    const wanted = Array.isArray(kinds) ? kinds : [kinds];
    const matches = (job) =>
      wanted.some((k) => (k.endsWith(":") ? job.kind.startsWith(k) : job.kind === k));

    // A running job first; failing that, the most recent finished one, so
    // coming back to the page still shows what happened while you were away.
    const live = res.jobs.find((j) => j.running && matches(j));
    const last = res.jobs.find((j) => matches(j));
    const job = live || last;
    if (!job) return null;

    stream.clear();
    if (onFound) onFound(job, !!live);
    stream.attach(job.id, { replay: !live });
    return job;
  } catch (err) {
    return null;
  }
}

/** The final line for a finished job, from the server's own record of it. */
async function jobOutcome(jobId) {
  try {
    const res = await apiGet(`/api/jobs/${encodeURIComponent(jobId)}`);
    const j = res.job;
    const secs = j.finished_at && j.started_at ? Math.round(j.finished_at - j.started_at) : null;
    const took = secs === null ? "" : ` in ${Math.floor(secs / 60)}m ${secs % 60}s`;
    if (j.status === "failed") return { job: j, type: "bad", text: `${j.title} — failed${took}. ${j.errors[0] || "See the log."}` };
    if (j.status === "stopped") return { job: j, type: "bad", text: `${j.title} — stopped.` };
    if (j.status === "partial") return { job: j, type: "bad", text: `${j.title} — finished with errors${took}. See the log.` };
    return { job: j, type: "good", text: `${j.title} — done${took}.` };
  } catch (err) {
    return { job: null, type: "good", text: "Finished." };
  }
}

/* ---------------------------------------------------------------- TABLES */
/**
 * Render rows into a table body.
 * columns: [{ key, label, className?, render?(row) }]
 */
function renderTable(tbodyId, rows, columns, emptyMessage = "Nothing to show.") {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  if (!rows || !rows.length) {
    tbody.innerHTML = `<tr><td colspan="${columns.length}"><div class="table-empty">${esc(emptyMessage)}</div></td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map((row) => {
      const cells = columns
        .map((col) => {
          const content = col.render ? col.render(row) : esc(row[col.key]);
          return `<td class="${col.className || ""}">${content}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
}

function fillSelect(selectId, items, { valueKey = "id", labelKey = "name", placeholder, selected } = {}) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const options = [];
  if (placeholder) options.push(`<option value="">${esc(placeholder)}</option>`);
  items.forEach((item) => {
    const value = item[valueKey];
    const isSel = selected !== undefined && String(selected) === String(value);
    options.push(`<option value="${esc(value)}"${isSel ? " selected" : ""}>${esc(item[labelKey])}</option>`);
  });
  select.innerHTML = options.join("");
}

/** Text of the currently selected option — used for the typed confirmations. */
function selectedLabel(selectId) {
  const select = document.getElementById(selectId);
  if (!select || select.selectedIndex < 0) return "";
  return select.options[select.selectedIndex].textContent.trim();
}

/* --------------------------------------------------------- BROWSER STORE
   localStorage can be blocked (private windows, strict settings); these
   never throw, so a page never breaks over a remembered preference. */
function storeGet(key, fallback = null) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : v; }
  catch (err) { return fallback; }
}
function storeSet(key, value) {
  try { localStorage.setItem(key, value); } catch (err) { /* ignore */ }
}

/* ----------------------------------------------------------------- THEME */
const THEME_KEY = "leadsConsole.theme";

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
  const btn = document.getElementById("themeToggle");
  if (btn) btn.textContent = theme === "light" ? "Dark" : "Light";
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  applyTheme(current === "light" ? "dark" : "light");
}

applyTheme(localStorage.getItem(THEME_KEY) || "dark");
document.addEventListener("DOMContentLoaded", () => {
  applyTheme(localStorage.getItem(THEME_KEY) || "dark");
});

/* ------------------------------------------------- TYPED CONFIRM DIALOG
   Bulk deletes are not reversible, so the operator retypes the campaign
   or list name before the request is sent. */
function confirmByName({ title, phrase, message, confirmLabel = "Delete", onConfirm }) {
  const existing = document.getElementById("confirmByNameModal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.id = "confirmByNameModal";
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <h3 class="modal-title">${esc(title)}</h3>
        <button class="modal-close" type="button" data-close>&times;</button>
      </div>
      <div class="modal-body stack">
        <div class="danger-box">${message}</div>
        <div class="field">
          <label class="label no-caps" for="confirmByNameInput">Type <strong>${esc(phrase)}</strong> to confirm</label>
          <input class="input mono" id="confirmByNameInput" autocomplete="off" spellcheck="false" />
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn" type="button" data-close>Cancel</button>
        <button class="btn btn-danger" type="button" id="confirmByNameGo" disabled>${esc(confirmLabel)}</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  const input = modal.querySelector("#confirmByNameInput");
  const go = modal.querySelector("#confirmByNameGo");

  input.addEventListener("input", () => {
    go.disabled = input.value.trim().toLowerCase() !== phrase.trim().toLowerCase();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !go.disabled) go.click();
  });
  modal.querySelectorAll("[data-close]").forEach((el) =>
    el.addEventListener("click", () => modal.remove())
  );
  go.addEventListener("click", () => {
    const typed = input.value.trim();
    modal.remove();
    onConfirm(typed);
  });

  setTimeout(() => input.focus(), 40);
}

/* ------------------------------------------------- LEAD DELETE PANEL
   Deleting one lead, or a hand-picked few, gets its own panel showing
   exactly which records are about to go. A native confirm() cannot show
   the lead's details, and some browsers suppress it entirely. */
function confirmLeadDelete({ title, leads, columns, note, confirmLabel,
                            countOverride, onConfirm }) {
  // A by-caller or whole-list delete can cover more leads than the preview
  // returns, so the headline count comes from the server, not the sample.
  const total = countOverride !== undefined ? countOverride : leads.length;
  const existing = document.getElementById("leadDeleteModal");
  if (existing) existing.remove();

  const head = columns.map((c) => `<th>${esc(c.label)}</th>`).join("");
  const body = leads
    .slice(0, 50)
    .map((lead) => {
      const cells = columns
        .map((c) => `<td class="${c.className || ""}">${esc(c.get(lead))}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  const shown = Math.min(leads.length, 50);
  const more = total > shown
    ? `<div class="table-foot">Showing ${num(shown)} of ${num(total)}.</div>`
    : "";

  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.id = "leadDeleteModal";
  modal.innerHTML = `
    <div class="modal wide">
      <div class="modal-head">
        <h3 class="modal-title">${esc(title)}</h3>
        <button class="modal-close" type="button" data-close>&times;</button>
      </div>
      <div class="modal-body stack">
        <div class="danger-box">
          You are about to permanently delete
          <strong>${num(total)} lead${total === 1 ? "" : "s"}</strong>.
          This cannot be undone.
        </div>
        ${note ? `<div class="info-box">${note}</div>` : ""}
        <div class="table-wrap">
          <div class="table-scroll" style="max-height:320px">
            <table class="data"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
          </div>
          ${more}
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn" type="button" data-close>Cancel</button>
        <button class="btn btn-danger" type="button" id="leadDeleteGo">
          ${esc(confirmLabel || `Delete ${total} lead(s)`)}
        </button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.querySelectorAll("[data-close]").forEach((el) =>
    el.addEventListener("click", () => modal.remove())
  );
  modal.querySelector("#leadDeleteGo").addEventListener("click", () => {
    modal.remove();
    onConfirm();
  });
}

/* A floating tray that appears as soon as leads are ticked, so a selection
   never sits unnoticed at the bottom of a long table. */
function updateSelectionTray({ count, label, onDelete, onClear }) {
  let tray = document.getElementById("selectionTray");

  if (!count) {
    if (tray) tray.remove();
    return;
  }

  if (!tray) {
    tray = document.createElement("div");
    tray.id = "selectionTray";
    tray.className = "selection-tray";
    tray.innerHTML = `
      <span class="selection-count"></span>
      <button class="btn btn-sm" type="button" id="trayClear">Clear</button>
      <button class="btn btn-sm btn-danger" type="button" id="trayDelete">Delete selected</button>`;
    document.body.appendChild(tray);
    tray.querySelector("#trayClear").addEventListener("click", () => onClear());
    tray.querySelector("#trayDelete").addEventListener("click", () => onDelete());
  }

  tray.querySelector(".selection-count").textContent =
    `${num(count)} ${label}${count === 1 ? "" : "s"} selected`;
}
