import { ArrowLeft, Heart, MessageCircle, UserPlus, Bookmark, Loader2, Briefcase, Bell, Film, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";

const Activity = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"notifications" | "watch" | "logins">("notifications");

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
      case "job_application":
      case "job_application_status":
        return <Briefcase className="h-5 w-5 text-[#c9a84c]" />;
      case "message": return <MessageCircle className="h-5 w-5 text-primary" />;
      default: return <Heart className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const openNotification = (n: any) => {
    const d = n.data || {};
    switch (n.type) {
      case "message":
        return navigate(d.conversation_id ? `/messages?c=${d.conversation_id}` : "/messages");
      case "follow":
        return d.actor_id ? navigate(`/user/${d.actor_id}`) : navigate("/activity");
      case "job_application":
        return navigate("/employer");
      case "job_application_status":
        return navigate("/jobs");
      case "like":
      case "comment":
        if (d.reel_id) return navigate(`/reels?start=${d.reel_id}`);
        if (d.post_id) return navigate(`/reels?start=${d.post_id}&kind=post`);
        return;
      default:
        return;
    }
  };

  const { data: watchHistory = [], isLoading: watchLoading } = useQuery({
    queryKey: ["watch-history", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reel_views" as any)
        .select("id, reel_id, viewed_at, reels:reel_id(id, caption, thumbnail_url, user_id, profiles:user_id(username, avatar_url))")
        .eq("user_id", user!.id)
        .order("viewed_at", { ascending: false })
        .limit(50);
      return (data as any) || [];
    },
    enabled: !!user && tab === "watch",
  });

  const { data: loginHistory = [], isLoading: loginLoading } = useQuery({
    queryKey: ["login-history", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_logs")
        .select("*")
        .eq("actor_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user && tab === "logins",
  });

  return (
    <div className="min-h-screen pb-20">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-base font-semibold text-foreground">Account Activity</h1>
      </div>

      <div className="flex border-b border-border">
        {[
          { k: "notifications", label: "Alerts", icon: Bell },
          { k: "watch", label: "Watch history", icon: Film },
          { k: "logins", label: "Login history", icon: LogIn },
        ].map(({ k, label, icon: Icon }) => (
          <button
            key={k}
            onClick={() => setTab(k as any)}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${tab === k ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
          >
            <Icon className="h-3.5 w-3.5"/>{label}
          </button>
        ))}
      </div>

      {tab === "notifications" && (isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <Heart className="h-12 w-12 text-muted-foreground mb-3" />
          <h2 className="text-lg font-semibold text-foreground">No notifications yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">When people interact with your content, you'll see it here.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => openNotification(n)}
              className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/40 ${!n.read ? "bg-primary/5" : ""}`}
            >
              <div className="mt-0.5">{getIcon(n.type)}</div>
              <div className="flex-1">
                <p className="text-sm text-foreground font-medium">{n.title}</p>
                {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
              </div>
            </button>
          ))}
        </div>
      ))}

      {tab === "watch" && (watchLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
      ) : watchHistory.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center px-4"><Film className="h-12 w-12 text-muted-foreground mb-3"/><h2 className="text-lg font-semibold">No watch history</h2><p className="mt-1 text-sm text-muted-foreground">Reels you watch will appear here.</p></div>
      ) : (
        <div className="divide-y divide-border">
          {watchHistory.map((v: any) => (
            <button key={v.id} onClick={() => v.reels?.id && navigate(`/reels?start=${v.reels.id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary/40">
              <img src={v.reels?.thumbnail_url || v.reels?.profiles?.avatar_url || "https://i.pravatar.cc/150"} alt="" className="h-14 w-10 rounded-md object-cover bg-secondary"/>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{v.reels?.caption || "Reel"}</p>
                <p className="text-xs text-muted-foreground">@{v.reels?.profiles?.username || "user"} · {formatDistanceToNow(new Date(v.viewed_at), { addSuffix: true })}</p>
              </div>
            </button>
          ))}
        </div>
      ))}

      {tab === "logins" && (loginLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
      ) : loginHistory.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center px-4"><LogIn className="h-12 w-12 text-muted-foreground mb-3"/><h2 className="text-lg font-semibold">No login history</h2><p className="mt-1 text-sm text-muted-foreground">Recent account activity will appear here.</p></div>
      ) : (
        <div className="divide-y divide-border">
          {loginHistory.map((l: any) => (
            <div key={l.id} className="px-4 py-3">
              <p className="text-sm font-medium">{l.action || "Activity"}</p>
              <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default Activity;
