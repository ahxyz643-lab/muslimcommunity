import { Bell, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TopBar = () => {
  const navigate = useNavigate();

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-card/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <h1 className="font-display text-xl font-bold">
          <span className="text-emerald-brand">Muslim</span>
          <span className="text-gold">Community</span>
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/explore")}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Search className="h-5 w-5" />
          </button>
          <button className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
