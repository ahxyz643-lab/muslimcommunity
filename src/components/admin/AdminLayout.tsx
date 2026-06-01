import { useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, BadgeCheck, FileText, Clapperboard, MessageSquare,
  MessagesSquare, Briefcase, HandHeart, Flag, HardDrive, BarChart3, Bell,
  Shield, Settings, Lock, LifeBuoy, DollarSign, Bot, Menu, X, ChevronLeft, Loader2
} from "lucide-react";
import { useAdminRole } from "@/hooks/useAdminRole";

const NAV = [
  { to: "/admin", end: true, label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { to: "/admin/users", label: "Users", icon: Users, group: "People" },
  { to: "/admin/verification", label: "Verification", icon: BadgeCheck, group: "People" },
  { to: "/admin/roles", label: "Roles & Permissions", icon: Shield, group: "People", adminOnly: true },
  { to: "/admin/content", label: "Posts", icon: FileText, group: "Moderation" },
  { to: "/admin/reels", label: "Reels", icon: Clapperboard, group: "Moderation" },
  { to: "/admin/comments", label: "Comments", icon: MessageSquare, group: "Moderation" },
  { to: "/admin/chats", label: "Chats", icon: MessagesSquare, group: "Moderation" },
  { to: "/admin/reports", label: "Reports", icon: Flag, group: "Moderation" },
  { to: "/admin/jobs", label: "Jobs", icon: Briefcase, group: "Community" },
  { to: "/admin/donations", label: "Donations", icon: HandHeart, group: "Community" },
  { to: "/admin/support", label: "Support", icon: LifeBuoy, group: "Community" },
  { to: "/admin/notifications", label: "Notifications", icon: Bell, group: "System" },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3, group: "System" },
  { to: "/admin/storage", label: "Storage", icon: HardDrive, group: "System" },
  { to: "/admin/security", label: "Security", icon: Lock, group: "System", adminOnly: true },
  { to: "/admin/monetization", label: "Monetization", icon: DollarSign, group: "System", adminOnly: true },
  { to: "/admin/ai", label: "AI Control", icon: Bot, group: "System", adminOnly: true },
  { to: "/admin/settings", label: "Settings", icon: Settings, group: "System", adminOnly: true },
];

// Mobile bottom tab quick links
const TABS = [
  { to: "/admin", end: true, label: "Home", icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/reports", label: "Reports", icon: Flag },
  { to: "/admin/content", label: "Posts", icon: FileText },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, hasAccess, loading, isAdmin } = useAdminRole();
  const [open, setOpen] = useState(false);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!hasAccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <Shield className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-xl font-bold text-foreground">Access Denied</h1>
        <p className="text-sm text-muted-foreground text-center">You don't have admin privileges.</p>
        <button onClick={() => navigate("/")} className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">Go Home</button>
      </div>
    );
  }

  const visible = NAV.filter(n => !n.adminOnly || isAdmin);
  const groups = Array.from(new Set(visible.map(v => v.group)));
  const current = visible.find(n => n.end ? location.pathname === n.to : location.pathname.startsWith(n.to) && n.to !== "/admin");
  const title = current?.label || (location.pathname === "/admin" ? "Dashboard" : "Admin");

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Top header */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur px-4 py-3">
        <button onClick={() => setOpen(true)} className="text-foreground"><Menu className="h-5 w-5" /></button>
        <button onClick={() => navigate("/")} className="text-muted-foreground"><ChevronLeft className="h-5 w-5" /></button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-foreground truncate">{title}</h1>
          <p className="text-[10px] text-muted-foreground">Muslim Community · Admin</p>
        </div>
        <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-bold uppercase text-primary">{role}</span>
      </header>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-72 flex-col border-r border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-sm font-bold">Admin Panel</span>
              </div>
              <button onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 py-3">
              {groups.map(g => (
                <div key={g} className="mb-4">
                  <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{g}</p>
                  {visible.filter(n => n.group === g).map(item => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                          isActive ? "bg-primary/15 text-primary font-semibold" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              ))}
            </nav>
          </aside>
        </div>
      )}

      <main className="px-4 py-4"><Outlet /></main>

      {/* Mobile bottom tabs */}
      <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-lg -translate-x-1/2 border-t border-border bg-background/95 backdrop-blur">
        <div className="grid grid-cols-5">
          {TABS.map(t => (
            <NavLink key={t.to} to={t.to} end={t.end}
              className={({isActive}) => `flex flex-col items-center gap-0.5 py-2 text-[10px] ${isActive ? "text-primary" : "text-muted-foreground"}`}>
              <t.icon className="h-5 w-5" />
              <span>{t.label}</span>
            </NavLink>
          ))}
          <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 py-2 text-[10px] text-muted-foreground">
            <Menu className="h-5 w-5" />
            <span>More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
