import { Clipboard, getPreferenceValues, showHUD } from "@raycast/api";
import { findHex } from "./hex/cli";
import { reportError } from "./hex/feedback";
import { HexError } from "./hex/protocol";

export default async function CopyLatestHistory() {
  try {
    const { variant } = getPreferenceValues<{ variant: "final" | "raw" }>();
    const hex = await findHex();
    const { entries, retention } = await hex.history("", 1);
    const latest = entries[0];
    if (!latest) {
      const message = retention === "off" ? "History is off and there are no saved dictations." : "History is empty.";
      throw new HexError("empty", message);
    }
    const text = variant === "raw" ? latest.raw_text : latest.final_text;
    if (!text?.trim()) {
      throw new HexError("missing-variant", "The latest saved entry has no text for the selected variant.");
    }
    await Clipboard.copy(text, { concealed: true });
    await showHUD("Copied Latest Transcript");
  } catch (error) {
    await reportError("Could Not Copy from History", error);
  }
}
