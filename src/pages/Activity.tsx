import { ArrowLeft, Heart, MessageCircle, UserPlus, Bookmark, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useEffect } from "react";

const Activity = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user,
  });

  // Realtime: live-prepend incoming notifications
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          qc.setQueryData(["notifications", user.id], (old: any[] = []) => [payload.new, ...old]);
          qc.invalidateQueries({ queryKey: ["unread-notifications", user.id] });
          if ("Notification" in window && Notification.permission === "granted") {
            try { new Notification((payload.new as any).title || "New activity", { body: (payload.new as any).body || "" }); } catch {}
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc]);

  // Request browser notification permission once
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Mark all as read
  useQuery({
    queryKey: ["mark-read", user?.id],
    queryFn: async () => {
      await supabase.from("notifications").update({ read: true }).eq("user_id", user!.id).eq("read", false);
      return true;
    },
    enabled: !!user && notifications.length > 0,
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "like": return <Heart className="h-5 w-5 text-destructive" />;
      case "comment": return <MessageCircle className="h-5 w-5 text-primary" />;
      case "follow": return <UserPlus className="h-5 w-5 text-primary" />;
      case "save": return <Bookmark className="h-5 w-5 text-accent" />;
      default: return <Heart className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-base font-semibold text-foreground">Activity</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <Heart className="h-12 w-12 text-muted-foreground mb-3" />
          <h2 className="text-lg font-semibold text-foreground">No activity yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">When people interact with your content, you'll see it here.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {notifications.map((n) => (
            <div key={n.id} className={`flex items-start gap-3 px-4 py-3 ${!n.read ? "bg-primary/5" : ""}`}>
              <div className="mt-0.5">{getIcon(n.type)}</div>
              <div className="flex-1">
                <p className="text-sm text-foreground font-medium">{n.title}</p>
                {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Activity;
