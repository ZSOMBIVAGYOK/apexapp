import { describe, it, expect } from "vitest";
import { parseAndValidateNumber } from "./NumberInput";

describe("NumberInput parseAndValidateNumber logic", () => {
  it("allows clearing field and reports required error when required", () => {
    const result = parseAndValidateNumber("", { required: true });
    expect(result.isValid).toBe(false);
    expect(result.value).toBeNull();
    expect(result.error).toBe("A mező kitöltése kötelező");
  });

  it("allows clearing field when allowEmpty is true", () => {
    const result = parseAndValidateNumber("", { required: false });
    expect(result.isValid).toBe(true);
    expect(result.value).toBeNull();
    expect(result.error).toBeNull();
  });

  it("parses typed integer '182'", () => {
    const result = parseAndValidateNumber("182", { min: 100, max: 250 });
    expect(result.isValid).toBe(true);
    expect(result.value).toBe(182);
    expect(result.error).toBeNull();
  });

  it("parses Hungarian decimal format with comma '72,5'", () => {
    const result = parseAndValidateNumber("72,5", { min: 30, max: 200 });
    expect(result.isValid).toBe(true);
    expect(result.value).toBe(72.5);
    expect(result.error).toBeNull();
  });

  it("parses standard decimal format with dot '72.5'", () => {
    const result = parseAndValidateNumber("72.5", { min: 30, max: 200 });
    expect(result.isValid).toBe(true);
    expect(result.value).toBe(72.5);
    expect(result.error).toBeNull();
  });

  it("handles pasted text with spaces e.g. '  84,2  '", () => {
    const result = parseAndValidateNumber("  84,2  ", { min: 40, max: 150 });
    expect(result.isValid).toBe(true);
    expect(result.value).toBe(84.2);
    expect(result.error).toBeNull();
  });

  it("rejects invalid non-numerical text like 'invalid_abc'", () => {
    const result = parseAndValidateNumber("invalid_abc");
    expect(result.isValid).toBe(false);
    expect(result.value).toBeNull();
    expect(result.error).toBe("Kérjük, érvényes számot adjon meg");
  });

  it("rejects malformed numbers with multiple decimal points like '12.3.4'", () => {
    const result = parseAndValidateNumber("12.3.4");
    expect(result.isValid).toBe(false);
    expect(result.value).toBeNull();
    expect(result.error).toBe("Kérjük, érvényes számot adjon meg");
  });

  it("enforces min value constraint", () => {
    const result = parseAndValidateNumber("115", { min: 120, max: 230 });
    expect(result.isValid).toBe(false);
    expect(result.value).toBe(115);
    expect(result.error).toBe("A minimális érték: 120");
  });

  it("enforces max value constraint", () => {
    const result = parseAndValidateNumber("245", { min: 120, max: 230 });
    expect(result.isValid).toBe(false);
    expect(result.value).toBe(245);
    expect(result.error).toBe("A maximális érték: 230");
  });

  it("accepts values exactly on min and max boundaries", () => {
    const minRes = parseAndValidateNumber("120", { min: 120, max: 230 });
    expect(minRes.isValid).toBe(true);
    expect(minRes.value).toBe(120);

    const maxRes = parseAndValidateNumber("230", { min: 120, max: 230 });
    expect(maxRes.isValid).toBe(true);
    expect(maxRes.value).toBe(230);
  });
});
