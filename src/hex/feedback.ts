import { open, showToast, Toast } from "@raycast/api";
import { downloadUrl, findHex } from "./cli";
import { HexError } from "./protocol";

export function explanation(error: unknown): string {
  return error instanceof HexError ? error.message : "An unexpected error occurred. Try again.";
}

export async function reportError(title: string, error: unknown, refresh?: () => void) {
  const code = error instanceof HexError ? error.code : undefined;
  const options: Toast.Options = { title, message: explanation(error), style: Toast.Style.Failure };
  if (code === "missing") {
    options.primaryAction = {
      title: "Get Hex",
      onAction: () => open(downloadUrl),
    };
  }
  if (code === "not-running") {
    options.primaryAction = {
      title: "Launch Hex",
      onAction: async () => {
        try {
          const message = await (await findHex()).start();
          refresh?.();
          await showToast({ title: "Opened Hex", message, style: Toast.Style.Success });
        } catch (launchError) {
          await reportError("Could Not Launch Hex", launchError);
        }
      },
    };
  }
  await showToast(options);
}

export async function showHex(pane: "history" | "settings" | "modes") {
  try {
    await (await findHex()).show(pane);
  } catch (error) {
    await reportError("Could Not Open Hex", error);
  }
}
