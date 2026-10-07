import { vi, expect, test } from "vitest";

// Capture the options each SDK client is constructed with, without touching the network.
const { openaiArgs, juglowArgs } = vi.hoisted(() => ({
  openaiArgs: [] as Array<Record<string, unknown>>,
  juglowArgs: [] as Array<Record<string, unknown>>,
}));
vi.mock("openai", () => ({ default: class { constructor(o: Record<string, unknown>) { openaiArgs.push(o); } } }));
vi.mock("@takebox-ai/sdk", () => ({ default: class { constructor(o: Record<string, unknown>) { juglowArgs.push(o); } } }));

import { openai } from "../src/openai/openai";
import { Juglow } from "../src/juglow/juglow";

test("both providers default the SDK's internal retries to 0 (delegated to retry() middleware)", () => {
  openai({ apiKey: "k" });
  Juglow({ apiKey: "k" });
  expect(openaiArgs.at(-1)?.maxRetries).toBe(0);
  expect(juglowArgs.at(-1)?.maxRetries).toBe(0);
});

test("both providers honor an explicit maxRetries", () => {
  openai({ apiKey: "k", maxRetries: 5 });
  Juglow({ apiKey: "k", maxRetries: 3 });
  expect(openaiArgs.at(-1)?.maxRetries).toBe(5);
  expect(juglowArgs.at(-1)?.maxRetries).toBe(3);
});
