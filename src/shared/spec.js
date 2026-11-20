/* Every setting the Elite Reports Console understands (ported from the Reports Console's config.py SPEC; Sales IQ dropped,
   Amit 20 Nov 2026: Chat & Email Analysis covers it).
   scope:
     "global"     — an account fact: LSQ host and every sheet / Apps Script link. One shared value; only console admins change
                    it (Amit, 20 Nov 2026: "Admins, for everyone"), everyone reads it.
     "user_token" — a credential of one person (LeadSquared, Ozonetel, MCube, Acefone; Amit, 20 Nov 2026: each person's own):
                    stored for that person only, never sent to any browser, masked even to them.
     "user"       — a working preference (fetch defaults, breach rules, batch sizes…): each person's own value. */
export const SPEC = {
  // LeadSquared
  LSQ_HOST:                      { def: "api-in21.leadsquared.com", scope: "global" },
  LSQ_ACCESS_KEY:                { def: "", scope: "user_token" },
  LSQ_SECRET_KEY:                { def: "", scope: "user_token" },
  LSQ_PAGE_SIZE:                 { def: "1000", scope: "user" },
  LSQ_DATES_ARE_UTC:             { def: "true", scope: "user" },
  DEFAULT_FETCH_DAYS:            { def: "30", scope: "user" },
  DEFAULT_FETCH_BASIS:           { def: "modified", scope: "user" },
  KEEP_HOURS:                    { def: "12", scope: "user" },
  DOWNLOAD_DATE_FORMAT:          { def: "%d/%m/%Y %H:%M:%S", scope: "user" },
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
  OZONETEL_API_KEY:              { def: "", scope: "user_token" },
  OZONETEL_USERNAME:             { def: "", scope: "user_token" },
  OZONETEL_API_URL:              { def: "https://in1-ccaas-api.ozonetel.com/ca_reports/fetchCDRDetails", scope: "global" },
  OZONETEL_SKILLS:               { def: "sales,Arbitrage_Sales", scope: "global" },
  OZONETEL_SLEEP_SECONDS:        { def: "32", scope: "user" },
  OZONETEL_PAGE_SIZE:            { def: "500", scope: "user" },
  OZONETEL_TODAY_REFRESH_MINUTES: { def: "30", scope: "user" },
  // MCube
  MCUBE_API_KEY:                 { def: "", scope: "user_token" },
  MCUBE_AUTHORIZATION:           { def: "", scope: "user_token" },
  MCUBE_GETAGENTS_TOKEN:         { def: "", scope: "user_token" },
  MCUBE_EMPLOYEES_AUTHORIZATION: { def: "", scope: "user_token" },
  MCUBE_AGENT_SOURCE:            { def: "both", scope: "user" },
  MCUBE_PUSH_BATCH_SIZE:         { def: "200", scope: "user" },
  MCUBE_RETRY_ATTEMPTS:          { def: "3", scope: "user" },
  MCUBE_RETRY_TIME:              { def: "180", scope: "user" },
  MCUBE_SEND_REFID:              { def: "false", scope: "user" },
  MCUBE_PRIORITY:                { def: "1", scope: "user" },
  // Acefone
  ACEFONE_TOKEN:                 { def: "", scope: "user_token" },
  ACEFONE_SKILL_LIST_ID:         { def: "", scope: "user" },
  ACEFONE_PUSH_BATCH_SIZE:       { def: "500", scope: "user" },
  ACEFONE_PRIORITY:              { def: "30", scope: "user" },
  // Breach rules and wording
  RULE_DAYS_FOLLOW_UP:           { def: "2", scope: "user" },
  RULE_DAYS_COUNSELLED:          { def: "2", scope: "user" },
  RULE_DAYS_CALL_BACK:           { def: "2", scope: "user" },
  DNP_COUNTER:                   { def: "phone", scope: "user" },
  DNP_OPERATOR:                  { def: "lt", scope: "user" },
  DNP_VALUE:                     { def: "4", scope: "user" },
  DEFAULT_TEAM:                  { def: "Elite", scope: "user" },
  DIAL_LABEL_MAX:                { def: "6", scope: "user" },
  // Pushing to the sheets
  PUSH_CHUNK_ROWS:               { def: "0", scope: "user" },
  PUSH_TIMEOUT_SECONDS:          { def: "300", scope: "user" },
};
export const TOKEN_KEYS = Object.keys(SPEC).filter((k) => SPEC[k].scope === "user_token");
export const SHEET_KEYS = Object.keys(SPEC).filter((k) => /_URL(_\d)?$/.test(k) && SPEC[k].scope === "global" && k !== "OZONETEL_API_URL");
export const PUSH_KEYS = SHEET_KEYS.filter((k) => k.endsWith("_PUSH_URL"));
export const READ_KEYS = SHEET_KEYS.filter((k) => !k.endsWith("_PUSH_URL"));
export const isPersonal = (k) => SPEC[k] && (SPEC[k].scope === "user" || SPEC[k].scope === "user_token");
export const MASK = "************";

