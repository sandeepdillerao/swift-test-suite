# TestFlow TCM — Desktop App: Getting Started

**Version:** 1.0.0  
**Platforms:** Windows 10/11 · macOS 12+ · Linux (Ubuntu 20.04+)

---

## What's in this folder

| File | Description |
|---|---|
| `TestFlow TCM Setup 1.0.0.exe` | Windows installer (x64 + x86, recommended) |
| `TestFlow TCM 1.0.0.exe` | Windows portable — run without installing |
| `TestFlow TCM-1.0.0.dmg` | macOS Intel (x64) |
| `TestFlow TCM-1.0.0-arm64.dmg` | macOS Apple Silicon (M1/M2/M3/M4) |
| `TestFlow TCM-1.0.0.AppImage` | Linux portable (x64) |
| `testflow-desktop_1.0.0_amd64.deb` | Debian / Ubuntu package |
| `GETTING_STARTED.md` | This file |

---

## Choose your setup mode

TestFlow TCM desktop app supports two modes. You choose on first launch.

| Mode | Best for | Requires |
|---|---|---|
| **Local** | Single user, development, offline | PostgreSQL on your machine |
| **Remote** | Teams, shared platform, cloud | A hosted TestFlow server URL |

---

## Mode A — Remote (connect to a hosted server)

### Prerequisites
Nothing to install. Just the app itself.

