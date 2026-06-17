# TestFlow TCM — Desktop App: Getting Started

**Version:** 1.0.0  
**Platforms:** Windows 10/11 · macOS 12+ · Linux (Ubuntu 20.04+, Fedora 36+)

---

## What's in this folder

| File | Description |
|---|---|
| `TestFlow TCM Setup 1.0.0.exe` | Windows installer (x64 + x86, recommended) |
| `TestFlow TCM 1.0.0.exe` | Windows portable — no install needed, just run |
| `TestFlow TCM-1.0.0.dmg` | macOS installer |
| `TestFlow TCM-1.0.0.AppImage` | Linux portable |
| `testflow-tcm_1.0.0_amd64.deb` | Debian/Ubuntu package |
| `TestFlow TCM-1.0.0.rpm` | Fedora/RHEL package |
| `GETTING_STARTED.md` | This file |

---

## Prerequisites

### End users (connecting to a hosted server)
Nothing extra. Just install the app and configure the server URL on first launch.

- Windows 10 or 11 (x64 or x86)
- macOS 12 Monterey or later (Intel or Apple Silicon)
- Ubuntu 20.04 / Debian 11 / Fedora 36 or later

### Self-hosted (running your own backend)
You need a TestFlow TCM backend server running somewhere on your network or the internet.

**Option A — Docker (easiest)**
```
- Docker Desktop 4.x or later
- docker-compose
```

**Option B — Manual**
```
- Node.js 20 LTS or later
- PostgreSQL 15 or later
- Redis 7 or later (optional — for queue features)
```

---

## Installation

### Windows

1. Double-click **`TestFlow TCM Setup 1.0.0.exe`**
2. If Windows Defender SmartScreen appears, click **"More info" → "Run anyway"**  
   *(The app is unsigned — code signing requires a commercial certificate)*
3. Follow the wizard — choose install directory, create desktop shortcut
4. Launch **TestFlow TCM** from the desktop or Start Menu

> **Portable version:** Run `TestFlow TCM 1.0.0.exe` directly. No install, no admin rights required. Settings are stored next to the EXE.

### macOS

1. Open **`TestFlow TCM-1.0.0.dmg`**
2. Drag **TestFlow TCM** into your Applications folder
3. On first launch, macOS may block it:  
   - Go to **System Settings → Privacy & Security**  
   - Scroll down and click **"Open Anyway"**  
   *(Required because the app is not notarized — notarization requires an Apple Developer account)*

### Linux (AppImage)

```bash
chmod +x "TestFlow TCM-1.0.0.AppImage"
./"TestFlow TCM-1.0.0.AppImage"
```

### Linux (Debian/Ubuntu .deb)

```bash
sudo dpkg -i testflow-tcm_1.0.0_amd64.deb
# Fix any missing dependencies:
sudo apt-get install -f
```

### Linux (Fedora/RHEL .rpm)

```bash
sudo rpm -i "TestFlow TCM-1.0.0.rpm"
# or with dnf:
sudo dnf install "TestFlow TCM-1.0.0.rpm"
```

---

## Playwright Automation (one-time setup)

Before running Playwright test scripts, download the browser binaries once:

```bash
# Install Chromium (smallest, covers most tests)
npx playwright install chromium

# Or install all browsers (Chromium + Firefox + WebKit)
npx playwright install
```

> **Node.js required** — download from https://nodejs.org (LTS version).  
> Browsers are cached in `~/.cache/ms-playwright/` (~200MB for Chromium).

---

## First Launch

### Connecting to a hosted TestFlow server

1. Open the app — you will see the login screen
2. If the login fails with a connection error, go to:  
   **Settings → Desktop App → API Connection**
3. Enter your server's API URL, e.g.:  
   `https://testflow.yourcompany.com/api/v1`
4. Click **Save Desktop Settings** and restart the app
5. Log in with your TestFlow credentials

### Running the backend locally (self-hosted with Docker)

> **Prerequisites:** Docker Desktop must be running.

```bash
# 1. Clone the repository
git clone https://github.com/your-org/testflow-tcm.git
cd testflow-tcm

# 2. Copy and configure environment
cp backend/.env.example backend/.env
# Edit backend/.env — set DB_PASSWORD, JWT_SECRET, etc.

# 3. Start the database services
docker-compose up -d postgres redis pgadmin

# 4. Install dependencies and run migrations
npm install
npm run migration:run --workspace=backend

# 5. Seed test data (optional)
npm run seed --workspace=backend

# 6. Start the backend
npm run dev:backend
# API is now at http://localhost:3000/api/v1
```

The desktop app defaults to `http://localhost:3000/api/v1` — so if you're running the backend locally you can log in immediately without changing any settings.

**Default dev credentials:**
```
admin@testflow.dev    /  Admin@1234
qalead@testflow.dev   /  QaLead@1234
tester@testflow.dev   /  Tester@1234
viewer@testflow.dev   /  Viewer@1234
```

---

## Desktop App Settings

Open **Settings → Desktop App** to configure:

| Setting | Description |
|---|---|
| **Backend API URL** | URL of the TestFlow backend (restart required after changing) |
| **Launch at startup** | Open TestFlow automatically when you log in to your computer |
| **Minimize to tray** | Keep the app running in the system tray when you close the window |
| **Update notifications** | Show a banner when a new version is available |

---

## Keyboard Shortcuts

| Action | Windows / Linux | macOS |
|---|---|---|
| Dashboard | Ctrl+1 | Cmd+1 |
| Projects | Ctrl+2 | Cmd+2 |
| Test Cases | Ctrl+3 | Cmd+3 |
| Test Runs | Ctrl+4 | Cmd+4 |
| Releases | Ctrl+5 | Cmd+5 |
| Settings | Ctrl+, | Cmd+, |
| Toggle Sidebar | Ctrl+B | Cmd+B |
| Toggle Dark Mode | Ctrl+Shift+D | Cmd+Shift+D |
| Developer Tools | F12 | Cmd+Option+I |
| New Test Case | Ctrl+N | Cmd+N |

---

## Troubleshooting

**"Connection refused" / can't log in**  
→ Make sure the backend server is running and the API URL is correct  
→ Check: Settings → Desktop App → API Connection

**Windows SmartScreen blocks the installer**  
→ Click "More info" then "Run anyway" — this is expected for unsigned builds

**macOS says the app is from an unidentified developer**  
→ System Settings → Privacy & Security → "Open Anyway"

**The app is blank / white screen**  
→ Press F12 to open Developer Tools and check the Console tab for errors  
→ Ensure the backend is reachable from this machine

**Linux: app doesn't start (missing libs)**  
```bash
sudo apt-get install libgtk-3-0 libnss3 libxss1 libgbm1
```

**Find log files**  
- Windows: `%APPDATA%\testflow-desktop\logs\`
- macOS: `~/Library/Logs/testflow-desktop/`
- Linux: `~/.config/testflow-desktop/logs/`

---

## Updates

The app checks for updates automatically on startup. When an update is available:
1. A banner appears at the bottom-right of the screen
2. Click **Download** to download in the background
3. Click **Restart & Install** to apply

You can also check manually: **Help → Check for Updates** or **Settings → Desktop App → Check for updates**

---

## Support

- **Issues:** https://github.com/your-org/testflow-tcm/issues
- **Docs:** https://docs.testflow.dev
- **Email:** support@testflow.dev
