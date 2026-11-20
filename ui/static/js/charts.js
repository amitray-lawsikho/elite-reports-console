/* =====================================================================
   charts.js — the ANALYSIS tab's charts, drawn as inline SVG.

   Four stacked-bar panels and one donut, all fed by the same shape the
   server returns. Horizontal bars throughout: the category is a person's
   name, and rotated labels under vertical columns are the first thing to
   become unreadable once a team has more than five callers.

   Colour rules that are not negotiable here:
     * a series keeps its colour whatever else is on screen — the slot is
       chosen from the series NAME, never from its rank, so filtering the
       chart down to two stages does not repaint them;
     * the eight slots are used in a fixed, validated order and never
       cycled — a ninth series folds into "Other";
     * every segment carries its own value label, so identity and magnitude
       never rest on colour alone.
   ===================================================================== */

/* The validated categorical palette, stepped per mode. Slots are assigned
   by name below, never by position in the data. */
const PALETTE_LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100",
                       "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
const PALETTE_DARK  = ["#3987e5", "#d95926", "#199e70", "#c98500",
                       "#d55181", "#008300", "#9085e9", "#e66767"];

/* Stages and types that appear again and again get a fixed slot, so the
   same stage is the same colour on every panel and every page. Anything
   else is hashed into a slot deterministically. */
const FIXED_SLOTS = {
  // stages
  "Follow Up For Closure": 0,
  "Call Back Later": 1,
  "Counselled lead": 2,
  "Followup DNP": 3,
  "Call Not Connected": 4,
  "Call Not Picking Up": 1,
  "New Lead": 0,
  "Re-enquired Lead": 2,
  "Opportunity Created": 6,
  "Untouched Lead": 0,
  "Actually Enrolled": 5,
  // follow-up verdicts
  "Follow Up Breached": 0,
  "Breached Call Back": 1,
  "Breached Counselled lead": 2,
  "Breached Followup DNP": 3,
  // chat/email/referral types
  "Chat": 6,
  "Email": 2,
  "Referral": 1,
  // the generic single-series bucket
  "Leads": 0,
  "Other": 7,
  "Others": 7,
  "—": 7,
};

function paletteFor() {
  const dark = (document.documentElement.getAttribute("data-theme") || "dark") !== "light";
  return dark ? PALETTE_DARK : PALETTE_LIGHT;
}

function slotFor(name) {
  const key = String(name == null ? "" : name).trim();
  if (Object.prototype.hasOwnProperty.call(FIXED_SLOTS, key)) return FIXED_SLOTS[key];
  // A stable hash, so an unexpected stage still keeps one colour for good.
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return hash % 8;
}

/* Set from the server's owner_slots so two callers never share a colour in
   the donut. It covers the whole report, not the current selection, so
   filtering still never repaints anybody. */
let OWNER_SLOTS = {};

function setOwnerSlots(map) { OWNER_SLOTS = map || {}; }

function colourFor(name) {
  return paletteFor()[slotFor(name)];
}

function colourForOwner(name) {
  const key = String(name == null ? "" : name).trim();
  const slot = Object.prototype.hasOwnProperty.call(OWNER_SLOTS, key)
    ? OWNER_SLOTS[key] : slotFor(key);
  return paletteFor()[slot];
}

