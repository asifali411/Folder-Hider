
# Folder Hider

`Folder Hider` is a Visual Studio Code extension that helps reduce Explorer clutter by allowing you to hide and unhide folders from the workspace explorer.

## Features

- Hide any folder from the VS Code Explorer using a context menu command
- Unhide individual folders from a dedicated `Hidden Folders` view
- Unhide all hidden folders at once
- Optional persistence across VS Code sessions
- Optional hidden folder count in the status bar

## Install

1. Download the `.vsix` file from Releases
2. Open VS Code
3. Run:

```bash
code --install-extension folder-hider-0.1.0.vsix
```

Or use “Install from VSIX” in the Extensions menu.

## Usage

1. Open the Explorer in VS Code.
2. Right-click any folder in the Explorer and choose **Hide Folder**.
3. Open the `Hidden Folders` view under Explorer to see hidden folders.
4. Right-click a hidden folder and choose **Unhide Folder** to restore it.
5. Use **Unhide All Folders** from the view title to restore every hidden folder.

## Commands

- `Hide Folder` — hide the selected folder in the Explorer
- `Unhide Folder` — restore a single folder from the `Hidden Folders` view
- `Unhide All Folders` — restore all hidden folders from the `Hidden Folders` view
- `Refresh` — refresh the hidden folders view

## Configuration

The extension contributes these settings under `folderHider`:

- `folderHider.persistAcrossSessions` (boolean, default: `true`)
  - Keep hidden folders remembered after VS Code restarts.
- `folderHider.showHiddenCount` (boolean, default: `true`)
  - Display the number of hidden folders in the status bar.

## Extension View

The extension adds a `Hidden Folders` view to the Explorer sidebar. When no folders are hidden, it shows a welcome message and usage hint.

## Project structure

- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `tslint.json`
- `src/`
  - `extension.ts`
  - `commands/`
    - `hideFolder.ts`
    - `unhideAll.ts`
    - `unhideFolder.ts`
  - `models/`
    - `HiddenFolder.ts`
  - `providers/`
    - `hiddenFolderProvider.ts`
  - `utils/`
    - `pathHelper.ts`
    - `settingsManager.ts`

## Notes

This extension uses the VS Code Tree View API to manage a dedicated hidden folder list and explorer context menu contributions.
