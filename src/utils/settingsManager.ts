import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import {
  getSettingsFilePath,
  ensureVscodeDir,
  toRelativePath,
  requireWorkspaceRoot,
} from "./pathHelper";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The shape of a parsed `.vscode/settings.json` file.
 * We only care about `files.exclude`; all other keys are preserved as-is.
 */
interface WorkspaceSettings {
  "files.exclude"?: Record<string, boolean>;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Low-level read / write
// ---------------------------------------------------------------------------

/**
 * Reads and parses `.vscode/settings.json`.
 *
 * - Returns an empty object `{}` if the file does not exist yet.
 * - Throws a user-friendly error if the file exists but contains invalid JSON
 *   (we never silently overwrite a file the user has manually edited).
 */
function readSettings(): WorkspaceSettings {
  const filePath = getSettingsFilePath();
  if (!filePath || !fs.existsSync(filePath)) {
    return {};
  }

  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as WorkspaceSettings;
  } catch {
    throw new Error(
      `Folder Hider: Could not parse ${filePath}.\n` +
        "Please fix any JSON syntax errors and try again.",
    );
  }
}

/**
 * Serialises `settings` and writes it to `.vscode/settings.json`.
 * Creates the `.vscode` directory if it does not already exist.
 *
 * Uses 2-space indentation to match VS Code's own formatter output.
 */
function writeSettings(settings: WorkspaceSettings): void {
  ensureVscodeDir();

  const filePath = getSettingsFilePath();
  if (!filePath) {
    throw new Error("Folder Hider: No workspace folder is open.");
  }

  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2) + "\n", "utf8");
}

// ---------------------------------------------------------------------------
// files.exclude helpers
// ---------------------------------------------------------------------------

/**
 * Returns the current `files.exclude` map, defaulting to `{}` when absent.
 */
function getFilesExclude(): Record<string, boolean> {
  return readSettings()["files.exclude"] ?? {};
}

/**
 * Overwrites the `files.exclude` section while preserving every other key
 * in `settings.json` exactly as it was.
 */
function setFilesExclude(exclude: Record<string, boolean>): void {
  const settings = readSettings();
  settings["files.exclude"] = exclude;
  writeSettings(settings);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Adds the folder at `absolutePath` to `files.exclude`, hiding it from the
 * VS Code Explorer.
 *
 * - Derives the workspace-relative key automatically.
 * - Is idempotent: calling it on an already-hidden folder is a no-op.
 *
 * @returns The relative-path key that was written (e.g. `"src/generated"`).
 */
export function excludeFolder(absolutePath: string): string {
  const root = requireWorkspaceRoot();
  const key = toRelativePath(absolutePath, root);

  const exclude = getFilesExclude();

  if (exclude[key] === true) {
    // Already excluded — nothing to do.
    return key;
  }

  exclude[key] = true;
  setFilesExclude(exclude);

  return key;
}

/**
 * Removes the folder at `absolutePath` from `files.exclude`, making it
 * visible again in the VS Code Explorer.
 *
 * - Is idempotent: calling it on a folder that isn't excluded is a no-op.
 * - Cleans up the `files.exclude` object entirely if it becomes empty after
 *   removal, to avoid leaving a stale empty object in `settings.json`.
 *
 * @returns The relative-path key that was removed (e.g. `"src/generated"`).
 */
export function unexcludeFolder(absolutePath: string): string {
  const root = requireWorkspaceRoot();
  const key = toRelativePath(absolutePath, root);

  const exclude = getFilesExclude();

  if (!(key in exclude)) {
    // Not excluded — nothing to do.
    return key;
  }

  delete exclude[key];

  // Remove the files.exclude key entirely when empty so settings.json
  // doesn't accumulate `"files.exclude": {}` noise.
  if (Object.keys(exclude).length === 0) {
    const settings = readSettings();
    delete settings["files.exclude"];
    writeSettings(settings);
  } else {
    setFilesExclude(exclude);
  }

  return key;
}

/**
 * Removes every folder key that the extension added from `files.exclude`.
 * Only keys present in `managedPaths` are touched — any exclusions the user
 * added manually are left untouched.
 *
 * @param managedPaths  Absolute paths of all folders currently tracked by
 *                      the extension (sourced from workspace storage).
 */
export function unexcludeAll(managedPaths: string[]): void {
  if (managedPaths.length === 0) {
    return;
  }

  const root = requireWorkspaceRoot();
  const settings = readSettings();
  const exclude = settings["files.exclude"] ?? {};

  for (const absolutePath of managedPaths) {
    const key = toRelativePath(absolutePath, root);
    delete exclude[key];
  }

  if (Object.keys(exclude).length === 0) {
    delete settings["files.exclude"];
  } else {
    settings["files.exclude"] = exclude;
  }

  writeSettings(settings);
}

/**
 * Returns `true` if the folder at `absolutePath` is currently listed in
 * `files.exclude` with a value of `true`.
 */
export function isFolderExcluded(absolutePath: string): boolean {
  const root = getWorkspaceRoot();
  if (!root) {
    return false;
  }
  const key = toRelativePath(absolutePath, root);
  return getFilesExclude()[key] === true;
}

/**
 * Returns all paths currently in `files.exclude` that are set to `true`,
 * resolved back to absolute paths.
 *
 * Useful for reconciling workspace storage against what's actually in the
 * settings file after an external edit.
 */
export function getExcludedAbsolutePaths(): string[] {
  const root = getWorkspaceRoot();
  if (!root) {
    return [];
  }

  const exclude = getFilesExclude();

  return Object.entries(exclude)
    .filter(([, value]) => value === true)
    .map(([key]) => path.resolve(root, key));
}

// ---------------------------------------------------------------------------
// Workspace-storage helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "folderHider.hiddenFolders";

/**
 * Persists the list of hidden folder absolute paths to VS Code workspace
 * storage so the panel survives session restarts.
 */
export function saveHiddenPaths(
  context: vscode.ExtensionContext,
  paths: string[],
): void {
  context.workspaceState.update(STORAGE_KEY, paths);
}

/**
 * Retrieves the persisted list of hidden folder absolute paths from workspace
 * storage. Returns `[]` when nothing has been stored yet.
 */
export function loadHiddenPaths(context: vscode.ExtensionContext): string[] {
  return context.workspaceState.get<string[]>(STORAGE_KEY) ?? [];
}

// ---------------------------------------------------------------------------
// Private re-export (used only inside utils/)
// ---------------------------------------------------------------------------

function getWorkspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}
