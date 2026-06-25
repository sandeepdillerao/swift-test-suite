import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { ElectronTitleBar } from "@/components/electron/ElectronTitleBar";
import { UpdateNotification } from "@/components/electron/UpdateNotification";
import { SetupWizard } from "@/components/electron/SetupWizard";
import { BackendStartup } from "@/components/electron/BackendStartup";
import { FirstRunSetup } from "@/components/electron/FirstRunSetup";
import { ChromiumBanner } from "@/components/electron/ChromiumBanner";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/app/Dashboard";
import { TestCases } from "@/pages/app/TestCases";
import { TestCaseDetail } from "@/pages/app/TestCaseDetail";
import { TestSuites } from "@/pages/app/TestSuites";
import { TestSuiteDetail } from "@/pages/app/TestSuiteDetail";
import { TestRuns } from "@/pages/app/TestRuns";
import { TestRunDetail } from "@/pages/app/TestRunDetail";
import { Releases } from "@/pages/app/Releases";
import { Integrations } from "@/pages/app/Integrations";
import { UserManagement } from "@/pages/app/UserManagement";
import { Settings } from "@/pages/app/Settings";
import { Projects } from "@/pages/app/Projects";
import { ProjectDetail } from "@/pages/app/ProjectDetail";
import { RolesPermissions } from "@/pages/app/RolesPermissions";
import AiReviewPage from "@/pages/app/AiReviewPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ThemeInitializer = ({ children }: { children: React.ReactNode }) => {
  const { theme } = useUIStore();
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);
  return <>{children}</>;
};

const PublicOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, accessToken } = useAuthStore();
  if (isAuthenticated && accessToken) return <Navigate to="/app" replace />;
  return <>{children}</>;
};

const ElectronNavigationHandler = (): null => {
  const navigate = useNavigate();
  const { toggleSidebar } = useUIStore();
  useEffect(() => {
    if (!window.electron) return;
    const unsubs = [
      window.electron.on('navigate', (path) => navigate(path as string)),
      window.electron.on('menu:toggle-sidebar', () => toggleSidebar()),
      window.electron.on('menu:toggle-theme', () => useUIStore.getState().toggleTheme()),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, [navigate, toggleSidebar]);
  return null;
};

const AppRouter = window.electron?.isElectron ? HashRouter : BrowserRouter;

// ─── Electron startup gate ────────────────────────────────────────────────────
// Shows the setup wizard on first launch, then the backend startup screen for
// local mode, before revealing the main application.

type ElectronGate = 'checking' | 'setup' | 'backend-starting' | 'first-run' | 'ready'

const App = () => {
  const [gate, setGate] = useState<ElectronGate>(() =>
    window.electron ? 'checking' : 'ready'
  )

  // Check if DB has any users yet. If not, show first-run admin creation screen.
  const checkFirstRun = async () => {
    try {
      const apiUrl = window.electron?.apiUrl || (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000/api/v1'
      const res = await fetch(`${apiUrl}/auth/setup-status`, { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        const json = await res.json()
        const data = json.data ?? json
        if (!data.isInitialized) {
          setGate('first-run')
          return
        }
      }
    } catch { /* backend unreachable — fall through to app */ }
    setGate('ready')
  }

  useEffect(() => {
    if (!window.electron) return
    const { isDev } = window.electron
    window.electron.getServerMode().then((mode) => {
      if (mode === 'not-configured') {
        setGate('setup')
      } else if (mode === 'local') {
        if (isDev) {
          // In dev, backend is already running — skip startup overlay, but still check first-run
          checkFirstRun()
        } else {
          setGate('backend-starting')
        }
      } else {
        setGate('ready')
      }
    })
  }, [])

  // After setup wizard completes
  const handleSetupComplete = async () => {
    const { isDev } = window.electron!
    const mode = await window.electron!.getServerMode()
    if (mode === 'local') {
      if (isDev) {
        // In dev, backend is already running via concurrently — skip startup overlay
        await checkFirstRun()
      } else {
        setGate('backend-starting')
        window.electron!.startBackend()
      }
    } else {
      // Remote mode: reload so http-client picks up the new apiUrl, then check first run
      setGate('ready')
      window.location.reload()
    }
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeInitializer>
          <Toaster />
          <Sonner />

          {/* First-launch setup wizard */}
          {gate === 'setup' && <SetupWizard onComplete={handleSetupComplete} />}

          {/* Backend startup overlay (local mode only) */}
          {gate === 'backend-starting' && (
            <BackendStartup onReady={checkFirstRun} />
          )}

          {/* First-run: no users in DB yet — create the first admin */}
          {gate === 'first-run' && (
            <FirstRunSetup onComplete={() => setGate('ready')} />
          )}

          {/* Main app (shown once gate is ready) */}
          {(gate === 'ready' || gate === 'checking') && (
            <>
              <UpdateNotification />
              <ChromiumBanner />
              <ElectronTitleBar />
              <AppRouter>
                <ElectronNavigationHandler />
                <Routes>
                  <Route path="/" element={<Navigate to="/app" replace />} />
                  <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
                  <Route element={<ProtectedRoute />}>
                    <Route path="/app" element={<AppLayout />}>
                      <Route index element={<Dashboard />} />
                      <Route path="projects" element={<Projects />} />
                      <Route path="projects/:id" element={<ProjectDetail />} />
                      <Route path="test-cases" element={<TestCases />} />
                      <Route path="test-cases/:id" element={<TestCaseDetail />} />
                      <Route path="test-suites" element={<TestSuites />} />
                      <Route path="test-suites/:id" element={<TestSuiteDetail />} />
                      <Route path="test-runs" element={<TestRuns />} />
                      <Route path="test-runs/:id" element={<TestRunDetail />} />
                      <Route path="releases" element={<Releases />} />
                      <Route path="integrations" element={<Integrations />} />
                      <Route path="users" element={<UserManagement />} />
                      <Route path="roles" element={<RolesPermissions />} />
                      <Route path="ai-review" element={<AiReviewPage />} />
                      <Route path="settings" element={<Settings />} />
                    </Route>
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppRouter>
            </>
          )}
        </ThemeInitializer>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
