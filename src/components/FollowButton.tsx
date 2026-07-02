import { useEffect, useState } from "react";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface FollowButtonProps {
  targetUserId: string;
  variant?: "solid" | "outline" | "pill-glass";
  size?: "sm" | "md";
  className?: string;
}

const FollowButton = ({ targetUserId, variant = "solid", size = "sm", className = "" }: FollowButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user || user.id === targetUserId) { setReady(true); return; }
    let alive = true;
    supabase
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        setFollowing(!!data);
        setReady(true);
      });
    return () => { alive = false; };
  }, [user?.id, targetUserId]);

  if (!user || user.id === targetUserId) {
    if (user?.id === targetUserId) return null;
    // guest: still show button, click prompts sign in
  }

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({ title: "Sign in to follow", description: "Create a free account to follow creators." });
      navigate("/auth");
      return;
    }
    setLoading(true);
    try {
      if (following) {
        await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetUserId);
        setFollowing(false);
      } else {
        const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: targetUserId });
        if (error && !String(error.message).includes("duplicate")) throw error;
        setFollowing(true);
      }
    } catch (err: any) {
      toast({ title: "Could not update", description: err?.message || "Try again", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const sizes = size === "md" ? "px-4 py-1.5 text-sm" : "px-3 py-1 text-xs";
  const base = "inline-flex items-center gap-1.5 rounded-full font-semibold transition-all active:scale-95";
  const styles =
    variant === "pill-glass"
      ? following
        ? "bg-white/15 text-white backdrop-blur-md border border-white/25"
        : "bg-white text-black hover:bg-white/90"
      : variant === "outline"
      ? following
        ? "border border-border text-foreground bg-secondary"
        : "border border-primary text-primary hover:bg-primary/10"
      : following
      ? "bg-secondary text-foreground"
      : "bg-primary text-primary-foreground hover:opacity-90";

  return (
    <button onClick={toggle} disabled={loading || !ready} className={`${base} ${sizes} ${styles} ${className}`}>
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : following ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
      {following ? "Following" : "Follow"}
    </button>
  );
};

export default FollowButton;