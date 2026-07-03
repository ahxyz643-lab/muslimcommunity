import { Home, Compass, Briefcase, HandHeart, User, Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Compass, label: "Explore", path: "/explore" },
  { icon: Plus, label: "Create", path: "/create" },
  { icon: Briefcase, label: "Jobs", path: "/jobs" },
  { icon: HandHeart, label: "Donate", path: "/donations" },
  { icon: User, label: "Profile", path: "/profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const guestGated = new Set(["/create", "/profile"]);
  const go = (path: string) => {
    if (!user && guestGated.has(path)) { navigate("/auth"); return; }
    navigate(path);
  };

  return (
    <nav className="fixed bottom-2 left-2 right-2 z-50 mx-auto max-w-lg">
      <div className="glass-strong mx-auto flex max-w-lg items-center justify-around rounded-2xl py-2 shadow-glow">
        {navItems.map(({ icon: Icon, label, path }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => go(path)}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 transition-all duration-200 ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {path === "/create" ? (
                <div className="gradient-primary flex h-10 w-10 items-center justify-center rounded-xl shadow-glow">
                  <Icon className="h-5 w-5 text-primary-foreground" />
                </div>
              ) : (
                <Icon className={`h-6 w-6 ${active ? "fill-current" : ""}`} strokeWidth={active ? 2.5 : 1.5} />
              )}
              {path !== "/create" && (
                <span className={`text-[10px] ${active ? "font-semibold" : "font-medium"}`}>
                  {label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
