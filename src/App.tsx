import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import zikalyzeLogo from "@/assets/zikalyze-logo.png";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { CurrencyProvider } from "@/hooks/useCurrency";
import ProtectedRoute from "./components/ProtectedRoute";
import { PWAInstallBanner } from "./components/PWAInstallBanner";
import { ZikalyzeWatermark } from "./components/ZikalyzeWatermark";
import { useSessionTracking } from "./hooks/useSessionTracking";
import ErrorBoundary from "./components/ErrorBoundary";


// Session tracking wrapper component - non-critical feature
function SessionTracker({ children }: { children: React.ReactNode }) {
  useSessionTracking();
  return <>{children}</>;
}
// Lazy load page components for code splitting
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Analyzer = lazy(() => import("./pages/Analyzer"));
const Settings = lazy(() => import("./pages/Settings"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Install = lazy(() => import("./pages/Install"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Seamless loading fallback with Zikalyze logo - no flash
const PageLoader = () => (
  <div 
    className="fixed inset-0 flex items-center justify-center"
    style={{ backgroundColor: '#0a0f1a' }}
  >
    <img 
      src={zikalyzeLogo} 
      alt="Loading"
      width={64}
      height={64}
      className="h-16 w-16 animate-spin-slow opacity-80"
    />
  </div>
);

// App-level error fallback
const AppErrorFallback = () => (
  <div 
    className="fixed inset-0 flex flex-col items-center justify-center gap-4"
    style={{ backgroundColor: '#0a0f1a' }}
  >
    <img 
      src={zikalyzeLogo} 
      alt="Zikalyze"
      width={64}
      height={64}
      className="h-16 w-16 opacity-80"
    />
    <h1 className="text-xl font-bold text-white">Something went wrong</h1>
    <p className="text-gray-400 text-sm text-center max-w-md px-4">
      The application encountered an unexpected error. Please refresh the page to continue.
    </p>
    <button
      onClick={() => window.location.reload()}
      className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
    >
      Refresh Page
    </button>
  </div>
);

const App = () => (
  <ErrorBoundary fallback={<AppErrorFallback />}>
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <QueryClientProvider client={queryClient}>
        <CurrencyProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <PWAInstallBanner />
            <ZikalyzeWatermark />
            <HashRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/login" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/dashboard" element={<ProtectedRoute><SessionTracker><ErrorBoundary componentName="Dashboard"><Dashboard /></ErrorBoundary></SessionTracker></ProtectedRoute>} />
                  <Route path="/dashboard/portfolio" element={<ProtectedRoute><SessionTracker><ErrorBoundary componentName="Portfolio"><Portfolio /></ErrorBoundary></SessionTracker></ProtectedRoute>} />
                  <Route path="/dashboard/analytics" element={<ProtectedRoute><SessionTracker><ErrorBoundary componentName="Analytics"><Analytics /></ErrorBoundary></SessionTracker></ProtectedRoute>} />
                  <Route path="/dashboard/analyzer" element={<ProtectedRoute><SessionTracker><ErrorBoundary componentName="Analyzer"><Analyzer /></ErrorBoundary></SessionTracker></ProtectedRoute>} />
                  <Route path="/dashboard/alerts" element={<ProtectedRoute><SessionTracker><ErrorBoundary componentName="Alerts"><Alerts /></ErrorBoundary></SessionTracker></ProtectedRoute>} />
                  <Route path="/dashboard/settings" element={<ProtectedRoute><SessionTracker><ErrorBoundary componentName="Settings"><Settings /></ErrorBoundary></SessionTracker></ProtectedRoute>} />
                  <Route path="/install" element={<Install />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </HashRouter>
          </TooltipProvider>
        </CurrencyProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