export function getSetting(values, key) {
  const raw = values[key];
  if (raw === undefined || raw === null || String(raw).trim() === "") return SPEC[key] ? SPEC[key].def : "";
  return String(raw).trim();
}
export function getInt(values, key, fallback = 0) {
  const n = parseInt(getSetting(values, key), 10);
  return Number.isFinite(n) ? n : fallback;
}
export function getBool(values, key, fallback = false) {
  const t = getSetting(values, key).toLowerCase();
  if (["1", "true", "yes", "on"].includes(t)) return true;
  if (["0", "false", "no", "off"].includes(t)) return false;
  return fallback;
}
/** config.status(): which pieces are configured — the readiness badges (Sales IQ dropped). */
export function credentialStatus(v) {
  const g = (k) => !!getSetting(v, k);
  return {
    lsq: g("LSQ_ACCESS_KEY") && g("LSQ_SECRET_KEY"),
    roster: g("ROSTER_URL"),
    cer: g("CER_COMBINED_URL") && g("REV_SHEET_URL"),
    incoming: g("INCOMING_MASTER_URL"),
    ozonetel: g("OZONETEL_API_KEY") && g("OZONETEL_USERNAME"),
    mcube: g("MCUBE_API_KEY") && g("MCUBE_AUTHORIZATION"),
    mcube_agents: g("MCUBE_GETAGENTS_TOKEN") || g("MCUBE_EMPLOYEES_AUTHORIZATION"),
    acefone: g("ACEFONE_TOKEN"),
    high: g("HP_CURRENT_MONTH_URL"),
    push_cer: g("CER_PUSH_URL"),
    push_incoming: g("INCOMING_PUSH_URL"),
    push_high: g("HP_PUSH_URL"),
  };
}
/** config.breach_days() */
export const breachDays = (v) => ({
  "Follow Up For Closure": getInt(v, "RULE_DAYS_FOLLOW_UP", 2),
  "Counselled lead": getInt(v, "RULE_DAYS_COUNSELLED", 2),
  "Call Back Later": getInt(v, "RULE_DAYS_CALL_BACK", 2),
});
export const BREACH_DAY_KEYS = { "Follow Up For Closure": "RULE_DAYS_FOLLOW_UP", "Counselled lead": "RULE_DAYS_COUNSELLED", "Call Back Later": "RULE_DAYS_CALL_BACK" };
/** config.dnp_rule() */
export function dnpRule(v) {
  const counter = (getSetting(v, "DNP_COUNTER") || "phone").toLowerCase(), op = (getSetting(v, "DNP_OPERATOR") || "lt").toLowerCase();
  return { counter: ["phone", "assigned"].includes(counter) ? counter : "phone", op: ["lt", "gt", "eq"].includes(op) ? op : "lt",
           value: getSetting(v, "DNP_VALUE") || "4" };
}
