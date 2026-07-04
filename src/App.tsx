import { useState, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import SplashScreen from "@/components/SplashScreen";
import BottomNav from "@/components/BottomNav";
import Home from "@/pages/Home";
import Explore from "@/pages/Explore";
import CreatePost from "@/pages/CreatePost";
import Messages from "@/pages/Messages";
import Profile from "@/pages/Profile";
import EditProfile from "@/pages/EditProfile";
import Settings from "@/pages/Settings";
import Activity from "@/pages/Activity";
import CreatorStudio from "@/pages/CreatorStudio";
import Employer from "@/pages/Employer";
import Auth from "@/pages/Auth";
import Welcome from "@/pages/Welcome";
import UserProfilePage from "@/pages/UserProfilePage";
import Reels from "@/pages/Reels";
import CreateReel from "@/pages/CreateReel";
import Jobs from "@/pages/Jobs";
import Donations from "@/pages/Donations";
import NotFound from "@/pages/NotFound";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminVerification from "@/pages/admin/AdminVerification";
import AdminContent from "@/pages/admin/AdminContent";
import AdminReels from "@/pages/admin/AdminReels";
import AdminComments from "@/pages/admin/AdminComments";
import AdminChats from "@/pages/admin/AdminChats";
import AdminJobs from "@/pages/admin/AdminJobs";
import AdminDonations from "@/pages/admin/AdminDonations";
import AdminReports from "@/pages/admin/AdminReports";
import AdminStorage from "@/pages/admin/AdminStorage";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";
import AdminNotifications from "@/pages/admin/AdminNotifications";
import AdminRoles from "@/pages/admin/AdminRoles";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminSecurity from "@/pages/admin/AdminSecurity";
import AdminSupport from "@/pages/admin/AdminSupport";
import AdminMonetization from "@/pages/admin/AdminMonetization";
import AdminAI from "@/pages/admin/AdminAI";

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
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!onAdmin && <BottomNav />}
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
