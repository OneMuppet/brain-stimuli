import { describe, it, expect } from "vitest";
import { validateSessionTitle, validateSession } from "@/shared/validation/schemas/SessionSchema";
import { validateNoteContent, validateNote } from "@/shared/validation/schemas/NoteSchema";
import { CONSTANTS } from "@/shared/config/constants";

describe("Session Validation", () => {
  describe("validateSessionTitle", () => {
    it("should return no errors for valid title", () => {
      const errors = validateSessionTitle("Valid Session Title");
      expect(errors).toHaveLength(0);
    });

    it("should return error for non-string title", () => {
      const errors = validateSessionTitle(123);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.field).toBe("title");
      expect(errors[0]?.message).toContain("string");
    });

    it("should return error for empty title", () => {
      const errors = validateSessionTitle("");
      expect(errors).toHaveLength(1);
      expect(errors[0]?.field).toBe("title");
      expect(errors[0]?.message).toContain("empty");
    });

    it("should return error for whitespace-only title", () => {
      const errors = validateSessionTitle("   ");
      expect(errors).toHaveLength(1);
      expect(errors[0]?.field).toBe("title");
      expect(errors[0]?.message).toContain("empty");
    });

    it("should return error for title exceeding max length", () => {
      const longTitle = "a".repeat(CONSTANTS.MAX_TITLE_LENGTH + 1);
      const errors = validateSessionTitle(longTitle);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.field).toBe("title");
      expect(errors[0]?.message).toContain(String(CONSTANTS.MAX_TITLE_LENGTH));
    });

    it("should accept title at max length", () => {
      const maxLengthTitle = "a".repeat(CONSTANTS.MAX_TITLE_LENGTH);
      const errors = validateSessionTitle(maxLengthTitle);
      expect(errors).toHaveLength(0);
    });
  });

  describe("validateSession", () => {
    it("should return no errors for valid session", () => {
      const session = {
        id: "session-1",
        title: "Valid Session",
        createdAt: Date.now(),
        lastModified: Date.now(),
        score: 0,
      };
      const errors = validateSession(session);
      expect(errors).toHaveLength(0);
    });

    it("should return error for non-object session", () => {
      const errors = validateSession(null);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.field).toBe("session");
    });

    it("should return error for array", () => {
      const errors = validateSession([]);
      expect(errors).toHaveLength(1);
    });

    it("should return error for invalid title in session", () => {
      const session = {
        id: "session-1",
        title: "",
        createdAt: Date.now(),
        lastModified: Date.now(),
        score: 0,
      };
      const errors = validateSession(session);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.field === "title")).toBe(true);
    });

    it("should return error for invalid id type", () => {
      const session = {
        id: 123,
        title: "Valid Title",
        createdAt: Date.now(),
        lastModified: Date.now(),
        score: 0,
      };
      const errors = validateSession(session);
      expect(errors.some((e) => e.field === "id")).toBe(true);
    });

    it("should return error for invalid createdAt type", () => {
      const session = {
        id: "session-1",
        title: "Valid Title",
        createdAt: "not-a-number",
        lastModified: Date.now(),
        score: 0,
      };
      const errors = validateSession(session);
      expect(errors.some((e) => e.field === "createdAt")).toBe(true);
    });

    it("should accept session with optional fields undefined", () => {
      const session = {
        title: "Valid Title",
        createdAt: Date.now(),
        lastModified: Date.now(),
        score: 0,
      };
      const errors = validateSession(session);
      expect(errors).toHaveLength(0);
    });
  });
});

describe("Note Validation", () => {
  describe("validateNoteContent", () => {
    it("should return no errors for valid content", () => {
      const errors = validateNoteContent("Valid note content");
      expect(errors).toHaveLength(0);
    });

    it("should return error for non-string content", () => {
      const errors = validateNoteContent(123);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.field).toBe("content");
      expect(errors[0]?.message).toContain("string");
    });

    it("should accept empty content", () => {
      const errors = validateNoteContent("");
      expect(errors).toHaveLength(0);
    });

    it("should return error for content exceeding max size", () => {
      const largeContent = "a".repeat(CONSTANTS.MAX_CONTENT_SIZE + 1);
      const errors = validateNoteContent(largeContent);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.field).toBe("content");
      expect(errors[0]?.message).toContain("too large");
    });

    it("should accept content at max size", () => {
      const maxSizeContent = "a".repeat(CONSTANTS.MAX_CONTENT_SIZE);
      const errors = validateNoteContent(maxSizeContent);
      expect(errors).toHaveLength(0);
    });
  });

  describe("validateNote", () => {
    it("should return no errors for valid note", () => {
      const note = {
        id: "note-1",
        sessionId: "session-1",
        content: "Valid note content",
        createdAt: Date.now(),
        lastModified: Date.now(),
      };
      const errors = validateNote(note);
      expect(errors).toHaveLength(0);
    });

    it("should return error for non-object note", () => {
      const errors = validateNote(null);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.field).toBe("note");
    });

    it("should return error for invalid content", () => {
      const note = {
        id: "note-1",
        sessionId: "session-1",
        content: 123,
        createdAt: Date.now(),
        lastModified: Date.now(),
      };
      const errors = validateNote(note);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.field === "content")).toBe(true);
    });

    it("should return error for invalid sessionId type", () => {
      const note = {
        id: "note-1",
        sessionId: 123,
        content: "Valid content",
        createdAt: Date.now(),
        lastModified: Date.now(),
      };
      const errors = validateNote(note);
      expect(errors.some((e) => e.field === "sessionId")).toBe(true);
    });

    it("should return error for invalid id type", () => {
      const note = {
        id: 123,
        sessionId: "session-1",
        content: "Valid content",
        createdAt: Date.now(),
        lastModified: Date.now(),
      };
      const errors = validateNote(note);
      expect(errors.some((e) => e.field === "id")).toBe(true);
    });

    it("should accept empty content", () => {
      const note = {
        id: "note-1",
        sessionId: "session-1",
        content: "",
        createdAt: Date.now(),
        lastModified: Date.now(),
      };
      const errors = validateNote(note);
      expect(errors).toHaveLength(0);
    });
  });
});

