import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, BadgeCheck, Shield, UserX, Trash2 } from "lucide-react";
import { Btn, Pill, Spinner } from "@/components/admin/ui";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type Filter = "all" | "active" | "banned" | "verified";

export default function AdminUsers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["adm-users", search, filter],
    queryFn: async () => {
      let q = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100);
      if (search) q = q.or(`username.ilike.%${search}%,display_name.ilike.%${search}%`);
      if (filter === "banned") q = q.eq("banned", true);
      if (filter === "verified") q = q.eq("verified", true);
      if (filter === "active") q = q.eq("banned", false);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["adm-user-roles", users.map(u => u.user_id)],
    queryFn: async () => {
      if (!users.length) return [];
      const { data } = await supabase.from("user_roles").select("*").in("user_id", users.map(u => u.user_id));
      return data || [];
    },
    enabled: users.length > 0,
  });

  const log = (action: string, target_id: string) =>
    user && supabase.from("admin_logs").insert({ admin_id: user.id, action, target_type: "user", target_id });

  const setField = async (uid: string, field: "banned" | "verified", value: boolean, label: string) => {
    await supabase.from("profiles").update({ [field]: value }).eq("user_id", uid);
    await log(`user_${field}_${value}`, uid);
    toast({ title: label });
    qc.invalidateQueries({ queryKey: ["adm-users"] });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or @username..."
          className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none" />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["all","active","verified","banned"] as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${filter===f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            {f}
          </button>
        ))}
      </div>

      {isLoading ? <Spinner /> : (
        <div className="space-y-2">
          {users.map((u: any) => {
            const r = roles.find((x: any) => x.user_id === u.user_id);
            return (
              <div key={u.id} className={`rounded-xl border border-border bg-card p-3 ${u.banned ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-3">
                  <img src={u.avatar_url || "https://i.pravatar.cc/150"} alt="" className="h-10 w-10 rounded-full object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold truncate">{u.display_name || "User"}</span>
                      {u.verified && <BadgeCheck className="h-4 w-4 text-blue-500" />}
                      {r && <Pill tone="ok">{r.role}</Pill>}
                      {u.banned && <Pill tone="bad">banned</Pill>}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">@{u.username || "—"} · {u.posts_count} posts · {u.followers_count} followers</p>
                    <p className="text-[10px] text-muted-foreground">joined {new Date(u.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Btn variant="secondary" onClick={() => setField(u.user_id, "verified", !u.verified, u.verified ? "Verification removed" : "Verified ✅")}>
                    <BadgeCheck className="h-3.5 w-3.5" />{u.verified ? "Unverify" : "Verify"}
                  </Btn>
                  <Btn variant={u.banned ? "secondary" : "danger"} onClick={() => setField(u.user_id, "banned", !u.banned, u.banned ? "Unblocked" : "Blocked")}>
                    <UserX className="h-3.5 w-3.5" />{u.banned ? "Unblock" : "Block"}
                  </Btn>
                </div>
              </div>
            );
          })}
          {users.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">No users found.</p>}
        </div>
      )}
    </div>
  );
}
