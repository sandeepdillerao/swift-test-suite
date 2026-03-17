import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
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

// Redirect already-authenticated users away from /login
const PublicOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, accessToken } = useAuthStore();
  if (isAuthenticated && accessToken) return <Navigate to="/app" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeInitializer>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/app" replace />} />
            <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="test-cases" element={<TestCases />} />
                <Route path="test-cases/:id" element={<TestCaseDetail />} />
                <Route path="test-suites" element={<TestSuites />} />
                <Route path="test-suites/:id" element={<TestSuiteDetail />} />
                <Route path="test-runs" element={<TestRuns />} />
                <Route path="test-runs/:id" element={<TestRunDetail />} />
                <Route path="releases" element={<Releases />} />
                <Route path="integrations" element={<Integrations />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ThemeInitializer>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
