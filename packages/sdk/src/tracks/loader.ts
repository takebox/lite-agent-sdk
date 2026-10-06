import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import matter from "gray-matter";

interface TrackMeta { name?: string; description?: string; tags?: string | string[]; [k: string]: unknown; }
interface Track { meta: TrackMeta; body: string; path: string; }

export class TrackLoader {
  readonly dirs: string[];
  private tracks: Record<string, Track> = {};

  constructor(dirs: string | string[]) {
    this.dirs = Array.isArray(dirs) ? dirs : [dirs];
    this.loadAll();
  }

  private loadAll(): void {
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, entry.name);
        if (entry.isDirectory()) walk(p);
        else if (entry.name === "TRACK.md") {
          const { meta, body } = this.parse(readFileSync(p, "utf8"));
          const name = meta.name ?? dirname(p).split("/").pop() ?? p;
          this.tracks[name] = { meta, body, path: p };
        }
      }
    };
    // Walk in order; later dirs overwrite earlier ones on name collision.
    for (const dir of this.dirs) {
      if (existsSync(dir)) walk(dir);
    }
  }

  private parse(text: string): { meta: TrackMeta; body: string } {
    const { data, content } = matter(text);
    // gray-matter returns data: Record<string, any>; cast is safe for well-formed TRACK.md.
    return { meta: data as TrackMeta, body: content.trim() };
  }

  getDescriptions(): string {
    const names = Object.keys(this.tracks);
    if (!names.length) return "(no tracks available)";
    return names
      .map((n) => {
        const s = this.tracks[n]!;
        const tagList = Array.isArray(s.meta.tags) ? s.meta.tags.join(", ") : s.meta.tags;
        const tags = tagList ? ` [${tagList}]` : "";
        return `  - ${n}: ${s.meta.description ?? "No description"}${tags}`;
      })
      .join("\n");
  }

  names(): string[] {
    return Object.keys(this.tracks);
  }

  getContent(name: string): string {
    const s = this.tracks[name];
    if (!s) return `Error: Unknown track '${name}'. Available: ${Object.keys(this.tracks).join(", ")}`;
    return `<track name="${name}">\n${s.body}\n</track>`;
  }
}
