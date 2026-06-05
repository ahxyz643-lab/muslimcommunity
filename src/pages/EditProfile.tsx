import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const EditProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [form, setForm] = useState({ display_name: "", username: "", bio: "" });
  const [initialized, setInitialized] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile && !initialized) {
      setForm({
        display_name: profile.display_name || "",
        username: profile.username || "",
        bio: profile.bio || "",
      });
      setInitialized(true);
    }
  }, [profile, initialized]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!user || !profile) return;
    setSaving(true);

    try {
      let avatarUrl = profile.avatar_url;

      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `avatars/${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("media").upload(path, avatarFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("profiles").update({
        display_name: form.display_name.trim(),
        username: form.username.trim(),
        bio: form.bio.trim(),
        avatar_url: avatarUrl,
      }).eq("user_id", user.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Profile updated! ✨" });
      navigate("/profile");
    } catch (err: any) {
      console.error("[EditProfile]", err);
      toast({ title: "Error", description: (await import("@/lib/errors")).getUserFriendlyError(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-base font-semibold text-foreground">Edit Profile</h1>
        <Button onClick={handleSave} disabled={saving} size="sm" className="gradient-primary text-primary-foreground">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
      </div>

      <div className="px-4 pt-6">
        <div className="flex justify-center">
          <div className="relative">
            <img
              src={avatarPreview || profile?.avatar_url || "https://i.pravatar.cc/150"}
              alt="Avatar"
              className="h-24 w-24 rounded-full object-cover ring-2 ring-primary"
            />
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
          </div>
        </div>

        <div className="mt-8 space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Display Name</label>
            <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} className="bg-card border-border" placeholder="Your display name" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Username</label>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} className="bg-card border-border" placeholder="username" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="w-full min-h-[100px] resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Tell us about yourself..."
              maxLength={200}
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">{form.bio.length}/200</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
