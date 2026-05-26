# Folder Hider

`Folder Hider` is a Visual Studio Code extension that helps reduce Explorer clutter by allowing you to hide and unhide folders and files from the workspace explorer.

- Current version: `0.2.0`
- Latest release: May 26, 2026

## Features

- Hide any folder or file from the VS Code Explorer using a context menu command
- Unhide individual folders from a dedicated `Hidden Folders` view
- Unhide individual files from a dedicated `Hidden Files` view
- Unhide all hidden folders and files at once
- Optional persistence across VS Code sessions
- Optional hidden item count in the status bar

## Install

1. Download the `.vsix` file from Releases
2. Open VS Code
3. Run:

```bash
code --install-extension folder-hider-0.2.0.vsix
```

Or use "Install from VSIX" in the Extensions menu.

## Usage

1. Open the Explorer in VS Code.
2. Right-click any folder and choose **Hide Folder**, or right-click any file and choose **Hide File**.
3. Open the `Hidden Folders` or `Hidden Files` view under Explorer to see hidden items.
4. Click the inline **Unhide** button next to any item to restore it individually.
5. Use **Unhide All** from the view title to restore every hidden folder and file at once.

## Commands

- `Hide Folder` — hide the selected folder in the Explorer
- `Hide File` — hide the selected file in the Explorer
- `Unhide Folder` — restore a single folder from the `Hidden Folders` view
- `Unhide File` — restore a single file from the `Hidden Files` view
- `Unhide All` — restore all hidden folders and files
- `Refresh` — refresh both hidden item views

## Configuration

The extension contributes these settings under `folderHider`:

- `folderHider.persistAcrossSessions` (boolean, default: `true`)
  - Keep hidden folders and files remembered after VS Code restarts.
- `folderHider.showHiddenCount` (boolean, default: `true`)
  - Display the number of hidden items in the status bar.

## Extension Views

The extension adds two views to the Explorer sidebar:

- `Hidden Folders` — lists all folders hidden by the extension
- `Hidden Files` — lists all files hidden by the extension

When a view is empty it shows a welcome message and usage hint.

## Project Structure

- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `tslint.json`
- `src/`
  - `extension.ts`
  - `commands/`
    - `hideFolder.ts`
    - `hideFile.ts`
    - `unhideFolder.ts`
    - `unhideFile.ts`
    - `unhideAll.ts`
  - `models/`
    - `HiddenFolder.ts`
    - `HiddenFile.ts`
  - `providers/`
    - `hiddenFolderProvider.ts`
    - `hiddenFileProvider.ts`
  - `utils/`
    - `pathHelper.ts`
    - `settingsManager.ts`

## Notes

This extension uses the VS Code Tree View API to manage dedicated hidden item lists and explorer context menu contributions. Both folders and files are tracked separately in workspace storage and written to `files.exclude` in `.vscode/settings.json`. Only items managed by the extension are touched — any exclusions you add manually are left untouched.