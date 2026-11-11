export class HexError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "HexError";
    this.code = code;
  }
}

function invalid(): never {
  throw new HexError("incompatible", "The Hex CLI returned an unexpected response. Update Hex and try again.");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readObject(stdout: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(stdout);
  } catch {
    return invalid();
  }
  return isObject(value) ? value : invalid();
}

export function readControl(stdout: string): Record<string, unknown> {
  const value = readObject(stdout);
  if (value.version !== 4) return invalid();
  if (value.status === "error") {
    if (typeof value.code !== "string" || typeof value.message !== "string") return invalid();
    if (value.code === "control-timeout") {
      throw new HexError("timeout", "Hex did not answer in time. Check its state before trying again.");
    }
    throw new HexError(value.code, value.message);
  }
  return value;
}

export function readDone(value: Record<string, unknown>): string {
  if (value.status !== "done" || typeof value.message !== "string") return invalid();
  return value.message;
}

export interface HistoryEntry {
  id: number;
  timestamp_ms: number;
  final_text: string;
  raw_text?: string;
  application: string | null;
  mode: string | null;
  kind: string;
}

export interface History {
  entries: HistoryEntry[];
  retention: string;
  truncated: boolean;
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
  return (
    isObject(value) &&
    Number.isSafeInteger(value.id) &&
    typeof value.timestamp_ms === "number" &&
    Number.isFinite(new Date(value.timestamp_ms).getTime()) &&
    typeof value.final_text === "string" &&
    (value.raw_text === undefined || typeof value.raw_text === "string") &&
    (value.application === null || typeof value.application === "string") &&
    (value.mode === null || typeof value.mode === "string") &&
    typeof value.kind === "string"
  );
}

export function readHistory(stdout: string): History {
  const value = readObject(stdout);
  if (
    value.version !== 1 ||
    !Array.isArray(value.entries) ||
    !value.entries.every(isHistoryEntry) ||
    typeof value.retention !== "string" ||
    typeof value.truncated !== "boolean"
  ) {
    return invalid();
  }
  const { entries, retention, truncated } = value;
  return { entries, retention, truncated };
}

export interface Flag {
  key: string;
  value: boolean;
  writable: boolean;
  available: boolean;
  about: string;
}

export function readFlags(value: Record<string, unknown>): Flag[] {
  if (value.status !== "settings" || !Array.isArray(value.settings)) return invalid();
  return value.settings.flatMap((setting: unknown) => {
    if (!isObject(setting)) return invalid();
    if (setting.kind !== "bool") return [];
    const { key, value, writable, available, about } = setting;
    if (
      typeof key !== "string" ||
      !/^[a-z0-9_]+(?:\.[a-z0-9_]+)*$/.test(key) ||
      typeof value !== "boolean" ||
      typeof writable !== "boolean" ||
      (available !== undefined && typeof available !== "boolean") ||
      typeof about !== "string"
    ) {
      return invalid();
    }
    return [{ key, value, writable, available: available !== false, about }];
  });
}

export interface Lab {
  name: string;
  state: "on" | "off" | "managed";
  key: string;
  description: string;
}

export function readLabs(stdout: string): Lab[] {
  // Hex 3.4 prints an aligned list with the exact settings key at the end of each row.
  return stdout
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => {
      const match = /^(\S+)\s{2,}(on|off|managed)\s{2,}(?:everyone|dev)\s{2,}(.+) \(hex settings ([\w.]+)\)\s*$/.exec(
        line,
      );
      if (!match) throw new HexError("labs-format", "This version of Hex lists Labs in an unrecognized format.");
      const [, name, state, description, key] = match;
      if (state !== "on" && state !== "off" && state !== "managed") return invalid();
      return { name, state, description, key };
    });
}

export function flagSections(flags: Flag[], labs: Lab[]) {
  const byKey = new Map(labs.map((lab) => [lab.key, lab]));
  const available = flags.filter((flag) => flag.available);
  return {
    labs: available.flatMap((flag) => {
      const lab = byKey.get(flag.key);
      if (!lab) return [];
      return [
        {
          ...flag,
          value: lab.state === "managed" ? flag.value : lab.state === "on",
          writable: flag.writable && lab.state !== "managed",
          lab,
        },
      ];
    }),
    settings: available.filter((flag) => {
      return !byKey.has(flag.key) && !flag.key.startsWith("labs.") && !/^Labs\b/i.test(flag.about);
    }),
  };
}

export function transcriptMarkdown(text: string): string {
  let length = 3;
  for (const [run] of text.matchAll(/`+/g)) length = Math.max(length, run.length + 1);
  const fence = "`".repeat(length);
  return `${fence}\n${text}\n${fence}`;
}
