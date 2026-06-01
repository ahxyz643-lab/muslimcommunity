import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AdminRole = "admin" | "moderator" | "support" | null;

export const useAdminRole = () => {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["admin-role", user?.id],
    queryFn: async (): Promise<AdminRole> => {
      if (!user) return null;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const roles = (data || []).map((r: any) => r.role as string);
      if (roles.includes("admin")) return "admin";
      if (roles.includes("moderator")) return "moderator";
      if (roles.includes("support")) return "support";
      return null;
    },
    enabled: !!user,
  });
  const role = q.data ?? null;
  return {
    role,
    loading: q.isLoading,
    isAdmin: role === "admin",
    isModerator: role === "moderator" || role === "admin",
    isSupport: role === "support" || role === "admin",
    hasAccess: role !== null,
  };
};
