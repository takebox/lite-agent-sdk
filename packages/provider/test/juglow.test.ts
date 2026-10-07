import { expect, test } from "vitest";
import type Juglow from "@takebox-ai/sdk";
import type { ModelChunk } from "@lite-agent/core";
import { ProviderError } from "@lite-agent/core";
import { Juglow } from "../src/juglow";
import type { JuglowClientLike } from "../src/juglow";

test("provider streams ModelChunks via an injected client and forwards params", async () => {
  let captured: Juglow.MessageCreateParamsStreaming | undefined;
  const fakeClient: JuglowClientLike = {
    messages: {
      create(params) {
        captured = params;
        async function* gen() {
          yield {
            type: "message_start",
            message: { usage: { input_tokens: 3, output_tokens: 0 } },
          };
          yield {
            type: "content_block_start",
            index: 0,
            content_block: { type: "text", text: "" },
          };
          yield {
            type: "content_block_delta",
            index: 0,
            delta: { type: "text_delta", text: "hi" },
          };
          yield { type: "content_block_stop", index: 0 };
          yield {
            type: "message_delta",
            delta: {},
            usage: { output_tokens: 1 },
          };
          yield { type: "message_stop" };
        }
        return gen() as unknown as AsyncIterable<Juglow.RawMessageStreamEvent>;
      },
    },
  };

  const provider = Juglow({ client: fakeClient });
  expect(provider.id).toBe("juglow");

  const chunks: ModelChunk[] = [];
  for await (const c of provider.stream({
    model: "m",
    messages: [{ role: "user", content: "hi" }],
  })) {
    chunks.push(c);
  }

  expect(captured?.model).toBe("m");
  expect(captured?.stream).toBe(true);
  expect(captured?.cache_control).toEqual({ type: "ephemeral" });
  expect(chunks.at(-1)).toMatchObject({
    type: "message_done",
    message: { content: [{ type: "text", text: "hi" }] },
    usage: { inputTokens: 3, outputTokens: 1 },
  });
});

test("wraps client errors in ProviderError preserving status", async () => {
  const failing: JuglowClientLike = {
    messages: {
      create() {
        const err = Object.assign(new Error("rate limited"), { status: 429 });
        throw err;
      },
    },
  };
  const provider = Juglow({ client: failing });
  await expect(async () => {
    for await (const chunk of provider.stream({
      model: "m",
      messages: [{ role: "user", content: "hi" }],
    })) {
      void chunk;
    }
  }).rejects.toMatchObject({ name: "ProviderError", status: 429 });
});
