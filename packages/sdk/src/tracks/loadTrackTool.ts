import { z } from "zod";
import { defineTool } from "@lite-agent/core";
import type { Tool } from "@lite-agent/core";
import type { TrackLoader } from "./loader";

export function loadTrackTool(loader: TrackLoader): Tool {
  return defineTool({
    name: "load_track",
    description:
      "Load a track's full instructions by name before tackling an unfamiliar task.",
    schema: z.object({ name: z.string() }),
    security: { network: "none", filesystem: "unrestricted", sideEffects: "none" },
    execute: ({ name }) => loader.getContent(name),
  });
}
