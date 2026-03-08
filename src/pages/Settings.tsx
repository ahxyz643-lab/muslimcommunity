import { ArrowLeft, User, Shield, Bell, Moon, Sun, Monitor, HelpCircle, LogOut, ChevronRight, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const themeOptions: { value: "dark" | "light" | "system"; icon: typeof Moon; label: string }[] = [
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "light", icon: Sun, label: "Light" },
    { value: "system", icon: Monitor, label: "Auto" },
  ];

  const sections = [
    {
      title: "Account",
      items: [
        { icon: User, label: "Edit Profile", action: () => navigate("/edit-profile") },
        { icon: Activity, label: "Account Activity", action: () => navigate("/activity") },
        { icon: Shield, label: "Privacy & Security", action: () => {} },
        { icon: Bell, label: "Notifications", action: () => navigate("/activity") },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: HelpCircle, label: "Help & Support", action: () => {} },
      ],
    },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/welcome");
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-base font-semibold text-foreground">Settings</h1>
      </div>

      <div className="px-4 py-4">
        {/* User info */}
        <button onClick={() => navigate("/edit-profile")} className="mb-6 flex w-full items-center gap-3 rounded-xl bg-card p-4 border border-border text-left">
          <img
            src={profile?.avatar_url || "https://i.pravatar.cc/150"}
            alt=""
            className="h-12 w-12 rounded-full object-cover ring-2 ring-primary"
          />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{profile?.display_name || user?.email}</p>
            <p className="text-xs text-muted-foreground">@{profile?.username || "user"}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Theme Switcher */}
        <div className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Appearance</h2>
          <div className="flex gap-2 rounded-xl border border-border bg-card p-2">
            {themeOptions.map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex flex-1 flex-col items-center gap-1.5 rounded-lg py-3 text-xs font-medium transition-all ${
                  theme === value
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {sections.map((section) => (
          <div key={section.title} className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{section.title}</h2>
            <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
              {section.items.map(({ icon: Icon, label, action }) => (
                <button key={label} onClick={action} className="flex w-full items-center gap-3 px-4 py-3.5 text-sm text-foreground hover:bg-secondary transition-colors">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="flex-1 text-left">{label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/20"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Settings;
