/* Ports of apis/mcube, apis/acefone, apis/lsq. Same shapes, same error messages; the HTTP goes through the Worker. */
import { ApiError, request, limiters, cfg, sleep, s } from "./core.js";

const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
const str = (v) => (v === null || v === undefined ? "" : String(v)).trim();

/* ================================================================== MCube */
const mc = (name, args) => request(name, args, { limiter: limiters.mcube });

export async function mcubeAgents() {
  const data = await mc("mcube.getagents", {});
  if (!isObj(data)) throw new ApiError("MCube getagents returned an unexpected response.");
  const list = data.agentlist;
  if (!Array.isArray(list)) {
    throw new ApiError(`MCube getagents did not return an agent list — ${data.message || data.success || JSON.stringify(data)}`);
  }
  return list.filter(isObj).map((row) => ({
    agent_id: str(row.agent_id), agent_name: str(row.agent_name), extension: str(row.extension), email: str(row.email),
    emp_phone: str(row.emp_phone), login_status: str(row.login_status), break_status: str(row.break_status),
  }));
}

function loginStatus(row) {
  if (str(row.oncall) === "1") return "oncall";
  const flag = str(row.is_logged_in);
  if (flag === "1") return "1";
  if (flag === "0" || flag === "") return flag ? "0" : "";
  return flag;
}
export async function mcubeEmployees() {
  const data = await mc("mcube.employees", {});
  if (!isObj(data)) throw new ApiError("MCube get-employees returned an unexpected response.");
  let rows = data.employees;
  if (!Array.isArray(rows) || !rows.length) rows = data.agents;
  if (!Array.isArray(rows)) {
    throw new ApiError(`MCube get-employees did not return an employee list — ${data.message || data.status || "no employees key"}`);
  }
  return rows.filter(isObj).map((row) => ({
    agent_id: str(row.agent_id), agent_name: str(row.agent_name), extension: str(row.extension || row.softphoneext),
    email: str(row.email), emp_phone: str(row.emp_phone), login_status: loginStatus(row), break_status: str(row.break_status),
  })).filter((r) => r.agent_name);
}

const NAME_KEYS = ["name", "campaign_name", "list_name", "autodialer_name", "autodailer_name", "title", "campaign", "description", "label", "dialer_name"];
function campaignName(row, cid) {
  for (const key of NAME_KEYS) {
    const v = str(row[key]);
    if (v && !/^\d+$/.test(v)) return v;
  }
  const skip = ["id", "date", "time", "status", "count", "flag", "type", "number", "phone", "url", "key", "token"];
  for (const [key, value] of Object.entries(row)) {
    const lowered = String(key).toLowerCase();
    if (skip.some((w) => lowered.includes(w))) continue;
    const text = str(typeof value === "object" && value !== null ? "" : value);
    if (text && !/^\d+$/.test(text) && /[A-Za-z]/.test(text) && text.length <= 80) return text;
  }
  return `Campaign ${cid}`;
}
export async function mcubeCampaigns() {
  const data = await mc("mcube.campaigns", {});
  if (!isObj(data)) throw new ApiError("MCube autodialer-list returned an unexpected response.");
  const rows = data.auto_dialer;
  if (!Array.isArray(rows)) throw new ApiError(`MCube autodialer-list did not return campaigns — ${data.message || data.error || JSON.stringify(data)}`);
  const out = [];
  for (const row of rows) {
    if (!isObj(row)) continue;
    const cid = row.id || row.campaign_id || row.autodailer_id;
    if (cid === null || cid === undefined || cid === "") continue;
    out.push({ id: str(cid), name: campaignName(row, cid), raw: row });
  }
  out.sort((a, b) => cmpLower(a.name, b.name));
  return out;
}
export const cmpLower = (a, b) => { const x = a.toLowerCase(), y = b.toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; };