### Steps
1. Install the app (see [Installation](#installation))
2. Open it — the setup wizard appears
3. Choose **"Connect to a server"**
4. Enter the API URL your administrator gave you:  
   `https://testflow.yourcompany.com/api/v1`
5. Click **Test connection → Connect**
6. Log in with your credentials

> If you skip the wizard or need to change the URL later:  
> **Settings → Desktop App → Server Mode → Remote**

---

## Mode B — Local (run backend on this machine)

### Step 1 — Install PostgreSQL

PostgreSQL is the database the TestFlow backend uses. Install it first.

**macOS**
```bash
# Option 1: Homebrew (recommended)
brew install postgresql@15
brew services start postgresql@15

# Option 2: Download installer
# https://www.postgresql.org/download/macosx/
```

**Windows**
1. Download from https://www.postgresql.org/download/windows/
2. Run the installer — choose version **15** or later
3. Set a password for the `postgres` superuser (remember this)
4. Keep the default port **5432**
5. PostgreSQL starts automatically as a Windows Service

**Linux (Ubuntu / Debian)**
```bash
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
```

---

### Step 2 — Create the database and user

Open a terminal and run:

**macOS / Linux**
```bash
psql -U postgres
```

**Windows** — open **SQL Shell (psql)** from the Start Menu, then type:

```sql
-- Create the database user
CREATE USER testflow WITH PASSWORD 'your_password_here';

-- Create the database
CREATE DATABASE testflow_db OWNER testflow;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE testflow_db TO testflow;

-- Exit
\q
```

> Pick a strong password and note it down — you'll enter it in the app's DB settings.

**Verify it works:**
```bash
# macOS / Linux
PGPASSWORD=your_password_here psql -h localhost -U testflow -d testflow_db -c "SELECT 1;"
# Expected output:  ?column? = 1

# Windows (PowerShell)
$env:PGPASSWORD="your_password_here"; psql -h localhost -U testflow -d testflow_db -c "SELECT 1;"
```

---

### Step 3 — Run database migrations

Migrations create all the TestFlow tables inside your database.

**Option A — Using the desktop app (recommended)**

1. Install and open the app
2. In the setup wizard choose **"Run locally"**
3. Enter your PostgreSQL credentials
4. Click **Save & Start** — the app runs migrations automatically on first boot

**Option B — From the terminal** (if you have the source code)
```bash
cd testflow-tcm
npm install
npm run migration:run --workspace=backend
# Optional: add demo data
npm run seed --workspace=backend
```

---

### Step 4 — Install the app and configure

1. Install the app (see [Installation](#installation))
2. Open it — the setup wizard appears
3. Choose **"Run locally"**
4. Fill in your PostgreSQL details:

   | Field | Default value | Notes |
   |---|---|---|
   | Database host | `localhost` | Change if PostgreSQL is on another machine |
   | DB port | `5432` | Default PostgreSQL port |
   | Backend port | `3000` | Port the TestFlow API runs on |
   | Username | `testflow` | The user you created in Step 2 |
   | Password | *(yours)* | |
   | Database name | `testflow_db` | |

5. Click **Save & Start**
6. Wait for the "Starting TestFlow…" screen to complete (~5–10 seconds)
7. Log in

---

### Step 5 — Install Playwright browsers (for automation features only)

Playwright is used for recording and running browser test scripts. Install the browsers once:

> **Requires Node.js 20+** — download from https://nodejs.org

**macOS / Linux**
```bash
npx playwright install chromium
# For all browsers (Firefox, WebKit too):
npx playwright install
```

**Windows** (in PowerShell or Command Prompt)
```bash
npx playwright install chromium
```

> **What this does:** Downloads ~200MB of browser binaries to your local cache.  
> It does NOT modify the system or install anything globally.  
> Browser cache locations:  
> - macOS: `~/Library/Caches/ms-playwright/`  
> - Windows: `%LOCALAPPDATA%\ms-playwright\`  
> - Linux: `~/.cache/ms-playwright/`

---

## Installation

### Windows

1. Double-click **`TestFlow TCM Setup 1.0.0.exe`**
2. If **Windows Defender SmartScreen** appears → click **"More info" → "Run anyway"**  
   *(The app is not code-signed — expected for unsigned enterprise builds)*
3. Follow the installer wizard
4. Launch **TestFlow TCM** from the desktop or Start Menu

> **Portable version:** Run `TestFlow TCM 1.0.0.exe` directly — no install, no admin rights needed.

### macOS

1. Open **`TestFlow TCM-1.0.0.dmg`** (Intel) or **`TestFlow TCM-1.0.0-arm64.dmg`** (Apple Silicon)
2. Drag **TestFlow TCM** into **Applications**
3. On first launch macOS will block it — this is normal for unsigned apps:
   - Open **System Settings → Privacy & Security**
   - Scroll down and click **"Open Anyway"**
   - Click **"Open"** on the confirmation dialog

### Linux (AppImage — portable)

```bash
chmod +x "TestFlow TCM-1.0.0.AppImage"
./"TestFlow TCM-1.0.0.AppImage"
```

### Linux (Debian / Ubuntu .deb)

```bash
sudo dpkg -i testflow-desktop_1.0.0_amd64.deb
sudo apt-get install -f   # fix any missing dependencies
```

---

## Quick reference: what you need per mode

| Requirement | Remote mode | Local mode |
|---|---|---|
| The TestFlow desktop app | ✅ Required | ✅ Required |
| PostgreSQL | ❌ Not needed | ✅ Required |
| Database + user created | ❌ Not needed | ✅ Required |
| Node.js (for migrations) | ❌ Optional | ✅ If running migrations manually |
| Playwright browsers | ❌ Only if using automation | ⚠️ Only if using automation features |
| A hosted server URL | ✅ Required | ❌ Not needed |

---

## Desktop App Settings

After setup, go to **Settings → Desktop App** to change:

| Setting | Description |
|---|---|
| **Server mode** | Switch between Local and Remote |
| **Backend API URL** | Remote server URL (remote mode) |
| **Database settings** | PostgreSQL connection details (local mode) |
| **Launch at startup** | Open TestFlow when you log in to your computer |
| **Minimize to tray** | Keep running in the system tray when you close the window |
| **Update notifications** | Show a banner when a new version is available |

---

## Keyboard Shortcuts

| Action | Windows / Linux | macOS |
|---|---|---|
| Dashboard | `Ctrl+1` | `Cmd+1` |
| Projects | `Ctrl+2` | `Cmd+2` |
| Test Cases | `Ctrl+3` | `Cmd+3` |
| Test Runs | `Ctrl+4` | `Cmd+4` |
| Releases | `Ctrl+5` | `Cmd+5` |
| Settings | `Ctrl+,` | `Cmd+,` |
| Toggle Sidebar | `Ctrl+B` | `Cmd+B` |
| Toggle Dark Mode | `Ctrl+Shift+D` | `Cmd+Shift+D` |
| New Test Case | `Ctrl+N` | `Cmd+N` |
| Developer Tools | `F12` | `Cmd+Option+I` |

---

## Troubleshooting

**Backend fails to start (local mode)**
- Make sure PostgreSQL is running
- Verify your database credentials in **Settings → Desktop App**
- Click **Edit DB config → Save & Restart** on the error screen

**"Connection refused" when logging in**
- The backend server is not reachable at the configured URL
- Open **Settings → Desktop App** and check the API URL

**Recording fails / Playwright browser not found**
```bash
npx playwright install chromium
```

**"Executable doesn't exist" for Playwright**  
The browser cache is in the wrong location. Run:
```bash
# macOS
ls ~/Library/Caches/ms-playwright/

# Windows
dir %LOCALAPPDATA%\ms-playwright\

# Linux
ls ~/.cache/ms-playwright/
```
If empty: run `npx playwright install chromium` again.

**macOS: "unidentified developer" warning**  
System Settings → Privacy & Security → scroll down → **Open Anyway**

**Windows: SmartScreen blocks the installer**  
Click **"More info"** then **"Run anyway"**

**Linux: app won't start**
```bash
sudo apt-get install libgtk-3-0 libnss3 libxss1 libgbm1 libasound2
```

**Find app log files**
- Windows: `%APPDATA%\testflow-desktop\logs\`
- macOS: `~/Library/Logs/testflow-desktop/`
- Linux: `~/.config/testflow-desktop/logs/`

---

## Auto-updates

The app checks for updates automatically at startup. When one is available:
1. A banner appears in the bottom-right corner
2. Click **Download**
3. Click **Restart & Install** once downloaded

Manual check: **Help → Check for Updates**

---

## Support

- **Docs:** https://docs.testflow.dev  
- **Issues:** https://github.com/sandeepdillerao/swift-test-suite/issues  
- **Email:** support@testflow.dev
