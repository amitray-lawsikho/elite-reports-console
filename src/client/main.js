/* Browser entry (bundled to web/static/js/erc.js, loaded in <head> before the page's own scripts).
   1. Shims: fetch("/api/..."), EventSource("/api/jobs/<id>/logs") and /download links are answered here (routes.js).
   2. Sign-in: only through the Sales Intelligence Portal (one-time sign-in link; same accounts as Calling Analytics).
   3. Per-page touches for the online version (this person's own settings, shared links read-only for non-admins). */
import { setTokenGetter, loadSettings, cfg, opJson } from "./core.js";
import { handle, download } from "./routes.js";
import * as J from "./jobs.js";

const CFG = { url: "https://ybkldfcilvibryoxcuvq.supabase.co", key: "sb_publishable_Ywx9a1pcD6tbJDDtcS_wAw_PuJBtLBw" };
const PORTAL = "https://sales-intelligence-portal.amitray.workers.dev/";
let sb = null, readyResolve;
const ready = new Promise((r) => { readyResolve = r; });
const cachedSettings = () => { try { const c = JSON.parse(sessionStorage.getItem("erc.settings") || "null"); return (c && c.data && c.data.settings) || {}; } catch { return {}; } };
// page scripts read their defaults while loading: this person's cached values straight away
window.ERC_DEFAULTS = () => { const s = cachedSettings(); const n = (k, d) => (Number.isFinite(parseInt(s[k], 10)) ? parseInt(s[k], 10) : d);
  return { retry_attempts: n("MCUBE_RETRY_ATTEMPTS", 3), retry_time: n("MCUBE_RETRY_TIME", 180) }; };

