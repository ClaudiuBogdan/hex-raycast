import { getApplications } from "@raycast/api";
import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { promisify } from "node:util";
import { HexError, readControl, readDone, readFlags, readHistory, readLabs } from "./protocol";

export const bundleId = "anomaly.hex";
export const downloadUrl = "https://anoma.ly/hex/";
const exec = promisify(execFile);
const maxOutput = 32 * 1024 * 1024;

export async function findHex() {
  const apps = await getApplications();
  const bundles = apps.filter((app) => app.bundleId === bundleId && isAbsolute(app.path));
  const app = bundles.find((app) => app.path === "/Applications/Hex.app") ?? bundles[0];
  if (!app) throw new HexError("missing", "Install Hex to use this command.");

  const executable = join(app.path, "Contents", "MacOS", "hex");
  try {
    await access(executable, constants.X_OK);
  } catch {
    throw new HexError("missing", "The Hex application does not have an accessible CLI. Reinstall Hex and try again.");
  }
  return new HexCli(executable);
}

class HexCli {
  constructor(private readonly executable: string) {}

  private async run(args: string[], options: { signal?: AbortSignal; control?: boolean; timeout?: number } = {}) {
    try {
      const { stdout } = await exec(this.executable, args, {
        encoding: "utf8",
        maxBuffer: maxOutput,
        timeout: options.timeout ?? 18_000,
        signal: options.signal,
      });
      return stdout;
    } catch (cause) {
      if (options.signal?.aborted) throw cause;
      const error = cause as { code?: string | number; killed?: boolean; stdout?: string };
      if (options.control && error.stdout && typeof error.code === "number") {
        readControl(error.stdout);
      }
      if (error.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
        throw new HexError("too-large", "The Hex response was too large. Try narrowing the search.");
      }
      if (error.killed) {
        throw new HexError("timeout", "Hex did not answer in time. Check its state before trying again.");
      }
      if (error.code === "ENOENT" || error.code === "EACCES") {
        throw new HexError("missing", "The Hex CLI could not be opened. Check that Hex is installed.");
      }
      if (error.code === "ERR_INVALID_ARG_VALUE") {
        throw new HexError("input", "The input contains a character the Hex CLI cannot accept.");
      }
      throw new HexError("command-failed", "The Hex CLI could not complete this command. Check Hex and try again.");
    }
  }

  private async control(args: string[], timeout?: number) {
    return readControl(await this.run([...args, "--json"], { control: true, timeout }));
  }

  async history(query: string, limit: number, signal?: AbortSignal) {
    const args = ["history", "--json", "--raw", "--limit", String(limit)];
    if (query) args.push(`--search=${query}`);
    return readHistory(await this.run(args, { signal }));
  }

  async settings() {
    return readFlags(await this.control(["settings", "list"]));
  }

  async labs() {
    return readLabs(await this.run(["labs", "list"]));
  }

  async changeFlag(key: string, value: boolean) {
    return readDone(await this.control(["settings", "set", key, String(value)]));
  }

  async labLink(name: string) {
    const link = (await this.run(["labs", "link", name])).trim();
    if (link !== `hex://labs/${name}` && link !== `hex-test://labs/${name}`) {
      throw new HexError("incompatible", "Hex returned an unexpected Labs link.");
    }
    return link;
  }

  async show(pane: "history" | "settings" | "modes") {
    return readDone(await this.control(["window", "show", pane]));
  }

  async start() {
    return readDone(await this.control(["start"], 25_000));
  }

  async toggle() {
    return readDone(await this.control(["dictation", "toggle"]));
  }

  async pasteLast() {
    return readDone(await this.control(["paste-last"]));
  }
}
