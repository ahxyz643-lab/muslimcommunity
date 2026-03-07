import { ArrowLeft, User, Shield, Bell, Moon, HelpCircle, LogOut, ChevronRight, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const sections = [
    {
      title: "Account",
      items: [
        { icon: User, label: "Edit Profile", action: () => navigate("/edit-profile") },
        { icon: Activity, label: "Account Activity", action: () => navigate("/activity") },
        { icon: Shield, label: "Privacy & Security", action: () => {} },
        { icon: Bell, label: "Notifications", action: () => {} },
      ],
    },
    {
      title: "Preferences",
      items: [
        { icon: Moon, label: "Appearance", action: () => {} },
        { icon: HelpCircle, label: "Help & Support", action: () => {} },
      ],
    },
  ];

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
        <div className="mb-6 flex items-center gap-3 rounded-xl bg-card p-4 border border-border">
          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{user?.email}</p>
            <p className="text-xs text-muted-foreground">Manage your account</p>
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
          onClick={signOut}
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
