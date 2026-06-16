# App Icon Requirements

Place your app icons here before building installers.

## Required files

| File | Size | Platform |
|---|---|---|
| `icon.ico` | Multi-size (256, 128, 64, 48, 32, 16) | Windows |
| `icon.icns` | Multi-size Apple icon | macOS |
| `icon.png` | 512×512 px, transparent background | Linux |
| `tray-icon.ico` | 16×16 or 32×32 | Windows tray |
| `tray-icon.png` | 16×16 or 32×32 | Linux tray |
| `tray-iconTemplate.png` | 16×16 (+ @2x = 32×32) | macOS tray (Template = auto dark/light) |
| `icons/` | 16, 32, 48, 64, 128, 256, 512 PNGs | Linux (AppImage/deb) |

## Generating from a single PNG (512×512)

Install `electron-icon-builder`:
```bash
npm install -g electron-icon-builder
electron-icon-builder --input=icon.png --output=./
```

Or use https://www.electronjs.org/docs/latest/tutorial/application-distribution#customizing-the-app-icon

## Linux icons folder structure

```
resources/icons/
├── 16x16.png
├── 32x32.png
├── 48x48.png
├── 64x64.png
├── 128x128.png
├── 256x256.png
└── 512x512.png
```