const CONTACT_FIELDS = ["id", "autodailer_id", "eid", "gid", "name", "number", "source", "starttime", "endtime", "startdate", "enddate", "priority", "lastcall", "created_at"];
export async function mcubeContactsPage(campaignId, limit = 1000, offset = 0, agentNumber = null, groupId = null) {
  const args = { campaign_id: String(campaignId), limit, offset: Math.max(0, offset) };
  if (agentNumber) args.agent_number = str(agentNumber);
  if (groupId) args.group_id = str(groupId);
  const data = await mc("mcube.contacts", args);
  if (!isObj(data)) throw new ApiError("MCube campaign-contacts returned an unexpected response.");
  const status = str(data.status).toLowerCase();
  if (status && !["succ", "success", "ok"].includes(status)) {
    throw new ApiError(`MCube campaign-contacts refused the request — ${data.message || data.msg || status}`);
  }
  return data;
}
export async function mcubeContactsAll(campaignId, { agentNumber = null, groupId = null, agentNames = {}, maxPages = 200, progress = null } = {}) {
  const contacts = [];
  let offset = 0;
  const meta = { total_contacts: 0, filtered_contacts: 0, pages: 0 };
  for (let p = 0; p < maxPages; p++) {
    const data = await mcubeContactsPage(campaignId, 1000, offset, agentNumber, groupId);
    const page = Array.isArray(data.contacts) ? data.contacts : [];
    for (const row of page) {
      if (!isObj(row)) continue;
      const lead = {};
      for (const k of CONTACT_FIELDS) lead[k] = row[k] === null || row[k] === undefined ? "" : row[k];
      lead.number = str(lead.number);
      lead.eid = str(lead.eid);
      lead.agent_name = agentNames[lead.eid] || "";
      for (const [k, v] of Object.entries(row)) if (!(k in lead)) lead[k] = v;
      contacts.push(lead);
    }
    meta.pages += 1;
    for (const key of ["total_contacts", "filtered_contacts"]) {
      const n = parseInt(data[key], 10);
      if (Number.isFinite(n) && data[key]) meta[key] = n;
    }
    if (progress) progress(contacts.length, meta.filtered_contacts || meta.total_contacts || 0);
    if (page.length < 1000) break;
    offset += 1000;
  }
  meta.fetched = contacts.length;
  return [contacts, meta];
}

const LEAD_FIELDS = ["id", "name", "number", "agent_name", "emp_code", "source", "status", "call_status", "retrycount", "lastcall", "created_at", "priority"];
export async function mcubeLeads(campaignId) {
  const data = await mc("mcube.leads", { campaign_id: String(campaignId) });
  if (!isObj(data)) throw new ApiError("MCube lead fetch returned an unexpected response.");
  let rows = data.list_info;
  if (rows === null || rows === undefined) rows = data.data;
  if (!Array.isArray(rows)) throw new ApiError(`MCube did not return a lead list — ${data.message || data.error || "unexpected response"}`);
  return rows.filter(isObj).map((row) => {
    const lead = {};
    for (const k of LEAD_FIELDS) lead[k] = row[k] === null || row[k] === undefined ? "" : row[k];
    lead.number = str(lead.number);
    return lead;
  });
}
export async function mcubeDelete(campaignId, numbers) {
  const clean = [...new Set((numbers || []).map(str).filter(Boolean))];
  if (!clean.length) throw new Error("No phone numbers to delete.");
  return mc("mcube.delete", { campaign_id: String(campaignId), numbers: clean });
}
export function mcubeRetryDefaults() {
  return [Math.max(1, cfg.int("MCUBE_RETRY_ATTEMPTS", 3)), Math.max(1, cfg.int("MCUBE_RETRY_TIME", 180))];
}
export async function mcubeUpload(campaignId, listData) {
  if (!Array.isArray(listData) || !listData.length) throw new Error("list_data must be a non-empty list of leads.");
  if (!/^\s*[+-]?\d+\s*$/.test(String(campaignId))) throw new Error(`campaign_id must be numeric, got '${campaignId}'`);
  return mc("mcube.push", { campaign_id: String(parseInt(campaignId, 10)), listData });
}
const blank = (v) => v === null || v === undefined || v === "";
export function mcubeBuildLead({ number, name = "", source = "", agent_number = "", priority = 1, retry_time = null, retry_attempt = null, ref_id = "" }) {
  const digits = String(number ?? "").replace(/\D/g, "");
  if (!digits) return null;
  let pv = /^[+-]?\d+$/.test(str(priority)) ? parseInt(str(priority), 10) : 1;
  if (pv < 1) pv = 1;
  const [att, mins] = mcubeRetryDefaults();
  const lead = {
    number: Number(digits) <= Number.MAX_SAFE_INTEGER ? Number(digits) : digits,
    name: str(name), source: str(source),
    retry_time: String(!blank(retry_time) ? retry_time : mins),
    retry_attempt: String(!blank(retry_attempt) ? retry_attempt : att),
    priority: pv,
  };
  const eid = str(agent_number);
  if (eid) lead.eid = eid;
  if (cfg.bool("MCUBE_SEND_REFID") && str(ref_id)) lead.refid = str(ref_id);
  return lead;
}
export function mcubeSummarise(response) {
  if (!isObj(response)) return { ok: true, message: String(response) };
  const out = { ok: response.status !== false, message: response.msg || response.message || "", raw: response };
  if (Array.isArray(response.success)) out.succeeded = response.success.length;
  if (Array.isArray(response.failed)) {
    out.failed = response.failed.length;
    if (response.failed.length) out.ok = out.ok && response.failed.length === 0;
  }
  return out;
}

