import * as vscode from "vscode";
import { HiddenFoldersProvider } from "../providers/hiddenFolderProvider";
import { unexcludeAll } from "../utils/settingsManager";

/**
 * Command: folderHider.unhideAll
 *
 * Triggered from the "Hidden Folders" panel title bar action.
 * Shows a confirmation prompt, then bulk-removes every managed path from
 * `files.exclude` and clears the provider.
 */
export async function unhideAll(
  provider: HiddenFoldersProvider,
): Promise<void> {
  const paths = provider.getPaths();

  if (paths.length === 0) {
    vscode.window.showInformationMessage(
      "Folder Hider: No hidden folders to restore.",
    );
    return;
  }

  const count = paths.length;
  const noun = count === 1 ? "folder" : "folders";

  const answer = await vscode.window.showWarningMessage(
    `Unhide all ${count} hidden ${noun}?`,
    { modal: true },
    "Unhide All",
  );

  if (answer !== "Unhide All") return; // user cancelled

  try {
    unexcludeAll([...paths]); // removes all managed keys from files.exclude
    provider.clearAll(); // clears panel + workspaceState

    vscode.window.showInformationMessage(
      `Folder Hider: ${count} ${noun} restored.`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Folder Hider: ${message}`);
  }
}
