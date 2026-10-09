import escapeHtml from "escape-html";
import { ConvexError } from "convex/values";

/**
 * Sanitizes a string by trimming, enforcing a maximum length, and escaping HTML special characters.
 */
export function sanitizeString(
  input: string,
  maxLength: number = 255,
  fieldName: string = "Input",
): string {
  if (typeof input !== "string") return "";
  const trimmed = input.trim();
  if (trimmed.length > maxLength) {
    throw new ConvexError(
      `${fieldName} exceeds maximum length of ${maxLength} characters.`,
    );
  }
  return escapeHtml(trimmed);
}

/**
 * Sanitizes an optional string if provided.
 */
export function sanitizeOptionalString(
  input: string | undefined | null,
  maxLength: number = 255,
  fieldName: string = "Input",
): string | undefined {
  if (input === undefined || input === null) return undefined;
  return sanitizeString(input, maxLength, fieldName);
}

/**
 * Sanitizes longer text fields like messages, notes, and announcements.
 */
export function sanitizeText(
  input: string,
  maxLength: number = 5000,
  fieldName: string = "Content",
): string {
  return sanitizeString(input, maxLength, fieldName);
}

/**
 * Sanitizes optional long text fields.
 */
export function sanitizeOptionalText(
  input: string | undefined | null,
  maxLength: number = 5000,
  fieldName: string = "Content",
): string | undefined {
  if (input === undefined || input === null) return undefined;
  return sanitizeText(input, maxLength, fieldName);
}