/* ================================================================== Acefone */
const ac = (name, args, opts = {}) => request(name, args, { limiter: limiters.acefone, ...opts });

export async function acefoneLists() {
  const res = await ac("acefone.lists", {});
  const rows = isObj(res) ? ("data" in res ? res.data : res) : res;
  if (!Array.isArray(rows)) return [];
  const out = [];
  for (const row of rows) {
    if (!isObj(row)) continue;
    const lid = row.id || row.list_id;
    if (lid === null || lid === undefined || lid === "") continue;
    out.push({ id: str(lid), name: str(row.name || row.list_name || `List ${lid}`),
               field_map: Array.isArray(row.field_map) ? row.field_map.map(String) : [], raw: row });
  }
  out.sort((a, b) => cmpLower(a.name, b.name));
  return out;
}
export async function acefoneSkillLists() {
  const res = await ac("acefone.skill_lists", {});
  const rows = isObj(res) ? (res.data || []) : res;
  if (!Array.isArray(rows)) return [];
  const out = [];
  for (const row of rows) {
    if (!isObj(row) || row.id === null || row.id === undefined || row.id === "") continue;
    out.push({ id: str(row.id), name: str(row.name || `Skill list ${row.id}`), raw: row });
  }
  out.sort((a, b) => cmpLower(a.name, b.name));
  return out;
}
export async function acefoneSkills(skillListId, includeDeleted = false) {
  const collected = [];
  let cursor = null;
  for (;;) {
    const args = { skill_list_id: skillListId, limit: 100 };
    if (cursor !== null) args.last_seen_id = cursor;
    const res = await ac("acefone.skills", args);
    if (!isObj(res)) break;
    const page = res.data || [];
    if (!page.length) break;
    collected.push(...page);
    const next = page[page.length - 1].id;
    if (next === cursor || !res.hasMore) break;
    cursor = next;
  }
  const out = [];
  for (const row of collected) {
    if (!isObj(row) || row.id === null || row.id === undefined || row.id === "") continue;
    if (row.deleted_at && !includeDeleted) continue;
    out.push({ id: str(row.id), name: str(row.name), deleted_at: row.deleted_at });
  }
  return out;
}

