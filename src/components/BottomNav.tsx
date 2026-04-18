import { Home, Clapperboard, PlusSquare, MessageCircle, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Clapperboard, label: "Reels", path: "/reels" },
  { icon: PlusSquare, label: "Create", path: "/create" },
  { icon: MessageCircle, label: "Messages", path: "/messages" },
  { icon: User, label: "Profile", path: "/profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {navItems.map(({ icon: Icon, label, path }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
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
