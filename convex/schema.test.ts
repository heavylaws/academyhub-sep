import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.ts";
import { modules } from "./test.setup.ts";

describe("convex backend setup", () => {
  it("initializes convex-test environment with modules and schema", async () => {
    const t = convexTest(schema, modules);
    expect(t).toBeDefined();
  });
});
