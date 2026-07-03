import { Bell, MessageCircle, Clapperboard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import appLogo from "@/assets/app-logo.png";

const TopBar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-notifications", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("read", false);
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Realtime unread badge
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`topbar-notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["unread-notifications", user.id] })
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["unread-notifications", user.id] })
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  return (
    <header className="glass-strong fixed left-0 right-0 top-0 z-50">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <button onClick={() => navigate("/")} className="flex items-center gap-2">
          <img src={appLogo} alt="Logo" className="h-8 w-8 rounded-lg" />
          <h1 className="font-display text-xl font-bold">
            <span className="text-emerald-brand">Muslim</span>
            <span className="text-gold">Community</span>
          </h1>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate("/reels")}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Reels"
          >
            <Clapperboard className="h-5 w-5" />
          </button>
          <button
            onClick={() => navigate("/messages")}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Messages"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
          <button
            onClick={() => navigate("/activity")}
            className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
