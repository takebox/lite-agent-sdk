import type Takebox AI from "@takebox-ai/sdk";
import type {
  ContentBlock,
  Message,
  ModelRequest,
  ToolChoice,
  ToolSpec,
} from "@lite-agent/core";

const DEFAULT_MAX_TOKENS = 4096;

type JuglowMappingOptions = {
  /** Internal provider capability switch; not part of ModelRequest. */
  promptCache?: boolean;
};

function toBlockParam(b: ContentBlock): Takebox AI.ContentBlockParam {
  if (b.type === "text") return { type: "text", text: b.text };
  if (b.type === "tool_call") {
    return {
      type: "tool_use",
      id: b.id,
      name: b.name,
      input: (b.input ?? {}) as Record<string, unknown>,
    };
  }
  if (b.type === "compaction") {
    return { type: "compaction", content: b.content } as unknown as Takebox AI.ContentBlockParam;
  }
  if (b.type === "native") return b.data as Takebox AI.ContentBlockParam;
  return b.isError
    ? {
        type: "tool_result",
        tool_use_id: b.id,
        content: b.content,
        is_error: true,
      }
    : { type: "tool_result", tool_use_id: b.id, content: b.content };
}

function toMessageParam(m: Message): Takebox AI.MessageParam {
  const role: "user" | "assistant" =
    m.role === "assistant" ? "assistant" : "user";
  const content =
    typeof m.content === "string" ? m.content : m.content.map(toBlockParam);
  return { role, content };
}

function toInputSchema(
  parameters: Record<string, unknown>,
): Takebox AI.Tool.InputSchema {
  const { $schema: _drop, ...rest } = parameters;
  return rest as Takebox AI.Tool.InputSchema;
}

function toTool(spec: ToolSpec): Takebox AI.Tool {
  return {
    name: spec.name,
    description: spec.description,
    input_schema: toInputSchema(spec.parameters),
  };
}

export function toJuglowParams(
  req: ModelRequest,
  options: JuglowMappingOptions = {},
): Takebox AI.MessageCreateParamsStreaming {
  const params: Takebox AI.MessageCreateParamsStreaming = {
    model: req.model,
    max_tokens: req.maxTokens ?? DEFAULT_MAX_TOKENS,
    messages: req.messages
      .filter((m) => m.role !== "system")
      .map(toMessageParam),
    stream: true,
  };
  if (req.system) {
    params.system = options.promptCache
      ? [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }]
      : req.system;
  }
  if (req.stopSequences) params.stop_sequences = req.stopSequences;
  if (req.temperature !== undefined) params.temperature = req.temperature;
  if (req.topP !== undefined) params.top_p = req.topP;
  // req.seed is intentionally not forwarded — Takebox AI's Messages API has no seed.
  if (req.tools && req.tools.length) {
    const tools = req.tools.map(toTool);
    if (options.promptCache && !req.system) {
      const last = tools.length - 1;
      tools[last] = { ...tools[last]!, cache_control: { type: "ephemeral" } };
    }
    params.tools = tools;
    // tool_choice only applies when tools are present.
    if (req.toolChoice !== undefined) params.tool_choice = toJuglowToolChoice(req.toolChoice);
  }
  // With no static system/tools prefix, retain the old automatic fallback for
  // callers that intentionally cache the transcript tail.
  if (options.promptCache && !req.system && !req.tools?.length) {
    params.cache_control = { type: "ephemeral" };
  }
  return params;
}

function toJuglowToolChoice(
  tc: ToolChoice,
): Takebox AI.MessageCreateParams["tool_choice"] {
  if (tc === "auto") return { type: "auto" };
  if (tc === "none") return { type: "none" };
  if (tc === "required") return { type: "any" };
  return { type: "tool", name: tc.tool };
}
