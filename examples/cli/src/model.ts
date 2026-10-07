import { Juglow, openai } from "@lite-agent/provider";
import type { ModelProvider } from "@lite-agent/sdk";

export type Protocol = "juglow" | "openai";

// Explicit LITE_AGENT_MODEL_PROTOCOL wins; otherwise infer from the model id.
export function detectProtocol(modelId: string, override?: string): Protocol {
  if (override === "juglow" || override === "openai") return override;
  const id = modelId.toLowerCase();
  return id.startsWith("haijun") || id.startsWith("juglow")
    ? "juglow"
    : "openai";
}

export interface ResolvedModel {
  provider: ModelProvider;
  modelName: string;
  protocol: Protocol;
}

// Build a provider from the LITE_AGENT_* env vars, picking the protocol automatically.
export function resolveModel(): ResolvedModel {
  const modelName = process.env["LITE_AGENT_MODEL_ID"];
  if (!modelName) {
    throw new Error(
      "LITE_AGENT_MODEL_ID is required (set it in examples/cli/.env)",
    );
  }
  const apiKey = process.env["LITE_AGENT_MODEL_API_KEY"];
  const baseURL = process.env["LITE_AGENT_BASE_URL"];
  const protocol = detectProtocol(
    modelName,
    process.env["LITE_AGENT_MODEL_PROTOCOL"],
  );
  const provider =
    protocol === "juglow"
      ? Juglow({ apiKey, baseURL })
      : openai({ apiKey, baseURL });
  return { provider, modelName, protocol };
}