/* ------------------------------------------------------------------ shims */
const realFetch = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === "string" ? input : input.url, location.href);
  const local = url.origin === location.origin && (url.pathname.startsWith("/api/") || url.pathname === "/keepalive");
  if (!local) return realFetch(input, init);
  await ready;
  const method = String(init.method || (typeof input !== "string" && input.method) || "GET").toUpperCase();
  const r = await handle(method, url, init.body);
  return new Response(JSON.stringify(r.body), { status: r.status, headers: { "content-type": "application/json" } });
};
const RealES = window.EventSource;
class JobEventSource {
  constructor(url) {
    this.url = url; this.readyState = 0; this.onmessage = null; this.onerror = null; this.onopen = null;
    const m = String(url).match(/\/api\/jobs\/([^/]+)\/logs/);
    if (String(url).includes("/keepalive")) { this.readyState = 1; return; }
    ready.then(() => {
      const job = m ? J.get(decodeURIComponent(m[1])) : null;
      if (!job) { this.readyState = 2; if (this.onerror) this.onerror(new Event("error")); return; }
      this.readyState = 1;
      if (this.onopen) this.onopen(new Event("open"));
      const send = (data) => { if (this.readyState !== 2 && this.onmessage) this.onmessage({ data }); };
      job.messages.forEach(send);
      if (job.finishedAt) return;
      this.listener = send; job.listeners.add(send); this.job = job;
    });
  }
  close() { this.readyState = 2; if (this.job && this.listener) this.job.listeners.delete(this.listener); }
  addEventListener(type, fn) { if (type === "message") this.onmessage = fn; else if (type === "error") this.onerror = fn; }
}
window.EventSource = function (url, opts) {
  const u = new URL(url, location.href);
  if (u.origin === location.origin && (u.pathname.startsWith("/api/jobs/") || u.pathname === "/keepalive")) return new JobEventSource(url);
  return new RealES(url, opts);
};
Object.assign(window.EventSource, { CONNECTING: 0, OPEN: 1, CLOSED: 2 });
window.lcDownload = async (path) => {
  try { await ready; await download(path); }
  catch (e) { if (window.toast) window.toast(e.message, "error"); else alert(e.message); }
};
document.addEventListener("click", (e) => {
  const a = e.target.closest && e.target.closest("a[href]");
  if (!a) return;
  const href = a.getAttribute("href");
  if (/^\/download\//.test(href)) { e.preventDefault(); if (!a.classList.contains("disabled")) window.lcDownload(href); }
}, true);

/* ------------------------------------------------------------------ sign-in: only through the portal */
function toPortal() {
  let last = 0; try { last = +sessionStorage.getItem("si-hop") || 0; } catch { /* ignore */ }
  if (Date.now() - last < 30000) return false;   // just came back from the portal and still not in: show the card, never loop
  try { sessionStorage.setItem("si-hop", String(Date.now())); } catch { /* ignore */ }
  location.replace(`${PORTAL}go.html?d=reports`); return true;
}
function showAuth(msg = "") {
  if (toPortal()) return;
  let el = document.getElementById("ercAuth");
  if (!el) {
    document.body.insertAdjacentHTML("beforeend", `<div class="erc-auth" id="ercAuth"><div class="erc-auth-card">
      <span class="erc-eyebrow">Sales Intelligence Portal</span><h2>Open it from the portal</h2>
      <p id="ercAuthMsg">The Elite Reports Console opens only through the Sales Intelligence Portal, after you sign in there.</p>
      <a class="btn btn-primary" href="${PORTAL}go.html?d=reports">Go to the Sales Intelligence Portal</a>
      <div class="erc-credit">Designed and developed by Amit Ray · amitray@lawsikho.in</div></div></div>`);
    el = document.getElementById("ercAuth");
  }
  if (msg) document.getElementById("ercAuthMsg").textContent = msg;
}
async function boot() {
  sb = window.supabase.createClient(CFG.url, CFG.key);
  setTokenGetter(async () => { const { data } = await sb.auth.getSession(); return data.session ? data.session.access_token : ""; });
  const { data } = await sb.auth.getSession();
  if (!data.session) { showAuth(); return; }
  try { await loadSettings(true); }
  catch (e) {
    if (e.workerStatus === 403) { await sb.auth.signOut({ scope: "local" }); showAuth(e.message); }
    else { try { sessionStorage.setItem("si-hop", String(Date.now())); } catch { /* ignore */ } showAuth(`Could not open the console: ${e.message}`); }
    return;
  }
  if (page() === "reports" && !cfg.status().lsq) { location.replace("/setup"); return; }   // as the old app: no keys -> Setup
  const PUSH = { chat_email_referral: "CER_PUSH_URL", incoming: "INCOMING_PUSH_URL", high_priority: "HP_PUSH_URL" };
  for (const r of window.ERC_REPORTS || []) r.push_configured = !!cfg.get(PUSH[r.key]);
  readyResolve();
  decorate();
}
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", boot) : boot();
window.ERC = { ready, cfg, signOut: async () => { await sb.auth.signOut({ scope: "local" }); location.replace(PORTAL + "?signout=1"); } };

/* ------------------------------------------------------------------ per-page touches */
const page = () => document.body.dataset.page || "";
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function decorate() {
  const me = cfg.me();
  const brand = document.querySelector(".sidebar .brand");
  if (brand) brand.insertAdjacentHTML("afterend", `<a class="si-home" href="${PORTAL}" title="Back to the Sales Intelligence Portal"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11.5 12 5l8 6.5M6.5 10v9h11v-9"/></svg> Portal home</a>`);
  const foot = document.querySelector(".sidebar-foot");
  const email = String(me.email || ""), name = email.split("@")[0].split(/[._-]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  if (foot) foot.insertAdjacentHTML("afterbegin", `<div class="erc-user"><div class="si-me" title="${esc(email)}"><span class="si-av">${esc((name || "?")[0])}</span>
    <span class="si-t"><b>${esc(name || email)}</b><small>${esc(email)}</small></span>${me.admin ? '<span class="erc-tag">Admin</span>' : ""}</div>
    <button class="btn btn-sm" type="button" onclick="ERC.signOut()">Sign out</button></div>`);
  if (page() !== "setup" && !cfg.status().lsq) document.querySelector(".content")?.insertAdjacentHTML("afterbegin",
    `<div class="banner"><div><strong>Your LeadSquared keys are not set yet.</strong> Every report is built from a live LeadSquared fetch with your own keys, so nothing can be built until you save them.</div><a class="btn btn-primary btn-sm" href="/setup">Paste keys &rarr;</a></div>`);
  const fn = { setup: setupPage, settings: settingsPage, reports: reportsPage }[page()];
  if (fn) fn(me);
}
function lockShared(me, scopes) {
  for (const [key, scope] of Object.entries(scopes || {})) {
    const el = document.getElementById(key);
    if (!el || scope === "user") continue;
    const note = document.createElement("div");
    note.className = "erc-note";
    if (scope === "user_token") note.textContent = "Your own key — only you set it; nobody else (admins included) can see it.";
    else {
      if (!me.admin) { el.disabled = true; el.closest(".field")?.classList.add("erc-readonly"); el.closest(".field")?.querySelectorAll("button").forEach((b) => { b.disabled = true; }); }
      note.textContent = "Shared for everyone — only a console admin can change it.";
    }
    el.closest(".field")?.appendChild(note);
  }
}
async function setupPage(me) {
  const s = await loadSettings();
  lockShared(me, s.scopes);
  if (!me.admin) {   // a card of shared links only: its Save button is for admins
    document.querySelectorAll("button[onclick*=\"saveCard(null, ['CER_PUSH_URL'\"]").forEach((b) => { b.disabled = true; b.title = "Only a console admin can change shared links."; });
    return;
  }
  const host = document.querySelector(".content");
  host.insertAdjacentHTML("beforeend", `<div class="card"><div class="card-head"><div><h2 class="card-title">Who can use the console</h2>
    <p class="card-sub">Only these emails can open it. Add, remove or change people in the <a href="${PORTAL}#settings" target="_blank" rel="noopener">Sales Intelligence Portal → People and access</a>.</p></div></div>
    <div class="card-body"><div id="ercUsersStatus"></div><div class="table-wrap"><table class="data"><thead><tr><th>Email</th><th>Role</th></tr></thead><tbody id="ercUsers"></tbody></table></div></div></div>`);
  try { const j = await opJson("users.list"); document.getElementById("ercUsers").innerHTML = (j.users || []).map((u) => `<tr><td>${esc(u.email)}</td><td>${esc(u.role)}</td></tr>`).join(""); }
  catch (e) { document.getElementById("ercUsersStatus").textContent = e.message; }
}
async function settingsPage(me) { const s = await loadSettings(); lockShared(me, s.scopes); }
function reportsPage() {
  const days = document.getElementById("fetchDays"), basis = document.getElementById("fetchBasis");
  if (days && cfg.get("DEFAULT_FETCH_DAYS")) days.value = cfg.get("DEFAULT_FETCH_DAYS");
  if (basis && cfg.get("DEFAULT_FETCH_BASIS")) basis.value = cfg.get("DEFAULT_FETCH_BASIS");
}
