import { useState, useCallback, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import SplashScreen from "@/components/SplashScreen";
import BottomNav from "@/components/BottomNav";
import ErrorBoundary from "@/components/ErrorBoundary";
import OfflineIndicator from "@/components/OfflineIndicator";
import Home from "@/pages/Home";
import Explore from "@/pages/Explore";
import Messages from "@/pages/Messages";
import Profile from "@/pages/Profile";
import EditProfile from "@/pages/EditProfile";
import Settings from "@/pages/Settings";
import Activity from "@/pages/Activity";
import Auth from "@/pages/Auth";
import Welcome from "@/pages/Welcome";
import UserProfilePage from "@/pages/UserProfilePage";
import Jobs from "@/pages/Jobs";
import NotFound from "@/pages/NotFound";

// Lazy heavier routes to shrink initial bundle
const CreatePost = lazy(() => import("@/pages/CreatePost"));
const PrivacySettings = lazy(() => import("@/pages/PrivacySettings"));
const NotificationSettings = lazy(() => import("@/pages/NotificationSettings"));
const HelpSupport = lazy(() => import("@/pages/HelpSupport"));
const CreatorStudio = lazy(() => import("@/pages/CreatorStudio"));
const Employer = lazy(() => import("@/pages/Employer"));
const Reels = lazy(() => import("@/pages/Reels"));
const CreateReel = lazy(() => import("@/pages/CreateReel"));
const Donations = lazy(() => import("@/pages/Donations"));
const TikTokFeed = lazy(() => import("@/pages/TikTokFeed"));
const AdminLayout = lazy(() => import("@/components/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminVerification = lazy(() => import("@/pages/admin/AdminVerification"));
const AdminContent = lazy(() => import("@/pages/admin/AdminContent"));
const AdminReels = lazy(() => import("@/pages/admin/AdminReels"));
const AdminComments = lazy(() => import("@/pages/admin/AdminComments"));
const AdminChats = lazy(() => import("@/pages/admin/AdminChats"));
const AdminJobs = lazy(() => import("@/pages/admin/AdminJobs"));
const AdminDonations = lazy(() => import("@/pages/admin/AdminDonations"));
const AdminReports = lazy(() => import("@/pages/admin/AdminReports"));
const AdminStorage = lazy(() => import("@/pages/admin/AdminStorage"));
const AdminAnalytics = lazy(() => import("@/pages/admin/AdminAnalytics"));
const AdminNotifications = lazy(() => import("@/pages/admin/AdminNotifications"));
const AdminRoles = lazy(() => import("@/pages/admin/AdminRoles"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminSecurity = lazy(() => import("@/pages/admin/AdminSecurity"));
const AdminSupport = lazy(() => import("@/pages/admin/AdminSupport"));
const AdminMonetization = lazy(() => import("@/pages/admin/AdminMonetization"));
const AdminAI = lazy(() => import("@/pages/admin/AdminAI"));

const RouteFallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const { user } = useAuth();
  const loc = useLocation();
  const onAdmin = loc.pathname.startsWith("/admin");

  return (
    <div className="mx-auto min-h-screen max-w-lg">
      <ErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/welcome" element={user ? <Navigate to="/" replace /> : <Welcome />} />
        <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/create" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/user/:userId" element={<UserProfilePage />} />
        <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/settings/privacy" element={<ProtectedRoute><PrivacySettings /></ProtectedRoute>} />
        <Route path="/settings/notifications" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />
        <Route path="/settings/support" element={<ProtectedRoute><HelpSupport /></ProtectedRoute>} />
        <Route path="/activity" element={<ProtectedRoute><Activity /></ProtectedRoute>} />
        <Route path="/creator-studio" element={<ProtectedRoute><CreatorStudio /></ProtectedRoute>} />
        <Route path="/employer" element={<ProtectedRoute><Employer /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="verification" element={<AdminVerification />} />
          <Route path="content" element={<AdminContent />} />
          <Route path="reels" element={<AdminReels />} />
          <Route path="comments" element={<AdminComments />} />
          <Route path="chats" element={<AdminChats />} />
          <Route path="jobs" element={<AdminJobs />} />
          <Route path="donations" element={<AdminDonations />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="storage" element={<AdminStorage />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="roles" element={<AdminRoles />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="security" element={<AdminSecurity />} />
          <Route path="support" element={<AdminSupport />} />
          <Route path="monetization" element={<AdminMonetization />} />
          <Route path="ai" element={<AdminAI />} />
        </Route>
        <Route path="/reels" element={<Reels />} />
        <Route path="/reels/create" element={<ProtectedRoute><CreateReel /></ProtectedRoute>} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/donations" element={<Donations />} />
        <Route path="/tiktok" element={<TikTokFeed />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      </ErrorBoundary>
      {!onAdmin && <BottomNav />}
      <OfflineIndicator />
    </div>
  );
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashFinish = useCallback(() => setShowSplash(false), []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
          <BrowserRouter>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
