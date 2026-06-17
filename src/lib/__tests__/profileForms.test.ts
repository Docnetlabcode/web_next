import { describe, it, expect } from "vitest";
import { prune, completionForRole, ROLE_SECTION_KEYS } from "@/lib/profileForms";

describe("prune", () => {
  it("drops empty strings, null, undefined, and empty arrays", () => {
    expect(prune({ a: "x", b: "", c: null, d: undefined, e: [], f: [1], g: 0 }))
      .toEqual({ a: "x", f: [1], g: 0 });
  });
  it("keeps File/Blob and boolean false", () => {
    const blob = new Blob(["x"]);
    expect(prune({ file: blob, flag: false })).toEqual({ file: blob, flag: false });
  });
});

describe("ROLE_SECTION_KEYS", () => {
  it("lists sections per role", () => {
    expect(ROLE_SECTION_KEYS.doctor).toEqual(["basic", "education", "workplace", "professional", "verification"]);
    expect(ROLE_SECTION_KEYS.student).toEqual(["basic", "academics", "experiences"]);
    expect(ROLE_SECTION_KEYS.general_user).toEqual(["basic", "interests"]);
  });
});

describe("completionForRole", () => {
  it("maps backend section keys to internal keys and counts done", () => {
    const completion = {
      percent: 60,
      sections: { basicContact: true, education: true, workplace: false, professionalDetails: true, verification: false },
    };
    const r = completionForRole("doctor", completion);
    expect(r.sections).toEqual({ basic: true, education: true, workplace: false, professional: true, verification: false });
    expect(r.done).toBe(3);
    expect(r.total).toBe(5);
    expect(r.percent).toBe(60);
  });
  it("falls back to computed percent when none provided, defaults unknown role to general_user", () => {
    const r = completionForRole("general_user", { sections: { basicContact: true, interests: false } });
    expect(r.sections).toEqual({ basic: true, interests: false });
    expect(r.percent).toBe(50);
  });
});