function svgEsc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shorten(text, max) {
  const s = String(text || "");
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

/* ------------------------------------------------------------- LEGEND */
function legendHtml(names) {
  if (!names.length) return "";
  return `<div class="viz-legend">${names.map((n) =>
    `<span class="viz-key"><span class="viz-dot" style="background:${colourFor(n)}"></span>${escHtml(n)}</span>`
  ).join("")}</div>`;
}

function escHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* --------------------------------------------------- STACKED BAR PANEL */
/**
 * panel: { title, subtitle, categories, series:[{name, values}], totals, total }
 * onPick(category) fires when a bar is clicked.
 */
function renderPanel(hostId, panel, onPick) {
  const host = document.getElementById(hostId);
  if (!host) return;

  if (!panel || panel.empty || !panel.categories.length) {
    host.innerHTML = `
      <div class="viz-head"><h3 class="viz-title">${escHtml(panel ? panel.title : "")}</h3>
        <span class="viz-sub">${escHtml(panel ? panel.subtitle : "")}</span></div>
      <div class="viz-empty">Nothing in this selection.</div>`;
    return;
  }

  // Drawn at the panel's real pixel width — never stretched — so names and
  // numbers stay the size set in the stylesheet and read cleanly in a
  // screenshot. The chart is redrawn when the window is resized.
  const ROW = 36;            // one bar and its gutter
  const BAR = 24;
  const PAD_T = 6;
  const GAP = 2;             // the surface gap between stacked segments
  const CHAR = 7.4;          // average width of a 13px label character
  const longest = Math.max(...panel.categories.map((c) => String(c || "").length), 4);
  const LABEL_W = Math.min(210, Math.max(96, Math.round(Math.min(longest, 26) * CHAR) + 14));
  const VALUE_W = 16 + String(Math.max(...panel.totals)).length * 9;

  const rows = panel.categories.length;
  const height = PAD_T + rows * ROW;
  const max = Math.max(1, ...panel.totals);
  const names = panel.series.map((s) => s.name);

  const width = Math.max(320, Math.floor(host.clientWidth - 32) || 640);
  const plotW = Math.max(60, width - LABEL_W - VALUE_W);

  let bars = "";
  panel.categories.forEach((category, row) => {
    const y = PAD_T + row * ROW + (ROW - BAR) / 2;
    const total = panel.totals[row];
    let x = LABEL_W;

    bars += `<text class="viz-cat" x="${LABEL_W - 8}" y="${y + BAR / 2}" text-anchor="end"
              dominant-baseline="central">${svgEsc(shorten(category, 26))}<title>${svgEsc(category)}</title></text>`;

    panel.series.forEach((series) => {
      const value = series.values[row];
      if (!value) return;
      const w = Math.max(1, (value / max) * plotW);
      const last = x + w >= LABEL_W + (total / max) * plotW - 0.5;
      // Only the data end is rounded, and only on the outermost segment, so
      // the bar reads as one length rather than a row of lozenges.
      const radius = last ? 4 : 0;
      bars += `<path class="viz-seg" d="${roundedRight(x, y, Math.max(1, w - GAP), BAR, radius)}"
                 fill="${colourFor(series.name)}"
                 data-cat="${svgEsc(category)}" data-series="${svgEsc(series.name)}" data-value="${value}">
                 <title>${svgEsc(category)} · ${svgEsc(series.name)}: ${value}</title></path>`;
      if (w > 10 + String(value).length * 8) {
        bars += `<text class="viz-seg-label" x="${x + (w - GAP) / 2}" y="${y + BAR / 2}"
                   text-anchor="middle" dominant-baseline="central">${value}</text>`;
      }
      x += w;
    });

    bars += `<text class="viz-total" x="${LABEL_W + (total / max) * plotW + 8}" y="${y + BAR / 2}"
              dominant-baseline="central">${total}</text>`;
  });

  host.innerHTML = `
    <div class="viz-head">
      <h3 class="viz-title">${escHtml(panel.title)}</h3>
      <span class="viz-sub">${escHtml(panel.subtitle)}</span>
      <span class="spacer"></span>
      <span class="viz-total-badge">${Number(panel.total).toLocaleString()}</span>
    </div>
    ${(names.length > 1 || (names[0] && names[0] !== "Leads")) ? legendHtml(names) : ""}
    <svg class="viz-svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"
         style="width:${width}px;height:${height}px" role="img"
         aria-label="${escHtml(panel.title)} by caller">${bars}</svg>`;

  host._redraw = () => renderPanel(hostId, panel, onPick);
  if (onPick) {
    host.querySelectorAll(".viz-seg").forEach((el) => {
      el.style.cursor = "pointer";
      el.addEventListener("click", () => onPick(el.getAttribute("data-cat")));
    });
  }
}

/** A rect with only its right corners rounded — the data end. */
function roundedRight(x, y, w, h, r) {
  const radius = Math.min(r, w, h / 2);
  if (radius <= 0) return `M${x},${y}h${w}v${h}h${-w}z`;
  return `M${x},${y}h${w - radius}a${radius},${radius} 0 0 1 ${radius},${radius}` +
         `v${h - 2 * radius}a${radius},${radius} 0 0 1 ${-radius},${radius}h${-(w - radius)}z`;
}

/* ---------------------------------------------------------- DONUT */
function renderDonut(hostId, data) {
  const host = document.getElementById(hostId);
  if (!host) return;

  if (!data || data.empty || !data.slices.length) {
    host.innerHTML = `<div class="viz-head"><h3 class="viz-title">${escHtml(data ? data.title : "")}</h3></div>
      <div class="viz-empty">No enrollments in this selection.</div>`;
    return;
  }

  const SIZE = 210, R = 88, THICK = 30, C = SIZE / 2;
  const total = data.total || 1;
  let angle = -Math.PI / 2;      // start at twelve o'clock
  let arcs = "";

  data.slices.forEach((slice) => {
    const sweep = (slice.value / total) * Math.PI * 2;
    // A 2px surface gap between neighbouring arcs, in radians at this radius.
    const gap = Math.min(sweep * 0.3, 2 / R);
    const from = angle + gap / 2;
    const to = angle + sweep - gap / 2;
    arcs += `<path class="viz-arc" d="${ring(C, C, R, THICK, from, to)}"
               fill="${colourForOwner(slice.name)}"
               ><title>${svgEsc(slice.name)}: ${slice.value} (${Math.round(slice.value / total * 100)}%)</title></path>`;
    angle += sweep;
  });

  host.innerHTML = `
    <div class="viz-head"><h3 class="viz-title">${escHtml(data.title)}</h3>
      <span class="spacer"></span>
      <span class="viz-total-badge">${Number(total).toLocaleString()}</span></div>
    <div class="donut-wrap">
      <svg class="viz-svg" viewBox="0 0 ${SIZE} ${SIZE}" style="width:${SIZE}px;height:${SIZE}px"
           role="img" aria-label="${escHtml(data.title)} by caller">
        ${arcs}
        <text class="donut-value" x="${C}" y="${C - 4}" text-anchor="middle">${total}</text>
        <text class="donut-label" x="${C}" y="${C + 16}" text-anchor="middle">enrolled</text>
      </svg>
      <div class="donut-legend">
        ${data.slices.map((s) => `
          <div class="donut-row">
            <span class="viz-dot" style="background:${colourForOwner(s.name)}"></span>
            <span class="donut-name">${escHtml(s.name)}</span>
            <span class="donut-count">${s.value}</span>
          </div>`).join("")}
      </div>
    </div>`;
}

/** An annular sector — the donut's one geometric primitive. */
function ring(cx, cy, radius, thickness, from, to) {
  const inner = radius - thickness;
  const large = (to - from) > Math.PI ? 1 : 0;
  const x1 = cx + radius * Math.cos(from), y1 = cy + radius * Math.sin(from);
  const x2 = cx + radius * Math.cos(to),   y2 = cy + radius * Math.sin(to);
  const x3 = cx + inner * Math.cos(to),    y3 = cy + inner * Math.sin(to);
  const x4 = cx + inner * Math.cos(from),  y4 = cy + inner * Math.sin(from);
  return `M${x1},${y1}A${radius},${radius} 0 ${large} 1 ${x2},${y2}` +
         `L${x3},${y3}A${inner},${inner} 0 ${large} 0 ${x4},${y4}Z`;
}

/* ------------------------------------------------------- DATA VIEW */
function renderMatrix(hostId, matrix, title) {
  const host = document.getElementById(hostId);
  if (!host) return;
  if (!matrix || !matrix.rows || !matrix.rows.length) {
    host.innerHTML = `<div class="table-empty">Nothing in this selection.</div>`;
    return;
  }
  host.innerHTML = `
    <table class="data compact">
      <thead><tr><th>${escHtml(title || "Caller")}</th>
        ${matrix.columns.map((c) => `<th class="num">${escHtml(c)}</th>`).join("")}
        <th class="num">Total</th></tr></thead>
      <tbody>
        ${matrix.rows.map((row) => `
          <tr><td>${escHtml(row.name)}</td>
            ${row.values.map((v) => `<td class="num">${v || ""}</td>`).join("")}
            <td class="num strong">${row.total}</td></tr>`).join("")}
      </tbody>
      <tfoot><tr><td>All</td>
        ${(matrix.totals || []).map((v) => `<td class="num">${v}</td>`).join("")}
        <td class="num strong">${matrix.total}</td></tr></tfoot>
    </table>`;
}


/* Redraw every panel at its new width when the window is resized. */
(function watchResize() {
  let timer = null;
  window.addEventListener("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      document.querySelectorAll(".viz").forEach((el) => { if (el._redraw) el._redraw(); });
    }, 150);
  });
})();
