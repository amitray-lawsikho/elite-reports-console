/* Elite Reports Console — built from src/client (npm run build). Do not edit. */
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/shared/spec.js
  var SPEC = {
    // LeadSquared
    LSQ_HOST: { def: "api-in21.leadsquared.com", scope: "global" },
    LSQ_ACCESS_KEY: { def: "", scope: "user_token" },
    LSQ_SECRET_KEY: { def: "", scope: "user_token" },
    LSQ_PAGE_SIZE: { def: "1000", scope: "user" },
    LSQ_DATES_ARE_UTC: { def: "true", scope: "user" },
    DEFAULT_FETCH_DAYS: { def: "30", scope: "user" },
    DEFAULT_FETCH_BASIS: { def: "modified", scope: "user" },
    KEEP_HOURS: { def: "12", scope: "user" },
    DOWNLOAD_DATE_FORMAT: { def: "%d/%m/%Y %H:%M:%S", scope: "user" },
    // Sheets (account facts, admins only)
    ROSTER_URL: { def: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRT73ztvPNZSvIu5WLxo-3WQ76JMAnt4P9dITd4EAbjSvuDytfgvdfri1WPXotCjm_Etnb80_Q7S-wf/pub?gid=0&single=true&output=csv", scope: "global" },
    STAGE_LOG_URL: { def: "https://docs.google.com/spreadsheets/d/1Pep2utYPzlnaPCKRVPfQSNdFyMlRpljektmt7DYvHjM/export?format=csv&gid=1411983190", scope: "global" },
    REV_SHEET_URL: { def: "https://docs.google.com/spreadsheets/d/1fFdwIWzS_JOcDLQ8ZP0BlNUm__OTW2vT99JB9hDukJA/export?format=csv&gid=337716200", scope: "global" },
    CER_COMBINED_URL: { def: "https://docs.google.com/spreadsheets/d/1hB3x_3Ww4_XXXaEQC_xPAxhld3dtYfb_zLNYNZgIc3Y/export?format=csv&gid=723301669", scope: "global" },
    CER_PUSH_URL: { def: "https://script.google.com/macros/s/AKfycbw7SFbPltUazDrEWoB9qiAvZVdhSg6I3SsRLvE3ZiJGi5C6Xq5RPgEkuKUisM-VaMvBeg/exec", scope: "global" },
    INCOMING_MASTER_URL: { def: "https://docs.google.com/spreadsheets/d/1hB3x_3Ww4_XXXaEQC_xPAxhld3dtYfb_zLNYNZgIc3Y/export?format=csv&gid=1765275690", scope: "global" },
    INCOMING_PUSH_URL: { def: "https://script.google.com/macros/s/AKfycbyYqOjuDGgbsQkFjKyj4EmHz7zxx5mYPclOrkRpAw_ls6DMEyi-bkKJp0zDnSBba_ntZA/exec", scope: "global" },
    HP_CURRENT_MONTH_URL: { def: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRcc_PLg4grrFReYEc5Qo6A_iAWcj_b4H27AZy0Rjld4PmB6SCeDP6nb8vhTb9Ha6_K6D7ngK82FDh5/pub?gid=0&single=true&output=csv", scope: "global" },
    HP_PREVIOUS_MONTH_URL: { def: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTx_UoJJG8r1haKOrlfYMivp5QYvPHQ53Eh1ApdHprZn8uLgcndqg58haIkG8KiQ_jSgwqcA8f2Y_S-/pub?gid=0&single=true&output=csv", scope: "global" },
    HP_REV_URL_1: { def: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR9ImdIoP2hqQ0kaYZR88il5IhzBL4tA9_i_dawmf_e2Y_oeWR2rv4MVJyZMHpRpSdM4zGncZkjmVSW/pub?gid=1275960172&single=true&output=csv", scope: "global" },
    HP_REV_URL_2: { def: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR9ImdIoP2hqQ0kaYZR88il5IhzBL4tA9_i_dawmf_e2Y_oeWR2rv4MVJyZMHpRpSdM4zGncZkjmVSW/pub?gid=196799956&single=true&output=csv", scope: "global" },
    HP_PUSH_URL: { def: "https://script.google.com/macros/s/AKfycbwokWICjaaHXdbcjDdU03quNdynhgqjGqekRyBGnidImYW9AHkQYA2pZ3RJcDxwZs0kmA/exec", scope: "global" },
    // Ozonetel
    OZONETEL_API_KEY: { def: "", scope: "user_token" },
    OZONETEL_USERNAME: { def: "", scope: "user_token" },
    OZONETEL_API_URL: { def: "https://in1-ccaas-api.ozonetel.com/ca_reports/fetchCDRDetails", scope: "global" },
    OZONETEL_SKILLS: { def: "sales,Arbitrage_Sales", scope: "global" },
    OZONETEL_SLEEP_SECONDS: { def: "32", scope: "user" },
    OZONETEL_PAGE_SIZE: { def: "500", scope: "user" },
    OZONETEL_TODAY_REFRESH_MINUTES: { def: "30", scope: "user" },
    // MCube
    MCUBE_API_KEY: { def: "", scope: "user_token" },
    MCUBE_AUTHORIZATION: { def: "", scope: "user_token" },
    MCUBE_GETAGENTS_TOKEN: { def: "", scope: "user_token" },
    MCUBE_EMPLOYEES_AUTHORIZATION: { def: "", scope: "user_token" },
    MCUBE_AGENT_SOURCE: { def: "both", scope: "user" },
    MCUBE_PUSH_BATCH_SIZE: { def: "200", scope: "user" },
    MCUBE_RETRY_ATTEMPTS: { def: "3", scope: "user" },
    MCUBE_RETRY_TIME: { def: "180", scope: "user" },
    MCUBE_SEND_REFID: { def: "false", scope: "user" },
    MCUBE_PRIORITY: { def: "1", scope: "user" },
    // Acefone
    ACEFONE_TOKEN: { def: "", scope: "user_token" },
    ACEFONE_SKILL_LIST_ID: { def: "", scope: "user" },
    ACEFONE_PUSH_BATCH_SIZE: { def: "500", scope: "user" },
    ACEFONE_PRIORITY: { def: "30", scope: "user" },
    // Breach rules and wording
    RULE_DAYS_FOLLOW_UP: { def: "2", scope: "user" },
    RULE_DAYS_COUNSELLED: { def: "2", scope: "user" },
    RULE_DAYS_CALL_BACK: { def: "2", scope: "user" },
    DNP_COUNTER: { def: "phone", scope: "user" },
    DNP_OPERATOR: { def: "lt", scope: "user" },
    DNP_VALUE: { def: "4", scope: "user" },
    DEFAULT_TEAM: { def: "Elite", scope: "user" },
    DIAL_LABEL_MAX: { def: "6", scope: "user" },
    // Pushing to the sheets
    PUSH_CHUNK_ROWS: { def: "0", scope: "user" },
    PUSH_TIMEOUT_SECONDS: { def: "300", scope: "user" }
  };
  var TOKEN_KEYS = Object.keys(SPEC).filter((k2) => SPEC[k2].scope === "user_token");
  var SHEET_KEYS = Object.keys(SPEC).filter((k2) => /_URL(_\d)?$/.test(k2) && SPEC[k2].scope === "global" && k2 !== "OZONETEL_API_URL");
  var PUSH_KEYS = SHEET_KEYS.filter((k2) => k2.endsWith("_PUSH_URL"));
  var READ_KEYS = SHEET_KEYS.filter((k2) => !k2.endsWith("_PUSH_URL"));
  function getSetting(values, key) {
    const raw = values[key];
    if (raw === void 0 || raw === null || String(raw).trim() === "") return SPEC[key] ? SPEC[key].def : "";
    return String(raw).trim();
  }
  function getInt(values, key, fallback = 0) {
    const n = parseInt(getSetting(values, key), 10);
    return Number.isFinite(n) ? n : fallback;
  }
  function getBool(values, key, fallback = false) {
    const t = getSetting(values, key).toLowerCase();
    if (["1", "true", "yes", "on"].includes(t)) return true;
    if (["0", "false", "no", "off"].includes(t)) return false;
    return fallback;
  }
  var breachDays = (v) => ({
    "Follow Up For Closure": getInt(v, "RULE_DAYS_FOLLOW_UP", 2),
    "Counselled lead": getInt(v, "RULE_DAYS_COUNSELLED", 2),
    "Call Back Later": getInt(v, "RULE_DAYS_CALL_BACK", 2)
  });
  var BREACH_DAY_KEYS = { "Follow Up For Closure": "RULE_DAYS_FOLLOW_UP", "Counselled lead": "RULE_DAYS_COUNSELLED", "Call Back Later": "RULE_DAYS_CALL_BACK" };
  function dnpRule(v) {
    const counter = (getSetting(v, "DNP_COUNTER") || "phone").toLowerCase(), op2 = (getSetting(v, "DNP_OPERATOR") || "lt").toLowerCase();
    return {
      counter: ["phone", "assigned"].includes(counter) ? counter : "phone",
      op: ["lt", "gt", "eq"].includes(op2) ? op2 : "lt",
      value: getSetting(v, "DNP_VALUE") || "4"
    };
  }

  // src/client/core.js
  var ApiError = class extends Error {
    constructor(message, status = null, body = null) {
      super(message);
      this.status = status;
      this.body = body;
    }
  };
  var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  var tokenGetter = async () => "";
  function setTokenGetter(fn) {
    tokenGetter = fn;
  }
  var hooks = null;
  async function op(name, args = {}) {
    if (hooks && hooks.op) return hooks.op(name, args);
    const token2 = await tokenGetter();
    let res;
    try {
      res = await fetch("/x/op", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token2}` },
        body: JSON.stringify({ op: name, args })
      });
    } catch (e) {
      throw new ApiError(`${name}: connection failed \u2014 ${e.message || e}`);
    }
    if (!res.headers.get("x-up-status")) {
      let j = null;
      try {
        j = await res.json();
      } catch {
      }
      if (!res.ok || j && j.ok === false) {
        const err = new Error(j && j.error || `${res.status} ${res.statusText}`);
        err.workerStatus = res.status;
        throw err;
      }
      return { worker: true, json: j };
    }
    return res;
  }
  async function opJson(name, args) {
    const r = await op(name, args);
    return r.json;
  }
  var RateLimiter = class {
    // token bucket: max_rps requests per second (shared by everything in this tab)
    constructor(rps) {
      this.max = rps;
      this.tokens = rps;
      this.last = performance.now();
      this.queue = Promise.resolve();
    }
    acquire() {
      const run3 = async () => {
        for (; ; ) {
          const now = performance.now();
          this.tokens = Math.min(this.max, this.tokens + (now - this.last) / 1e3 * this.max);
          this.last = now;
          if (this.tokens >= 1) {
            this.tokens -= 1;
            return;
          }
          await sleep((1 - this.tokens) / this.max * 1e3);
        }
      };
      const p = this.queue.then(run3);
      this.queue = p.catch(() => {
      });
      return p;
    }
  };
  var limiters = { mcube: new RateLimiter(4), acefone: new RateLimiter(5), lsq: new RateLimiter(5) };
  var RETRYABLE = /* @__PURE__ */ new Set([429, 500, 502, 503, 504]);
  async function request(name, args, { limiter = null, retries = 3, expectJson = true } = {}) {
    let lastErr = null;
    for (let attempt = 1; attempt <= retries; attempt++) {
      if (limiter) await limiter.acquire();
      let res;
      try {
        res = await op(name, args);
      } catch (e) {
        if (!(e instanceof ApiError)) throw e;
        lastErr = e;
        if (attempt === retries) throw new ApiError(e.message);
        await sleep(1e3 * 2 ** (attempt - 1));
        continue;
      }
      const status = parseInt(res.headers.get("x-up-status"), 10);
      const label = res.headers.get("x-up-label") || name;
      const text2 = await res.text();
      if (status < 400) {
        if (!expectJson) return text2;
        if (!text2) return { success: true };
        try {
          return JSON.parse(text2);
        } catch {
          throw new ApiError(`${label}: response was not JSON \u2014 ${text2.slice(0, 300)}`, status, text2);
        }
      }
      if (RETRYABLE.has(status) && attempt < retries) {
        await sleep(1e3 * 2 ** (attempt - 1));
        continue;
      }
      throw new ApiError(`${label}: HTTP ${status} \u2014 ${text2.slice(0, 500)}`, status, text2);
    }
    throw new ApiError(`${name}: all ${retries} attempts failed \u2014 ${lastErr && lastErr.message}`);
  }
  var settingsCache = null;
  async function loadSettings(force = false) {
    if (!force && settingsCache) return settingsCache;
    if (!force) {
      try {
        const s2 = JSON.parse(sessionStorage.getItem("erc.settings") || "null");
        if (s2 && s2.at > Date.now() - 60 * 1e3) {
          settingsCache = s2.data;
          return s2.data;
        }
      } catch {
      }
    }
    const j = await opJson("settings.get");
    settingsCache = j;
    try {
      sessionStorage.setItem("erc.settings", JSON.stringify({ at: Date.now(), data: j }));
    } catch {
    }
    return j;
  }
  function forgetSettings() {
    settingsCache = null;
    try {
      sessionStorage.removeItem("erc.settings");
    } catch {
    }
  }
  var cfg = {
    get: (key) => getSetting(settingsCache ? settingsCache.settings : {}, key),
    int: (key, fb) => getInt(settingsCache ? settingsCache.settings : {}, key, fb),
    bool: (key, fb) => getBool(settingsCache ? settingsCache.settings : {}, key, fb),
    status: () => settingsCache ? settingsCache.status : {},
    all: () => settingsCache ? settingsCache.settings : {},
    set: (values) => {
      settingsCache = { ...settingsCache || {}, settings: { ...(settingsCache || {}).settings || {}, ...values } };
    },
    me: () => settingsCache ? { email: settingsCache.email, admin: settingsCache.admin } : {},
    spec: SPEC
  };
  var dbp = null;
  function db() {
    if (!dbp) dbp = new Promise((resolve, reject) => {
      const r = indexedDB.open("elite-reports-console", 1);
      r.onupgradeneeded = () => {
        r.result.createObjectStore("kv");
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    return dbp;
  }
  async function idbGet(key) {
    if (hooks && hooks.idb) return hooks.idb.get(key);
    const d = await db();
    return new Promise((resolve, reject) => {
      const r = d.transaction("kv").objectStore("kv").get(key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  async function idbSet(key, value) {
    if (hooks && hooks.idb) return hooks.idb.set(key, value);
    const d = await db();
    return new Promise((resolve, reject) => {
      const t = d.transaction("kv", "readwrite");
      t.objectStore("kv").put(value, key);
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  }
  async function idbDel(key) {
    if (hooks && hooks.idb) return hooks.idb.delete(key);
    const d = await db();
    return new Promise((resolve) => {
      const t = d.transaction("kv", "readwrite");
      t.objectStore("kv").delete(key);
      t.oncomplete = () => resolve();
      t.onerror = () => resolve();
    });
  }
  async function idbKeys() {
    if (hooks && hooks.idb) return [...hooks.idb.keys()];
    const d = await db();
    return new Promise((resolve, reject) => {
      const r = d.transaction("kv").objectStore("kv").getAllKeys();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  function* chunked(items, size) {
    size = Math.max(1, parseInt(size, 10) || 1);
    for (let i = 0; i < items.length; i += size) yield items.slice(i, i + size);
  }
  var uuid = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
  function parseCsv(text2) {
    if (text2.charCodeAt(0) === 65279) text2 = text2.slice(1);
    const out = [];
    let row = [], field = "", i = 0, q = false;
    while (i < text2.length) {
      const c = text2[i];
      if (q) {
        if (c === '"') {
          if (text2[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          q = false;
          i++;
          continue;
        }
        field += c;
        i++;
        continue;
      }
      if (c === '"') {
        q = true;
        i++;
        continue;
      }
      if (c === ",") {
        row.push(field);
        field = "";
        i++;
        continue;
      }
      if (c === "\r") {
        i++;
        continue;
      }
      if (c === "\n") {
        row.push(field);
        out.push(row);
        row = [];
        field = "";
        i++;
        continue;
      }
      field += c;
      i++;
    }
    if (field !== "" || row.length) {
      row.push(field);
      out.push(row);
    }
    const nonEmpty = out.filter((r) => r.some((x) => x !== ""));
    if (!nonEmpty.length) return { columns: [], rows: [] };
    const columns = dedupeColumns(nonEmpty[0]);
    const rows = nonEmpty.slice(1).map((r) => {
      const o = {};
      columns.forEach((c, k2) => {
        o[c] = r[k2] === void 0 ? "" : r[k2];
      });
      return o;
    });
    return { columns, rows };
  }
  function dedupeColumns(cols) {
    const seen = {};
    return cols.map((c, k2) => {
      let name = c === "" ? `Unnamed: ${k2}` : c;
      if (seen[name] !== void 0) {
        seen[name] += 1;
        name = `${name}.${seen[name]}`;
      } else seen[name] = 0;
      return name;
    });
  }
  function toCsv(columns, rows) {
    const cell2 = (v) => {
      const t = v === null || v === void 0 ? "" : String(v);
      return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    return [columns.map(cell2).join(","), ...rows.map((r) => columns.map((c) => cell2(Array.isArray(r) ? r[columns.indexOf(c)] : r[c])).join(","))].join("\n") + "\n";
  }
  function downloadText(filename, text2, mime = "text/csv") {
    const blob = text2 instanceof Blob ? text2 : new Blob([text2], { type: `${mime};charset=utf-8` });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 2e3);
  }
  var LIBS = {
    JSZip: "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js",
    XLSX: "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
    ExcelJS: "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js"
  };
  var libLoads = {};
  function lib(name) {
    if (window[name]) return Promise.resolve(window[name]);
    if (!libLoads[name]) libLoads[name] = new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = LIBS[name];
      el.onload = () => resolve(window[name]);
      el.onerror = () => {
        delete libLoads[name];
        reject(new Error(`Could not load ${name} \u2014 check the internet connection and try again.`));
      };
      document.head.appendChild(el);
    });
    return libLoads[name];
  }

  // src/client/apis.js
  var isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
  var str = (v) => (v === null || v === void 0 ? "" : String(v)).trim();
  var mc = (name, args) => request(name, args, { limiter: limiters.mcube });
  async function mcubeAgents() {
    const data = await mc("mcube.getagents", {});
    if (!isObj(data)) throw new ApiError("MCube getagents returned an unexpected response.");
    const list = data.agentlist;
    if (!Array.isArray(list)) {
      throw new ApiError(`MCube getagents did not return an agent list \u2014 ${data.message || data.success || JSON.stringify(data)}`);
    }
    return list.filter(isObj).map((row) => ({
      agent_id: str(row.agent_id),
      agent_name: str(row.agent_name),
      extension: str(row.extension),
      email: str(row.email),
      emp_phone: str(row.emp_phone),
      login_status: str(row.login_status),
      break_status: str(row.break_status)
    }));
  }
  function loginStatus(row) {
    if (str(row.oncall) === "1") return "oncall";
    const flag = str(row.is_logged_in);
    if (flag === "1") return "1";
    if (flag === "0" || flag === "") return flag ? "0" : "";
    return flag;
  }
  async function mcubeEmployees() {
    const data = await mc("mcube.employees", {});
    if (!isObj(data)) throw new ApiError("MCube get-employees returned an unexpected response.");
    let rows = data.employees;
    if (!Array.isArray(rows) || !rows.length) rows = data.agents;
    if (!Array.isArray(rows)) {
      throw new ApiError(`MCube get-employees did not return an employee list \u2014 ${data.message || data.status || "no employees key"}`);
    }
    return rows.filter(isObj).map((row) => ({
      agent_id: str(row.agent_id),
      agent_name: str(row.agent_name),
      extension: str(row.extension || row.softphoneext),
      email: str(row.email),
      emp_phone: str(row.emp_phone),
      login_status: loginStatus(row),
      break_status: str(row.break_status)
    })).filter((r) => r.agent_name);
  }
  var NAME_KEYS = ["name", "campaign_name", "list_name", "autodialer_name", "autodailer_name", "title", "campaign", "description", "label", "dialer_name"];
  function campaignName(row, cid) {
    for (const key of NAME_KEYS) {
      const v = str(row[key]);
      if (v && !/^\d+$/.test(v)) return v;
    }
    const skip = ["id", "date", "time", "status", "count", "flag", "type", "number", "phone", "url", "key", "token"];
    for (const [key, value] of Object.entries(row)) {
      const lowered = String(key).toLowerCase();
      if (skip.some((w) => lowered.includes(w))) continue;
      const text2 = str(typeof value === "object" && value !== null ? "" : value);
      if (text2 && !/^\d+$/.test(text2) && /[A-Za-z]/.test(text2) && text2.length <= 80) return text2;
    }
    return `Campaign ${cid}`;
  }
  async function mcubeCampaigns() {
    const data = await mc("mcube.campaigns", {});
    if (!isObj(data)) throw new ApiError("MCube autodialer-list returned an unexpected response.");
    const rows = data.auto_dialer;
    if (!Array.isArray(rows)) throw new ApiError(`MCube autodialer-list did not return campaigns \u2014 ${data.message || data.error || JSON.stringify(data)}`);
    const out = [];
    for (const row of rows) {
      if (!isObj(row)) continue;
      const cid = row.id || row.campaign_id || row.autodailer_id;
      if (cid === null || cid === void 0 || cid === "") continue;
      out.push({ id: str(cid), name: campaignName(row, cid), raw: row });
    }
    out.sort((a, b) => cmpLower(a.name, b.name));
    return out;
  }
  var cmpLower = (a, b) => {
    const x = a.toLowerCase(), y = b.toLowerCase();
    return x < y ? -1 : x > y ? 1 : 0;
  };
  function mcubeRetryDefaults() {
    return [Math.max(1, cfg.int("MCUBE_RETRY_ATTEMPTS", 3)), Math.max(1, cfg.int("MCUBE_RETRY_TIME", 180))];
  }
  async function mcubeUpload(campaignId, listData) {
    if (!Array.isArray(listData) || !listData.length) throw new Error("list_data must be a non-empty list of leads.");
    if (!/^\s*[+-]?\d+\s*$/.test(String(campaignId))) throw new Error(`campaign_id must be numeric, got '${campaignId}'`);
    return mc("mcube.push", { campaign_id: String(parseInt(campaignId, 10)), listData });
  }
  var blank = (v) => v === null || v === void 0 || v === "";
  function mcubeBuildLead({ number, name = "", source = "", agent_number = "", priority = 1, retry_time = null, retry_attempt = null, ref_id = "" }) {
    const digits = String(number ?? "").replace(/\D/g, "");
    if (!digits) return null;
    let pv = /^[+-]?\d+$/.test(str(priority)) ? parseInt(str(priority), 10) : 1;
    if (pv < 1) pv = 1;
    const [att, mins] = mcubeRetryDefaults();
    const lead = {
      number: Number(digits) <= Number.MAX_SAFE_INTEGER ? Number(digits) : digits,
      name: str(name),
      source: str(source),
      retry_time: String(!blank(retry_time) ? retry_time : mins),
      retry_attempt: String(!blank(retry_attempt) ? retry_attempt : att),
      priority: pv
    };
    const eid = str(agent_number);
    if (eid) lead.eid = eid;
    if (cfg.bool("MCUBE_SEND_REFID") && str(ref_id)) lead.refid = str(ref_id);
    return lead;
  }
  function mcubeSummarise(response) {
    if (!isObj(response)) return { ok: true, message: String(response) };
    const out = { ok: response.status !== false, message: response.msg || response.message || "", raw: response };
    if (Array.isArray(response.success)) out.succeeded = response.success.length;
    if (Array.isArray(response.failed)) {
      out.failed = response.failed.length;
      if (response.failed.length) out.ok = out.ok && response.failed.length === 0;
    }
    return out;
  }
  var ac = (name, args, opts = {}) => request(name, args, { limiter: limiters.acefone, ...opts });
  async function acefoneLists() {
    const res = await ac("acefone.lists", {});
    const rows = isObj(res) ? "data" in res ? res.data : res : res;
    if (!Array.isArray(rows)) return [];
    const out = [];
    for (const row of rows) {
      if (!isObj(row)) continue;
      const lid = row.id || row.list_id;
      if (lid === null || lid === void 0 || lid === "") continue;
      out.push({
        id: str(lid),
        name: str(row.name || row.list_name || `List ${lid}`),
        field_map: Array.isArray(row.field_map) ? row.field_map.map(String) : [],
        raw: row
      });
    }
    out.sort((a, b) => cmpLower(a.name, b.name));
    return out;
  }
  async function acefoneSkillLists() {
    const res = await ac("acefone.skill_lists", {});
    const rows = isObj(res) ? res.data || [] : res;
    if (!Array.isArray(rows)) return [];
    const out = [];
    for (const row of rows) {
      if (!isObj(row) || row.id === null || row.id === void 0 || row.id === "") continue;
      out.push({ id: str(row.id), name: str(row.name || `Skill list ${row.id}`), raw: row });
    }
    out.sort((a, b) => cmpLower(a.name, b.name));
    return out;
  }
  async function acefoneSkills(skillListId, includeDeleted = false) {
    const collected = [];
    let cursor = null;
    for (; ; ) {
      const args = { skill_list_id: skillListId, limit: 100 };
      if (cursor !== null) args.last_seen_id = cursor;
      const res = await ac("acefone.skills", args);
      if (!isObj(res)) break;
      const page2 = res.data || [];
      if (!page2.length) break;
      collected.push(...page2);
      const next = page2[page2.length - 1].id;
      if (next === cursor || !res.hasMore) break;
      cursor = next;
    }
    const out = [];
    for (const row of collected) {
      if (!isObj(row) || row.id === null || row.id === void 0 || row.id === "") continue;
      if (row.deleted_at && !includeDeleted) continue;
      out.push({ id: str(row.id), name: str(row.name), deleted_at: row.deleted_at });
    }
    return out;
  }
  async function acefoneBulkCreate(listId, data, skillId = null, priority = null) {
    if (!Array.isArray(data) || !data.length) throw new Error("data must be a non-empty list of lead objects.");
    const args = { list_id: listId, data };
    if (!blank(skillId)) args.skill_id = str(skillId);
    if (!blank(priority)) args.priority = /^[+-]?\d+$/.test(str(priority)) ? parseInt(priority, 10) : priority;
    return ac("acefone.bulk_create", args);
  }
  function acefoneBuildLead({ phone: phone2, name = "", email: email2 = "", address = "", company = "", ref_id = "", priority = null, skill_id = null }) {
    phone2 = str(phone2);
    if (!phone2) return null;
    const lead = { field_0: phone2, field_1: str(name), field_2: str(email2), field_3: str(address), field_4: str(company), field_5: str(ref_id) };
    if (!blank(priority) && /^[+-]?\d+$/.test(str(priority))) lead.priority = parseInt(str(priority), 10);
    if (!blank(skill_id)) lead.skill_id = str(skill_id);
    return lead;
  }
  var lq = (name, args) => request(name, args, { limiter: limiters.lsq });
  async function lsqUsers() {
    const data = await lq("lsq.users", {});
    let rows = Array.isArray(data) ? data : null;
    if (rows === null && isObj(data)) rows = data.Users || data.List || data.Result;
    if (!Array.isArray(rows)) throw new ApiError(`LeadSquared did not return a user list \u2014 ${JSON.stringify(data).slice(0, 200)}`);
    const users = [];
    for (const row of rows) {
      if (!isObj(row)) continue;
      const uid = row.ID || row.Id || row.UserId;
      const email2 = str(row.EmailAddress);
      if (!uid || !email2) continue;
      const st = /^[+-]?\d+$/.test(str(row.StatusCode ?? 0)) ? parseInt(str(row.StatusCode ?? 0), 10) : 0;
      const first = str(row.FirstName), last = str(row.LastName);
      users.push({ id: str(uid), email: email2, name: `${first} ${last}`.trim() || email2, role: row.Role || "", active: st === 0 });
    }
    return users;
  }
  async function lsqAvailableFields() {
    let data;
    try {
      data = await lq("lsq.metadata", {});
    } catch (e) {
      if (e instanceof ApiError) return null;
      throw e;
    }
    const rows = Array.isArray(data) ? data : isObj(data) ? data.Fields : null;
    if (!Array.isArray(rows)) return null;
    const names = /* @__PURE__ */ new Set();
    for (const row of rows) if (isObj(row)) {
      const n = row.SchemaName || row.schemaName;
      if (n) names.add(str(n));
    }
    return names.size ? names : null;
  }
  var THROTTLE = ["rate", "limit", "too many", "throttl", "exceeded"];
  var isThrottle = (m) => THROTTLE.some((w) => String(m || "").toLowerCase().includes(w));
  async function lsqLeadsPage(cutoffUtc, fields, page2, pageSize = 1e3, { maxWaits = 8, log = null, lookupName = "ModifiedOn", operator = ">" } = {}) {
    const payload = {
      Parameter: { LookupName: lookupName, LookupValue: cutoffUtc, SqlOperator: operator },
      Columns: { Include_CSV: fields.join(",") },
      Paging: { PageIndex: page2, PageSize: Math.min(pageSize, 1e3) }
    };
    let waits = 0;
    for (; ; ) {
      let data;
      try {
        data = await lq("lsq.leads_get", { payload });
      } catch (e) {
        if (e instanceof ApiError && (e.status === 429 || isThrottle(e.message)) && waits < maxWaits) {
          waits += 1;
          if (log) log(`LeadSquared asked us to slow down \u2014 waiting ${waits * 5}s.`);
          await sleep(waits * 5e3);
          continue;
        }
        throw e;
      }
      if (Array.isArray(data)) return data;
      const message = isObj(data) ? data.ExceptionMessage || data.Message || JSON.stringify(data) : "";
      if (isThrottle(message) && waits < maxWaits) {
        waits += 1;
        if (log) log(`LeadSquared asked us to slow down \u2014 waiting ${waits * 5}s.`);
        await sleep(waits * 5e3);
        continue;
      }
      if (isObj(data) && data.success === true && Object.keys(data).length === 1) return [];
      throw new ApiError(`LeadSquared Leads.Get failed on page ${page2}: ${String(message).slice(0, 400)}`);
    }
  }

  // src/client/jobs.js
  var DONE = "__DONE__";
  var jobs = /* @__PURE__ */ new Map();
  var Job = class {
    constructor(kind, title) {
      Object.assign(this, {
        id: uuid(),
        kind,
        title,
        messages: [],
        listeners: /* @__PURE__ */ new Set(),
        stopRequested: false,
        startedAt: Date.now(),
        finishedAt: null,
        status: "running",
        processed: 0,
        total: 0,
        succeeded: 0,
        failed: 0,
        errors: [],
        result: null,
        running: true
      });
    }
    put(message) {
      this.messages.push(String(message));
      for (const fn of this.listeners) {
        try {
          fn(String(message));
        } catch {
        }
      }
    }
    log(message) {
      this.put(message);
    }
    setTotal(total) {
      this.total = parseInt(total, 10) || 0;
      this.emitProgress();
    }
    advance({ succeeded = 0, failed = 0, errors = null } = {}) {
      this.processed += succeeded + failed;
      this.succeeded += succeeded;
      this.failed += failed;
      for (const e of errors || []) if (this.errors.length < 50) this.errors.push(String(e));
      this.emitProgress();
    }
    emitProgress() {
      const pct = this.total ? Math.trunc(this.processed * 100 / this.total) : 0;
      this.put(`__PROGRESS__ ${pct} ${this.processed} ${this.total}`);
    }
    get stopped() {
      return this.stopRequested;
    }
    checkStop() {
      if (this.stopRequested) {
        if (this.status === "running") {
          this.status = "stopped";
          this.log("Stopped on request.");
        }
        return true;
      }
      return false;
    }
    finish(status = null, message = null) {
      if (this.finishedAt) return;
      if (message) this.log(message);
      if (status) this.status = status;
      else if (this.status === "running") this.status = "done";
      this.finishedAt = Date.now();
      this.running = false;
      this.put(DONE);
      updateGuard();
    }
    snapshot() {
      return {
        id: this.id,
        kind: this.kind,
        title: this.title,
        status: this.status,
        processed: this.processed,
        total: this.total,
        succeeded: this.succeeded,
        failed: this.failed,
        errors: this.errors.slice(0, 20),
        result: this.result,
        running: this.running,
        started_at: this.startedAt / 1e3,
        finished_at: this.finishedAt ? this.finishedAt / 1e3 : null
      };
    }
  };
  function start(kind, title, target, ...args) {
    const job = new Job(kind, title);
    job.queue = { put: (line) => job.put(line) };
    jobs.set(job.id, job);
    updateGuard();
    (async () => {
      try {
        await target(job, ...args);
        if (job.status === "running") job.status = "done";
      } catch (e) {
        job.status = "failed";
        job.log(`ERROR: ${e.message || e}`);
        job.errors.push(String(e.message || e));
      } finally {
        job.finish();
      }
    })();
    return job;
  }
  var get = (id) => jobs.get(id) || null;
  function stop(id) {
    const j = jobs.get(id);
    if (!j) return false;
    j.stopRequested = true;
    return true;
  }
  var active = () => [...jobs.values()].filter((j) => j.running).map((j) => j.snapshot());
  var anyRunning = () => [...jobs.values()].some((j) => j.running);
  var recent = (limit = 10) => [...jobs.values()].sort((a, b) => a.running === b.running ? (b.finishedAt || b.startedAt) - (a.finishedAt || a.startedAt) : a.running ? -1 : 1).slice(0, limit).map((j) => j.snapshot());
  function guard(e) {
    e.preventDefault();
    e.returnValue = "A push / delete / fetch is still running in this tab. Leaving stops it.";
    return e.returnValue;
  }
  var guarded = false;
  function updateGuard() {
    if (typeof window === "undefined") return;
    const running = [...jobs.values()].some((j) => j.running);
    if (running && !guarded) {
      window.addEventListener("beforeunload", guard);
      guarded = true;
    }
    if (!running && guarded) {
      window.removeEventListener("beforeunload", guard);
      guarded = false;
    }
  }

  // src/client/dates.js
  var DAY = 864e5;
  var BLANKS = /* @__PURE__ */ new Set(["", "nan", "nat", "none", "null", "0001-01-01 00:00:00", "01/01/0001"]);
  var ISO = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?\s*(Z|UTC|GMT|[+-]00:?00)?$/i;
  var YMD = /^(\d{4})[/.](\d{1,2})[/.](\d{1,2})(?:[ T,]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*([AaPp]\.?[Mm]\.?)?)?\s*(?:IST)?$/i;
  var NUM = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2}|\d{4})(?:[ T,]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*([AaPp]\.?[Mm]\.?)?)?\s*(?:IST)?$/i;
  var SERIAL = /^\d{5}(\.\d+)?$/;
  var clean = (v) => {
    const t = (v === null || v === void 0 ? "" : String(v)).replace(/\s+/g, " ").trim();
    return BLANKS.has(t.toLowerCase()) ? "" : t;
  };
  function compose(y, mo, d, h = 0, mi = 0, se = 0, ap = "") {
    if ([y, mo, d, h, mi, se].some((x) => !Number.isFinite(x))) return null;
    if (ap) {
      const a = ap.toLowerCase().replace(/\./g, "");
      h = h % 12 + (a === "pm" ? 12 : 0);
    }
    if (!(mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && h >= 0 && h <= 23 && mi >= 0 && mi <= 59)) return null;
    if (se < 0 || se > 59 || y < 1678 || y > 2261) return null;
    const t = Date.UTC(y, mo - 1, d, h, mi, se);
    const dt = new Date(t);
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    return t;
  }
  var nz = (x) => x === void 0 || x === null || x === "" ? 0 : Number(x);
  var fixedNow = null;
  function nowIst() {
    return fixedNow !== null ? fixedNow : Date.now() + 5.5 * 3600 * 1e3;
  }
  var normalize = (t) => t === null ? null : t - (t % DAY + DAY) % DAY;
  var todayIst = () => normalize(nowIst());
  var MON = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    sept: 9,
    oct: 10,
    nov: 11,
    dec: 12,
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12
  };
  function fallbackParse(value) {
    let v = value.replace(/\b(IST|GMT\+0?5:?30)\b/gi, "").trim();
    let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*(Z|[+-]\d{2}:?\d{2})$/i);
    if (m) {
      const base = compose(+m[1], +m[2], +m[3], +m[4], +m[5], nz(m[6]));
      if (base === null) return null;
      let off = 0;
      if (m[7].toUpperCase() !== "Z") {
        const s2 = m[7][0] === "-" ? -1 : 1;
        const d = m[7].slice(1).replace(":", "");
        off = s2 * (+d.slice(0, 2) * 60 + +d.slice(2));
      }
      return base - off * 6e4 + 330 * 6e4;
    }
    const tm = "(?:[ T,]+(\\d{1,2}):(\\d{2})(?::(\\d{2}))?(?:\\.\\d+)?\\s*([AaPp]\\.?[Mm]\\.?)?)?";
    m = v.match(new RegExp(`^(\\d{1,2})[\\s\\-/.]+([A-Za-z]{3,9})\\.?[\\s\\-/.,]+(\\d{2}|\\d{4})${tm}$`));
    if (m && MON[m[2].toLowerCase()]) {
      const y = +m[3] < 100 ? +m[3] + 2e3 : +m[3];
      return compose(y, MON[m[2].toLowerCase()], +m[1], nz(m[4]), nz(m[5]), nz(m[6]), m[7] || "");
    }
    m = v.match(new RegExp(`^(?:[A-Za-z]{3,9},?\\s+)?([A-Za-z]{3,9})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})${tm}$`));
    if (m && MON[m[1].toLowerCase()]) return compose(+m[3], MON[m[1].toLowerCase()], +m[2], nz(m[4]), nz(m[5]), nz(m[6]), m[7] || "");
    m = v.match(new RegExp(`^(\\d{4})[\\s\\-/.]+([A-Za-z]{3,9})[\\s\\-/.]+(\\d{1,2})${tm}$`));
    if (m && MON[m[2].toLowerCase()]) return compose(+m[1], MON[m[2].toLowerCase()], +m[3], nz(m[4]), nz(m[5]), nz(m[6]), m[7] || "");
    return null;
  }
  function standardise(values, { isoIsUtc = true, pastOnly = false, defaultDayfirst = true, report = null, now = null } = {}) {
    now = now !== null ? now : nowIst();
    const text2 = values.map(clean);
    const out = new Array(text2.length).fill(null);
    const info = {
      nonblank: text2.filter((t) => t !== "").length,
      iso: 0,
      date_only: 0,
      day_first: 0,
      month_first: 0,
      ambiguous: 0,
      flipped_future: 0,
      order: "",
      other: 0,
      unparsed: 0,
      future: 0,
      samples: []
    };
    const iso = text2.map((t) => t.match(ISO));
    const isoIdx = iso.map((m, i) => m ? i : -1).filter((i) => i >= 0);
    const isIso = new Set(isoIdx);
    if (isoIdx.length) {
      const midnight = isoIdx.map((i) => {
        const m = iso[i];
        return m[4] === void 0 || nz(m[4]) === 0 && nz(m[5]) === 0 && nz(m[6]) === 0;
      });
      const allMid = midnight.every(Boolean);
      isoIdx.forEach((i, k2) => {
        const m = iso[i];
        const stamp2 = compose(+m[1], +m[2], +m[3], nz(m[4]), nz(m[5]), nz(m[6]));
        const noTime = m[4] === void 0;
        const dateOnly = allMid ? midnight[k2] : noTime;
        if (dateOnly) info.date_only += 1;
        const wanted = !dateOnly && (isoIsUtc || m[7] !== void 0);
        out[i] = stamp2 === null ? null : stamp2 + (wanted ? 330 * 6e4 : 0);
      });
      info.iso = isoIdx.length;
    }
    const ymd = text2.map((t, i) => isIso.has(i) ? null : t.match(YMD));
    const isYmd = /* @__PURE__ */ new Set();
    ymd.forEach((m, i) => {
      if (m) {
        isYmd.add(i);
        out[i] = compose(+m[1], +m[2], +m[3], nz(m[4]), nz(m[5]), nz(m[6]), m[7] || "");
      }
    });
    const numIdx = [], num = [];
    text2.forEach((t, i) => {
      if (isIso.has(i) || isYmd.has(i)) return;
      const m = t.match(NUM);
      if (m) {
        numIdx.push(i);
        num.push(m);
      }
    });
    if (numIdx.length) {
      const rows = num.map((m) => {
        const a = +m[1], b = +m[2];
        let y = +m[3];
        if (y < 100) y += 2e3;
        const dmy = compose(y, b, a, nz(m[4]), nz(m[5]), nz(m[6]), m[7] || "");
        const mdy = compose(y, a, b, nz(m[4]), nz(m[5]), nz(m[6]), m[7] || "");
        return { a, b, dmy, mdy, onlyDF: a > 12 && b <= 12 && dmy !== null, onlyMF: b > 12 && a <= 12 && mdy !== null, amb: a <= 12 && b <= 12 };
      });
      info.ambiguous = rows.filter((r) => r.amb).length;
      const vD = rows.filter((r) => r.onlyDF).length, vM = rows.filter((r) => r.onlyMF).length;
      let dayfirst, why;
      if (vD > vM) {
        dayfirst = true;
        why = `day-first (${vD} values can only be day-first, ${vM} only month-first)`;
      } else if (vM > vD) {
        dayfirst = false;
        why = `month-first (${vM} values can only be month-first, ${vD} only day-first)`;
      } else if (pastOnly && rows.some((r) => r.amb)) {
        const fD = rows.filter((r) => r.amb && r.dmy !== null && r.dmy > now).length;
        const fM = rows.filter((r) => r.amb && r.mdy !== null && r.mdy > now).length;
        dayfirst = fD !== fM ? fD < fM : defaultDayfirst;
        why = (dayfirst ? "day-first" : "month-first") + " (no value was unambiguous; chosen because the other order puts calls in the future)";
      } else {
        dayfirst = defaultDayfirst;
        why = (dayfirst ? "day-first" : "month-first") + " (no value was unambiguous; default)";
      }
      rows.forEach((r, k2) => {
        let chosen = r.onlyDF || r.amb && dayfirst ? r.dmy : r.mdy;
        if (r.onlyMF) chosen = r.mdy;
        if (pastOnly) {
          const other2 = dayfirst ? r.mdy : r.dmy;
          if (r.amb && chosen !== null && chosen > now && other2 !== null && other2 <= now) {
            chosen = other2;
            info.flipped_future += 1;
          }
        }
        out[numIdx[k2]] = chosen;
      });
      info.day_first = vD;
      info.month_first = vM;
      info.order = why;
    }
    const serialIdx = /* @__PURE__ */ new Set();
    text2.forEach((t, i) => {
      if (out[i] !== null || !SERIAL.test(t)) return;
      serialIdx.add(i);
      const d = Number(t);
      if (d > 2e4 && d < 8e4) {
        const w = Math.trunc(d);
        out[i] = Date.UTC(1899, 11, 30) + w * DAY + Math.floor((d - w) * DAY);
      }
    });
    let other = 0;
    text2.forEach((t, i) => {
      if (t === "" || out[i] !== null || serialIdx.has(i)) return;
      const p = fallbackParse(t);
      if (p !== null) {
        out[i] = p;
        other += 1;
      }
    });
    info.other = other;
    info.unparsed = text2.filter((t, i) => t !== "" && out[i] === null).length;
    if (pastOnly) info.future = out.filter((t) => t !== null && t > now + 36e5).length;
    if (!info.order) info.order = info.iso && isoIsUtc ? "ISO (UTC \u2192 IST)" : info.iso ? "ISO" : "\u2014";
    else if (info.iso) info.order += isoIsUtc ? `; ${info.iso} ISO values (UTC \u2192 IST)` : `; ${info.iso} ISO values`;
    if (info.date_only) info.order += `; ${info.date_only} date-only, kept as written`;
    if (report) {
      const pick = [];
      numIdx.forEach((i, k2) => {
        if (pick.length < 4 && +num[k2][1] <= 12 && +num[k2][2] <= 12) pick.push(i);
      });
      let added = 0;
      for (let i = 0; i < text2.length && added < 6; i++) {
        if (text2[i] === "") continue;
        added += 1;
        if (!pick.includes(i)) pick.push(i);
      }
      info.samples = pick.slice(0, 6).map((i) => ({ raw: text2[i], ist: out[i] === null ? "" : fmt(out[i], "%d %b %Y %H:%M") }));
      Object.assign(report, info);
    }
    return out;
  }
  var daysSince = (t, today) => t === null || t === void 0 ? null : Math.round((today - normalize(t)) / DAY);
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var FULLM = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var p2 = (x) => String(x).padStart(2, "0");
  function fmt(t, pattern) {
    if (t === null || t === void 0) return "";
    const d = new Date(t);
    const H = d.getUTCHours();
    const map = {
      "%Y": String(d.getUTCFullYear()),
      "%y": p2(d.getUTCFullYear() % 100),
      "%m": p2(d.getUTCMonth() + 1),
      "%d": p2(d.getUTCDate()),
      "%H": p2(H),
      "%M": p2(d.getUTCMinutes()),
      "%S": p2(d.getUTCSeconds()),
      "%I": p2(H % 12 === 0 ? 12 : H % 12),
      "%p": H < 12 ? "AM" : "PM",
      "%b": MONTHS[d.getUTCMonth()],
      "%B": FULLM[d.getUTCMonth()],
      "%A": DAYS[d.getUTCDay()],
      "%a": DAYS[d.getUTCDay()].slice(0, 3),
      "%j": String(Math.floor((t - Date.UTC(d.getUTCFullYear(), 0, 1)) / DAY) + 1).padStart(3, "0"),
      "%%": "%"
    };
    return pattern.replace(/%[YymdHMSIpbBAaj%]/g, (c) => map[c]);
  }

  // src/client/breach.js
  var STAGE_LABELS = {
    "Follow Up For Closure": ["Timely Follow Up", "Follow Up Breached"],
    "Counselled lead": ["Timely Counselled", "Breached Counselled lead"],
    "Call Back Later": ["Timely Called Back", "Breached Call Back"]
  };
  var BREACHED_LABELS = Object.values(STAGE_LABELS).map(([, b]) => b);
  var BREACH_STAGES = Object.keys(STAGE_LABELS);
  var FRESH_STAGES = ["New Lead", "Re-enquired Lead", "Opportunity Created", "Untouched Lead"];
  var DNP_STAGES = ["Call Not Connected", "Call Not Picking Up"];
  var ENROLLED_STAGE = "Actually Enrolled";
  var COUNTER_LABELS = { phone: "Phone Call Counter", assigned: "Assigned On Call Counter" };
  var OP_WORDS = { lt: "less than", gt: "more than", eq: "equal to" };
  var settings = () => {
    try {
      return cfg.all ? cfg.all() : {};
    } catch {
      return {};
    }
  };
  var daysByStage = () => breachDays(settings());
  var dnpRule2 = () => dnpRule(settings());
  var plural = (k2) => {
    k2 = Math.trunc(k2);
    return Math.abs(k2) === 1 ? `${k2} day` : `${k2} days`;
  };
  var str2 = (v) => (v === null || v === void 0 ? "" : String(v)).trim();
  function judge(stages, lastCalled, followUp = null, { days = null, now = null } = {}) {
    days = days || daysByStage();
    now = now !== null && now !== void 0 ? now : nowIst();
    const today = normalize(now);
    const status = [], reason = [];
    stages.forEach((st, i) => {
      const stage = str2(st);
      const n = Object.prototype.hasOwnProperty.call(days, stage) ? Number(days[stage]) : null;
      const last = lastCalled[i] ?? null, fu = followUp ? followUp[i] ?? null : null;
      const dLc = daysSince(last, today), dFu = daysSince(fu, today);
      const hasFu = fu !== null, hasLc = last !== null;
      const fuAhead = hasFu && fu > now;
      const fuNotDue = fuAhead || hasFu && n !== null && dFu < n;
      const calledRecently = hasLc && n !== null && dLc <= n;
      const breached = !fuNotDue && !calledRecently;
      status.push(STAGE_LABELS[stage] ? STAGE_LABELS[stage][breached ? 1 : 0] : "");
      let why = "";
      if (n !== null) {
        if (fuAhead) why = `Follow-up due ${fmt(fu, "%d %b %Y %H:%M")}`;
        else if (fuNotDue) why = `Follow-up ${plural(dFu)} ago \u2014 not overdue yet`;
        else if (calledRecently) why = dLc <= 0 ? "Called today" : `Called ${plural(dLc)} ago`;
        else if (hasFu) why = `Follow-up overdue by ${plural(dFu)}, ${hasLc ? `last call ${plural(dLc)} ago` : "never called"}`;
        else if (hasLc) why = `No call in ${plural(dLc)}`;
        else why = "Never called, no follow-up";
      }
      reason.push(why);
    });
    return [status, reason];
  }
  var isBreachedOne = (status) => BREACHED_LABELS.includes(str2(status));
  function parseNumbers(text2) {
    const wanted = /* @__PURE__ */ new Set();
    for (const part of str2(text2).split(/[,\s]+/)) {
      if (!part) continue;
      const m = part.match(/^(\d+)\s*-\s*(\d+)$/);
      if (m) {
        let [lo, hi] = [parseInt(m[1], 10), parseInt(m[2], 10)].sort((a, b) => a - b);
        if (hi - lo > 1e3) throw new Error(`The range ${part} is too wide.`);
        for (let k2 = lo; k2 <= hi; k2++) wanted.add(k2);
      } else if (/^\d+$/.test(part)) wanted.add(parseInt(part, 10));
      else throw new Error(`'${part}' is not a number, a range like 2-5, or a list like 2,5,7.`);
    }
    if (!wanted.size) throw new Error("Give the DNP counter a number.");
    return wanted;
  }
  function validateDnpRule(rule) {
    rule = rule || {};
    const counter = str2(rule.counter || "phone").toLowerCase(), op2 = str2(rule.op || "lt").toLowerCase(), value = str2(rule.value || "");
    if (!(counter in COUNTER_LABELS)) throw new Error("Pick Phone Call Counter or Assigned On Call Counter for DNP.");
    if (!(op2 in OP_WORDS)) throw new Error("Pick less than, more than or equal to for the DNP counter.");
    if (op2 === "eq") parseNumbers(value);
    else if (!/^\d+$/.test(value)) throw new Error("The DNP counter needs a whole number.");
    return { counter, op: op2, value };
  }
  var dnpCaption = (rule = null) => {
    rule = rule || dnpRule2();
    return `${COUNTER_LABELS[rule.counter]} ${OP_WORDS[rule.op]} ${rule.value}`;
  };
  function dialCount(v) {
    if (typeof v === "number") return Number.isFinite(v) ? Math.trunc(v) : 0;
    const t = str2(v);
    if (t === "" || !/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) return 0;
    const n = Number(t);
    return Number.isFinite(n) ? Math.trunc(n) : 0;
  }
  function counterMatch(counts2, rule = null) {
    rule = rule || dnpRule2();
    const c = counts2.map(dialCount);
    if (rule.op === "eq") {
      const set = parseNumbers(rule.value);
      return c.map((x) => set.has(x));
    }
    const value = parseInt(rule.value, 10);
    return c.map((x) => rule.op === "lt" ? x < value : x > value);
  }
  function dnpMask(view, rule = null) {
    rule = rule || dnpRule2();
    const column = rule.counter === "assigned" ? "_assigned_count" : "_dial_count";
    const m = counterMatch(view.map((r) => column in r ? r[column] : 0), rule);
    return view.map((r, i) => DNP_STAGES.includes(r._stage) && m[i]);
  }
  var freshMask = (view) => view.map((r) => FRESH_STAGES.includes(r._stage));
  var breachedMask = (view) => view.map((r) => isBreachedOne(r._follow_up));
  function dialLabel(value) {
    if (value === null || value === void 0) return "Not Dialled yet";
    const text2 = String(value).trim();
    if (text2 === "" || ["nan", "none", "#n/a", "na"].includes(text2.toLowerCase())) return "Not Dialled yet";
    const num = Number(text2);
    if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(text2) && !/^[+-]?inf(inity)?$/i.test(text2)) return text2;
    if (!Number.isFinite(num)) return text2;
    const count = Math.trunc(num);
    const ceiling = Math.max(1, cfg.int("DIAL_LABEL_MAX", 6));
    if (count <= 0) return "Not Dialled yet";
    if (count === 1) return "1 time dialled";
    if (count <= ceiling) return `${count} times dialled`;
    return `Dialled more than ${ceiling} times`;
  }

  // src/client/sheets.js
  var CACHE_TTL = 180 * 1e3;
  var cache = /* @__PURE__ */ new Map();
  function clearCache() {
    cache.clear();
  }
  async function readCsv(key, label = null, { force = false } = {}) {
    const name = label || "a linked sheet";
    if (!cfg.get(key)) throw new Error(`No link is set for ${name}. Open Settings and paste it.`);
    const hit = cache.get(key);
    if (hit && !force && Date.now() - hit.at < CACHE_TTL) return copy(hit.table);
    let res;
    try {
      res = await op("sheet.read", { key });
    } catch (e) {
      throw new Error(`Could not read ${name}: ${e.message || e}`);
    }
    const status = parseInt(res.headers.get("x-up-status"), 10);
    const body = await res.text();
    if (!(status >= 200 && status < 300)) throw new Error(`Could not read ${name}: ${status} \u2014 ${body.slice(0, 200)}`);
    const head = body.slice(0, 400).trimStart().toLowerCase();
    if (head.startsWith("<!doctype html") || head.startsWith("<html")) {
      throw new Error(`${name} did not return CSV \u2014 the link is probably not published to the web, or points at the sheet's normal view. Use File \u2192 Share \u2192 Publish to web (CSV), or an export?format=csv link.`);
    }
    let table;
    try {
      table = parseCsv(body);
    } catch (e) {
      throw new Error(`Could not read ${name} as a CSV: ${e.message || e}`);
    }
    const seen = /* @__PURE__ */ new Set(), keep = [];
    for (const c of table.columns) {
      const t = String(c).trim();
      if (!seen.has(t)) {
        seen.add(t);
        keep.push([c, t]);
      }
    }
    table = { columns: keep.map(([, t]) => t), rows: table.rows.map((r) => Object.fromEntries(keep.map(([c, t]) => [t, r[c]]))) };
    cache.set(key, { at: Date.now(), table });
    return copy(table);
  }
  var copy = (t) => ({ columns: [...t.columns], rows: t.rows.map((r) => ({ ...r })) });
  async function push(key, columns, rows, { label = null, log = null, stop: stop2 = null } = {}) {
    const name = label || "the Google Sheet";
    if (!cfg.get(key)) throw new Error(`No Apps Script link is set for ${name}. Open Settings and paste it.`);
    const cell2 = (v) => v === null || v === void 0 || typeof v === "number" && !Number.isFinite(v) ? "" : String(v);
    const header = columns.map(String);
    const body = rows.map((r) => columns.map((c) => cell2(r[c])));
    const chunk = Math.max(0, cfg.int("PUSH_CHUNK_ROWS", 0));
    const send = async (payload, note) => {
      const res = await op("sheet.push", { key, rows: payload });
      const status = parseInt(res.headers.get("x-up-status"), 10);
      const reply2 = await res.text();
      if (status !== 200) throw new Error(`${name} refused the push \u2014 HTTP ${status}: ${reply2.slice(0, 300)}`);
      if (log) log(`${note} \u2014 Google replied: ${reply2.trim().slice(0, 200) || "OK"}`);
      return reply2;
    };
    if (log) log(`Pushing ${body.length.toLocaleString("en-US")} row(s) and ${header.length} column(s) to ${name}\u2026`);
    if (!chunk || body.length <= chunk) {
      const reply2 = await send([header, ...body], "Pushed in one request");
      return { rows: body.length, requests: 1, reply: reply2.slice(0, 400) };
    }
    let sent = 0, made = 0, reply = "";
    for (let start2 = 0; start2 < body.length; start2 += chunk) {
      if (stop2 && stop2()) throw new Error(`Push stopped after ${sent.toLocaleString("en-US")} row(s) \u2014 the sheet is now partial.`);
      const batch = body.slice(start2, start2 + chunk);
      reply = await send(start2 === 0 ? [header, ...batch] : batch, `Rows ${(start2 + 1).toLocaleString("en-US")}\u2013${(start2 + batch.length).toLocaleString("en-US")}`);
      sent += batch.length;
      made += 1;
    }
    return { rows: sent, requests: made, reply: reply.slice(0, 400) };
  }

  // src/client/frame.js
  function text(v) {
    if (v === null || v === void 0) return "";
    if (typeof v === "number" && !Number.isFinite(v)) return "";
    const t = String(v).trim();
    return ["nan", "nat", "none", "null"].includes(t.toLowerCase()) ? "" : t;
  }
  function phone(v) {
    if (v === null || v === void 0) return "";
    const d = String(v).replace(/\D/g, "");
    return d.length >= 10 ? d.slice(-10) : "";
  }
  var email = (v) => text(v).toLowerCase();
  var AMPM = "(?:\\s*([AaPp]\\.?[Mm]\\.?))?";
  function guessFormat(v, dayfirst) {
    let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:([ T])(\d{1,2}):(\d{2})(?::(\d{2}))?(\.\d+)?)?$/);
    if (m) return { kind: "ymd", sep: "-", time: m[5] ? m[7] ? "hms" : "hm" : "", t: m[4] || " ", frac: !!m[8] };
    m = v.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (m) return { kind: "ymd", sep: "/", time: m[4] ? m[6] ? "hms" : "hm" : "", t: " " };
    m = v.match(new RegExp(`^(\\d{1,2})([/\\-.])(\\d{1,2})\\2(\\d{4}|\\d{2})(?:\\s+(\\d{1,2}):(\\d{2})(?::(\\d{2}))?${AMPM})?$`));
    if (m) {
      const a = +m[1], b = +m[3];
      let order = dayfirst ? "dm" : "md";
      if (order === "dm" && b > 12 && a <= 12) order = "md";
      if (order === "md" && a > 12 && b <= 12) order = "dm";
      return { kind: order, sep: m[2], year: m[4].length === 2 ? "y" : "Y", time: m[5] ? m[7] ? "hms" : "hm" : "", ampm: !!m[8] };
    }
    return null;
  }
  function parseWith(f, v) {
    let m;
    if (f.kind === "ymd") {
      const sep2 = f.sep === "-" ? "-" : "\\/";
      const t2 = f.time ? (f.t === "T" ? "T" : " ") + "(\\d{1,2}):(\\d{2})" + (f.time === "hms" ? ":(\\d{2})" : "") + (f.frac ? "(?:\\.\\d+)?" : "") : "";
      m = v.match(new RegExp(`^(\\d{4})${sep2}(\\d{1,2})${sep2}(\\d{1,2})${t2}$`));
      if (!m) return null;
      return compose(+m[1], +m[2], +m[3], f.time ? +m[4] : 0, f.time ? +m[5] : 0, f.time === "hms" ? +m[6] : 0);
    }
    const sep = f.sep === "." ? "\\." : f.sep === "-" ? "-" : "\\/";
    const y = f.year === "y" ? "(\\d{2})" : "(\\d{4})";
    const t = f.time ? "\\s+(\\d{1,2}):(\\d{2})" + (f.time === "hms" ? ":(\\d{2})" : "()") + (f.ampm ? "\\s*([AaPp]\\.?[Mm]\\.?)" : "()") : "()()()()";
    m = v.match(new RegExp(`^(\\d{1,2})${sep}(\\d{1,2})${sep}${y}${t}$`));
    if (!m) return null;
    let year = +m[3];
    if (f.year === "y") year += year < 69 ? 2e3 : 1900;
    const [d, mo] = f.kind === "dm" ? [+m[1], +m[2]] : [+m[2], +m[1]];
    if (f.ampm && !(+m[4] >= 1 && +m[4] <= 12)) return null;
    return compose(year, mo, d, f.time ? +m[4] : 0, f.time ? +m[5] : 0, f.time === "hms" ? +m[6] : 0, f.ampm ? m[7] : "");
  }
  function parseOne(v, dayfirst) {
    const f = guessFormat(v, dayfirst);
    if (f) return parseWith(f, v);
    return fallbackParse(v);
  }
  var isBlank = (v) => v === null || v === void 0 || typeof v === "number" && !Number.isFinite(v) || text(v) === "";
  function toDatetime(values, { dayfirst = false } = {}) {
    const first = values.find((v) => !isBlank(v) && typeof v !== "number");
    const f = first === void 0 ? null : guessFormat(text(first), dayfirst);
    return values.map((v) => {
      if (isBlank(v)) return null;
      if (typeof v === "number") return v;
      const t = text(v);
      return f ? parseWith(f, t) : parseOne(t, dayfirst);
    });
  }
  var MONTHS2 = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  var monthLabel = (t) => t === null || t === void 0 ? "" : `${MONTHS2[new Date(t).getUTCMonth()]}-${new Date(t).getUTCFullYear()}`;
  var fmtDate = (t, pattern = null) => t === null || t === void 0 ? "" : fmt(t, pattern || cfg.get("DOWNLOAD_DATE_FORMAT"));
  function firstColumn(columns, ...names) {
    const lookup = /* @__PURE__ */ new Map();
    for (const c of columns) {
      const k2 = String(c).trim().toLowerCase();
      if (!lookup.has(k2)) lookup.set(k2, c);
    }
    for (const n of names) {
      const hit = lookup.get(String(n).trim().toLowerCase());
      if (hit !== void 0) return hit;
    }
    return null;
  }
  function requireColumns(table, columns, label) {
    const missing = columns.filter((c) => !table.columns.includes(c));
    if (missing.length) throw new Error(`${label} is missing the column(s) ${missing.join(", ")}. Found: ${table.columns.slice(0, 25).join(", ")}`);
    return table;
  }
  function dropDuplicates(rows, key, keep = "first") {
    const pick = /* @__PURE__ */ new Map();
    rows.forEach((r, i) => {
      const k2 = key(r);
      if (keep === "last" || !pick.has(k2)) pick.set(k2, i);
    });
    const keepIdx = new Set(pick.values());
    return rows.filter((_, i) => keepIdx.has(i));
  }
  function sortDesc(rows, get3) {
    return rows.map((r, i) => [r, get3(r), i]).sort((a, b) => {
      const x = a[1], y = b[1];
      if (x === null || x === void 0) return y === null || y === void 0 ? a[2] - b[2] : 1;
      if (y === null || y === void 0) return -1;
      return y - x || a[2] - b[2];
    }).map(([r]) => r);
  }
  function index(rows, key) {
    const m = /* @__PURE__ */ new Map();
    for (const r of rows) {
      const k2 = key(r);
      if (!m.has(k2)) m.set(k2, r);
    }
    return m;
  }

  // src/client/roster.js
  var REQUIRED_COLS = ["Caller Name", "Team Name"];
  var OPTIONAL_COLS = ["Vertical", "Email id", "Analyst", "Sales Leader"];
  var OTHERS = "Others";
  var CACHE_TTL2 = 300 * 1e3;
  var cache2 = { roster: null, at: 0 };
  function normaliseName(name) {
    if (name === null || name === void 0) return "";
    const t = String(name).trim().toLowerCase().replace(/[^a-z0-9\s]+/g, " ");
    return t.replace(/\s+/g, " ").trim();
  }
  async function load(force = false) {
    if (cache2.roster && !force && Date.now() - cache2.at < CACHE_TTL2) return cache2.roster.map((r) => ({ ...r }));
    let t = await readCsv("ROSTER_URL", "the roster sheet", { force });
    const rename = (from, to) => {
      t = { columns: t.columns.map((c) => c === from ? to : c), rows: t.rows.map((r) => {
        const o = { ...r };
        if (from in o) {
          o[to] = o[from];
          if (from !== to) delete o[from];
        }
        return o;
      }) };
    };
    for (const c of [...t.columns]) {
      const flat = String(c).replace(/\s+/g, " ").trim();
      if (flat !== c) rename(c, flat);
    }
    if (!t.columns.includes("Vertical")) {
      const lower = Object.fromEntries(t.columns.map((c) => [c.toLowerCase(), c]));
      for (const opt of ["verticals", "vertical name", "vertical"]) if (lower[opt]) {
        rename(lower[opt], "Vertical");
        break;
      }
    }
    requireColumns(t, REQUIRED_COLS, "The roster sheet");
    const rows = t.rows.map((r) => {
      const o = {};
      for (const c of [...REQUIRED_COLS, ...OPTIONAL_COLS]) o[c] = String(r[c] ?? "").trim();
      return o;
    }).filter((r) => r["Caller Name"] !== "");
    cache2 = { roster: rows, at: Date.now() };
    return rows.map((r) => ({ ...r }));
  }
  function clearCache2() {
    cache2 = { roster: null, at: 0 };
    clearCache();
  }
  function makeIndex(roster) {
    const out = /* @__PURE__ */ new Map();
    for (const r of roster) {
      const k2 = normaliseName(r["Caller Name"]);
      if (k2 && !out.has(k2)) out.set(k2, { caller: r["Caller Name"], team: r["Team Name"] || OTHERS, vertical: r.Vertical || OTHERS, email: r["Email id"] || "" });
    }
    return out;
  }
  function attach(rows, ownerColumn, roster) {
    const lookup = makeIndex(roster);
    for (const r of rows) {
      const hit = lookup.get(normaliseName(r[ownerColumn] ?? ""));
      r.Verticals = hit ? hit.vertical : OTHERS;
      r.Team = hit ? hit.team : OTHERS;
    }
    return rows;
  }

  // src/client/runs.js
  var LATEST = "runs:latest";
  var mem = { token: null, frame: null, reports: /* @__PURE__ */ new Map() };
  var SAFE = /^[a-z0-9_\-]+$/;
  var newToken = () => uuid();
  function reportName(report) {
    const name = String(report || "").trim().toLowerCase();
    if (!SAFE.test(name)) throw new Error(`Unknown report: ${JSON.stringify(report)}`);
    return name;
  }
  var k = (token2, part) => `run:${token2}:${part}`;
  async function saveFetch(token2, frame, meta) {
    await idbSet(k(token2, "leads"), frame);
    await idbSet(k(token2, "meta"), { ...meta, _at: Date.now() });
    await idbSet(LATEST, token2);
    mem = { token: token2, frame, reports: /* @__PURE__ */ new Map() };
  }
  async function saveFetchMeta(token2, meta) {
    await idbSet(k(token2, "meta"), { ...meta, _at: Date.now() });
  }
  async function loadFrame(token2) {
    if (mem.token === token2 && mem.frame) return mem.frame;
    const frame = await idbGet(k(token2, "leads"));
    if (!frame) throw new Error("That fetch has expired or was cleaned up \u2014 fetch again.");
    mem = { token: token2, frame, reports: /* @__PURE__ */ new Map() };
    return frame;
  }
  async function loadMeta(token2) {
    const m = await idbGet(k(token2, "meta"));
    if (!m) return null;
    const { _at, ...rest } = m;
    return rest;
  }
  async function latestToken() {
    const token2 = await idbGet(LATEST);
    if (token2 && await idbGet(k(token2, "meta"))) return token2;
    return null;
  }
  async function saveReport(token2, report, view, summary) {
    const name = reportName(report);
    await idbSet(k(token2, `report:${name}`), view);
    await idbSet(k(token2, `summary:${name}`), summary);
    if (mem.token === token2) mem.reports.set(name, view);
  }
  async function loadReport(token2, report) {
    const name = reportName(report);
    if (mem.token === token2 && mem.reports.has(name)) return mem.reports.get(name);
    const view = await idbGet(k(token2, `report:${name}`));
    if (!view) throw new Error("That report has not been built from this fetch yet \u2014 build it first.");
    if (mem.token === token2) mem.reports.set(name, view);
    return view;
  }
  async function reportSummary(token2, report) {
    return await idbGet(k(token2, `summary:${reportName(report)}`)) || null;
  }
  async function builtReports(token2, keys = null) {
    const out = {};
    const prefix = k(token2, "summary:");
    for (const key of await idbKeys()) {
      if (typeof key !== "string" || !key.startsWith(prefix)) continue;
      const name = key.slice(prefix.length);
      if (name.endsWith("__pending")) continue;
      if (keys && !keys.includes(name)) continue;
      out[name] = await idbGet(key);
    }
    return out;
  }
  async function cleanup(maxAgeHours = null) {
    const hours = maxAgeHours !== null ? maxAgeHours : cfg.int("KEEP_HOURS", 12);
    const cutoff = Date.now() - Math.max(1, hours) * 3600 * 1e3;
    const keep = await latestToken();
    const keys = await idbKeys();
    const old = /* @__PURE__ */ new Set();
    for (const key of keys) {
      const m = typeof key === "string" && key.match(/^run:([^:]+):meta$/);
      if (!m || m[1] === keep) continue;
      const meta = await idbGet(key);
      if (!meta || !meta._at || meta._at < cutoff) old.add(m[1]);
    }
    let removed = 0;
    for (const key of keys) {
      const m = typeof key === "string" && key.match(/^run:([^:]+):/);
      if (m && old.has(m[1])) {
        await idbDel(key);
        removed++;
      }
    }
    return removed;
  }

  // src/client/ozonetel.js
  var MAX_DAYS_BACK = 15;
  var MAX_PAGES = 50;
  var lastRequest = 0;
  var OzonetelError = class extends Error {
  };
  var configured = () => !!(cfg.get("OZONETEL_API_KEY") && cfg.get("OZONETEL_USERNAME"));
  var skills = () => String(cfg.get("OZONETEL_SKILLS") || "").split(",").map((x) => x.trim()).filter(Boolean);
  async function waitTurn(job) {
    const gap = Math.max(0, cfg.int("OZONETEL_SLEEP_SECONDS", 32)) * 1e3;
    for (; ; ) {
      const left = lastRequest + gap - Date.now();
      if (left <= 0) {
        lastRequest = Date.now();
        return;
      }
      if (job && job.checkStop()) throw new OzonetelError("Stopped.");
      await sleep(Math.min(left, 1e3));
    }
  }
  async function request2(day, pageNo, pageSize, job) {
    for (let attempt = 0; attempt < 4; attempt++) {
      await waitTurn(job);
      let res;
      try {
        res = await op("ozonetel.cdr", { day, page_no: pageNo, page_size: pageSize });
      } catch (e) {
        if (e.workerStatus) throw new OzonetelError(e.message);
        if (attempt === 3) throw new OzonetelError(`Could not reach Ozonetel: ${e.message || e}`);
        continue;
      }
      const status = parseInt(res.headers.get("x-up-status"), 10);
      const body = await res.text();
      if (status === 429) {
        if (job) job.log("Ozonetel says slow down \u2014 waiting a minute.");
        lastRequest = Date.now() + 3e4;
        continue;
      }
      if (status === 401 || status === 403) throw new OzonetelError("Ozonetel refused the API key or username \u2014 check them on Setup and Tokens.");
      if (status !== 200) throw new OzonetelError(`Ozonetel returned HTTP ${status}: ${body.slice(0, 200)}`);
      let data;
      try {
        data = JSON.parse(body);
      } catch {
        throw new OzonetelError("Ozonetel did not return JSON.");
      }
      if (!["success", "true"].includes(String(data.status ?? "success").toLowerCase())) throw new OzonetelError(`Ozonetel: ${data.message || JSON.stringify(data).slice(0, 200)}`);
      return data;
    }
    throw new OzonetelError("Ozonetel kept rate-limiting \u2014 try again in a few minutes.");
  }
  async function fetchDay(day, job = null) {
    const pageSize = Math.max(1, cfg.int("OZONETEL_PAGE_SIZE", 500));
    const rows = [], seen = /* @__PURE__ */ new Set();
    for (let pageNo = 1; pageNo <= MAX_PAGES; pageNo++) {
      const data = await request2(day, pageNo, pageSize, job);
      const details = data.details || [];
      const fresh = details.filter((r) => !seen.has(String(r.UCID || r.CallID)));
      for (const r of fresh) seen.add(String(r.UCID || r.CallID));
      rows.push(...fresh);
      const total = data.totalCount;
      if (!details.length || !fresh.length || details.length > pageSize || details.length < pageSize || total !== null && total !== void 0 && total !== "" && rows.length >= parseInt(total, 10)) break;
    }
    return rows;
  }
  var ck = (day) => `ozonetel:${day}`;
  async function cached(day, today) {
    const blob = await idbGet(ck(day));
    if (!blob) return null;
    const fetchedDay = fmt(blob.fetched_at, "%Y-%m-%d");
    if (fetchedDay > day) return blob.rows;
    if (day === fmt(today, "%Y-%m-%d")) {
      const freshFor = cfg.int("OZONETEL_TODAY_REFRESH_MINUTES", 30) * 6e4;
      if (nowIst() - blob.fetched_at < freshFor) return blob.rows;
    }
    return null;
  }
  var store = (day, rows) => idbSet(ck(day), { day, fetched_at: nowIst(), rows });
  async function cleanCache(keepDays = 40) {
    const cutoff = fmt(todayIst() - keepDays * DAY, "%Y-%m-%d");
    for (const key of await idbKeys()) if (typeof key === "string" && key.startsWith("ozonetel:") && key.slice(9, 19) < cutoff) await idbDel(key);
  }
  var DT = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
  var D = /^(\d{4})-(\d{2})-(\d{2})$/;
  function when(callDate, startTime) {
    let m = `${callDate} ${startTime}`.match(DT);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
    m = callDate.match(D);
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function toFrame(rows, wantedSkills = null) {
    const wanted = new Set((wantedSkills || skills()).map((x) => x.toLowerCase()));
    const seen = /* @__PURE__ */ new Set(), out = [];
    for (const r0 of rows || []) {
      const r = {};
      for (const c of ["Skill", "UCID", "CallID", "E164", "CallerID", "CallDate", "StartTime", "CampaignName", "CallFlow", "Event", "Status"]) r[c] = r0[c] === null || r0[c] === void 0 ? "" : String(r0[c]).trim();
      if (!wanted.has(r.Skill.toLowerCase())) continue;
      const ucid = r.UCID !== "" ? r.UCID : r.CallID;
      if (seen.has(ucid)) continue;
      seen.add(ucid);
      out.push({
        Campaign: r.CampaignName,
        "Phone Number": r.E164 !== "" ? r.E164 : r.CallerID,
        "Call Date": when(r.CallDate, r.StartTime),
        "Call Flow": r.CallFlow !== "" ? r.CallFlow : r.Event,
        Status: r.Status,
        UCID: ucid,
        Skill: r.Skill
      });
    }
    return out;
  }
  function daysToFetch(lastDay, today = null) {
    today = today !== null ? today : todayIst();
    const earliest = today - MAX_DAYS_BACK * DAY;
    let note = "", start2;
    if (lastDay === null || lastDay === void 0) {
      start2 = earliest;
      note = `The master sheet has no Call Date to start from, so the last ${MAX_DAYS_BACK} days are fetched.`;
    } else {
      start2 = lastDay - (lastDay % DAY + DAY) % DAY;
      if (start2 > today) start2 = today;
      if (start2 < earliest) {
        note = `The master sheet's newest call is ${fmt(start2, "%d %b %Y")}, but Ozonetel only keeps ${MAX_DAYS_BACK} days \u2014 calls from ${fmt(start2, "%d %b")} to ${fmt(earliest - DAY, "%d %b")} cannot be fetched. Upload them into the master sheet by hand if they matter.`;
        start2 = earliest;
      }
    }
    const days = [];
    for (let d = start2; d <= today; d += DAY) days.push(fmt(d, "%Y-%m-%d"));
    return [days, note];
  }
  var fmtN = (n) => Number(n).toLocaleString("en-US");
  async function collect(job, lastDay) {
    if (!configured()) throw new OzonetelError("Ozonetel is not set up \u2014 add your API key and username on Setup and Tokens.");
    const today = todayIst();
    const [days, note] = daysToFetch(lastDay, today);
    if (note) job.log("WARNING: " + note);
    const wanted = skills();
    job.log(`Ozonetel: ${days.length} day(s), ${days[0]} to ${days[days.length - 1]}, skills ${wanted.join(", ")}.`);
    const need = [];
    for (const d of days) if (await cached(d, today) === null) need.push(d);
    if (need.length) {
      const gap = cfg.int("OZONETEL_SLEEP_SECONDS", 32);
      job.log(`${days.length - need.length} day(s) already cached; fetching ${need.length} \u2014 about ${Math.max(1, Math.round(need.length * gap / 60))} minute(s) at Ozonetel's two requests a minute.`);
    }
    let calls = [];
    const perDay = [];
    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      if (job.checkStop()) throw new OzonetelError("Stopped \u2014 the Ozonetel fetch did not finish.");
      let rows = await cached(day, today), source = "cache";
      if (rows === null) {
        job.put(`__STEP__ Ozonetel \u2014 day ${i + 1} of ${days.length} (${day})\u2026`);
        rows = await fetchDay(day, job);
        await store(day, rows);
        source = "API";
      }
      const dayCalls = toFrame(rows, wanted);
      calls.push(...dayCalls);
      perDay.push({ day, calls: rows.length, sales: dayCalls.length, source });
      job.log(`Ozonetel ${day}: ${fmtN(rows.length)} call(s), ${fmtN(dayCalls.length)} sales incoming (${source}).`);
    }
    await cleanCache();
    const seen = /* @__PURE__ */ new Set();
    calls = calls.filter((c) => seen.has(c.UCID) ? false : (seen.add(c.UCID), true));
    const info = {
      from: days[0],
      to: days[days.length - 1],
      days: perDay,
      calls: calls.length,
      numbers: new Set(calls.map((c) => c["Phone Number"])).size,
      note,
      fetched_at: new Date(nowIst()).toISOString().slice(0, 19)
    };
    job.log(`Ozonetel: ${fmtN(info.calls)} sales incoming call(s) from ${fmtN(info.numbers)} number(s).`);
    return [calls, info];
  }

  // src/client/lsq_fetch.js
  var MAX_PAGES2 = 1e3;
  var FIELDS = [
    ["First Name", "FirstName"],
    ["Last Name", "LastName"],
    ["Email", "EmailAddress"],
    ["Enquired Course", "mx_Enquired_Course"],
    ["Campaign Name", "mx_Campaign_Name"],
    ["Contact Stage", "ProspectStage"],
    ["Created On", "CreatedOn"],
    ["Funnel name", "mx_Funnel_name"],
    ["Last Called Date", "mx_Last_Call_new"],
    ["Owner", "OwnerId"],
    ["Phone call counter", "mx_Phone_call_counter"],
    ["Phone Number", "Phone"],
    ["Report_Type", "mx_Report_Type"],
    ["Assigned On Call Counter", "mx_Assigned_On_Call_Counter"],
    ["Zip Intent", "mx_Zip_Intent"],
    ["Zip Intent Justification", "mx_Zip_Intent_Justification"]
  ];
  var SYSTEM_FIELDS = ["ProspectID", "ModifiedOn", "mx_Assigned_On", "mx_Last_Called_Date_DT", "mx_Follow_up_date_and_time", "mx_Next_follow_up_date"];
  var FOLLOW_UP_FIELD = "mx_Follow_up_date_and_time";
  var NEXT_FOLLOW_UP_FIELD = "mx_Next_follow_up_date";
  var FETCH_FIELDS = [...SYSTEM_FIELDS, ...FIELDS.map(([, s2]) => s2)];
  var FETCH_BASES = {
    assigned: { label: "Assigned On", schema: "mx_Assigned_On" },
    modified: { label: "Modified On", schema: "ModifiedOn" },
    created: { label: "Created On", schema: "CreatedOn" },
    last_called: { label: "Last Called On", schema: "mx_Last_Called_Date_DT" }
  };
  var BASIS_ORDER = ["assigned", "modified", "created", "last_called"];
  var DEFAULT_BASIS = "modified";
  var ZIP_FIELDS = ["mx_Zip_Intent", "mx_Zip_Intent_Justification"];
  var pystr = (v) => typeof v === "boolean" ? v ? "True" : "False" : v;
  function buildFrame(rows, owners, { isoIsUtc = true, report = null, now = null } = {}) {
    const raw0 = (rows || []).map((r) => {
      const o = {};
      for (const f of FETCH_FIELDS) o[f] = r[f] === void 0 ? "" : pystr(r[f]);
      o.ProspectID = text(o.ProspectID);
      return o;
    });
    const lastIdx = /* @__PURE__ */ new Map();
    raw0.forEach((r, i) => {
      if (r.ProspectID !== "") lastIdx.set(r.ProspectID, i);
    });
    const raw = [...raw0.filter((r, i) => r.ProspectID !== "" && lastIdx.get(r.ProspectID) === i), ...raw0.filter((r) => r.ProspectID === "")];
    const df = raw.map((r) => {
      const o = {};
      for (const [col, schema] of FIELDS) o[col] = text(r[schema]);
      const oid = o.Owner;
      o.Owner = (owners[oid] || {}).name || "";
      o["Owner Email"] = (owners[oid] || {}).email || "";
      o["Prospect ID"] = text(r.ProspectID);
      o.Phone = phone(o["Phone Number"]);
      o["Phone Number"] = o.Phone ? `91 ${o.Phone}` : "";
      o["Lead Name"] = o["Last Name"] !== "" ? `${o["First Name"]} ${o["Last Name"]}`.trim() : o["First Name"];
      return o;
    });
    const std = (values, opts, field, schema) => {
      const info = {};
      const out = standardise(values, { isoIsUtc, now, report: info, ...opts });
      if (report && field) report.push({ ...info, field, schema });
      return out;
    };
    const created = std(df.map((o) => o["Created On"]), { pastOnly: true }, "Created On", "CreatedOn");
    const textCall = std(df.map((o) => o["Last Called Date"]), { pastOnly: true, defaultDayfirst: false }, "Last Called Date", "mx_Last_Call_new");
    const fieldCall = std(raw.map((r) => text(r.mx_Last_Called_Date_DT)), { pastOnly: true }, "Last Called On", "mx_Last_Called_Date_DT");
    const follow = std(raw.map((r) => text(r[FOLLOW_UP_FIELD])), {}, "Follow up date and time", FOLLOW_UP_FIELD);
    const nextFollow = std(raw.map((r) => text(r[NEXT_FOLLOW_UP_FIELD])), {}, "Next follow up date", NEXT_FOLLOW_UP_FIELD);
    const assigned = std(raw.map((r) => text(r.mx_Assigned_On)), { pastOnly: true }, null, null);
    const modified = std(raw.map((r) => text(r.ModifiedOn)), { pastOnly: true }, null, null);
    df.forEach((o, i) => {
      o._created = created[i];
      o._last_called = fieldCall[i] !== null ? fieldCall[i] : textCall[i];
      o._last_called_source = fieldCall[i] !== null ? "mx_Last_Called_Date_DT" : textCall[i] !== null ? "mx_Last_Call_new" : "";
      const a = follow[i], b = nextFollow[i];
      o._follow_up_dt = a === null ? b : b === null ? a : Math.max(a, b);
      o._assigned = assigned[i];
      o._modified = modified[i];
    });
    return df;
  }
  var fmtN2 = (n) => Number(n).toLocaleString("en-US");
  var utcText = (d) => d.toISOString().slice(0, 19).replace("T", " ");
  async function run(job, days, basis = null, keep = true) {
    days = parseInt(days, 10);
    if (!(days >= 1 && days <= 365)) throw new Error("Days must be between 1 and 365.");
    basis = String(basis || DEFAULT_BASIS).trim().toLowerCase();
    if (!(basis in FETCH_BASES)) throw new Error("Choose what to fetch on the basis of: " + BASIS_ORDER.map((k2) => FETCH_BASES[k2].label).join(", "));
    const { label: basisLabel, schema: basisSchema } = FETCH_BASES[basis];
    const started = Date.now();
    const cutoffText = utcText(new Date(Date.now() - days * 864e5));
    job.log(`Fetching on the basis of ${basisLabel} (${basisSchema}): the last ${days} day(s), after ${cutoffText} UTC.`);
    if (basis !== "modified") job.log(`Leads with no ${basisLabel} date are not part of this fetch.`);
    job.log("Reading the LeadSquared user list\u2026");
    const users = await lsqUsers();
    const owners = Object.fromEntries(users.map((u) => [u.id, { name: u.name, email: u.email }]));
    job.log(`${Object.keys(owners).length} LeadSquared users loaded.`);
    let wanted = [...FETCH_FIELDS], missing = [];
    const known = await lsqAvailableFields();
    if (known) {
      if (!known.has(basisSchema)) throw new Error(`${basisLabel} (${basisSchema}) is not a field on this LeadSquared account, so the fetch cannot be based on it. Pick another one.`);
      missing = wanted.filter((f) => !known.has(f) && f !== "ProspectID" && f !== "ModifiedOn");
      if (missing.length) job.log("Not on this LeadSquared account, left blank: " + missing.join(", "));
      for (const f of [FOLLOW_UP_FIELD, NEXT_FOLLOW_UP_FIELD]) if (missing.includes(f)) job.log(`WARNING: ${f} is not on this account, so the breach rule cannot use it.`);
      const zipMissing = ZIP_FIELDS.filter((f) => missing.includes(f));
      if (zipMissing.length) job.log("WARNING: " + zipMissing.join(" and ") + " do not exist on this account, so Zip Intent / Zip Intent Justification will be blank in every report. Check the field's schema name in LeadSquared.");
      wanted = wanted.filter((f) => !missing.includes(f));
    } else job.log("Could not read the field list \u2014 asking for every field as-is.");
    const pageSize = Math.max(1, Math.min(cfg.int("LSQ_PAGE_SIZE", 1e3), 1e3));
    const rows = [];
    for (let page2 = 1; page2 <= MAX_PAGES2; page2++) {
      if (job.checkStop()) throw new Error("Fetch stopped \u2014 nothing was saved.");
      const batch = await lsqLeadsPage(cutoffText, wanted, page2, pageSize, { log: (m) => job.log(m), lookupName: basisSchema });
      if (!batch.length) break;
      rows.push(...batch);
      job.processed = rows.length;
      job.log(`Page ${page2}: ${fmtN2(batch.length)} leads \u2014 ${fmtN2(rows.length)} so far.`);
      job.put(`__COUNT__ ${rows.length} ${page2}`);
      await sleep(250);
    }
    job.log(`LeadSquared returned ${fmtN2(rows.length)} lead rows.`);
    const dateCheck = [];
    const frame = buildFrame(rows, owners, { isoIsUtc: cfg.bool("LSQ_DATES_ARE_UTC", true), report: dateCheck });
    for (const item of dateCheck) {
      if (!item.nonblank) continue;
      job.log(`${item.field}: ${fmtN2(item.nonblank - item.unparsed)} of ${fmtN2(item.nonblank)} read \u2014 ${item.order}`);
      if (item.unparsed) job.log(`WARNING: ${fmtN2(item.unparsed)} ${item.field} value(s) could not be read as dates and are treated as blank.`);
    }
    const tagged = frame.filter((r) => r.Report_Type.trim() !== "").length;
    const zipIntent = frame.filter((r) => r["Zip Intent"].trim() !== "").length;
    job.log(`${fmtN2(tagged)} of ${fmtN2(frame.length)} lead(s) have a Report_Type set \u2014 those are the ones the reports are built from.`);
    job.log(`Zip Intent is filled on ${fmtN2(zipIntent)} lead(s).`);
    const types = /* @__PURE__ */ new Map();
    for (const r of frame) if (r.Report_Type.trim() !== "") types.set(r.Report_Type, (types.get(r.Report_Type) || 0) + 1);
    const stats = {
      rows: frame.length,
      tagged,
      untagged: frame.length - tagged,
      zip_intent: zipIntent,
      zip_justification: frame.filter((r) => r["Zip Intent Justification"].trim() !== "").length,
      no_owner: frame.filter((r) => r.Owner === "").length,
      no_last_call: frame.filter((r) => r._last_called === null).length,
      follow_up: frame.filter((r) => r._follow_up_dt !== null).length,
      report_types: Object.fromEntries([...types].sort((a, b) => b[1] - a[1]).slice(0, 20))
    };
    const token2 = newToken();
    const seconds = Math.round((Date.now() - started) / 100) / 10;
    const meta = {
      token: token2,
      days,
      basis,
      basis_label: basisLabel,
      basis_schema: basisSchema,
      cutoff_utc: cutoffText,
      fetched_at: (/* @__PURE__ */ new Date()).toISOString(),
      raw_rows: rows.length,
      missing_fields: missing,
      zip_fields_missing: ZIP_FIELDS.filter((f) => missing.includes(f)),
      stats,
      date_check: dateCheck,
      seconds
    };
    const mins = Math.floor(seconds / 60), secs = Math.floor(seconds % 60);
    if (!keep) {
      job.log(`Done \u2014 ${fmtN2(frame.length)} unique leads in ${mins}m ${secs}s.`);
      job.result = { ...meta, frame };
      return;
    }
    await saveFetch(token2, frame, meta);
    await cleanup();
    job.log(`Done \u2014 ${fmtN2(frame.length)} unique leads ready in ${mins}m ${secs}s.`);
    job.result = meta;
  }
  var taggedOnly = (frame) => frame.filter((r) => text(r.Report_Type) !== "");

  // src/client/reports/chat_email_referral.js
  var chat_email_referral_exports = {};
  __export(chat_email_referral_exports, {
    COLUMNS: () => COLUMNS,
    FILENAME: () => FILENAME,
    KEY: () => KEY,
    NEEDS_UPLOAD: () => NEEDS_UPLOAD,
    PUSH_SETTING: () => PUSH_SETTING,
    REPORT_TYPE: () => REPORT_TYPE,
    SUBTITLE: () => SUBTITLE,
    TITLE: () => TITLE,
    build: () => build,
    pending: () => pending
  });

  // src/client/reports/base.js
  var NA = "#N/A";
  var ZIP_COLUMNS = ["Zip Intent", "Zip Intent Justification"];
  function opsCallerColumn(columns) {
    for (const c of columns) {
      const flat = String(c).replace(/\s+/g, " ").trim().toLowerCase();
      if (flat.includes("caller name") && flat.includes("ops")) return c;
    }
    return null;
  }
  var Enrollments = class _Enrollments {
    constructor(byPhone, byEmail, rows, source) {
      Object.assign(this, { byPhone, byEmail, rows, source });
    }
    /** keys: setting names holding the tracker link(s). */
    static async load(keys, label, { onlyNewEnrollment = false, log = null, force = false } = {}) {
      const tables = [];
      for (const k2 of Array.isArray(keys) ? keys : [keys]) if (cfg.get(k2)) tables.push(await readCsv(k2, label, { force }));
      if (!tables.length) throw new Error(`No link is set for ${label}. Open Settings and paste it.`);
      const columns = [];
      for (const t of tables) for (const c of t.columns) if (!columns.includes(c)) columns.push(c);
      let rev = tables.flatMap((t) => t.rows);
      const phoneCol = firstColumn(columns, "Contact No", "Contact_No", "Contact Number", "Phone");
      const emailCol = firstColumn(columns, "Email Id", "Email_Id", "Email", "Email Address");
      const dateCol = firstColumn(columns, "Date", "Enrollment Date");
      const callerCol = opsCallerColumn(columns);
      if (phoneCol === null && emailCol === null) throw new Error(`${label} has no contact number or email column to match on. Found: ${columns.slice(0, 25).join(", ")}`);
      if (dateCol === null) throw new Error(`${label} has no Date column, so enrollments cannot be dated.`);
      if (onlyNewEnrollment) {
        const flag = firstColumn(columns, "Enrollment", "Enrollment Type");
        if (flag !== null) {
          const before = rev.length;
          rev = rev.filter((r) => text(r[flag]).toLowerCase() === "new enrollment");
          if (log) log(`${label}: ${rev.length.toLocaleString("en-US")} new enrollment(s) of ${before.toLocaleString("en-US")} row(s).`);
        }
      }
      const dates = toDatetime(rev.map((r) => r[dateCol]), { dayfirst: true });
      let keyed = rev.map((r, i) => ({
        _date: dates[i],
        _caller: callerCol ? text(r[callerCol]) : "",
        _phone: phoneCol ? phone(r[phoneCol]) : "",
        _email: emailCol ? email(r[emailCol]) : ""
      }));
      keyed = sortDesc(keyed, (r) => r._date);
      const byPhone = /* @__PURE__ */ new Map(), byEmail = /* @__PURE__ */ new Map();
      for (const r of keyed) {
        if (r._phone && !byPhone.has(r._phone)) byPhone.set(r._phone, r);
        if (r._email && !byEmail.has(r._email)) byEmail.set(r._email, r);
      }
      if (callerCol === null && log) log(`WARNING: ${label} has no 'Caller name (for ops)' column, so enrolled leads keep the owner they already had instead of the person who circulated the link.`);
      return new _Enrollments(byPhone, byEmail, keyed.length, label);
    }
    /** [dates[], callers[]] — phone first, then email. */
    lookup(phones, emails = null) {
      const dates = [], callers = [];
      phones.forEach((p, i) => {
        const hp = this.byPhone.get(p ?? "");
        let date = hp ? hp._date : null, caller = hp ? hp._caller : null;
        if (emails && this.byEmail.size) {
          const he = this.byEmail.get(email(emails[i]));
          if (date === null && he) date = he._date;
          if ((caller === null || caller === "") && he) caller = he._caller;
        }
        dates.push(date);
        callers.push(text(caller));
      });
      return [dates, callers];
    }
  };
  async function stageComments({ log = null, force = false } = {}) {
    if (!cfg.get("STAGE_LOG_URL")) {
      if (log) log("No stage-change log link is set, so Comment LSQ will be blank.");
      return /* @__PURE__ */ new Map();
    }
    const t = await readCsv("STAGE_LOG_URL", "the stage-change log", { force });
    const pc = firstColumn(t.columns, "Phone", "Phone Number", "Mobile"), cc = firstColumn(t.columns, "Comments", "Comment");
    const wc = firstColumn(t.columns, "StageChangedOn", "Stage Changed On", "ModifiedOn");
    if (pc === null || cc === null) {
      if (log) log("WARNING: the stage-change log has no Phone/Comments columns, so Comment LSQ will be blank.");
      return /* @__PURE__ */ new Map();
    }
    let rows = t.rows.map((r) => ({ _phone: phone(r[pc]), _comment: text(r[cc]), _raw_when: wc !== null ? r[wc] : null })).filter((r) => r._phone !== "" && r._comment !== "" && !r._comment.includes("ActionType"));
    if (wc !== null) {
      const when2 = toDatetime(rows.map((r) => r._raw_when), { dayfirst: true });
      rows.forEach((r, i) => {
        r._when = when2[i];
      });
      rows = sortDesc(rows, (r) => r._when);
    }
    const out = /* @__PURE__ */ new Map();
    for (const r of rows) if (!out.has(r._phone)) out.set(r._phone, r._comment);
    return out;
  }
  async function stageEmails({ force = false } = {}) {
    if (!cfg.get("STAGE_LOG_URL")) return /* @__PURE__ */ new Map();
    const t = await readCsv("STAGE_LOG_URL", "the stage-change log", { force });
    const pc = firstColumn(t.columns, "Phone", "Phone Number"), ec = firstColumn(t.columns, "EmailAddress", "Email Address", "Email");
    if (pc === null || ec === null) return /* @__PURE__ */ new Map();
    const out = /* @__PURE__ */ new Map();
    for (const r of t.rows) {
      const p = phone(r[pc]), e = text(r[ec]);
      if (p && e && !out.has(p)) out.set(p, e);
    }
    return out;
  }
  function applyBreach(rows, stageCol, lastCalledCol, followUpCol, counterCol, statusCol, labelCol) {
    const [status, reason] = judge(
      rows.map((r) => r[stageCol]),
      rows.map((r) => r[lastCalledCol] ?? null),
      rows.map((r) => followUpCol in r ? r[followUpCol] ?? null : null)
    );
    rows.forEach((r, i) => {
      r[statusCol] = status[i];
      r._reason = reason[i];
      r[labelCol] = dialLabel(r[counterCol]);
    });
    return rows;
  }
  function buildView(rows, {
    owner,
    stage,
    followUp,
    dialLabel: dialLabel2,
    dialCount: dialCount2,
    monthFrom,
    typeColumn = null,
    campaign = null,
    dateColumn = null,
    phoneCol = null,
    assignedCount = "Assigned On Call Counter"
  }) {
    for (const r of rows) {
      r._owner = text(r[owner]) || "(No owner)";
      r._stage = text(r[stage]);
      r._follow_up = text(r[followUp]);
      r._dial_label = text(r[dialLabel2]);
      r._dial_count = dialCount(r[dialCount2]);
      r._assigned_count = assignedCount in r ? dialCount(r[assignedCount]) : 0;
      r._phone = phoneCol && phoneCol in r ? phone(r[phoneCol]) : "";
      if (!("_reason" in r)) r._reason = "";
      r._month = monthLabel(r[monthFrom] ?? null);
      r._type = typeColumn ? text(r[typeColumn]) : "";
      r._campaign = campaign ? text(r[campaign]) : "";
      const d = r[dateColumn || monthFrom];
      r._date = typeof d === "number" ? d : null;
      r._enrolled = r._stage === ENROLLED_STAGE;
      r._team = "Team" in r ? text(r.Team) || OTHERS : OTHERS;
      r._vertical = "Verticals" in r ? text(r.Verticals) || OTHERS : OTHERS;
    }
    return rows;
  }
  var cellOut = (v) => v === null || v === void 0 || typeof v === "number" && !Number.isFinite(v) ? "" : v;
  function outputColumns(columns) {
    return [...columns.filter((c) => !ZIP_COLUMNS.includes(c)), ...ZIP_COLUMNS];
  }
  function finish(rows, columns) {
    const cols = outputColumns(columns);
    return { columns: cols, rows: rows.map((r) => Object.fromEntries(cols.map((c) => [c, c in r ? cellOut(r[c]) : ""]))) };
  }
  function summarise(out, view) {
    const total = view.length;
    const enrolled = view.filter((r) => r._stage === ENROLLED_STAGE).length;
    return {
      total,
      enrolled,
      conversion: total ? Math.round(enrolled * 1e3 / total) / 10 : 0,
      breached: view.filter((r) => isBreachedOne(r._follow_up)).length,
      fresh: view.filter((r) => FRESH_STAGES.includes(r._stage)).length,
      dnp: dnpMask(view).filter(Boolean).length,
      owners: new Set(view.map((r) => r._owner)).size,
      zip_intent: out.columns.includes("Zip Intent") ? out.rows.filter((r) => text(r["Zip Intent"]) !== "").length : 0
    };
  }

  // src/client/reports/chat_email_referral.js
  var KEY = "chat_email_referral";
  var TITLE = "Chat, Email & Referral";
  var SUBTITLE = "Hand-kept enquiry sheet, enriched from LeadSquared and the enrollment tracker.";
  var REPORT_TYPE = "Chat/Email/Referral";
  var NEEDS_UPLOAD = null;
  var COLUMNS = [
    "Date",
    "Course_Enquired",
    "Name",
    "Email",
    "Lead_Phone_Number",
    "Owner",
    "Contact_Stage",
    "Type",
    "Last Called date",
    "Next Follow Up Date",
    "Follow Up status",
    "Phone Call Counter",
    "Phone Call Counter Formula",
    "Enrollment Tracker",
    "Manage Contact Tracker",
    "Assigned On Call Counter",
    "Assigned On Call Counter Formula"
  ];
  var PUSH_SETTING = "CER_PUSH_URL";
  var FILENAME = "Chat_Email_Referral";
  var fmtN3 = (n) => Number(n).toLocaleString("en-US");
  async function build(job, lsq, { force = false } = {}) {
    const log = (m) => job.log(m);
    log("Reading the Chat / Email / Referral enquiry sheet\u2026");
    if (!cfg.get("CER_COMBINED_URL")) throw new Error('Chat/Email/Referral sheet is not configured. Open the "Settings" page and paste it.');
    const sheet = await readCsv("CER_COMBINED_URL", "the Chat / Email / Referral sheet", { force });
    requireColumns(sheet, ["Lead_Phone_Number"], "The Chat / Email / Referral sheet");
    const rows = sheet.rows.map((r) => ({ ...r }));
    log(`${fmtN3(rows.length)} enquiry row(s).`);
    const snap = index(dropDuplicates(lsq.filter((r) => r.Phone !== ""), (r) => r.Phone, "last"), (r) => r.Phone);
    log(`${fmtN3(snap.size)} LeadSquared lead(s) with a usable phone number to match against.`);
    const stageEmails2 = await stageEmails({ force });
    let fromLsq = 0;
    for (const r of rows) {
      r.Phone = phone(r.Lead_Phone_Number);
      const s2 = snap.get(r.Phone);
      r.Email = text(r.Email) || text(s2 ? s2.Email : "") || text(stageEmails2.get(r.Phone));
      r._last_called = s2 ? s2._last_called : null;
      r._follow_up_dt = s2 ? s2._follow_up_dt : null;
      r["Phone Call Counter"] = s2 ? s2["Phone call counter"] : 0;
      r["Assigned On Call Counter"] = s2 ? s2["Assigned On Call Counter"] : "";
      r["Zip Intent"] = text(s2 ? s2["Zip Intent"] : "");
      r["Zip Intent Justification"] = text(s2 ? s2["Zip Intent Justification"] : "");
      const lsqStage = text(s2 ? s2["Contact Stage"] : "");
      if (lsqStage !== "") fromLsq++;
      r.Contact_Stage = lsqStage || text(r.Contact_Stage);
      r.Owner = text(r.Owner);
    }
    log(`Contact stage from LeadSquared on ${fmtN3(fromLsq)} row(s); from the sheet on the rest.`);
    log("Matching the enrollment tracker\u2026");
    const enrol = await Enrollments.load("REV_SHEET_URL", "the enrollment tracker", { log, force });
    const [enrolledOn, opsCaller] = enrol.lookup(rows.map((r) => r.Phone), rows.map((r) => r.Email));
    let hits = 0;
    rows.forEach((r, i) => {
      r["Enrollment Tracker"] = fmtDate(enrolledOn[i], "%d/%m/%Y") || NA;
      if (enrolledOn[i] !== null) {
        hits++;
        r.Contact_Stage = ENROLLED_STAGE;
        if (opsCaller[i] !== "") r.Owner = opsCaller[i];
      }
    });
    log(`${fmtN3(hits)} lead(s) matched an enrollment.`);
    const knownEmails = new Set([...snap.values()].map((s2) => email(s2.Email)).filter(Boolean));
    for (const r of rows) r["Manage Contact Tracker"] = snap.has(r.Phone) || knownEmails.has(r.Email.toLowerCase()) ? "Available" : "Unavailable";
    applyBreach(rows, "Contact_Stage", "_last_called", "_follow_up_dt", "Phone Call Counter", "Follow Up status", "Phone Call Counter Formula");
    const dates = toDatetime(rows.map((r) => "Date" in r ? r.Date : ""), { dayfirst: true });
    rows.forEach((r, i) => {
      r["Assigned On Call Counter Formula"] = dialLabel(r["Assigned On Call Counter"]);
      r["Last Called date"] = fmtDate(r._last_called) || NA;
      r["Next Follow Up Date"] = fmtDate(r._follow_up_dt) || NA;
      r.Lead_Phone_Number = r.Phone !== "" ? r.Phone : text(r.Lead_Phone_Number);
      if (!("Date" in r)) r.Date = "";
      r._date = dates[i];
    });
    attach(rows, "Owner", await load(force));
    buildView(rows, {
      owner: "Owner",
      stage: "Contact_Stage",
      followUp: "Follow Up status",
      dialLabel: "Phone Call Counter Formula",
      dialCount: "Phone Call Counter",
      monthFrom: "_date",
      typeColumn: "Type",
      campaign: "Course_Enquired",
      dateColumn: "_date",
      phoneCol: "Phone"
    });
    const out = finish(rows, COLUMNS);
    const summary = summarise(out, rows);
    summary.unavailable = rows.filter((r) => r["Manage Contact Tracker"] === "Unavailable").length;
    log(`Built ${fmtN3(out.rows.length)} row(s); ${fmtN3(summary.unavailable)} not yet in LeadSquared.`);
    return [out, rows, summary];
  }
  function pending(out, view) {
    const rows = view.filter((r) => r["Manage Contact Tracker"] === "Unavailable" && r._last_called === null && r.Phone !== "");
    return dropDuplicates(rows.map((r) => ({ "Phone Number": r.Phone, "Prospect ID": "", Email: r.Email, Report_Type: REPORT_TYPE })), (r) => r["Phone Number"]);
  }

  // src/client/reports/incoming.js
  var incoming_exports = {};
  __export(incoming_exports, {
    COLUMNS: () => COLUMNS2,
    FILENAME: () => FILENAME2,
    KEY: () => KEY2,
    NEEDS_UPLOAD: () => NEEDS_UPLOAD2,
    PUSH_SETTING: () => PUSH_SETTING2,
    REPORT_TYPE: () => REPORT_TYPE2,
    SUBTITLE: () => SUBTITLE2,
    TITLE: () => TITLE2,
    _text: () => text,
    build: () => build2,
    lastReportDay: () => lastReportDay,
    pending: () => pending2,
    prepareCalls: () => prepareCalls,
    readMaster: () => readMaster
  });
  var KEY2 = "incoming";
  var TITLE2 = "Incoming Leads";
  var SUBTITLE2 = "Sales incoming calls from the Ozonetel API, merged with the master sheet and resolved against LeadSquared.";
  var REPORT_TYPE2 = "Incoming";
  var NEEDS_UPLOAD2 = null;
  var COLUMNS2 = [
    "Campaign",
    "Phone Number",
    "Call Date",
    "Call Flow",
    "Status",
    "Contact_Stage",
    "Owner",
    "Last Called Date",
    "Next Follow Up Date",
    "Follow Up Status",
    "Phone call counter",
    "Phone call counter formula",
    "Enrollment Tracker",
    "Owner According to Rev Sheet",
    "Verticals",
    "Team",
    "Comment LSQ",
    "Comment Analysis",
    "Assigned On Call Counter",
    "Assigned On Call Counter Formula"
  ];
  var PUSH_SETTING2 = "INCOMING_PUSH_URL";
  var FILENAME2 = "Incoming_Report";
  var NA2 = "#NA";
  var fmtN4 = (n) => Number(n).toLocaleString("en-US");
  async function readMaster({ force = false } = {}) {
    if (!cfg.get("INCOMING_MASTER_URL")) throw new Error('Incoming master sheet is not configured. Open the "Settings" page and paste it.');
    const t = await readCsv("INCOMING_MASTER_URL", "the Incoming master sheet", { force });
    const pc = firstColumn(t.columns, "Phone Number", "Caller No", "Phone"), dc = firstColumn(t.columns, "Call Date", "Date");
    if (pc === null || dc === null) throw new Error("The Incoming master sheet needs a phone column and a Call Date column.");
    const dates = toDatetime(t.rows.map((r) => r[dc]), { dayfirst: true });
    return t.rows.map((r, i) => ({
      Campaign: r.Campaign ?? "",
      "Phone Number": phone(r[pc]),
      "Call Date": dates[i],
      "Call Flow": r["Call Flow"] ?? "",
      Status: r.Status ?? "",
      "Comment LSQ": r["Comment LSQ"] ?? "",
      "Comment Analysis": r["Comment Analysis"] ?? ""
    }));
  }
  function lastReportDay(master) {
    const limit = nowIst() + DAY;
    const stamps = master.map((r) => r["Call Date"]).filter((t) => t !== null && t <= limit);
    return stamps.length ? normalize(Math.max(...stamps)) : null;
  }
  async function prepareCalls(job, token2, { force = false } = {}) {
    const master = await readMaster({ force });
    const last = lastReportDay(master);
    job.log(last !== null ? `Incoming master sheet: ${fmtN4(master.length)} call(s), newest ${fmt(last, "%d %b %Y")}.` : `Incoming master sheet: ${fmtN4(master.length)} call(s), no readable Call Date.`);
    const [calls, info] = await collect(job, last);
    info.master_last_day = last !== null ? fmt(last, "%Y-%m-%d") : null;
    if (token2) await saveReport(token2, "ozonetel_calls", calls, info);
    return [calls, info];
  }
  async function build2(job, lsq, { force = false, token: token2 = null } = {}) {
    const log = (m) => job.log(m);
    let calls = null, info = null;
    if (token2) {
      try {
        calls = await loadReport(token2, "ozonetel_calls");
        info = await reportSummary(token2, "ozonetel_calls") || {};
        log(`Using the Ozonetel calls fetched with this snapshot: ${info.from} to ${info.to}.`);
      } catch {
        calls = null;
      }
    }
    if (calls === null) {
      log("No Ozonetel calls with this snapshot yet \u2014 fetching them now.");
      if (token2) [calls, info] = await prepareCalls(job, token2, { force });
      else {
        const master2 = await readMaster({ force });
        [calls, info] = await collect(job, lastReportDay(master2));
      }
    }
    const fresh = calls.map((c) => ({
      Campaign: c.Campaign ?? "",
      "Phone Number": phone(c["Phone Number"]),
      "Call Date": c["Call Date"] ?? null,
      "Call Flow": c["Call Flow"] ?? "",
      Status: c.Status ?? "",
      "Comment LSQ": "",
      "Comment Analysis": ""
    }));
    log(`${fmtN4(fresh.length)} sales incoming call(s) from Ozonetel.`);
    log("Reading the master call history\u2026");
    const master = await readMaster({ force });
    log(`${fmtN4(master.length)} historic call record(s).`);
    let rows = [...fresh, ...master].filter((r) => r["Phone Number"] !== "");
    rows = dropDuplicates(sortDesc(rows, (r) => r["Call Date"]), (r) => r["Phone Number"]);
    log(`${fmtN4(rows.length)} distinct number(s) after merging the two sources.`);
    const snap = index(dropDuplicates(lsq.filter((r) => r.Phone !== ""), (r) => r.Phone, "last"), (r) => r.Phone);
    for (const r of rows) {
      const s2 = snap.get(r["Phone Number"]);
      r.Contact_Stage = text(s2 ? s2["Contact Stage"] : "") || NA2;
      r.Owner = text(s2 ? s2.Owner : "") || NA2;
      r._last_called = s2 ? s2._last_called : null;
      r._follow_up_dt = s2 ? s2._follow_up_dt : null;
      r["Phone call counter"] = dialCount(s2 ? s2["Phone call counter"] : null);
      r["Assigned On Call Counter"] = dialCount(s2 ? s2["Assigned On Call Counter"] : null);
      r.Email = text(s2 ? s2.Email : "");
      r["Zip Intent"] = text(s2 ? s2["Zip Intent"] : "");
      r["Zip Intent Justification"] = text(s2 ? s2["Zip Intent Justification"] : "");
    }
    const unmapped = rows.filter((r) => r.Contact_Stage === NA2).length;
    log(`${fmtN4(rows.length - unmapped)} number(s) matched a LeadSquared lead; ${fmtN4(unmapped)} did not.`);
    log("Matching the enrollment tracker\u2026");
    const enrol = await Enrollments.load("REV_SHEET_URL", "the enrollment tracker", { log, force });
    const [enrolledOn, opsCaller] = enrol.lookup(rows.map((r) => r["Phone Number"]), rows.map((r) => r.Email));
    let hits = 0;
    rows.forEach((r, i) => {
      r["Enrollment Tracker"] = fmtDate(enrolledOn[i], "%d/%m/%Y") || NA2;
      r["Owner According to Rev Sheet"] = opsCaller[i] || NA2;
      if (enrolledOn[i] !== null) {
        hits++;
        r.Contact_Stage = ENROLLED_STAGE;
        if (opsCaller[i] !== "") r.Owner = opsCaller[i];
      }
    });
    log(`${fmtN4(hits)} number(s) matched an enrollment.`);
    applyBreach(rows, "Contact_Stage", "_last_called", "_follow_up_dt", "Phone call counter", "Follow Up Status", "Phone call counter formula");
    for (const r of rows) {
      r["Assigned On Call Counter Formula"] = dialLabel(r["Assigned On Call Counter"]);
      r["Last Called Date"] = fmtDate(r._last_called) || NA;
      r["Next Follow Up Date"] = fmtDate(r._follow_up_dt) || NA;
    }
    attach(rows, "Owner", await load(force));
    const comments = await stageComments({ log, force });
    for (const r of rows) {
      const own = text(r["Comment LSQ"]) || NA;
      r["Comment LSQ"] = comments.size ? text(comments.get(r["Phone Number"])) || own : own;
      r["Comment Analysis"] = text(r["Comment Analysis"]);
      r._call_date = r["Call Date"];
      r["Call Date"] = fmtDate(r._call_date, "%d/%m/%Y");
    }
    buildView(rows, {
      owner: "Owner",
      stage: "Contact_Stage",
      followUp: "Follow Up Status",
      dialLabel: "Phone call counter formula",
      dialCount: "Phone call counter",
      monthFrom: "_call_date",
      campaign: "Campaign",
      dateColumn: "_call_date",
      phoneCol: "Phone Number"
    });
    const out = finish(rows, COLUMNS2);
    const summary = summarise(out, rows);
    summary.unavailable = unmapped;
    summary.ozonetel = Object.fromEntries(["from", "to", "calls", "numbers", "note"].map((k2) => [k2, (info || {})[k2] ?? null]));
    log(`Built ${fmtN4(out.rows.length)} row(s); ${fmtN4(unmapped)} not yet in LeadSquared.`);
    return [out, rows, summary];
  }
  function pending2(out, view) {
    const rows = view.filter((r) => r.Contact_Stage === NA2 && r["Phone Number"] !== "");
    return dropDuplicates(rows.map((r) => ({ "Phone Number": r["Phone Number"], "Prospect ID": "", Email: r.Email ?? "", Report_Type: REPORT_TYPE2 })), (r) => r["Phone Number"]);
  }

  // src/client/reports/high_priority.js
  var high_priority_exports = {};
  __export(high_priority_exports, {
    COLUMNS: () => COLUMNS3,
    FILENAME: () => FILENAME3,
    KEY: () => KEY3,
    NEEDS_UPLOAD: () => NEEDS_UPLOAD3,
    PUSH_SETTING: () => PUSH_SETTING3,
    REPORT_TYPE: () => REPORT_TYPE3,
    SUBTITLE: () => SUBTITLE3,
    TITLE: () => TITLE3,
    _phone: () => phone,
    build: () => build3,
    pending: () => pending3
  });
  var KEY3 = "high_priority";
  var TITLE3 = "High Priority Leads";
  var SUBTITLE3 = "This month's and last month's lead sheets, resolved against LeadSquared by Prospect ID.";
  var REPORT_TYPE3 = "High Priority";
  var NEEDS_UPLOAD3 = null;
  var COLUMNS3 = [
    "Course Name",
    "Name",
    "Email",
    "Country Code",
    "Phone no",
    "Lead Description",
    "Lead Source",
    "Date",
    "Caller Name",
    "Call_Status",
    "Last Called Date",
    "Next Follow Up Date",
    "Phone Call Counter",
    "Phone Call Counter Formula",
    "Caller Comments",
    "Enrolled",
    "Follow Up Status",
    "Verticals",
    "Team",
    "Assigned On Call Counter",
    "Assigned On Call Counter Formula",
    "Prospect ID"
  ];
  var PUSH_SETTING3 = "HP_PUSH_URL";
  var FILENAME3 = "High_Priority_Report";
  var fmtN5 = (n) => Number(n).toLocaleString("en-US");
  async function loadLeadSheets(log, force) {
    const tables = [];
    for (const [key, label] of [["HP_CURRENT_MONTH_URL", "the current month's High Priority sheet"], ["HP_PREVIOUS_MONTH_URL", "the previous month's High Priority sheet"]]) {
      if (!cfg.get(key)) {
        log(`No link set for ${label} \u2014 skipping it.`);
        continue;
      }
      const t = await readCsv(key, label, { force });
      log(`${label}: ${fmtN5(t.rows.length)} row(s).`);
      tables.push(t);
    }
    if (!tables.length) throw new Error("Neither High Priority lead sheet is set. Open Settings and paste at least the current month's link.");
    const columns = [];
    for (const t of tables) for (const c of t.columns) if (!columns.includes(c)) columns.push(c);
    const idCol = firstColumn(columns, "Prospect ID", "ProspectID", "Prospect Id");
    if (idCol === null) throw new Error(`The High Priority lead sheets have no Prospect ID column, which is what they are matched on. Found: ${columns.slice(0, 25).join(", ")}`);
    let merged = tables.flatMap((t) => t.rows).map((r) => {
      const o = { ...r };
      o["Prospect ID"] = text(r[idCol]);
      if (idCol !== "Prospect ID") delete o[idCol];
      return o;
    });
    const cols = columns.map((c) => c === idCol ? "Prospect ID" : c);
    merged.forEach((r) => {
      r._stamp = null;
    });
    for (const name of ["Timestamp", "Created On", "Date"]) {
      const col = firstColumn(cols, name);
      if (col === null) continue;
      const parsed = toDatetime(merged.map((r) => r[col]), { dayfirst: true });
      merged.forEach((r, i) => {
        if (r._stamp === null) r._stamp = parsed[i];
      });
    }
    const withId = dropDuplicates(sortDesc(merged.filter((r) => r["Prospect ID"] !== ""), (r) => r._stamp), (r) => r["Prospect ID"]);
    const withoutId = merged.filter((r) => r["Prospect ID"] === "");
    if (withoutId.length) log(`${fmtN5(withoutId.length)} row(s) have no Prospect ID \u2014 kept as they are, but they cannot be matched to LeadSquared.`);
    const out = [...withId, ...withoutId];
    log(`${fmtN5(out.length)} lead(s) after merging and de-duplicating on Prospect ID.`);
    return [out, cols];
  }
  async function build3(job, lsq, { force = false } = {}) {
    const log = (m) => job.log(m);
    const [leads2, cols] = await loadLeadSheets(log, force);
    const norm2 = (x) => String(x).toLowerCase().replace(/[^a-z0-9]/g, "");
    const lower = new Map(cols.map((c) => [norm2(c), c]));
    const pick = (r, ...names) => {
      let out2 = "";
      for (const n of names) {
        const c = lower.get(norm2(n));
        if (c === void 0) continue;
        if (out2 === "") out2 = text(r[c]);
      }
      return out2;
    };
    const rows = leads2.map((r) => {
      const rawPhone = pick(r, "Phone Number", "Phone", "Phone no", "Mobile Number", "Mobile", "Contact Number", "Contact No", "Mobile No", "WhatsApp Number");
      const cleaned = phone(rawPhone);
      return {
        "Course Name": pick(r, "Enquired Course", "Course Name", "Course"),
        Name: pick(r, "First Name", "Name", "Lead Name", "Full Name"),
        Email: pick(r, "Email Address", "Email", "Email Id", "EmailAddress"),
        "Country Code": "",
        "Phone no": cleaned !== "" ? cleaned : rawPhone,
        "Lead Description": pick(r, "Campaign Name", "Lead Description", "Campaign"),
        "Lead Source": pick(r, "Source", "Lead Source"),
        "Prospect ID": r["Prospect ID"],
        _stamp: r._stamp,
        Date: fmtDate(r._stamp, "%d/%m/%Y")
      };
    });
    log(`Phone number found on ${fmtN5(rows.filter((r) => r["Phone no"] !== "").length)} of ${fmtN5(rows.length)} lead(s) in the sheets.`);
    log("Mapping LeadSquared data by Prospect ID\u2026");
    const snap = index(dropDuplicates(sortDesc(lsq.filter((r) => text(r["Prospect ID"]) !== ""), (r) => r._last_called), (r) => r["Prospect ID"]), (r) => r["Prospect ID"]);
    for (const r of rows) {
      const s2 = snap.get(r["Prospect ID"]);
      r["Caller Name"] = text(s2 ? s2.Owner : "");
      r.Call_Status = text(s2 ? s2["Contact Stage"] : "");
      r._last_called = s2 ? s2._last_called : null;
      r._follow_up_dt = s2 ? s2._follow_up_dt : null;
      r["Phone Call Counter"] = dialCount(s2 ? s2["Phone call counter"] : null);
      r["Assigned On Call Counter"] = dialCount(s2 ? s2["Assigned On Call Counter"] : null);
      r["Zip Intent"] = text(s2 ? s2["Zip Intent"] : "");
      r["Zip Intent Justification"] = text(s2 ? s2["Zip Intent Justification"] : "");
      if (r.Email === "") r.Email = text(s2 ? s2.Email : "");
      const snapPhone = text(s2 ? s2.Phone : "");
      if (!/^\d{10}$/.test(r["Phone no"]) && snapPhone !== "") r["Phone no"] = snapPhone;
    }
    const unmapped = rows.filter((r) => r["Caller Name"] === "").length;
    log(`${fmtN5(rows.length - unmapped)} lead(s) matched a LeadSquared owner; ${fmtN5(unmapped)} did not.`);
    log("Matching the High Priority enrollment tracker\u2026");
    const enrol = await Enrollments.load(["HP_REV_URL_1", "HP_REV_URL_2"], "the High Priority enrollment tracker", { onlyNewEnrollment: true, log, force });
    const [enrolledOn, opsCaller] = enrol.lookup(rows.map((r) => r["Phone no"]), rows.map((r) => r.Email));
    let hits = 0;
    rows.forEach((r, i) => {
      r.Enrolled = fmtDate(enrolledOn[i], "%d/%m/%Y") || NA;
      if (enrolledOn[i] !== null) {
        hits++;
        r.Call_Status = ENROLLED_STAGE;
        if (opsCaller[i] !== "") r["Caller Name"] = opsCaller[i];
      }
    });
    log(`${fmtN5(hits)} lead(s) matched a new enrollment.`);
    applyBreach(rows, "Call_Status", "_last_called", "_follow_up_dt", "Phone Call Counter", "Follow Up Status", "Phone Call Counter Formula");
    for (const r of rows) {
      r["Assigned On Call Counter Formula"] = dialLabel(r["Assigned On Call Counter"]);
      r["Last Called Date"] = fmtDate(r._last_called) || NA;
      r["Next Follow Up Date"] = fmtDate(r._follow_up_dt) || NA;
    }
    attach(rows, "Caller Name", await load(force));
    const comments = await stageComments({ log, force });
    for (const r of rows) {
      r["Caller Comments"] = comments.size ? text(comments.get(r["Phone no"])) || NA : NA;
      r["Caller Name"] = r["Caller Name"] || NA;
      r.Call_Status = r.Call_Status || NA;
    }
    buildView(rows, {
      owner: "Caller Name",
      stage: "Call_Status",
      followUp: "Follow Up Status",
      dialLabel: "Phone Call Counter Formula",
      dialCount: "Phone Call Counter",
      monthFrom: "_stamp",
      campaign: "Lead Description",
      dateColumn: "_stamp",
      phoneCol: "Phone no"
    });
    const out = finish(rows, COLUMNS3);
    const summary = summarise(out, rows);
    summary.unavailable = unmapped;
    log(`Built ${fmtN5(out.rows.length)} row(s); ${fmtN5(unmapped)} with no LeadSquared owner.`);
    return [out, rows, summary];
  }
  function pending3(out, view) {
    const rows = view.filter((r) => r["Caller Name"] === NA && r["Prospect ID"] !== "");
    return dropDuplicates(rows.map((r) => ({ "Phone Number": r["Phone no"], "Prospect ID": r["Prospect ID"], Email: r.Email, Report_Type: REPORT_TYPE3 })), (r) => r["Prospect ID"]);
  }

  // src/client/reports/registry.js
  var MODULES = [chat_email_referral_exports, incoming_exports, high_priority_exports];
  var BY_KEY = Object.fromEntries(MODULES.map((m) => [m.KEY, m]));
  var ORDER = MODULES.map((m) => m.KEY);
  var fmtN6 = (n) => Number(n).toLocaleString("en-US");
  function get2(key) {
    const m = BY_KEY[String(key || "").trim().toLowerCase()];
    if (!m) throw new Error(`Unknown report: ${JSON.stringify(key)}`);
    return m;
  }
  var describe = (m) => ({
    key: m.KEY,
    title: m.TITLE,
    subtitle: m.SUBTITLE,
    report_type: m.REPORT_TYPE,
    needs_upload: m.NEEDS_UPLOAD,
    columns: [...m.COLUMNS, "Zip Intent", "Zip Intent Justification"],
    push_configured: !!cfg.get(m.PUSH_SETTING),
    filename: m.FILENAME
  });
  var catalogue = () => ORDER.map((k2) => describe(BY_KEY[k2]));
  var currentRules = () => ({ breach_days: breachDays(cfg.all()), dnp: dnpRule2(), dnp_caption: dnpCaption() });
  async function run2(job, key, token2, uploadPath = null, refreshSources = false) {
    const module = get2(key);
    job.put(`__STEP__ Building ${module.TITLE}\u2026`);
    const started = Date.now();
    if (refreshSources) {
      job.log("Re-reading every linked sheet rather than using the cached copies.");
      clearCache();
    }
    const frame = await loadFrame(token2);
    const meta = await loadMeta(token2) || {};
    job.log(`Using the fetch of ${meta.days ?? "?"} day(s) on ${meta.basis_label ?? "?"} \u2014 ${fmtN6(frame.length)} lead(s).`);
    const tagged = taggedOnly(frame);
    job.log(`${fmtN6(tagged.length)} of those carry a Report_Type and are what this report matches against.`);
    if (!tagged.length) throw new Error("No lead in this fetch has a Report_Type set, so nothing can be matched. Check that mx_Report_Type is populated in LeadSquared, then fetch again.");
    const rules = currentRules();
    job.log(`Breached days: ${Object.entries(rules.breach_days).map(([s2, n]) => `${s2} ${n}d`).join(", ")}. Less-dialled DNP: ${rules.dnp_caption}.`);
    const [out, view, summary] = await module.build(job, tagged, { force: refreshSources, token: token2 });
    const waiting = module.pending(out, view);
    Object.assign(summary, {
      key: module.KEY,
      title: module.TITLE,
      report_type: module.REPORT_TYPE,
      rows: out.rows.length,
      columns: out.columns,
      pending: waiting.length,
      built_at: (/* @__PURE__ */ new Date()).toISOString(),
      seconds: Math.round((Date.now() - started) / 100) / 10,
      token: token2,
      fetch_days: meta.days ?? null,
      fetch_basis: meta.basis_label ?? null,
      zip_fields_missing: meta.zip_fields_missing || [],
      rules
    });
    await saveReport(token2, module.KEY, view, summary);
    await saveReport(token2, `${module.KEY}__pending`, waiting, { rows: waiting.length, report: module.KEY });
    if (summary.pending) job.log(`${fmtN6(summary.pending)} lead(s) could not be matched. Download the LSQ update CSV, set Report_Type to '${module.REPORT_TYPE}' in LeadSquared, fetch again and rebuild.`);
    else job.log("Every lead matched \u2014 nothing to update in LeadSquared.");
    if (summary.zip_fields_missing.length) job.log("NOTE: " + summary.zip_fields_missing.join(", ") + " are not on this LeadSquared account, so the two Zip Intent columns are blank.");
    job.log(`Done \u2014 ${fmtN6(out.rows.length)} row(s) ready to download or push.`);
    job.result = summary;
    return summary;
  }
  var cell = (v) => v === null || v === void 0 || typeof v === "number" && !Number.isFinite(v) ? "" : v;
  async function outputFrame(token2, key) {
    const module = get2(key);
    const view = await loadReport(token2, module.KEY);
    const has = (c) => view.length ? c in view[0] : true;
    const columns = [...module.COLUMNS.filter(has), ...["Zip Intent", "Zip Intent Justification"].filter(has)];
    return { columns, rows: view.map((r) => Object.fromEntries(columns.map((c) => [c, cell(r[c])]))) };
  }
  var PENDING_COLUMNS = ["Phone Number", "Prospect ID", "Email", "Report_Type"];
  async function pendingFrame(token2, key) {
    try {
      return await loadReport(token2, `${get2(key).KEY}__pending`);
    } catch {
      return [];
    }
  }
  async function combinedPending(token2) {
    const parts = [];
    for (const key of ORDER) parts.push(...await pendingFrame(token2, key));
    const rows = parts.map((r) => Object.fromEntries(PENDING_COLUMNS.map((c) => [c, cell(r[c])])));
    return dropDuplicates(rows, (r) => `${r["Phone Number"]}\0${r["Prospect ID"]}\0${r.Report_Type}`);
  }

  // src/client/pipeline.js
  var fmtN7 = (n) => Number(n).toLocaleString("en-US");
  async function fetch2(job, days, basis, withCalls = true) {
    job.put("__STEP__ Fetching from LeadSquared\u2026");
    await run(job, days, basis);
    const meta = job.result;
    if (!withCalls) return meta;
    job.log("");
    if (!configured()) {
      job.log("Ozonetel is not set up on Setup and Tokens, so Incoming cannot be built until your API key and username are added.");
      meta.ozonetel = { error: "not configured" };
    } else {
      job.put("__STEP__ Fetching sales incoming calls from Ozonetel\u2026");
      try {
        const [, info] = await prepareCalls(job, meta.token);
        meta.ozonetel = Object.fromEntries(["from", "to", "calls", "numbers", "note", "master_last_day"].map((k2) => [k2, info[k2] ?? null]));
      } catch (e) {
        if (job.stopped) throw e;
        job.log(`ERROR: Ozonetel \u2014 ${e.message || e}. The other two reports can still be built; Incoming will try again when it is built.`);
        meta.ozonetel = { error: String(e.message || e) };
      }
    }
    await saveFetchMeta(meta.token, meta);
    job.result = meta;
    return meta;
  }
  async function pendingByReport(token2) {
    const out = {};
    if (!token2) return out;
    for (const key of ORDER) {
      const s2 = await reportSummary(token2, key);
      if (s2) out[key] = parseInt(s2.pending || 0, 10);
    }
    return out;
  }
  async function buildAll(job, token2, keys = null, before = null, started = null) {
    started = started || Date.now();
    const wanted = ORDER.filter((k2) => !keys || keys.includes(k2));
    const built = [], failed = [];
    for (let i = 0; i < wanted.length; i++) {
      const module = get2(wanted[i]);
      if (job.checkStop()) {
        job.log(`Stopped \u2014 ${module.TITLE} and anything after it were not built.`);
        break;
      }
      job.log(`Report ${i + 1} of ${wanted.length} \u2014 ${module.TITLE}.`);
      try {
        built.push([module.KEY, await run2(job, module.KEY, token2)]);
      } catch (e) {
        if (job.stopped) break;
        failed.push([module.KEY, String(e.message || e)]);
        job.log(`ERROR: ${module.TITLE} could not be built \u2014 ${e.message || e}`);
      }
      job.log("");
    }
    conclude(job, token2, built, failed, before, started);
  }
  async function rebuild(job, days, basis, keys = null) {
    const started = Date.now();
    const before = await pendingByReport(await latestToken());
    const meta = await fetch2(job, days, basis);
    job.log("");
    await buildAll(job, meta.token, keys || (Object.keys(before).length ? Object.keys(before) : null), before, started);
  }
  function conclude(job, token2, built, failed, before, started) {
    before = before || {};
    const after = Object.fromEntries(built.map(([k2, s2]) => [k2, parseInt(s2.pending || 0, 10)]));
    const totalBefore = built.reduce((a, [k2]) => a + (before[k2] || 0), 0);
    const totalAfter = Object.values(after).reduce((a, b) => a + b, 0);
    job.log("=".repeat(52));
    for (const [key, s2] of built) {
      const was = before[key];
      let line = `${s2.title}: ${fmtN7(s2.rows)} rows, ${fmtN7(s2.pending)} unmatched`;
      if (was !== void 0 && was !== s2.pending) line += ` (was ${fmtN7(was)})`;
      job.log(line);
    }
    for (const [key, reason] of failed) job.log(`${get2(key).TITLE}: not built \u2014 ${reason}`);
    if (built.length && Object.keys(before).length && totalBefore) {
      if (totalAfter < totalBefore) job.log(`Unmatched leads went ${fmtN7(totalBefore)} -> ${fmtN7(totalAfter)}. The LeadSquared update worked.`);
      else if (totalAfter === totalBefore) job.log(`Unmatched leads are unchanged at ${fmtN7(totalAfter)}. Either the import has not been applied in LeadSquared yet, or it matched nothing \u2014 check that it was imported against mx_Report_Type.`);
      else job.log(`Unmatched leads went UP, ${fmtN7(totalBefore)} -> ${fmtN7(totalAfter)}. New leads have arrived since the last pass; download the update CSV again.`);
    } else if (totalAfter) job.log(`${fmtN7(totalAfter)} lead(s) still need a Report_Type in LeadSquared \u2014 step 3.`);
    else if (built.length) job.log("Every lead in every report matched \u2014 nothing left to update.");
    const secs = Math.floor((Date.now() - started) / 1e3);
    job.log(`Done in ${Math.floor(secs / 60)}m ${secs % 60}s.`);
    if (failed.length && !built.length) job.status = "failed";
    job.result = {
      token: token2,
      built: built.map(([k2]) => k2),
      failed: failed.map(([key, error]) => ({ key, error })),
      pending_before: totalBefore,
      pending_after: totalAfter,
      seconds: Math.round((Date.now() - started) / 100) / 10
    };
  }

  // src/client/dialers.js
  var CATEGORIES = { breached: "Breached", dnp: "Less-dialled DNP", fresh: "Fresh" };
  var ORDER2 = ["breached", "dnp", "fresh"];
  var MCUBE_COLUMNS = ["Number", "Name", "Source", "Agent Number", "Ref Id", "Priority"];
  var ACEFONE_COLUMNS = [
    "Phone Number",
    "Name",
    "Email Id",
    "Address",
    "Company Name",
    "Alternate Phone Number",
    "Time Group Id",
    "Priority(1 to 30)",
    "Skill Name",
    "External Reference ID"
  ];
  var LEADS_COLUMNS = [
    "Phone Number",
    "Name",
    "Owner",
    "MCube Agent Number",
    "Category",
    "Report",
    "Contact Stage",
    "Follow Up Status",
    "Last Called",
    "Next Follow Up",
    "Why",
    "Phone Call Counter",
    "Assigned On Call Counter",
    "Email",
    "Prospect ID"
  ];
  var FILE_COLUMNS = { mcube: MCUBE_COLUMNS, acefone: ACEFONE_COLUMNS, skipped: MCUBE_COLUMNS, leads: LEADS_COLUMNS };
  var norm = (n) => normaliseName(n);
  var masks = (view) => ({ breached: breachedMask(view), dnp: dnpMask(view), fresh: freshMask(view) });
  var strRow = (r, cols) => Object.fromEntries(cols.map((c) => [c, r[c] === null || r[c] === void 0 ? "" : String(r[c])]));
  async function rosterIndex() {
    try {
      return makeIndex(await load());
    } catch {
      return /* @__PURE__ */ new Map();
    }
  }
  async function counts(token2) {
    const out = { reports: {}, rules: null };
    for (const key of ORDER) {
      const summary = await reportSummary(token2, key);
      if (!summary) continue;
      const view = await loadReport(token2, key);
      const m = masks(view);
      const hasPhone = view.map((r) => String(r._phone ?? "").length === 10);
      out.reports[key] = { title: summary.title, ...Object.fromEntries(ORDER2.map((c) => [c, m[c].filter((x, i) => x && hasPhone[i]).length])) };
      out.rules = summary.rules || null;
    }
    return out;
  }
  async function select(token2, categories, reports = null, owners = null) {
    categories = ORDER2.filter((c) => (categories || []).includes(c));
    if (!categories.length) throw new Error("Tick at least one of Breached, Less-dialled DNP or Fresh.");
    const keys = ORDER.filter((k2) => !reports || !reports.length || reports.includes(k2));
    let leads2 = [];
    for (const key of keys) {
      if (!await reportSummary(token2, key)) continue;
      const view = await loadReport(token2, key);
      const m = masks(view);
      view.forEach((r, i) => {
        const cat = categories.find((c) => m[c][i]);
        if (!cat) return;
        leads2.push({
          phone: String(r._phone ?? ""),
          category: CATEGORIES[cat],
          rank: ORDER2.indexOf(cat),
          report: get2(key).TITLE,
          report_owner: String(r._owner ?? ""),
          stage: String(r._stage ?? ""),
          follow_up: String(r._follow_up ?? ""),
          reason: String(r._reason ?? ""),
          last_called: r._last_called !== null && r._last_called !== void 0 ? fmt(r._last_called, "%d/%m/%Y %H:%M") : "",
          next_follow_up: r._follow_up_dt !== null && r._follow_up_dt !== void 0 ? fmt(r._follow_up_dt, "%d/%m/%Y %H:%M") : "",
          phone_calls: r._dial_count ?? 0,
          assigned_calls: r._assigned_count ?? 0,
          prospect_id: "Prospect ID" in r ? String(r["Prospect ID"] ?? "") : ""
        });
      });
    }
    if (!leads2.length) throw new Error("No lead matches those boxes in the reports that are built.");
    const noPhone = leads2.filter((l) => l.phone.length !== 10).length;
    leads2 = leads2.filter((l) => l.phone.length === 10);
    const before = leads2.length;
    leads2 = dropDuplicates(leads2.map((l, i) => [l, i]).sort((a, b) => a[0].rank - b[0].rank || a[1] - b[1]).map(([l]) => l), (l) => l.phone);
    const duplicates = before - leads2.length;
    const snap = index(dropDuplicates((await loadFrame(token2)).filter((r) => r.Phone !== ""), (r) => r.Phone, "last"), (r) => r.Phone);
    const ri = await rosterIndex();
    for (const l of leads2) {
      const s2 = snap.get(l.phone);
      l.name = s2 ? s2["Lead Name"] ?? "" : "";
      l.email = s2 ? s2.Email ?? "" : "";
      const pid = s2 ? s2["Prospect ID"] ?? "" : "";
      if (pid !== "") l.prospect_id = pid;
      const owner = s2 ? s2.Owner ?? "" : "";
      const fallback = ["#NA", "#N/A", "(No owner)"].includes(l.report_owner) ? "" : l.report_owner;
      l.owner = owner !== "" ? owner : fallback;
      l.owner_email = s2 ? s2["Owner Email"] ?? "" : "";
      l.caller = (ri.get(norm(l.owner)) || {}).caller ?? l.owner;
    }
    const beforeOwner = leads2.length;
    if (owners && owners.length) {
      const wanted = new Set(owners.map(norm));
      leads2 = leads2.filter((l) => wanted.has(norm(l.caller)));
      if (!leads2.length) throw new Error("None of the picked callers has a lead in that selection.");
    }
    const tally = (f) => {
      const o = {};
      for (const l of leads2) o[f(l)] = (o[f(l)] || 0) + 1;
      return Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]));
    };
    const stats = {
      leads: leads2.length,
      duplicates_removed: duplicates,
      no_phone: noPhone,
      by_category: tally((l) => l.category),
      by_report: tally((l) => l.report),
      no_owner: leads2.filter((l) => l.owner === "").length,
      owners_picked: (owners || []).length,
      left_out_by_owner: beforeOwner - leads2.length
    };
    for (const l of leads2) delete l.rank;
    return [leads2, stats];
  }
  async function ownerSummary(token2, categories, reports = null) {
    let tally = {};
    try {
      const [leads2] = await select(token2, categories && categories.length ? categories : ORDER2, reports);
      for (const l of leads2) tally[l.caller] = (tally[l.caller] || 0) + 1;
    } catch {
      tally = {};
    }
    const ri = await rosterIndex();
    const rows = [], seen = /* @__PURE__ */ new Set();
    for (const e of ri.values()) {
      seen.add(norm(e.caller));
      rows.push({ caller: e.caller, team: e.team, vertical: e.vertical, leads: tally[e.caller] || 0, on_roster: true });
    }
    for (const [caller, n] of Object.entries(tally)) if (!seen.has(norm(caller))) rows.push({ caller: caller || "(no owner)", team: "Not on roster", vertical: "", leads: n, on_roster: false });
    const low = (x) => x.toLowerCase();
    rows.sort((a, b) => (a.team === "Not on roster") - (b.team === "Not on roster") || (low(a.team) < low(b.team) ? -1 : low(a.team) > low(b.team) ? 1 : 0) || b.leads - a.leads || (low(a.caller) < low(b.caller) ? -1 : low(a.caller) > low(b.caller) ? 1 : 0));
    const teams = [...new Set(rows.map((r) => r.team))].sort((a, b) => (a === "Not on roster") - (b === "Not on roster") || (low(a) < low(b) ? -1 : low(a) > low(b) ? 1 : 0));
    return { callers: rows, teams, roster_loaded: ri.size > 0 };
  }
  async function loadAgents(log = null) {
    let agents = [];
    const errors = [];
    const source = String(cfg.get("MCUBE_AGENT_SOURCE") || "both").toLowerCase();
    if (["both", "getagents"].includes(source) && cfg.get("MCUBE_GETAGENTS_TOKEN")) {
      try {
        agents = await mcubeAgents();
      } catch (e) {
        errors.push(`getagents: ${e.message || e}`);
      }
    }
    if (["both", "employees"].includes(source) && cfg.get("MCUBE_EMPLOYEES_AUTHORIZATION")) {
      try {
        const seen = new Set(agents.map((a) => norm(a.agent_name)));
        for (const row of await mcubeEmployees()) if (!seen.has(norm(row.agent_name))) {
          agents.push(row);
          seen.add(norm(row.agent_name));
        }
      } catch (e) {
        errors.push(`get-employees: ${e.message || e}`);
      }
    }
    if (log && errors.length) log("MCube agent directory: " + errors.join("; "));
    if (!agents.length && errors.length) throw new Error("Could not read MCube's agent directory \u2014 " + errors.join("; "));
    return agents;
  }
  async function agentNumbers(owners, ownerEmails, agents) {
    const byName = /* @__PURE__ */ new Map(), byEmail = /* @__PURE__ */ new Map();
    for (const a of agents) {
      const ph = String(a.emp_phone ?? "").trim();
      if (!ph) continue;
      const k2 = norm(a.agent_name);
      if (!byName.has(k2)) byName.set(k2, ph);
      const em = String(a.email ?? "").trim().toLowerCase();
      if (em && !byEmail.has(em)) byEmail.set(em, ph);
    }
    const ri = await rosterIndex();
    return owners.map((owner, i) => {
      const key = norm(owner);
      let number = byName.get(key) || "";
      if (!number) for (const e of [(ri.get(key) || {}).email || "", ownerEmails[i]]) {
        const em = String(e || "").trim().toLowerCase();
        if (em && byEmail.has(em)) {
          number = byEmail.get(em);
          break;
        }
      }
      return number;
    });
  }
  var fileKey = (token2) => `dialer_files`;
  async function makeFiles(token2, categories, reports = null, owners = null, log = () => {
  }) {
    const [leads2, stats] = await select(token2, categories, reports, owners);
    const callers = leads2.map((l) => l.caller);
    const mcubePriority = cfg.int("MCUBE_PRIORITY", 1);
    const acefonePriority = Math.min(30, Math.max(1, cfg.int("ACEFONE_PRIORITY", 30)));
    let agents = [], agentError = "";
    if (cfg.get("MCUBE_GETAGENTS_TOKEN") || cfg.get("MCUBE_EMPLOYEES_AUTHORIZATION")) {
      try {
        agents = await loadAgents(log);
      } catch (e) {
        agentError = String(e.message || e);
      }
    } else agentError = "No MCube agents token in Settings, so no Agent Number can be filled.";
    const numbers = agents.length ? await agentNumbers(callers, leads2.map((l) => l.owner_email), agents) : leads2.map(() => "");
    const mcube = leads2.map((l, i) => ({ Number: l.phone, Name: l.name, Source: callers[i], "Agent Number": numbers[i], "Ref Id": l.prospect_id, Priority: mcubePriority }));
    const has = (r) => String(r["Agent Number"]).trim() !== "";
    const mcubeOk = mcube.filter(has), skipped = mcube.filter((r) => !has(r));
    const acefone = leads2.map((l, i) => ({
      "Phone Number": l.phone,
      Name: l.name,
      "Email Id": l.email,
      Address: "",
      "Company Name": callers[i],
      "Alternate Phone Number": "",
      "Time Group Id": "",
      "Priority(1 to 30)": acefonePriority,
      "Skill Name": callers[i],
      "External Reference ID": l.prospect_id
    }));
    const detail = leads2.map((l, i) => ({
      "Phone Number": l.phone,
      Name: l.name,
      Owner: callers[i],
      "MCube Agent Number": numbers[i],
      Category: l.category,
      Report: l.report,
      "Contact Stage": l.stage,
      "Follow Up Status": l.follow_up,
      "Last Called": l.last_called,
      "Next Follow Up": l.next_follow_up,
      Why: l.reason,
      "Phone Call Counter": l.phone_calls,
      "Assigned On Call Counter": l.assigned_calls,
      Email: l.email,
      "Prospect ID": l.prospect_id
    }));
    const files = {
      mcube: mcubeOk.map((r) => strRow(r, MCUBE_COLUMNS)),
      acefone: acefone.map((r) => strRow(r, ACEFONE_COLUMNS)),
      skipped: skipped.map((r) => strRow(r, MCUBE_COLUMNS)),
      leads: detail.map((r) => strRow(r, LEADS_COLUMNS))
    };
    const prev = await reportSummary(token2, fileKey(token2)) || {};
    await saveReport(token2, fileKey(token2), { ...files, uploads: (await loadFiles(token2)).uploads || {} }, { saved: Date.now(), uploads: prev.uploads });
    const per = /* @__PURE__ */ new Map();
    callers.forEach((c, i) => {
      const o = c === "" ? "(no owner)" : c;
      const e = per.get(o) || { owner: o, leads: 0, agent: numbers[i] };
      e.leads++;
      per.set(o, e);
    });
    const perOwner = [...per.values()].sort((a, b) => b.leads - a.leads).map((e) => ({ owner: e.owner, leads: e.leads, agent: e.agent || "" }));
    const summary = {
      ...stats,
      categories: ORDER2.filter((c) => categories.includes(c)),
      reports: reports || [],
      owners: stats.owners_picked ? `${stats.owners_picked} caller(s)` : "all callers",
      mcube_rows: mcubeOk.length,
      mcube_skipped: skipped.length,
      mcube_no_agent: [...new Set(skipped.map((r) => r.Source).filter((o) => String(o).trim()))].sort(),
      acefone_rows: acefone.length,
      agent_error: agentError,
      mcube_priority: mcubePriority,
      acefone_priority: acefonePriority,
      per_owner: perOwner
    };
    await saveReport(token2, "dialer", files.leads, summary);
    return summary;
  }
  async function loadFiles(token2) {
    try {
      return await loadReport(token2, fileKey(token2));
    } catch {
      return { uploads: {} };
    }
  }
  async function loadFile(token2, which) {
    const files = await loadFiles(token2);
    if (which.endsWith("_upload")) {
      const up = (files.uploads || {})[which.replace("_upload", "")];
      if (!up) throw new Error("No uploaded file for this push \u2014 choose one first.");
      return up;
    }
    if (!files[which]) throw new Error("Make the dialer files first.");
    return { columns: FILE_COLUMNS[which], rows: files[which] };
  }
  async function saveUpload(token2, target, table, name = "") {
    const needed = target === "mcube" ? ["Number", "Agent Number"] : ["Phone Number"];
    const missing = needed.filter((c) => !table.columns.includes(c));
    if (missing.length) throw new Error(`That file is missing ${missing.join(", ")} \u2014 it should look like the ${target === "mcube" ? "MCube" : "Acefone"} file made here.`);
    const files = await loadFiles(token2);
    files.uploads = { ...files.uploads || {}, [target]: { ...table, name } };
    await saveReport(token2, fileKey(token2), files, { saved: Date.now() });
    return { rows: table.rows.length, name };
  }
  var sourceFrame = (token2, target, source) => loadFile(token2, source === "upload" ? `${target}_upload` : target);
  async function pushMcube(job, token2, campaignId, campaignName2, retryAttempts = null, retryTime = null, priority = null, source = "made") {
    const frame = await sourceFrame(token2, "mcube", source);
    job.log(`Pushing to MCube campaign '${campaignName2}' (id ${campaignId}) \u2014 ${source === "upload" ? "the uploaded file" : "the dialer file made here"}.`);
    const prepared = [];
    let skipped = 0;
    const override = priority !== null && priority !== void 0 && priority !== "";
    for (const row of frame.rows) {
      const lead = mcubeBuildLead({
        number: row.Number,
        name: row.Name ?? "",
        source: row.Source ?? "",
        agent_number: row["Agent Number"] ?? "",
        priority: override ? priority : row.Priority ?? 1,
        ref_id: row["Ref Id"] ?? "",
        retry_attempt: retryAttempts,
        retry_time: retryTime
      });
      if (lead && lead.eid) prepared.push(lead);
      else skipped++;
    }
    if (skipped) job.log(`${skipped} row(s) skipped \u2014 no phone number or no MCube agent number.`);
    if (!prepared.length) throw new Error("Nothing to push: no lead has an MCube Agent Number.");
    const pr = override ? `overridden to ${prepared[0].priority}` : `[${[...new Set(prepared.map((l) => l.priority))].sort((a, b) => a - b).join(", ")}]`;
    job.log(`${prepared.length.toLocaleString("en-US")} lead(s), priority ${pr}, retry ${prepared[0].retry_attempt} attempt(s) ${prepared[0].retry_time} minute(s) apart.`);
    const batches = [...chunked(prepared, cfg.int("MCUBE_PUSH_BATCH_SIZE", 200))];
    job.setTotal(prepared.length);
    for (let i = 0; i < batches.length; i++) {
      if (job.checkStop()) break;
      const batch = batches[i];
      try {
        const r = mcubeSummarise(await mcubeUpload(campaignId, batch));
        if (r.ok !== false) {
          job.advance({ succeeded: batch.length });
          job.log(`Batch ${i + 1}/${batches.length}: ${batch.length} lead(s) \u2014 ${r.message || "accepted"}`);
        } else {
          job.advance({ failed: batch.length, errors: [r.message || "rejected"] });
          job.log(`Batch ${i + 1}/${batches.length} rejected: ${r.message}`);
        }
      } catch (e) {
        job.advance({ failed: batch.length, errors: [String(e.message || e)] });
        job.log(`Batch ${i + 1}/${batches.length} failed: ${e.message || e}`);
      }
    }
    close(job, `MCube '${campaignName2}'`);
  }
  async function skillIndex(skillListId = null) {
    const listId = skillListId || cfg.get("ACEFONE_SKILL_LIST_ID");
    if (!listId) throw new Error("Acefone skill list (pick one on the Acefone panel) is not configured.");
    const out = /* @__PURE__ */ new Map();
    for (const s2 of await acefoneSkills(listId)) {
      const k2 = norm(s2.name);
      if (!out.has(k2)) out.set(k2, { id: s2.id, name: s2.name });
    }
    return out;
  }
  async function skillMapping(token2, skillListId = null, overrides = null, source = "made") {
    const frame = await sourceFrame(token2, "acefone", source);
    const callers = [...new Set(frame.rows.map((r) => String(r["Skill Name"] ?? "").trim()).filter(Boolean))].sort();
    const index2 = await skillIndex(skillListId);
    const byId = new Map([...index2.values()].map((e) => [e.id, e.name]));
    const ov = Object.fromEntries(Object.entries(overrides || {}).map(([k2, v]) => [String(k2), String(v).trim()]).filter(([, v]) => v));
    const tally = {};
    for (const r of frame.rows) {
      const c = r["Skill Name"];
      tally[c] = (tally[c] || 0) + 1;
    }
    const rows = callers.map((caller) => {
      const auto = index2.get(norm(caller));
      if (caller in ov) return { caller, skill_id: ov[caller], skill_name: byId.get(ov[caller]) || "(set by hand)", source: "override", leads: tally[caller] || 0 };
      if (auto) return { caller, skill_id: auto.id, skill_name: auto.name, source: "auto", leads: tally[caller] || 0 };
      return { caller, skill_id: "", skill_name: "", source: "none", leads: tally[caller] || 0 };
    });
    return {
      mapping: rows,
      skills: [...index2.values()].sort((a, b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : 0),
      unmatched: rows.filter((r) => !r.skill_id).map((r) => r.caller)
    };
  }
  async function pushAcefone(job, token2, listId, listName, priority = null, skillMap = null, skillListId = null, source = "made") {
    const frame = await sourceFrame(token2, "acefone", source);
    job.log(`Pushing to Acefone list '${listName}' (id ${listId}) \u2014 ${source === "upload" ? "the uploaded file" : "the dialer file made here"}.`);
    const skills2 = {};
    try {
      for (const r of (await skillMapping(token2, skillListId, skillMap, source)).mapping) if (r.skill_id) skills2[r.caller] = r.skill_id;
    } catch (e) {
      job.log(`WARNING: could not read Acefone skills (${e.message || e}) \u2014 leads will arrive unrouted.`);
    }
    const override = priority !== null && priority !== void 0 && priority !== "";
    const prepared = [], unrouted = /* @__PURE__ */ new Set();
    for (const row of frame.rows) {
      const caller = String(row["Skill Name"] || row["Company Name"] || "").trim();
      const skill = skills2[caller] || "";
      if (!skill) unrouted.add(caller || "(no owner)");
      const lead = acefoneBuildLead({
        phone: row["Phone Number"],
        name: row.Name ?? "",
        email: row["Email Id"] ?? "",
        company: row["Company Name"] ?? "",
        ref_id: row["External Reference ID"] ?? "",
        priority: override ? priority : row["Priority(1 to 30)"],
        skill_id: skill || null
      });
      if (lead) prepared.push(lead);
    }
    if (!prepared.length) throw new Error("Nothing to push: no lead has a phone number.");
    if (unrouted.size) job.log(`No Acefone skill for: ${[...unrouted].sort().join(", ")} \u2014 their leads arrive unrouted.`);
    if (override) job.log(`Priority overridden to ${priority} for every lead.`);
    const batches = [...chunked(prepared, cfg.int("ACEFONE_PUSH_BATCH_SIZE", 500))];
    job.setTotal(prepared.length);
    for (let i = 0; i < batches.length; i++) {
      if (job.checkStop()) break;
      try {
        await acefoneBulkCreate(listId, batches[i]);
        job.advance({ succeeded: batches[i].length });
        job.log(`Batch ${i + 1}/${batches.length}: ${batches[i].length} lead(s) imported.`);
      } catch (e) {
        job.advance({ failed: batches[i].length, errors: [String(e.message || e)] });
        job.log(`Batch ${i + 1}/${batches.length} failed: ${e.message || e}`);
      }
    }
    close(job, `Acefone '${listName}'`);
  }
  function close(job, where) {
    job.result = { pushed: job.succeeded, failed: job.failed };
    if (job.stopped) return;
    if (job.failed) {
      job.status = job.succeeded ? "partial" : "failed";
      job.log(`Finished with ${job.succeeded.toLocaleString("en-US")} pushed and ${job.failed.toLocaleString("en-US")} failed.`);
    } else job.log(`Done \u2014 pushed ${job.succeeded.toLocaleString("en-US")} lead(s) to ${where}.`);
  }

  // src/client/analysis.js
  var PAGES = {
    chat_email_referral: { owner_label: "Owner", fresh_series: "_type", given_series: "_type", slicers: ["month", "type", "team", "vertical"] },
    incoming: { owner_label: "Owner", fresh_series: "_stage", given_series: null, slicers: ["month", "team", "vertical"] },
    high_priority: { owner_label: "Caller Name", fresh_series: "_stage", given_series: "_stage", slicers: ["month", "team", "vertical", "campaign"] }
  };
  var SLICER_COLUMNS = {
    month: ["_month", "Month of Lead"],
    type: ["_type", "Type"],
    team: ["_team", "Team"],
    vertical: ["_vertical", "Vertical"],
    campaign: ["_campaign", "Campaign"],
    owner: ["_owner", "Owner"],
    stage: ["_stage", "Contact Stage"]
  };
  var pageConfig = (key) => PAGES[String(key || "").trim().toLowerCase()] || PAGES.incoming;
  var sv = (v) => v === null || v === void 0 ? "" : String(v);
  var MONTHS3 = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  var monthKey = (v) => {
    const m = String(v).toUpperCase().match(/^([A-Z]+)-(\d{4})$/);
    const i = m ? MONTHS3.indexOf(m[1]) : -1;
    return i < 0 ? null : +m[2] * 12 + i;
  };
  var byNewestMonth = (a, b) => {
    const x = monthKey(a), y = monthKey(b);
    if (x === null) return y === null ? 0 : 1;
    if (y === null) return -1;
    return y - x;
  };
  var cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  function valueCounts(values) {
    const m = /* @__PURE__ */ new Map();
    for (const v of values) m.set(v, (m.get(v) || 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]);
  }
  function select2(view, filters = null) {
    filters = filters || {};
    const wanted = Object.entries(SLICER_COLUMNS).map(([name, [col]]) => [col, (filters[name] || []).map(String).filter((v) => v.trim())]).filter(([, w]) => w.length);
    const exStages = (filters.exclude_stages || []).map(String).filter((v) => v.trim());
    const exOwners = (filters.exclude_owners || []).map(String).filter((v) => v.trim());
    return view.filter((r) => wanted.every(([col, w]) => !(col in r) || w.includes(sv(r[col]))) && !(exStages.length && exStages.includes(sv(r._stage))) && !(exOwners.length && exOwners.includes(sv(r._owner))));
  }
  function options(view, key, filters = null) {
    const page2 = pageConfig(key);
    filters = filters || {};
    const out = { owner_label: page2.owner_label, slicers: [] };
    const has = (col) => view.length > 0 && col in view[0];
    for (const name of [...page2.slicers, "owner", "stage"]) {
      const [col, label] = SLICER_COLUMNS[name];
      if (!has(col)) continue;
      const everything = new Set(view.map((r) => sv(r[col])).filter((v) => v.trim()));
      if (!everything.size) continue;
      const others = Object.fromEntries(Object.entries(filters).filter(([k2]) => k2 !== name));
      const counts2 = Object.fromEntries(valueCounts(select2(view, others).map((r) => sv(r[col])).filter((v) => v.trim())));
      const picked = (filters[name] || []).map(String).filter((v) => v.trim());
      let values = [.../* @__PURE__ */ new Set([...Object.keys(counts2), ...picked])].sort(cmp);
      if (name === "month") values = values.map((v, i) => [v, i]).sort((a, b) => byNewestMonth(a[0], b[0]) || b[1] - a[1]).map(([v]) => v);
      out.slicers.push({ key: name, label, values, counts: Object.fromEntries(values.map((v) => [v, counts2[v] || 0])), total: everything.size });
    }
    out.default_team = cfg.get("DEFAULT_TEAM") || "";
    out.months = has("_month") ? [...new Set(view.map((r) => sv(r._month)).filter((v) => v.trim()))].sort(cmp).sort(byNewestMonth) : [];
    return out;
  }
  function crosstab(rows, ownerCol, seriesCol) {
    const owners = /* @__PURE__ */ new Map(), cols = /* @__PURE__ */ new Set();
    for (const r of rows) {
      const o = sv(r[ownerCol] ?? "(No owner)") || "(No owner)", c = seriesCol ? sv(r[seriesCol]) || "\u2014" : "Leads";
      if (!owners.has(o)) owners.set(o, /* @__PURE__ */ new Map());
      owners.get(o).set(c, (owners.get(o).get(c) || 0) + 1);
      cols.add(c);
    }
    const ownerNames = [...owners.keys()].sort(cmp), colNames = [...cols].sort(cmp);
    const rowTotal = (o) => [...owners.get(o).values()].reduce((a, b) => a + b, 0);
    const colTotal = (c) => ownerNames.reduce((a, o) => a + (owners.get(o).get(c) || 0), 0);
    const sortedOwners = ownerNames.map((o) => [o, rowTotal(o)]).sort((a, b) => b[1] - a[1]).map(([o]) => o);
    const sortedCols = colNames.map((c) => [c, colTotal(c)]).sort((a, b) => b[1] - a[1]).map(([c]) => c);
    return { owners: sortedOwners, cols: sortedCols, cell: (o, c) => owners.get(o).get(c) || 0 };
  }
  function panel(title, subtitle, rows, seriesCol, ownerCol = "_owner", limit = 25) {
    if (!rows.length) return { title, subtitle, categories: [], series: [], totals: [], total: 0, empty: true };
    const useSeries = seriesCol && rows.length && seriesCol in rows[0];
    let t = crosstab(rows, ownerCol, useSeries ? seriesCol : null);
    let owners = t.owners;
    if (!useSeries) {
      owners = valueCounts(rows.map((r) => sv(r[ownerCol] ?? "(No owner)") || "(No owner)")).map(([o]) => o);
    }
    if (limit && owners.length > limit) owners = owners.slice(0, limit);
    const cols = t.cols.map((c) => [c, owners.reduce((a, o) => a + t.cell(o, c), 0)]).sort((a, b) => b[1] - a[1]).map(([c]) => c);
    const totals = owners.map((o) => cols.reduce((a, c) => a + t.cell(o, c), 0));
    return {
      title,
      subtitle,
      categories: owners,
      series: cols.map((c) => ({ name: c, values: owners.map((o) => t.cell(o, c)) })),
      totals,
      total: totals.reduce((a, b) => a + b, 0),
      empty: false
    };
  }
  function ownerSlots(view, ownerCol = "_owner", slots = 8) {
    const names = [...new Set(view.map((r) => sv(r[ownerCol])).filter((v) => v.trim()))].sort(cmp);
    return Object.fromEntries(names.map((n, i) => [n, i % slots]));
  }
  function share(title, rows, ownerCol = "_owner", limit = 12) {
    if (!rows.length) return { title, slices: [], total: 0, empty: true };
    let counts2 = valueCounts(rows.map((r) => sv(r[ownerCol] ?? "(No owner)") || "(No owner)"));
    if (limit && counts2.length > limit) {
      const tail = counts2.slice(limit).reduce((a, [, n]) => a + n, 0);
      counts2 = counts2.slice(0, limit);
      if (tail) counts2.push(["Others", tail]);
    }
    return { title, slices: counts2.map(([name, value]) => ({ name, value })), total: counts2.reduce((a, [, n]) => a + n, 0), empty: false };
  }
  function matrix(rows, ownerCol = "_owner", seriesCol = "_stage") {
    if (!rows.length) return { columns: [], rows: [] };
    const t = crosstab(rows, ownerCol, seriesCol);
    const out = t.owners.map((o) => {
      const values = t.cols.map((c) => t.cell(o, c));
      return { name: o, values, total: values.reduce((a, b) => a + b, 0) };
    });
    const totals = t.cols.map((c) => t.owners.reduce((a, o) => a + t.cell(o, c), 0));
    return { columns: t.cols, rows: out, totals, total: totals.reduce((a, b) => a + b, 0) };
  }
  function breachedCaption(days = null, today = null) {
    days = days || breachDays(cfg.all());
    const values = new Set(Object.values(days));
    if (values.size === 1) {
      const n = Math.trunc([...values][0]);
      const since = (today !== null ? today : todayIst()) - n * DAY;
      return `Not dialled in the past ${n} day${n !== 1 ? "s" : ""} (since ${fmt(since, "%d %b %Y")}) or follow-up overdue`;
    }
    return "Not dialled within " + Object.entries(days).map(([k2, v]) => `${k2} ${v}d`).join(", ");
  }
  var pickRows = (rows, mask) => rows.filter((_, i) => mask[i]);
  function compute(view, key, filters = null) {
    const page2 = pageConfig(key);
    const rows = select2(view, filters);
    const fresh = pickRows(rows, freshMask(rows)), dnp = pickRows(rows, dnpMask(rows)), breached = pickRows(rows, breachedMask(rows));
    const enrolled = rows.filter((r) => r._stage === ENROLLED_STAGE);
    const total = rows.length;
    return {
      owner_slots: ownerSlots(view),
      cards: {
        total,
        enrolled: enrolled.length,
        conversion: total ? Math.round(enrolled.length * 1e3 / total) / 10 : 0,
        breached: breached.length,
        fresh: fresh.length,
        dnp: dnp.length,
        owners: total ? new Set(rows.map((r) => sv(r._owner))).size : 0
      },
      breach_mix: Object.fromEntries(valueCounts(breached.map((r) => sv(r._stage)))),
      dnp_caption: dnpCaption(),
      breach_days: breachDays(cfg.all()),
      panels: {
        fresh: panel("Fresh leads", "Not yet worked", fresh, page2.fresh_series),
        dnp: panel("Breached DNP leads", dnpCaption(), dnp, "_stage"),
        breached: panel("Breached leads", breachedCaption(), breached, "_stage"),
        given: panel("Leads given", "Everything in this selection", rows, page2.given_series)
      },
      enrollments: share("Actual enrollments", enrolled),
      tables: { fresh: matrix(fresh), dnp: matrix(dnp), breached: matrix(breached, "_owner", "_follow_up"), given: matrix(rows) }
    };
  }
  var display = (v) => v === null || v === void 0 ? "" : typeof v === "boolean" ? v ? "True" : "False" : String(v);
  function leads(view, key, filters = null, panelName = "breached", search = "", limit = 500) {
    let rows = select2(view, filters);
    if (panelName === "fresh") rows = pickRows(rows, freshMask(rows));
    else if (panelName === "dnp") rows = pickRows(rows, dnpMask(rows));
    else if (panelName === "breached") rows = pickRows(rows, breachedMask(rows));
    else if (panelName === "enrolled") rows = rows.filter((r) => r._stage === ENROLLED_STAGE);
    const ownerFilter = (filters || {}).panel_owner;
    if (ownerFilter) rows = rows.filter((r) => sv(r._owner) === String(ownerFilter));
    const q = String(search || "").trim().toLowerCase();
    if (q) rows = rows.filter((r) => Object.keys(r).some((c) => (!c.startsWith("_") || ["_owner", "_stage", "_campaign"].includes(c)) && display(r[c]).toLowerCase().includes(q)));
    const total = rows.length;
    rows = rows.slice(0, parseInt(limit, 10) || 500);
    const pick = (r, ...names) => {
      for (const n of names) if (n in r) return display(r[n]);
      return "";
    };
    const out = rows.map((r) => ({
      owner: sv(r._owner),
      lead: pick(r, "Name", "Lead Name", "First Name"),
      phone: pick(r, "Lead_Phone_Number", "Phone Number", "Phone no"),
      stage: sv(r._stage),
      follow_up: sv(r._follow_up),
      last_called: pick(r, "Last Called date", "Last Called Date"),
      next_follow_up: pick(r, "Next Follow Up Date"),
      calls: String(Math.trunc(Number(r._dial_count) || 0)),
      why: sv(r._reason),
      zip_intent: pick(r, "Zip Intent"),
      zip_justification: pick(r, "Zip Intent Justification")
    }));
    return { rows: out, total, shown: out.length };
  }
  var PANEL_ORDER = [["fresh", "Fresh leads"], ["dnp", "Breached DNP"], ["breached", "Breached leads"], ["given", "Total distribution"]];
  function exportSheets(view, key, moduleColumns, filters = null) {
    const page2 = pageConfig(key);
    const rows = select2(view, filters);
    const result = compute(view, key, filters);
    const fresh = freshMask(rows), dnp = dnpMask(rows), breached = breachedMask(rows);
    const cols = moduleColumns.filter((c) => rows.length && c in rows[0]);
    const leadRows = rows.map((r, i) => {
      let category = "";
      if (fresh[i]) category = "Fresh";
      if (dnp[i]) category = "Breached DNP";
      if (breached[i]) category = "Breached";
      if (r._stage === ENROLLED_STAGE) category = "Enrolled";
      const o = Object.fromEntries(cols.map((c) => [c, r[c] ?? ""]));
      Object.assign(o, { Category: category, "Why (breach reason)": r._reason ?? "", Team: r._team, Vertical: r._vertical });
      return o;
    });
    const leadCols = [...cols.filter((c) => !["Category", "Why (breach reason)", "Team", "Vertical"].includes(c)), "Category", "Why (breach reason)", "Team", "Vertical"];
    const ordered = [...cols, ...["Category", "Why (breach reason)", "Team", "Vertical"].filter((c) => !cols.includes(c))];
    const sheets = [{ name: "Leads", columns: ordered.length ? ordered : leadCols, rows: leadRows, freeze: "A2" }];
    for (const [name, title] of PANEL_ORDER) {
      const t = result.tables[name];
      if (!t || !t.rows.length) continue;
      const columns = [page2.owner_label, ...t.columns, "Total"];
      const body = t.rows.map((r) => Object.fromEntries(columns.map((c, k2) => [c, k2 === 0 ? r.name : k2 <= t.columns.length ? r.values[k2 - 1] : r.total])));
      body.push(Object.fromEntries(columns.map((c, k2) => [c, k2 === 0 ? "Total" : k2 <= t.columns.length ? t.totals[k2 - 1] : t.total])));
      sheets.push({ name: title.slice(0, 31), columns, rows: body, freeze: "B2" });
    }
    return { sheets, count: leadRows.length };
  }

  // src/client/routes.js
  var HttpError = class extends Error {
    constructor(msg, status = 400) {
      super(msg);
      this.status = status;
    }
  };
  var fail = (m, s2 = 400) => {
    throw new HttpError(m, s2);
  };
  var stamp = () => fmt(nowIst(), "%Y%m%d_%H%M");
  var fmtN8 = (n) => Number(n).toLocaleString("en-US");
  var routes = [];
  var on = (method, pattern, fn) => routes.push({ method, re: new RegExp(`^${pattern}$`), fn });
  async function token(value = null) {
    const t = String(value || "").trim() || await latestToken();
    if (!t) fail("Nothing fetched yet \u2014 press Fetch on the Reports page first.", 404);
    return t;
  }
  function daysAndBasis(d) {
    let raw = d.days;
    if (raw === null || raw === void 0 || String(raw).trim() === "") raw = cfg.int("DEFAULT_FETCH_DAYS", 30);
    if (!/^\s*-?\d+\s*$/.test(String(raw))) fail("Days must be a whole number.");
    const days = parseInt(raw, 10);
    if (days < 1 || days > 365) fail("Days must be between 1 and 365.");
    const basis = String(d.basis || cfg.get("DEFAULT_FETCH_BASIS") || DEFAULT_BASIS).trim().toLowerCase();
    if (!(basis in FETCH_BASES)) fail(`Unknown fetch basis: '${basis}'`);
    return [days, basis];
  }
  async function saveRules(rules) {
    if (!rules) return;
    const values = {};
    for (const [stage, key] of Object.entries(BREACH_DAY_KEYS)) {
      const raw = (rules.breach_days || {})[stage];
      if (raw === null || raw === void 0 || String(raw).trim() === "") continue;
      if (!/^\s*-?\d+\s*$/.test(String(raw))) fail(`Breached days for ${stage} must be a whole number.`);
      const n = parseInt(raw, 10);
      if (n < 0 || n > 365) fail(`Breached days for ${stage} must be between 0 and 365.`);
      values[key] = String(n);
    }
    if (rules.dnp) {
      let dnp;
      try {
        dnp = validateDnpRule(rules.dnp);
      } catch (e) {
        fail(e.message);
      }
      Object.assign(values, { DNP_COUNTER: dnp.counter, DNP_OPERATOR: dnp.op, DNP_VALUE: dnp.value });
    }
    if (!Object.keys(values).length) return;
    await opJson("settings.set", { settings: values });
    cfg.set(values);
  }
  var requireLsq = () => {
    if (!cfg.get("LSQ_ACCESS_KEY")) fail('LeadSquared access key is not set for you yet. Open "Setup and links" and paste your own key.');
    if (!cfg.get("LSQ_SECRET_KEY")) fail('LeadSquared secret key is not set for you yet. Open "Setup and links" and paste your own key.');
  };
  var busy = () => {
    if (anyRunning()) fail("Something is already running \u2014 wait for it, or stop it first.");
  };
  on("GET", "/api/health", async () => ({ credentials: cfg.status(), version: "online", auto_shutdown: false, open_tabs: 0, busy: anyRunning() }));
  on("GET", "/api/settings", async () => {
    const s2 = await loadSettings(true);
    return { settings: s2.settings, secrets: Object.keys(SPEC).filter((k2) => SPEC[k2].scope === "user_token").sort(), scopes: s2.scopes, admin: s2.admin, email: s2.email };
  });
  on("POST", "/api/settings", async ({ json }) => {
    const res = await opJson("settings.set", { settings: json || {} });
    forgetSettings();
    clearCache();
    clearCache2();
    await loadSettings(true);
    return { written: res.written, settings: res.settings };
  });
  on("POST", "/api/sources/refresh", async () => {
    clearCache();
    clearCache2();
    return { message: "Every linked sheet will be re-read on the next build." };
  });
  on("GET", "/api/roster", async ({ url }) => {
    try {
      const rows = await load(url.searchParams.get("refresh") === "1");
      return { rows, count: rows.length };
    } catch (e) {
      fail(`Could not read the roster sheet: ${e.message}`, 502);
    }
  });
  var SHEET_LINKS = {
    ROSTER_URL: "the roster sheet",
    CER_COMBINED_URL: "the Chat / Email / Referral sheet",
    REV_SHEET_URL: "the enrollment tracker",
    STAGE_LOG_URL: "the stage-change log",
    INCOMING_MASTER_URL: "the Incoming master sheet",
    HP_CURRENT_MONTH_URL: "the current month's High Priority sheet",
    HP_PREVIOUS_MONTH_URL: "the previous month's High Priority sheet",
    HP_REV_URL_1: "the High Priority enrollment tracker (tab 1)",
    HP_REV_URL_2: "the High Priority enrollment tracker (tab 2)"
  };
  on("GET", "/api/test/([a-z_]+)", async ({ url, m }) => {
    const what = m[1];
    try {
      if (what === "lsq") return { message: `LeadSquared returned ${(await lsqUsers()).length} user(s).` };
      if (what === "ozonetel") {
        const rows = await fetchDay(fmt(todayIst(), "%Y-%m-%d"));
        return { message: `Ozonetel returned ${fmtN8(rows.length)} call(s) for today, ${fmtN8(toFrame(rows).length)} of them sales incoming (${skills().join(", ")}).` };
      }
      if (what === "mcube_agents") {
        const agents = await loadAgents();
        return { message: `MCube returned ${agents.length} agent(s), ${agents.filter((a) => String(a.emp_phone || "").trim()).length} with a dial number.` };
      }
      if (what === "mcube") return { message: `MCube returned ${(await mcubeCampaigns()).length} campaign(s).${cfg.get("MCUBE_API_KEY") ? "" : " The API key for pushing is not saved yet."}` };
      if (what === "acefone") {
        let message = `Acefone returned ${(await acefoneLists()).length} lead list(s).`;
        if (cfg.get("ACEFONE_SKILL_LIST_ID")) message += ` The skill list has ${(await acefoneSkills(cfg.get("ACEFONE_SKILL_LIST_ID"))).length} skill(s).`;
        else message += " No skill list id yet, so pushed leads would arrive unrouted.";
        return { message };
      }
      if (what === "sheet") {
        const key = String(url.searchParams.get("key") || "");
        if (!(key in SHEET_LINKS)) fail("Unknown sheet.", 404);
        if (!cfg.get(key)) fail("Nothing saved for this link yet.");
        const t = await readCsv(key, SHEET_LINKS[key], { force: true });
        return { message: `Read ${fmtN8(t.rows.length)} row(s). Columns: ${t.columns.slice(0, 8).join(", ")}${t.columns.length > 8 ? "\u2026" : ""}` };
      }
    } catch (e) {
      if (e instanceof HttpError) throw e;
      fail(`Saved, but it did not work \u2014 ${e.message || e}`, 502);
    }
    fail("Unknown test.", 404);
  });
  on("GET", "/api/jobs", async () => ({ jobs: recent(12), running: anyRunning() }));
  on("GET", "/api/jobs/([^/]+)", async ({ m }) => {
    const j = get(decodeURIComponent(m[1]));
    if (!j) fail("Unknown job.", 404);
    return { job: j.snapshot() };
  });
  on("POST", "/api/jobs/([^/]+)/stop", async ({ m }) => ({ stopped: stop(decodeURIComponent(m[1])) }));
  on("POST", "/api/fetch", async ({ json }) => {
    const [days, basis] = daysAndBasis(json || {});
    busy();
    requireLsq();
    const job = start("fetch", `Fetch last ${days} days (${FETCH_BASES[basis].label}) + Ozonetel`, fetch2, days, basis);
    return { job_id: job.id };
  });
  on("GET", "/api/rules", async () => ({ breach_days: breachDays(cfg.all()), dnp: dnpRule2(), dnp_caption: dnpCaption(), stages: BREACH_STAGES }));
  on("GET", "/api/fetch/latest", async () => {
    const t = await latestToken();
    if (!t) return { meta: null, reports: {} };
    return { meta: await loadMeta(t), reports: await builtReports(t, ORDER) };
  });
  on("GET", "/api/fetch/result/([^/]+)", async ({ m }) => {
    const job = get(decodeURIComponent(m[1]));
    if (!job) fail("That fetch has expired.", 404);
    if (job.result === null) fail(job.errors[0] || "The fetch did not finish.", 409);
    return { meta: job.result };
  });
  on("GET", "/api/reports", async () => {
    const t = await latestToken();
    return { reports: catalogue(), token: t, meta: t ? await loadMeta(t) : null, built: t ? await builtReports(t, ORDER) : {} };
  });
  on("POST", "/api/reports/([a-z_]+)/build", async ({ m, json }) => {
    let module;
    try {
      module = get2(m[1]);
    } catch (e) {
      fail(e.message, 404);
    }
    const d = json || {};
    const t = await token(d.token);
    await saveRules(d.rules);
    busy();
    const job = start(`build:${module.KEY}`, `Build ${module.TITLE}`, run2, module.KEY, t, null, !!d.refresh);
    return { job_id: job.id, token: t };
  });
  on("POST", "/api/build-all", async ({ json }) => {
    const d = json || {};
    const t = await token(d.token);
    await saveRules(d.rules);
    busy();
    const keys = (d.reports || []).filter((k2) => k2 in BY_KEY);
    const before = {};
    for (const k2 of ORDER) {
      const s2 = await reportSummary(t, k2);
      if (s2) before[k2] = parseInt(s2.pending || 0, 10);
    }
    const job = start("build", "Build the reports", buildAll, t, keys.length ? keys : null, before);
    return { job_id: job.id, token: t };
  });
  on("POST", "/api/refresh", async ({ json }) => {
    const d = json || {};
    const [days, basis] = daysAndBasis(d);
    await saveRules(d.rules);
    busy();
    requireLsq();
    const keys = (d.reports || []).filter((k2) => k2 in BY_KEY);
    const job = start("refresh", `Fetch and rebuild (${days} days)`, rebuild, days, basis, keys.length ? keys : null);
    return { job_id: job.id };
  });
  on("GET", "/api/reports/([a-z_]+)/summary", async ({ m, url }) => {
    let module;
    try {
      module = get2(m[1]);
    } catch (e) {
      fail(e.message, 404);
    }
    const t = await token(url.searchParams.get("token"));
    return { token: t, summary: await reportSummary(t, module.KEY) };
  });
  on("GET", "/api/reports/([a-z_]+)/preview", async ({ m, url }) => {
    const t = await token(url.searchParams.get("token"));
    let out;
    try {
      out = await outputFrame(t, m[1]);
    } catch (e) {
      fail(e.message, 404);
    }
    const limit = Math.max(1, Math.min(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 500));
    return {
      token: t,
      columns: out.columns,
      rows: out.rows.length,
      preview: out.rows.slice(0, limit).map((r) => Object.fromEntries(out.columns.map((c) => [c, String(r[c] ?? "")])))
    };
  });
  on("POST", "/api/reports/([a-z_]+)/push", async ({ m, json }) => {
    let module, out;
    try {
      module = get2(m[1]);
    } catch (e) {
      fail(e.message, 404);
    }
    const t = await token((json || {}).token);
    try {
      out = await outputFrame(t, module.KEY);
    } catch (e) {
      fail(e.message, 404);
    }
    if (!cfg.get(module.PUSH_SETTING)) fail(`No Apps Script link is set for ${module.TITLE}. Open Settings and paste it.`);
    if (active().some((j) => j.kind === `push:${module.KEY}`)) fail(`${module.TITLE} is already being pushed.`);
    const job = start(`push:${module.KEY}`, `Push ${module.TITLE}`, async (job2) => {
      job2.log(`Pushing ${module.TITLE} \u2014 ${fmtN8(out.rows.length)} row(s), ${out.columns.length} column(s), ending with Zip Intent and Zip Intent Justification.`);
      const result = await push(module.PUSH_SETTING, out.columns, out.rows, { label: `the ${module.TITLE} sheet`, log: (x) => job2.log(x), stop: () => job2.checkStop() });
      job2.log(`Pushed ${fmtN8(result.rows)} row(s) in ${result.requests} request(s). Refresh the Power BI dataset to see it there.`);
      job2.result = result;
    });
    return { job_id: job.id };
  });
  on("GET", "/api/update/pending", async ({ url }) => {
    const t = await token(url.searchParams.get("token"));
    const per = {};
    for (const key of ORDER) {
      const rows = await pendingFrame(t, key), module = get2(key);
      per[key] = {
        title: module.TITLE,
        report_type: module.REPORT_TYPE,
        built: await reportSummary(t, key) !== null,
        rows: rows.length,
        keyed_on: key === "high_priority" ? "Prospect ID" : "Phone Number",
        sample: rows.slice(0, 15).map((r) => Object.fromEntries(PENDING_COLUMNS.map((c) => [c, String(r[c] ?? "")])))
      };
    }
    const combined = await combinedPending(t);
    return { token: t, reports: per, total: combined.length, preview: combined.slice(0, 50).map((r) => Object.fromEntries(PENDING_COLUMNS.map((c) => [c, String(r[c] ?? "")]))) };
  });
  var statusReady = () => {
    const st = cfg.status();
    return { mcube: st.mcube, mcube_agents: st.mcube_agents, acefone: st.acefone, acefone_skills: !!cfg.get("ACEFONE_SKILL_LIST_ID") };
  };
  on("GET", "/api/dialers/counts", async ({ url }) => {
    const t = await token(url.searchParams.get("token"));
    const last = await reportSummary(t, "dialer");
    return { token: t, last, ...await counts(t), ready: statusReady() };
  });
  on("POST", "/api/dialers/files", async ({ json }) => {
    const d = json || {};
    const t = await token(d.token);
    try {
      return { token: t, summary: await makeFiles(t, d.categories || [], d.reports && d.reports.length ? d.reports : null, d.owners && d.owners.length ? d.owners : null) };
    } catch (e) {
      fail(/^(Tick|No lead|None of)/.test(e.message) ? e.message : `Could not make the dialer files: ${e.message}`, /^(Tick|No lead|None of)/.test(e.message) ? 400 : 500);
    }
  });
  on("POST", "/api/dialers/owners", async ({ json }) => {
    const d = json || {};
    const t = await token(d.token);
    if (d.refresh) clearCache2();
    try {
      return await ownerSummary(t, d.categories || [], d.reports && d.reports.length ? d.reports : null);
    } catch (e) {
      fail(`Could not read the roster: ${e.message}`, 502);
    }
  });
  on("POST", "/api/dialers/upload/(mcube|acefone)", async ({ m, form }) => {
    const f = form && form.get("file");
    if (!f || typeof f === "string" || !f.name) fail("Choose a CSV file.");
    const t = await token(form.get("token"));
    let table;
    try {
      table = parseCsv(await f.text());
    } catch (e) {
      fail(`Could not read that file: ${e.message}`);
    }
    try {
      return await saveUpload(t, m[1], table, f.name);
    } catch (e) {
      fail(e.message);
    }
  });
  on("GET", "/api/dialers/acefone/skill-lists", async () => {
    try {
      return { skill_lists: (await acefoneSkillLists()).map((x) => ({ id: x.id, name: x.name })), selected: cfg.get("ACEFONE_SKILL_LIST_ID") };
    } catch (e) {
      fail(`Could not load Acefone skill lists: ${e.message}`, 502);
    }
  });
  on("POST", "/api/dialers/acefone/skill-list", async ({ json }) => {
    const id = String((json || {}).id || "").trim();
    await opJson("settings.set", { settings: { ACEFONE_SKILL_LIST_ID: id } });
    cfg.set({ ACEFONE_SKILL_LIST_ID: id });
    return { selected: cfg.get("ACEFONE_SKILL_LIST_ID") };
  });
  on("POST", "/api/dialers/acefone/skill-mapping", async ({ json }) => {
    const d = json || {};
    const t = await token(d.token);
    try {
      return await skillMapping(t, d.skill_list_id || null, d.overrides, d.source || "made");
    } catch (e) {
      if (/first/.test(e.message)) fail("Make the dialer files first, or upload an Acefone file.");
      fail(`Could not map callers to skills: ${e.message}`, 502);
    }
  });
  on("GET", "/api/dialers/mcube/campaigns", async () => {
    try {
      return { campaigns: (await mcubeCampaigns()).map((c) => ({ id: c.id, name: c.name })) };
    } catch (e) {
      fail(`Could not load MCube campaigns: ${e.message}`, 502);
    }
  });
  on("GET", "/api/dialers/acefone/lists", async () => {
    try {
      return { lists: (await acefoneLists()).map((i) => ({ id: i.id, name: i.name })) };
    } catch (e) {
      fail(`Could not load Acefone lead lists: ${e.message}`, 502);
    }
  });
  on("POST", "/api/dialers/push", async ({ json }) => {
    const d = json || {};
    const target = String(d.target || "").trim().toLowerCase(), targetId = String(d.id || "").trim();
    const name = String(d.name || targetId).trim(), source = d.source === "upload" ? "upload" : "made";
    if (!["mcube", "acefone"].includes(target)) fail("Push to MCube or Acefone.");
    if (!targetId) fail(target === "mcube" ? "Choose a campaign." : "Choose a lead list.");
    const number = (key, low, high, label) => {
      const raw = String(d[key] ?? "").trim();
      if (!raw) return null;
      if (!/^\d+$/.test(raw) || +raw < low || +raw > high) fail(`${label} must be a whole number from ${low} to ${high}.`);
      return parseInt(raw, 10);
    };
    const t = await token(d.token);
    try {
      await loadFile(t, source === "upload" ? `${target}_upload` : target);
    } catch {
      fail(source === "upload" ? "Upload a file first." : "Make the dialer files first.");
    }
    const args = target === "mcube" ? [t, targetId, name, number("retry_attempts", 1, 20, "Retry attempts"), number("retry_time", 1, 1440, "Retry time"), number("priority", 1, 999, "Priority"), source] : [t, targetId, name, number("priority", 1, 30, "Priority"), d.skill_map || null, d.skill_list_id || null, source];
    busy();
    const job = start(`dialer:${target}`, `Push to ${target === "mcube" ? "MCube" : "Acefone"} \u2014 ${name}`, target === "mcube" ? pushMcube : pushAcefone, ...args);
    return { job_id: job.id };
  });
  async function viewOf(key, tokenValue) {
    const t = await token(tokenValue);
    let module, view;
    try {
      module = get2(key);
      view = await loadReport(t, module.KEY);
    } catch (e) {
      fail(e.message, 404);
    }
    return [t, module, view];
  }
  var optionsRoute = async ({ m, json, url }) => {
    const d = json || {};
    const [t, , view] = await viewOf(m[1], d.token || url.searchParams.get("token"));
    return { token: t, ...options(view, m[1], d.filters) };
  };
  on("GET", "/api/analysis/([a-z_]+)/options", optionsRoute);
  on("POST", "/api/analysis/([a-z_]+)/options", optionsRoute);
  on("POST", "/api/analysis/([a-z_]+)/leads", async ({ m, json }) => {
    const d = json || {};
    const [, , view] = await viewOf(m[1], d.token);
    try {
      return leads(view, m[1], d.filters, String(d.panel || "breached"), d.search || "");
    } catch (e) {
      fail(`Could not list those leads: ${e.message}`, 500);
    }
  });
  on("POST", "/api/analysis/([a-z_]+)", async ({ m, json }) => {
    const d = json || {};
    const [t, , view] = await viewOf(m[1], d.token);
    try {
      const s2 = await reportSummary(t, m[1]) || {};
      return { token: t, built_at: s2.built_at ?? null, fetch_days: s2.fetch_days ?? null, ...compute(view, m[1], d.filters) };
    } catch (e) {
      fail(`Could not build the dashboard: ${e.message}`, 500);
    }
  });
  var csvText = (columns, rows) => "\uFEFF" + toCsv(columns, rows);
  async function xlsxBlob(sheetsSpec) {
    const ExcelJS = await lib("ExcelJS");
    const wb = new ExcelJS.Workbook();
    for (const s2 of sheetsSpec) {
      const ws = wb.addWorksheet(s2.name);
      ws.addRow(s2.columns);
      for (const r of s2.rows) ws.addRow(s2.columns.map((c) => r[c] === null || r[c] === void 0 ? "" : r[c]));
      ws.getRow(1).font = { bold: true };
      if (s2.autoWidth) s2.columns.forEach((c, k2) => {
        const width = Math.max(String(c).length, ...s2.rows.slice(0, 199).map((r) => String(r[c] ?? "").length));
        ws.getColumn(k2 + 1).width = Math.min(48, Math.max(10, width + 2));
      });
      if (s2.freeze) ws.views = [{ state: "frozen", xSplit: s2.freeze === "B2" ? 1 : 0, ySplit: 1 }];
    }
    return new Blob([await wb.xlsx.writeBuffer()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }
  var DIALER_NAMES = { mcube: "MCUBE_Upload", acefone: "Acefone_Upload", skipped: "MCUBE_Skipped_No_Agent", leads: "Dialer_Leads" };
  async function download(path) {
    const u = new URL(path, location.href);
    let m = u.pathname.match(/^\/download\/analysis\/([a-z_]+)$/);
    if (m) {
      const [, module, view] = await viewOf(m[1], u.searchParams.get("token"));
      let filters = {};
      try {
        filters = JSON.parse(u.searchParams.get("filters") || "{}");
      } catch {
      }
      const out = exportSheets(view, m[1], [...module.COLUMNS, "Zip Intent", "Zip Intent Justification"], filters);
      return downloadText(`${module.FILENAME}_Analysis_${stamp()}.xlsx`, await xlsxBlob(out.sheets.map((s2) => ({ ...s2, autoWidth: true }))));
    }
    m = u.pathname.match(/^\/download\/([^/]+)\/(.+)$/);
    if (!m) throw new Error("Unknown download.");
    const t = await token(decodeURIComponent(m[1])), rest = m[2];
    if (rest === "snapshot") {
      const frame = await loadFrame(t);
      const cols = frame.length ? Object.keys(frame[0]).filter((c) => !c.startsWith("_")) : [];
      return downloadText(`LSQ_Snapshot_${stamp()}.csv`, csvText(cols, frame));
    }
    if (rest === "lsq-update") return downloadText(`LSQ_Report_Type_Update_${stamp()}.csv`, csvText(PENDING_COLUMNS, await combinedPending(t)));
    let mm = rest.match(/^dialer\/(mcube|acefone|skipped|leads)$/);
    if (mm) {
      let file;
      try {
        file = await loadFile(t, mm[1]);
      } catch {
        throw new Error("Make the dialer files first.");
      }
      return downloadText(`${DIALER_NAMES[mm[1]]}_${stamp()}.csv`, csvText(file.columns, file.rows));
    }
    mm = rest.match(/^([a-z_]+)\/(xlsx|csv|pending)$/);
    if (mm) {
      const module = get2(mm[1]);
      if (mm[2] === "pending") return downloadText(`${module.FILENAME}_Pending_${stamp()}.csv`, csvText(PENDING_COLUMNS, await pendingFrame(t, module.KEY)));
      const out = await outputFrame(t, module.KEY);
      if (mm[2] === "csv") return downloadText(`${module.FILENAME}_${stamp()}.csv`, csvText(out.columns, out.rows));
      return downloadText(`${module.FILENAME}_${stamp()}.xlsx`, await xlsxBlob([{ name: "Sheet1", columns: out.columns, rows: out.rows }]));
    }
    throw new Error("Unknown download.");
  }
  async function handle(method, url, body) {
    for (const r of routes) {
      if (r.method !== method) continue;
      const m = url.pathname.match(r.re);
      if (!m) continue;
      let json = null, form = null;
      if (body instanceof FormData) form = body;
      else if (typeof body === "string" && body) {
        try {
          json = JSON.parse(body);
        } catch {
          json = null;
        }
      }
      try {
        const out = await r.fn({ url, m, json, form });
        return { status: 200, body: { ok: true, ...out || {} } };
      } catch (e) {
        return { status: e instanceof HttpError ? e.status : e.workerStatus || 500, body: { ok: false, error: String(e.message || e) } };
      }
    }
    return { status: 404, body: { ok: false, error: `Unknown route: ${method} ${url.pathname}` } };
  }

  // src/client/main.js
  var CFG = { url: "https://ybkldfcilvibryoxcuvq.supabase.co", key: "sb_publishable_Ywx9a1pcD6tbJDDtcS_wAw_PuJBtLBw" };
  var PORTAL = "https://sales-intelligence-portal.amitray.workers.dev/";
  var sb = null;
  var readyResolve;
  var ready = new Promise((r) => {
    readyResolve = r;
  });
  var cachedSettings = () => {
    try {
      const c = JSON.parse(sessionStorage.getItem("erc.settings") || "null");
      return c && c.data && c.data.settings || {};
    } catch {
      return {};
    }
  };
  window.ERC_DEFAULTS = () => {
    const s2 = cachedSettings();
    const n = (k2, d) => Number.isFinite(parseInt(s2[k2], 10)) ? parseInt(s2[k2], 10) : d;
    return { retry_attempts: n("MCUBE_RETRY_ATTEMPTS", 3), retry_time: n("MCUBE_RETRY_TIME", 180) };
  };
  var realFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url, location.href);
    const local = url.origin === location.origin && (url.pathname.startsWith("/api/") || url.pathname === "/keepalive");
    if (!local) return realFetch(input, init);
    await ready;
    const method = String(init.method || typeof input !== "string" && input.method || "GET").toUpperCase();
    const r = await handle(method, url, init.body);
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { "content-type": "application/json" } });
  };
  var RealES = window.EventSource;
  var JobEventSource = class {
    constructor(url) {
      this.url = url;
      this.readyState = 0;
      this.onmessage = null;
      this.onerror = null;
      this.onopen = null;
      const m = String(url).match(/\/api\/jobs\/([^/]+)\/logs/);
      if (String(url).includes("/keepalive")) {
        this.readyState = 1;
        return;
      }
      ready.then(() => {
        const job = m ? get(decodeURIComponent(m[1])) : null;
        if (!job) {
          this.readyState = 2;
          if (this.onerror) this.onerror(new Event("error"));
          return;
        }
        this.readyState = 1;
        if (this.onopen) this.onopen(new Event("open"));
        const send = (data) => {
          if (this.readyState !== 2 && this.onmessage) this.onmessage({ data });
        };
        job.messages.forEach(send);
        if (job.finishedAt) return;
        this.listener = send;
        job.listeners.add(send);
        this.job = job;
      });
    }
    close() {
      this.readyState = 2;
      if (this.job && this.listener) this.job.listeners.delete(this.listener);
    }
    addEventListener(type, fn) {
      if (type === "message") this.onmessage = fn;
      else if (type === "error") this.onerror = fn;
    }
  };
  window.EventSource = function(url, opts) {
    const u = new URL(url, location.href);
    if (u.origin === location.origin && (u.pathname.startsWith("/api/jobs/") || u.pathname === "/keepalive")) return new JobEventSource(url);
    return new RealES(url, opts);
  };
  Object.assign(window.EventSource, { CONNECTING: 0, OPEN: 1, CLOSED: 2 });
  window.lcDownload = async (path) => {
    try {
      await ready;
      await download(path);
    } catch (e) {
      if (window.toast) window.toast(e.message, "error");
      else alert(e.message);
    }
  };
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    const href = a.getAttribute("href");
    if (/^\/download\//.test(href)) {
      e.preventDefault();
      if (!a.classList.contains("disabled")) window.lcDownload(href);
    }
  }, true);
  function toPortal() {
    let last = 0;
    try {
      last = +sessionStorage.getItem("si-hop") || 0;
    } catch {
    }
    if (Date.now() - last < 3e4) return false;
    try {
      sessionStorage.setItem("si-hop", String(Date.now()));
    } catch {
    }
    location.replace(`${PORTAL}go.html?d=reports`);
    return true;
  }
  function showAuth(msg = "") {
    if (toPortal()) return;
    let el = document.getElementById("ercAuth");
    if (!el) {
      document.body.insertAdjacentHTML("beforeend", `<div class="erc-auth" id="ercAuth"><div class="erc-auth-card">
      <span class="erc-eyebrow">Sales Intelligence Portal</span><h2>Open it from the portal</h2>
      <p id="ercAuthMsg">The Elite Reports Console opens only through the Sales Intelligence Portal, after you sign in there.</p>
      <a class="btn btn-primary" href="${PORTAL}go.html?d=reports">Go to the Sales Intelligence Portal</a>
      <div class="erc-credit">Designed and developed by Amit Ray \xB7 amitray@lawsikho.in</div></div></div>`);
      el = document.getElementById("ercAuth");
    }
    if (msg) document.getElementById("ercAuthMsg").textContent = msg;
  }
  async function boot() {
    sb = window.supabase.createClient(CFG.url, CFG.key);
    setTokenGetter(async () => {
      const { data: data2 } = await sb.auth.getSession();
      return data2.session ? data2.session.access_token : "";
    });
    const { data } = await sb.auth.getSession();
    if (!data.session) {
      showAuth();
      return;
    }
    try {
      await loadSettings(true);
    } catch (e) {
      if (e.workerStatus === 403) {
        await sb.auth.signOut({ scope: "local" });
        showAuth(e.message);
      } else {
        try {
          sessionStorage.setItem("si-hop", String(Date.now()));
        } catch {
        }
        showAuth(`Could not open the console: ${e.message}`);
      }
      return;
    }
    if (page() === "reports" && !cfg.status().lsq) {
      location.replace("/setup");
      return;
    }
    const PUSH = { chat_email_referral: "CER_PUSH_URL", incoming: "INCOMING_PUSH_URL", high_priority: "HP_PUSH_URL" };
    for (const r of window.ERC_REPORTS || []) r.push_configured = !!cfg.get(PUSH[r.key]);
    readyResolve();
    decorate();
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", boot) : boot();
  window.ERC = { ready, cfg, signOut: async () => {
    await sb.auth.signOut({ scope: "local" });
    location.replace(PORTAL + "?signout=1");
  } };
  var page = () => document.body.dataset.page || "";
  var esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  function decorate() {
    const me = cfg.me();
    const bar = document.querySelector(".topbar-actions");
    if (bar) bar.insertAdjacentHTML("beforeend", `<a class="si-home" href="${PORTAL}" aria-label="Home: back to the Sales Intelligence Portal"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h4.75v-5.5h3.5V20h4.75V9.5"/></svg><span class="si-home-l">Home</span><span class="si-tip" role="tooltip"><b>Sales Intelligence Portal</b>Back to all your dashboards</span></a>`);
    const foot = document.querySelector(".sidebar-foot");
    const email2 = String(me.email || ""), name = email2.split("@")[0].split(/[._-]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
    if (foot) foot.insertAdjacentHTML("afterbegin", `<div class="erc-user"><div class="si-me" title="${esc(email2)}"><span class="si-av">${esc((name || "?")[0])}</span>
    <span class="si-t"><b>${esc(name || email2)}</b><small>${esc(email2)}</small></span>${me.admin ? '<span class="erc-tag">Admin</span>' : ""}</div>
    <button class="btn btn-sm" type="button" onclick="ERC.signOut()">Sign out</button></div>`);
    if (page() !== "setup" && !cfg.status().lsq) document.querySelector(".content")?.insertAdjacentHTML(
      "afterbegin",
      `<div class="banner"><div><strong>Your LeadSquared keys are not set yet.</strong> Every report is built from a live LeadSquared fetch with your own keys, so nothing can be built until you save them.</div><a class="btn btn-primary btn-sm" href="/setup">Paste keys &rarr;</a></div>`
    );
    const fn = { setup: setupPage, settings: settingsPage, reports: reportsPage }[page()];
    if (fn) fn(me);
  }
  function lockShared(me, scopes) {
    for (const [key, scope] of Object.entries(scopes || {})) {
      const el = document.getElementById(key);
      if (!el || scope === "user") continue;
      const note = document.createElement("div");
      note.className = "erc-note";
      if (scope === "user_token") note.textContent = "Your own key \u2014 only you set it; nobody else (admins included) can see it.";
      else {
        if (!me.admin) {
          el.disabled = true;
          el.closest(".field")?.classList.add("erc-readonly");
          el.closest(".field")?.querySelectorAll("button").forEach((b) => {
            b.disabled = true;
          });
        }
        note.textContent = "Shared for everyone \u2014 only a console admin can change it.";
      }
      el.closest(".field")?.appendChild(note);
    }
  }
  async function setupPage(me) {
    const s2 = await loadSettings();
    lockShared(me, s2.scopes);
    if (!me.admin) {
      document.querySelectorAll(`button[onclick*="saveCard(null, ['CER_PUSH_URL'"]`).forEach((b) => {
        b.disabled = true;
        b.title = "Only a console admin can change shared links.";
      });
      return;
    }
    const host = document.querySelector(".content");
    host.insertAdjacentHTML("beforeend", `<div class="card"><div class="card-head"><div><h2 class="card-title">Who can use the console</h2>
    <p class="card-sub">Only these emails can open it. Add, remove or change people in the <a href="${PORTAL}#settings" target="_blank" rel="noopener">Sales Intelligence Portal \u2192 People and access</a>.</p></div></div>
    <div class="card-body"><div id="ercUsersStatus"></div><div class="table-wrap"><table class="data"><thead><tr><th>Email</th><th>Role</th></tr></thead><tbody id="ercUsers"></tbody></table></div></div></div>`);
    try {
      const j = await opJson("users.list");
      document.getElementById("ercUsers").innerHTML = (j.users || []).map((u) => `<tr><td>${esc(u.email)}</td><td>${esc(u.role)}</td></tr>`).join("");
    } catch (e) {
      document.getElementById("ercUsersStatus").textContent = e.message;
    }
  }
  async function settingsPage(me) {
    const s2 = await loadSettings();
    lockShared(me, s2.scopes);
  }
  function reportsPage() {
    const days = document.getElementById("fetchDays"), basis = document.getElementById("fetchBasis");
    if (days && cfg.get("DEFAULT_FETCH_DAYS")) days.value = cfg.get("DEFAULT_FETCH_DAYS");
    if (basis && cfg.get("DEFAULT_FETCH_BASIS")) basis.value = cfg.get("DEFAULT_FETCH_BASIS");
  }
})();