export const DIALER_STATUS_LABELS = { 0: "New", [-1]: "Undisposed", [-2]: "Account DND", [-3]: "Public DND", [-4]: "Emergency", [-5]: "Call Drop", [-6]: "Channel Limit", [-7]: "Blocked" };
export const DIAL_STATUS_LABELS = { 1: "New", 2: "Message Played", 3: "DTMF Pressed", 4: "No Answer", 5: "DND", 6: "Busy", 7: "Congestion", 8: "Failed", 9: "Account DND" };
export const FIELD_LABELS = { field_0: "Phone Number", field_1: "Name", field_2: "Email Id", field_3: "Address", field_4: "Company Name", field_5: "External Reference ID" };
const asInt = (v) => (v === null || v === undefined || v === "" ? null : (/^[+-]?\d+$/.test(str(v)) ? parseInt(str(v), 10) : null));
export function statusLabel(v) {
  const n = asInt(v);
  if (n === null) return "";
  return n in DIALER_STATUS_LABELS ? DIALER_STATUS_LABELS[n] : `Dispositioned (${n})`;
}
export function isPending(lead) {
  const n = asInt(lead.dialer_dial_status);
  if (n === null) return null;
  return n === 0 || n === -1;
}
export async function acefoneListLeads(listId) {
  const res = await ac("acefone.list_leads", { list_id: listId });
  const rows = isObj(res) ? ("data" in res ? res.data : res) : res;
  if (!Array.isArray(rows)) return [];
  return rows.filter(isObj).map((row) => {
    const skill = row.dialer_skill;
    let skillName, skillId;
    if (isObj(skill)) { skillName = skill.name; skillId = skill.id || row.skill_id || row.dialer_skill_id; }
    else { skillName = row.dialer_skill_name; skillId = row.dialer_skill_id || row.skill_id; }
    const lead = {
      id: row.id || row.lead_id, lead_id: row.lead_id || row.id, list_id: row.list_id, list_name: row.list_name,
      skill_id: skillId === null || skillId === undefined ? "" : String(skillId), skill_name: skillName || "",
      priority: row.priority, call_count: row.call_count, retry_count: row.retry_count,
      dial_status: row.dial_status, dial_status_label: DIAL_STATUS_LABELS[asInt(row.dial_status)] || "",
      dialer_dial_status: row.dialer_dial_status, status_label: statusLabel(row.dialer_dial_status),
      lead_picked: row.lead_picked, created_at: row.created_at, updated_at: row.updated_at,
    };
    for (const k of Object.keys(FIELD_LABELS)) lead[k] = row[k] || "";
    return lead;
  });
}
export async function acefoneBulkCreate(listId, data, skillId = null, priority = null) {
  if (!Array.isArray(data) || !data.length) throw new Error("data must be a non-empty list of lead objects.");
  const args = { list_id: listId, data };
  if (!blank(skillId)) args.skill_id = str(skillId);
  if (!blank(priority)) args.priority = /^[+-]?\d+$/.test(str(priority)) ? parseInt(priority, 10) : priority;
  return ac("acefone.bulk_create", args);
}
export async function acefoneDeleteByField(listId, field, values) {
  const clean = [...new Set((values || []).map(str).filter(Boolean))];
  if (!clean.length) throw new Error("No values to delete.");
  return ac("acefone.delete_by_field", { list_id: listId, field: str(field), data: clean });
}
export async function acefoneDeleteSingle(leadId) { return ac("acefone.delete_single", { lead_id: leadId }); }
export function acefoneBuildLead({ phone, name = "", email = "", address = "", company = "", ref_id = "", priority = null, skill_id = null }) {
  phone = str(phone);
  if (!phone) return null;
  const lead = { field_0: phone, field_1: str(name), field_2: str(email), field_3: str(address), field_4: str(company), field_5: str(ref_id) };
  if (!blank(priority) && /^[+-]?\d+$/.test(str(priority))) lead.priority = parseInt(str(priority), 10);
  if (!blank(skill_id)) lead.skill_id = str(skill_id);
  return lead;
}

/* ================================================================== LeadSquared */
const lq = (name, args) => request(name, args, { limiter: limiters.lsq });

