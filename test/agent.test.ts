import { expect, test } from "bun:test";
import { gbrainAgent } from "../src/index.js";

test("GBrain Agent is configured correctly", async () => {
  expect(gbrainAgent.id).toBe("gbrain");
  expect(gbrainAgent.name).toBe("GBrain Agent");

  // Test tools exist
  const tools = await gbrainAgent.listTools();
  expect(tools).toHaveProperty("searchTool");
  expect(tools).toHaveProperty("ingestTool");
});
