import { closeMainWindow, showHUD } from "@raycast/api";
import { findHex } from "./hex/cli";
import { reportError } from "./hex/feedback";

export default async function PasteLastDictation() {
  try {
    const hex = await findHex();
    await closeMainWindow();
    await showHUD(await hex.pasteLast());
  } catch (error) {
    await reportError("Could Not Request Paste", error);
  }
}
