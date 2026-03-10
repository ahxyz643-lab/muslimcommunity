import { useState } from "react";
import { ArrowLeft, Shield, Search, UserCheck, UserX, BadgeCheck, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Check if current user is admin
  const { data: isAdmin, isLoading: checkingAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("id").eq("user_id", user!.id).eq("role", "admin").maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  // Fetch all users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: async () => {
      let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (search) query = query.or(`username.ilike.%${search}%,display_name.ilike.%${search}%`);
      const { data } = await query.limit(50);
      return data || [];
    },
    enabled: isAdmin === true,
  });

  // Fetch roles for displayed users
  const { data: roles = [] } = useQuery({
    queryKey: ["admin-roles", users.map(u => u.user_id)],
    queryFn: async () => {
      const userIds = users.map(u => u.user_id);
      if (userIds.length === 0) return [];
      const { data } = await supabase.from("user_roles").select("*").in("user_id", userIds);
      return data || [];
    },
    enabled: users.length > 0,
  });

  const toggleVerified = async (userId: string, current: boolean) => {
    setActionLoading(userId + "-verify");
    await supabase.from("profiles").update({ verified: !current }).eq("user_id", userId);
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    toast({ title: current ? "Verification removed" : "User verified ✅" });
    setActionLoading(null);
  };

  const toggleBan = async (userId: string, current: boolean) => {
    setActionLoading(userId + "-ban");
    await supabase.from("profiles").update({ banned: !current }).eq("user_id", userId);
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    toast({ title: current ? "User unbanned" : "User banned 🚫" });
    setActionLoading(null);
  };

  const toggleAdmin = async (userId: string) => {
    setActionLoading(userId + "-admin");
    const hasRole = roles.some(r => r.user_id === userId && r.role === "admin");
    if (hasRole) {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
    }
    queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
    toast({ title: hasRole ? "Admin removed" : "Admin granted 🛡️" });
    setActionLoading(null);
  };

  if (checkingAdmin) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <Shield className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-xl font-bold text-foreground">Access Denied</h1>
        <p className="text-sm text-muted-foreground text-center">You don't have admin privileges.</p>
        <button onClick={() => navigate("/")} className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="text-base font-semibold text-foreground">Admin Panel</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 px-4 py-4">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{users.length}</p>
          <p className="text-[10px] text-muted-foreground">Total Users</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{users.filter(u => u.verified).length}</p>
          <p className="text-[10px] text-muted-foreground">Verified</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{users.filter(u => (u as any).banned).length}</p>
          <p className="text-[10px] text-muted-foreground">Banned</p>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      {/* Users List */}
      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="divide-y divide-border">
          {users.map((u) => {
            const isUserAdmin = roles.some(r => r.user_id === u.user_id && r.role === "admin");
            const isBanned = (u as any).banned;
            return (
              <div key={u.user_id} className={`px-4 py-3 ${isBanned ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-3">
                  <img src={u.avatar_url || "https://i.pravatar.cc/150"} alt="" className="h-10 w-10 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground truncate">{u.display_name || "User"}</span>
                      {u.verified && <BadgeCheck className="h-4 w-4 text-blue-500 flex-shrink-0" />}
                      {isUserAdmin && <Shield className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                      {isBanned && <span className="text-[10px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded font-medium">BANNED</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">@{u.username || "user"} · {u.posts_count} posts · {u.followers_count} followers</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-2 ml-13">
                  <button
                    onClick={() => toggleVerified(u.user_id, u.verified)}
                    disabled={actionLoading === u.user_id + "-verify"}
                    className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      u.verified ? "bg-blue-500/20 text-blue-500" : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {u.verified ? "Unverify" : "Verify"}
                  </button>
                  <button
                    onClick={() => toggleBan(u.user_id, isBanned)}
                    disabled={actionLoading === u.user_id + "-ban"}
                    className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      isBanned ? "bg-destructive/20 text-destructive" : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <UserX className="h-3.5 w-3.5" />
                    {isBanned ? "Unban" : "Ban"}
                  </button>
                  {u.user_id !== user?.id && (
                    <button
                      onClick={() => toggleAdmin(u.user_id)}
                      disabled={actionLoading === u.user_id + "-admin"}
                      className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        isUserAdmin ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Shield className="h-3.5 w-3.5" />
                      {isUserAdmin ? "Remove Admin" : "Make Admin"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Admin;