export async function lsqUsers() {
  const data = await lq("lsq.users", {});
  let rows = Array.isArray(data) ? data : null;
  if (rows === null && isObj(data)) rows = data.Users || data.List || data.Result;
  if (!Array.isArray(rows)) throw new ApiError(`LeadSquared did not return a user list — ${JSON.stringify(data).slice(0, 200)}`);
  const users = [];
  for (const row of rows) {
    if (!isObj(row)) continue;
    const uid = row.ID || row.Id || row.UserId;
    const email = str(row.EmailAddress);
    if (!uid || !email) continue;
    const st = /^[+-]?\d+$/.test(str(row.StatusCode ?? 0)) ? parseInt(str(row.StatusCode ?? 0), 10) : 0;
    const first = str(row.FirstName), last = str(row.LastName);
    users.push({ id: str(uid), email, name: `${first} ${last}`.trim() || email, role: row.Role || "", active: st === 0 });
  }
  return users;
}
export function lsqEmailIndex(users) {
  const index = {};
  for (const u of users) {
    const k = u.email.toLowerCase();
    const ex = index[k];
    if (!ex || (u.active && !ex.active)) index[k] = u;
  }
  return index;
}
export async function lsqBulkUpdate(entries, searchBy = "ProspectID", pushMissing = true) {
  if (!entries || !entries.length) throw new Error("No leads to update.");
  if (entries.length > 25) throw new Error(`LeadSquared accepts at most 25 leads per call; got ${entries.length}.`);
  const props = [];
  for (const entry of entries) {
    const fields = Object.entries(entry).filter(([, v]) => !blank(v)).map(([a, v]) => ({ Attribute: a, Value: String(v) }));
    if (fields.length) props.push({ Fields: fields });
  }
  if (!props.length) throw new Error("No usable fields to update.");
  return lq("lsq.bulk_update", { payload: { SearchBy: searchBy, Options: { PushNonExistentLeadsToUnProcessedList: !!pushMissing }, LeadPropertiesList: props } });
}
export function lsqSummarise(response) {
  if (!isObj(response)) return { total: 0, success: 0, failed: 0, unprocessed: 0, message: String(response).slice(0, 200), reasons: [] };
  const status = response.Status || {}, details = response.Details || {};
  const count = (k) => (/^[+-]?\d+$/.test(str(status[k] || 0)) ? parseInt(str(status[k] || 0), 10) : 0);
  const reasons = [];
  for (const bucket of ["FailedLeads", "UnProcessedLeads"]) {
    const rows = details[bucket];
    if (!Array.isArray(rows)) continue;
    for (const row of rows.slice(0, 25)) if (isObj(row)) reasons.push(`${row.IdentifierValue || row.Identifier || "?"}: ${row.Reason || "no reason given"}`);
  }
  return { total: count("TotalCount"), success: count("SuccessCount"), failed: count("FailureCount"), unprocessed: count("UnProcessedCount"),
           message: str(status.Message), reasons };
}
export async function lsqAvailableFields() {
  let data;
  try { data = await lq("lsq.metadata", {}); } catch (e) { if (e instanceof ApiError) return null; throw e; }
  const rows = Array.isArray(data) ? data : (isObj(data) ? data.Fields : null);
  if (!Array.isArray(rows)) return null;
  const names = new Set();
  for (const row of rows) if (isObj(row)) { const n = row.SchemaName || row.schemaName; if (n) names.add(str(n)); }
  return names.size ? names : null;
}
const THROTTLE = ["rate", "limit", "too many", "throttl", "exceeded"];
const isThrottle = (m) => THROTTLE.some((w) => String(m || "").toLowerCase().includes(w));
export async function lsqLeadsPage(cutoffUtc, fields, page, pageSize = 1000, { maxWaits = 8, log = null, lookupName = "ModifiedOn", operator = ">" } = {}) {
  const payload = {
    Parameter: { LookupName: lookupName, LookupValue: cutoffUtc, SqlOperator: operator },
    Columns: { Include_CSV: fields.join(",") },
    Paging: { PageIndex: page, PageSize: Math.min(pageSize, 1000) },
  };
  let waits = 0;
  for (;;) {
    let data;
    try {
      data = await lq("lsq.leads_get", { payload });
    } catch (e) {
      if (e instanceof ApiError && (e.status === 429 || isThrottle(e.message)) && waits < maxWaits) {
        waits += 1;
        if (log) log(`LeadSquared asked us to slow down — waiting ${waits * 5}s.`);
        await sleep(waits * 5000);
        continue;
      }
      throw e;
    }
    if (Array.isArray(data)) return data;
    const message = isObj(data) ? (data.ExceptionMessage || data.Message || JSON.stringify(data)) : "";
    if (isThrottle(message) && waits < maxWaits) {
      waits += 1;
      if (log) log(`LeadSquared asked us to slow down — waiting ${waits * 5}s.`);
      await sleep(waits * 5000);
      continue;
    }
    if (isObj(data) && data.success === true && Object.keys(data).length === 1) return [];
    throw new ApiError(`LeadSquared Leads.Get failed on page ${page}: ${String(message).slice(0, 400)}`);
  }
}
export { s };
