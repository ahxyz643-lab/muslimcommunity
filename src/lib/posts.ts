import { supabase } from "@/integrations/supabase/client";
import type { PostWithProfile } from "@/components/PostCard";

export async function fetchPostsWithProfiles(
  queryBuilder: any
): Promise<PostWithProfile[]> {
  const { data } = await queryBuilder;
  if (!data || data.length === 0) return [];

  const userIds = [...new Set(data.map((p: any) => p.user_id))] as string[];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, username, display_name, avatar_url, verified")
    .in("user_id", userIds);

  const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

  return data.map((post: any) => ({
    ...post,
    profiles: profileMap.get(post.user_id) || null,
  }));
}
