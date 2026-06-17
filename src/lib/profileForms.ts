// Framework-free helpers for the edit-profile flow. Unit-tested in __tests__/profileForms.test.ts.

// Drop empty strings / null / undefined / empty arrays so we never send invalid fields to Joi.
export function prune(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === "" || v === null || v === undefined) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

// Internal section keys per role (drives both the accordion and the dashboard).
export const ROLE_SECTION_KEYS = {
  doctor: ["basic", "education", "workplace", "professional", "verification"],
  student: ["basic", "academics", "experiences"],
  general_user: ["basic", "interests"],
};

// Backend completion.sections keys → internal section keys (others map to themselves).
const SECTION_KEY_MAP = { basic: "basicContact", professional: "professionalDetails" };

export function completionForRole(role, completion) {
  const keys = ROLE_SECTION_KEYS[role] || ROLE_SECTION_KEYS.general_user;
  const backend = completion?.sections || {};
  const sections = {};
  let done = 0;
  for (const k of keys) {
    const complete = !!backend[SECTION_KEY_MAP[k] || k];
    sections[k] = complete;
    if (complete) done += 1;
  }
  const total = keys.length;
  const percent = completion?.percent ?? (total ? Math.round((done / total) * 100) : 0);
  return { sections, done, total, percent };
}
