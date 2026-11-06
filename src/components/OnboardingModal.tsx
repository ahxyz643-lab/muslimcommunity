import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, Sparkles, User, MapPin, Compass, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&auto=format&fit=crop&q=80",
];

const INTEREST_OPTIONS = [
  { id: "quran_hadith", label: "📖 Quran & Hadith" },
  { id: "reminders", label: "🌙 Daily Reminders" },
  { id: "halal_tech", label: "💻 Halal Tech & Career" },
  { id: "charity", label: "🤲 Charity & Waqf" },
  { id: "halal_lifestyle", label: "🥗 Halal Lifestyle & Food" },
  { id: "family", label: "👨‍👩‍👧 Family & Marriage" },
  { id: "arabic", label: "✒️ Arabic Learning" },
  { id: "youth", label: "🤝 Youth & Students" },
];

export const OnboardingModal = () => {
  const { user, profile, completeOnboarding } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState(profile?.display_name || user?.displayName || "");
  const [username, setUsername] = useState(
    profile?.username || user?.email?.split("@")[0] || ""
  );
  const [avatarUrl, setAvatarUrl] = useState(
    profile?.avatar_url || user?.photoURL || AVATAR_PRESETS[0]
  );
  const [bio, setBio] = useState(profile?.bio || "");
  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    profile?.interests || ["reminders", "quran_hadith"]
  );
  const [city, setCity] = useState(profile?.city || "");
  const [country, setCountry] = useState(profile?.country || "");

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleFinish = async () => {
    if (!username.trim()) {
      toast({ title: "Username required", description: "Please enter a username.", variant: "destructive" });
      setStep(1);
      return;
    }
    setSaving(true);
    try {
      await completeOnboarding({
        display_name: displayName.trim() || username.trim(),
        username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, ""),
        avatar_url: avatarUrl,
        bio: bio.trim(),
        interests: selectedInterests,
        city: city.trim(),
        country: country.trim(),
      });
      toast({
        title: "Welcome to the Ummah! ✨",
        description: "Your profile has been created successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Setup failed",
        description: err.message || "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl transition-all">
        {/* Header Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span className="font-semibold text-emerald-brand uppercase tracking-wider">
              Profile Onboarding
            </span>
            <span>Step {step} of 3</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Basics */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <User className="h-6 w-6" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">
                Set up your profile
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Choose how community members will recognize you
              </p>
            </div>

            {/* Avatar picker */}
            <div>
              <label className="text-xs font-medium text-foreground block mb-2">
                Choose Avatar
              </label>
              <div className="flex items-center gap-3 justify-center mb-3">
                <img
                  src={avatarUrl}
                  alt="Selected avatar"
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-primary ring-offset-2 ring-offset-background"
                />
              </div>
              <div className="flex justify-center gap-2">
                {AVATAR_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatarUrl(p)}
                    className={`h-9 w-9 rounded-full overflow-hidden border-2 transition-transform ${
                      avatarUrl === p ? "border-primary scale-110" : "border-border opacity-70"
                    }`}
                  >
                    <img src={p} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Display Name
              </label>
              <Input
                placeholder="e.g. Zaid Khan"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-secondary/40"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Username (@handle)
              </label>
              <Input
                placeholder="e.g. zaid_k"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                className="bg-secondary/40"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Bio / Status
              </label>
              <Textarea
                placeholder="Tell the ummah about yourself, your studies or goals..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                className="bg-secondary/40 resize-none text-sm"
              />
            </div>

            <Button
              onClick={() => {
                if (!username.trim()) {
                  toast({ title: "Please enter a username", variant: "destructive" });
                  return;
                }
                setStep(2);
              }}
              className="w-full gradient-primary text-primary-foreground font-semibold mt-2"
            >
              Next: Interests <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Step 2: Interests */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Compass className="h-6 w-6" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">
                Your Interests
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Customize your feed and connect with like-minded Muslims
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 py-2">
              {INTEREST_OPTIONS.map((item) => {
                const active = selectedInterests.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleInterest(item.id)}
                    className={`flex items-center justify-between rounded-xl border p-3 text-xs font-medium text-left transition-all ${
                      active
                        ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm"
                        : "border-border bg-secondary/30 text-foreground hover:bg-secondary"
                    }`}
                  >
                    <span>{item.label}</span>
                    {active && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1"
              >
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                className="flex-1 gradient-primary text-primary-foreground font-semibold"
              >
                Next: Location <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Location & Finish */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MapPin className="h-6 w-6" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">
                Where are you based?
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Helps discover local halal events, jobs, and community announcements
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Country
              </label>
              <Input
                placeholder="e.g. United Kingdom, Malaysia, US..."
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="bg-secondary/40"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                City / Region
              </label>
              <Input
                placeholder="e.g. London, Kuala Lumpur, Toronto..."
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="bg-secondary/40"
              />
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-brand shrink-0" />
              <span>You can always update these details anytime in your Profile Settings.</span>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                disabled={saving}
                className="flex-1"
              >
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button
                onClick={handleFinish}
                disabled={saving}
                className="flex-1 gradient-primary text-primary-foreground font-semibold shadow-glow"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Complete Setup"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
