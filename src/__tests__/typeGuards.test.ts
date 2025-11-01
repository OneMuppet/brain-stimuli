import { describe, it, expect } from "vitest";
import {
  isNotNull,
  isString,
  isNumber,
  isValidTimestamp,
  isObject,
  hasProperty,
  isValidEntityId,
} from "@/shared/utils/typeGuards";

describe("Type Guards", () => {
  describe("isNotNull", () => {
    it("should return true for non-null values", () => {
      expect(isNotNull("string")).toBe(true);
      expect(isNotNull(123)).toBe(true);
      expect(isNotNull({})).toBe(true);
      expect(isNotNull([])).toBe(true);
    });

    it("should return false for null", () => {
      expect(isNotNull(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isNotNull(undefined)).toBe(false);
    });

    it("should narrow type correctly", () => {
      const value: string | null = "test";
      if (isNotNull(value)) {
        expect(typeof value).toBe("string");
      }
    });
  });

  describe("isString", () => {
    it("should return true for strings", () => {
      expect(isString("")).toBe(true);
      expect(isString("hello")).toBe(true);
      expect(isString("123")).toBe(true);
    });

    it("should return false for non-strings", () => {
      expect(isString(123)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
      expect(isString({})).toBe(false);
      expect(isString([])).toBe(false);
    });
  });

  describe("isNumber", () => {
    it("should return true for valid numbers", () => {
      expect(isNumber(0)).toBe(true);
      expect(isNumber(123)).toBe(true);
      expect(isNumber(-123)).toBe(true);
      expect(isNumber(3.14)).toBe(true);
    });

    it("should return false for NaN", () => {
      expect(isNumber(NaN)).toBe(false);
    });

    it("should return false for non-numbers", () => {
      expect(isNumber("123")).toBe(false);
      expect(isNumber(null)).toBe(false);
      expect(isNumber(undefined)).toBe(false);
      expect(isNumber({})).toBe(false);
    });
  });

  describe("isValidTimestamp", () => {
    it("should return true for valid timestamps", () => {
      const now = Date.now();
      expect(isValidTimestamp(now)).toBe(true);
      expect(isValidTimestamp(1609459200000)).toBe(true); // Jan 1, 2021
    });

    it("should return false for future timestamps", () => {
      const future = Date.now() + 86400000; // 1 day in future
      expect(isValidTimestamp(future)).toBe(false);
    });

    it("should return false for zero or negative", () => {
      expect(isValidTimestamp(0)).toBe(false);
      expect(isValidTimestamp(-1)).toBe(false);
    });

    it("should return false for non-numbers", () => {
      expect(isValidTimestamp("123")).toBe(false);
      expect(isValidTimestamp(null)).toBe(false);
      expect(isValidTimestamp(undefined)).toBe(false);
    });

    it("should return false for NaN", () => {
      expect(isValidTimestamp(NaN)).toBe(false);
    });
  });

  describe("isObject", () => {
    it("should return true for plain objects", () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ key: "value" })).toBe(true);
      expect(isObject(new Date())).toBe(true);
    });

    it("should return false for null", () => {
      expect(isObject(null)).toBe(false);
    });

    it("should return false for arrays", () => {
      expect(isObject([])).toBe(false);
      expect(isObject([1, 2, 3])).toBe(false);
    });

    it("should return false for primitives", () => {
      expect(isObject("string")).toBe(false);
      expect(isObject(123)).toBe(false);
      expect(isObject(true)).toBe(false);
      expect(isObject(undefined)).toBe(false);
    });
  });

  describe("hasProperty", () => {
    it("should return true when object has property", () => {
      expect(hasProperty({ name: "test" }, "name")).toBe(true);
      expect(hasProperty({ id: 123, title: "test" }, "id")).toBe(true);
    });

    it("should return false when object does not have property", () => {
      expect(hasProperty({ name: "test" }, "id")).toBe(false);
      expect(hasProperty({}, "missing")).toBe(false);
    });

    it("should return false for non-objects", () => {
      expect(hasProperty(null, "key")).toBe(false);
      expect(hasProperty("string", "key")).toBe(false);
      expect(hasProperty(123, "key")).toBe(false);
      expect(hasProperty([], "key")).toBe(false);
    });

    it("should narrow type correctly", () => {
      const obj: unknown = { id: "test" };
      if (hasProperty(obj, "id")) {
        expect(typeof obj.id).toBe("string");
      }
    });
  });

  describe("isValidEntityId", () => {
    it("should return true for non-empty strings", () => {
      expect(isValidEntityId("id-1")).toBe(true);
      expect(isValidEntityId("a")).toBe(true);
      expect(isValidEntityId("very-long-id-12345")).toBe(true);
    });

    it("should return false for empty string", () => {
      expect(isValidEntityId("")).toBe(false);
    });

    it("should return false for non-strings", () => {
      expect(isValidEntityId(123)).toBe(false);
      expect(isValidEntityId(null)).toBe(false);
      expect(isValidEntityId(undefined)).toBe(false);
      expect(isValidEntityId({})).toBe(false);
    });
  });
});

