import { Suspense, useState, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { ThemeProvider } from "./providers/ThemeProvider";
import { AuthProvider, useAuth } from "./providers/AuthProvider";
import { SplashScreen } from "./components/SplashScreen";
import { ScrollToTop } from "./components/ScrollToTop";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { lazyWithRetry } from "./lib/lazyWithRetry";

const Home = lazyWithRetry(() => import("./pages/Home").then((module) => ({ default: module.Home })), "page-home");
const Login = lazyWithRetry(() => import("./pages/Login").then((module) => ({ default: module.Login })), "page-login");
const Planning = lazyWithRetry(() => import("./pages/Planning").then((module) => ({ default: module.Planning })), "page-planning");
const Profile = lazyWithRetry(() => import("./pages/Profile").then((module) => ({ default: module.Profile })), "page-profile");
const BudgetForm = lazyWithRetry(() => import("./pages/BudgetForm").then((module) => ({ default: module.BudgetForm })), "page-budget-form");
const GoalForm = lazyWithRetry(() => import("./pages/GoalForm").then((module) => ({ default: module.GoalForm })), "page-goal-form");
const RecurrenceForm = lazyWithRetry(() => import("./pages/RecurrenceForm").then((module) => ({ default: module.RecurrenceForm })), "page-recurrence-form");
const Categories = lazyWithRetry(() => import("./pages/Categories").then((module) => ({ default: module.Categories })), "page-categories");
const Tags = lazyWithRetry(() => import("./pages/Tags").then((module) => ({ default: module.Tags })), "page-tags");
const Invoices = lazyWithRetry(() => import("./pages/Invoices").then((module) => ({ default: module.Invoices })), "page-invoices");
const Settings = lazyWithRetry(() => import("./pages/Settings").then((module) => ({ default: module.Settings })), "page-settings");
const AzinhaQuality = lazyWithRetry(() => import("./pages/AzinhaQuality").then((module) => ({ default: module.AzinhaQuality })), "page-azinha-quality");
const Notifications = lazyWithRetry(() => import("./pages/Notifications").then((module) => ({ default: module.Notifications })), "page-notifications");
const Security = lazyWithRetry(() => import("./pages/Security").then((module) => ({ default: module.Security })), "page-security");
const Help = lazyWithRetry(() => import("./pages/Help").then((module) => ({ default: module.Help })), "page-help");
const AccountReport = lazyWithRetry(() => import("./pages/AccountReport").then((module) => ({ default: module.AccountReport })), "page-account-report");
const CardReport = lazyWithRetry(() => import("./pages/CardReport").then((module) => ({ default: module.CardReport })), "page-card-report");
const TransactionHistory = lazyWithRetry(() => import("./pages/TransactionHistory").then((module) => ({ default: module.TransactionHistory })), "page-transaction-history");
const ArchivedItems = lazyWithRetry(() => import("./pages/ArchivedItems").then((module) => ({ default: module.ArchivedItems })), "page-archived-items");
const NotFound = lazyWithRetry(() => import("./pages/NotFound"), "page-not-found");

const queryClient = new QueryClient();

function FullScreenLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

function PublicOnlyRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenLoader />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  
  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            
            <AppErrorBoundary>
              {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
              
              <BrowserRouter>
                <ScrollToTop />
                <Suspense fallback={<FullScreenLoader />}>
                  <Routes>
                    <Route element={<PublicOnlyRoutes />}>
                      <Route path="/login" element={<Login />} />
                    </Route>

                    <Route element={<ProtectedRoutes />}>
                      <Route path="/" element={<Home />} />
                      <Route path="/home" element={<Home />} />
                      <Route path="/onboarding" element={<Navigate to="/" replace />} />
                      <Route path="/wallet" element={<Navigate to="/" replace />} />
                      <Route path="/planning" element={<Planning />} />
                      <Route path="/planning/budget/new" element={<BudgetForm />} />
                      <Route path="/planning/budget/:id" element={<BudgetForm />} />
                      <Route path="/planning/goal/new" element={<GoalForm />} />
                      <Route path="/planning/goal/:id" element={<GoalForm />} />
                      <Route path="/planning/recurring/new" element={<RecurrenceForm />} />
                      <Route path="/planning/recurring/:id" element={<RecurrenceForm />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/achievements" element={<Navigate to="/" replace />} />
                      <Route path="/missions" element={<Navigate to="/" replace />} />
                      <Route path="/score" element={<Navigate to="/" replace />} />
                      <Route path="/badges" element={<Navigate to="/" replace />} />
                      <Route path="/leaderboard" element={<Navigate to="/" replace />} />
                      <Route path="/xp-history" element={<Navigate to="/" replace />} />
                      <Route path="/anti-fraud" element={<Navigate to="/" replace />} />
                      {/* Account & Card Reports */}
                      <Route path="/account/:id/report" element={<AccountReport />} />
                      <Route path="/card/:id/report" element={<CardReport />} />
                      <Route path="/archived" element={<ArchivedItems />} />
                      <Route path="/transactions/history" element={<TransactionHistory />} />
                      {/* Settings */}
                      <Route path="/categories" element={<Categories />} />
                      <Route path="/tags" element={<Tags />} />
                      <Route path="/invoices" element={<Invoices />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/settings/azinha-quality" element={<AzinhaQuality />} />
                      <Route path="/notifications" element={<Notifications />} />
                      <Route path="/security" element={<Security />} />
                      <Route path="/help" element={<Help />} />
                      {/* Redirects */}
                      <Route path="/transaction/new" element={<Navigate to="/" replace />} />
                      <Route path="/transactions" element={<Navigate to="/transactions/history" replace />} />
                      <Route path="/goals" element={<Navigate to="/planning" replace />} />
                      <Route path="/reports" element={<Navigate to="/planning" replace />} />
                      <Route path="*" element={<NotFound />} />
                    </Route>
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </AppErrorBoundary>
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
