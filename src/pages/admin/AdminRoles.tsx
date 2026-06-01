import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield, UserCog, Trash2, Plus, Search } from "lucide-react";
import { Btn, Section, Spinner, Pill } from "@/components/admin/ui";
import { useToast } from "@/hooks/use-toast";

const ROLES = ["admin","moderator","support"] as const;
const PERMS: Record<string,string[]> = {
  admin: ["Full access","Manage roles","Delete content","Edit settings","Monetization"],
  moderator: ["Review reports","Hide/delete posts","Moderate chats","Verify users"],
  support: ["Tickets","Reply to users","View reports"],
};

export default function AdminRoles() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["adm-all-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("*");
      return data || [];
    },
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ["adm-role-profiles", roles.map((r:any)=>r.user_id)],
    queryFn: async () => {
      if (!roles.length) return [];
      const { data } = await supabase.from("profiles").select("user_id, username, display_name, avatar_url").in("user_id", roles.map((r:any)=>r.user_id));
      return data || [];
    },
    enabled: roles.length>0,
  });
  const { data: search_results = [] } = useQuery({
    queryKey: ["adm-role-search", search],
    queryFn: async () => {
      if (!search) return [];
      const { data } = await supabase.from("profiles").select("user_id, username, display_name, avatar_url").or(`username.ilike.%${search}%,display_name.ilike.%${search}%`).limit(10);
      return data || [];
    },
    enabled: search.length > 1,
  });

  const grant = async (uid: string, role: typeof ROLES[number]) => {
    await supabase.from("user_roles").insert({ user_id: uid, role });
    toast({ title: `Granted ${role}` });
    qc.invalidateQueries({ queryKey: ["adm-all-roles"] });
  };
  const revoke = async (id: string) => {
    await supabase.from("user_roles").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["adm-all-roles"] });
  };

  return (
    <div className="space-y-4">
      <Section title="Roles & Permissions">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {ROLES.map(r => (
            <div key={r} className="rounded-xl bg-secondary p-3">
              <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary"/><span className="text-sm font-bold capitalize">{r}</span></div>
              <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                {PERMS[r].map(p => <li key={p}>• {p}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Grant role">
        <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search user..." className="w-full bg-transparent text-sm focus:outline-none" />
        </div>
        <ul className="mt-2 space-y-1">
          {search_results.map((u: any) => (
            <li key={u.user_id} className="flex items-center gap-2 rounded-lg p-2">
              <img src={u.avatar_url || "https://i.pravatar.cc/150"} className="h-8 w-8 rounded-full"/>
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{u.display_name}</p><p className="text-[10px] text-muted-foreground">@{u.username}</p></div>
              {ROLES.map(r => <Btn key={r} onClick={()=>grant(u.user_id, r)}><Plus className="h-3 w-3"/>{r}</Btn>)}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Current role assignments">
        {isLoading ? <Spinner /> : (
          <ul className="divide-y divide-border">
            {roles.map((r: any) => {
              const p = profiles.find((x: any) => x.user_id === r.user_id);
              return (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <img src={p?.avatar_url || "https://i.pravatar.cc/150"} className="h-8 w-8 rounded-full"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{p?.display_name || r.user_id.slice(0,8)}</p>
                    <p className="text-[10px] text-muted-foreground">@{p?.username || "—"}</p>
                  </div>
                  <Pill tone="ok"><UserCog className="mr-1 h-3 w-3 inline"/>{r.role}</Pill>
                  <Btn variant="danger" onClick={()=>revoke(r.id)}><Trash2 className="h-3 w-3"/></Btn>
                </li>
              );
            })}
            {!roles.length && <p className="py-6 text-center text-xs text-muted-foreground">No roles assigned.</p>}
          </ul>
        )}
      </Section>
    </div>
  );
}
