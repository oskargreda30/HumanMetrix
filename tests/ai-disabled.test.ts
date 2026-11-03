import { afterEach, describe, expect, it, vi } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import DisabledOpenAI, { AI_DISABLED_MESSAGE } from "../server/ai-disabled";

afterEach(() => vi.unstubAllGlobals());

describe("AI spending shutdown", () => {
  it("blocks paid requests without invoking any network transport or retrying", async () => {
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    const client = new DisabledOpenAI({
      apiKey: "not-a-real-key",
      baseURL: "https://example.com",
      fetch: network,
      maxRetries: 5,
    });
    const requests = [
      () => client.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: "test" }],
      }),
      () => client.embeddings.create({ model: "text-embedding-3-small", input: "test" }),
      () => client.images.generate({ model: "gpt-image-1", prompt: "test" }),
      () => client.models.list(),
    ];
    for (const request of requests) {
      const error = await request().catch((err: Error & { cause?: Error }) => err);
      expect(error).toBeInstanceOf(Error);
      expect((error as Error & { cause?: Error }).cause?.message).toBe(AI_DISABLED_MESSAGE);
    }
    expect(network).not.toHaveBeenCalled();
  });

  it("can initialise without provider credentials", () => {
    expect(() => new DisabledOpenAI()).not.toThrow();
  });

  it("keeps app and maintenance scripts from bypassing the disabled client", () => {
    function inspect(directory: string) {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) inspect(file);
        else if (/\.(ts|js|mjs)$/.test(file) && !file.endsWith("ai-disabled.ts") && !file.endsWith(".test.ts")) {
          expect(readFileSync(file, "utf8"), file).not.toMatch(
            /(?:from\s*|import\s*\(|require\s*\()\s*["']openai["']/,
          );
        }
      }
    }
    inspect("server");
    inspect("scripts");
  });
});
