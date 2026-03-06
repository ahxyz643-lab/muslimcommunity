import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const StoriesBar = () => {
  const { user } = useAuth();

  const { data: profiles = [] } = useQuery({
    queryKey: ["stories-profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .limit(8);
      return data || [];
    },
  });

  // Put current user first
  const currentProfile = profiles.find((p) => p.user_id === user?.id);
  const otherProfiles = profiles.filter((p) => p.user_id !== user?.id);

  return (
    <div className="flex gap-3 overflow-x-auto px-4 py-3 scrollbar-hide">
      {/* Current user story */}
      {currentProfile && (
        <button className="flex flex-col items-center gap-1">
          <div className="relative h-16 w-16 flex-shrink-0 rounded-full bg-gradient-to-tr from-primary to-accent p-[2px]">
            <img
              src={currentProfile.avatar_url || "https://i.pravatar.cc/150"}
              alt="Your story"
              className="h-full w-full rounded-full border-2 border-card object-cover"
            />
            <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
              <span className="text-xs text-primary-foreground font-bold">+</span>
            </div>
          </div>
          <span className="w-16 truncate text-center text-[11px] text-muted-foreground">Your Story</span>
        </button>
      )}
      {otherProfiles.map((p) => (
        <button key={p.user_id} className="flex flex-col items-center gap-1">
          <div className="h-16 w-16 flex-shrink-0 rounded-full bg-gradient-to-tr from-primary to-accent p-[2px]">
            <img
              src={p.avatar_url || "https://i.pravatar.cc/150"}
              alt={p.display_name || ""}
              className="h-full w-full rounded-full border-2 border-card object-cover"
            />
          </div>
          <span className="w-16 truncate text-center text-[11px] text-muted-foreground">
            {p.username?.split("_")[0] || "user"}
          </span>
        </button>
      ))}
    </div>
  );
};

export default StoriesBar;
