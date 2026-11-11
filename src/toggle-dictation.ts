import { closeMainWindow, showHUD } from "@raycast/api";
import { findHex } from "./hex/cli";
import { reportError } from "./hex/feedback";

export default async function ToggleDictation() {
  try {
    const hex = await findHex();
    await closeMainWindow();
    await showHUD(await hex.toggle());
  } catch (error) {
    await reportError("Could Not Toggle Dictation", error);
  }
}
