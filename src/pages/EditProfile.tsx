import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const EditProfile = () => {
  const navigate = useNavigate();
  const { user, profile, updateProfile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [form, setForm] = useState({ display_name: "", username: "", bio: "" });
  const [initialized, setInitialized] = useState(false);

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
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const avatarUrl = avatarPreview || profile?.avatar_url || user.photoURL;

      await updateProfile({
        display_name: form.display_name.trim(),
        username: form.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, ""),
        bio: form.bio.trim(),
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      });

      await refreshProfile();
      toast({ title: "Profile updated! ✨" });
      navigate("/profile");
    } catch (err: any) {
      console.error("[EditProfile]", err);
      toast({
        title: "Error",
        description: err.message || "Failed to save profile changes.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-base font-semibold text-foreground">Edit Profile</h1>
        <Button onClick={handleSave} disabled={saving} size="sm" className="gradient-primary text-primary-foreground font-semibold">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
      </div>

      <div className="px-4 pt-6">
        <div className="flex justify-center">
          <div className="relative">
            <img
              src={avatarPreview || profile?.avatar_url || user?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"}
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
            <Input
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              className="bg-card border-border"
              placeholder="Your display name"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Username</label>
            <Input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
              className="bg-card border-border"
              placeholder="username"
            />
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
