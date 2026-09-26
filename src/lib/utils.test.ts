import { describe, expect, it } from "vitest";
import { cn } from "./utils.ts";

describe("cn utility", () => {
  it("merges class names correctly", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("handles conditional classes and tailwind conflicts", () => {
    const isHidden = false;
    expect(cn("px-2 py-1", isHidden && "hidden", "px-4")).toBe("py-1 px-4");
  });
});
