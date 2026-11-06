import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Mail, Lock, User, Loader2, Sparkles } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);

    try {
      if (isLogin) {
        await signInWithEmail(email.trim(), password);
        toast({ title: "Welcome back! 🌙", description: "Signed in successfully." });
        navigate("/", { replace: true });
      } else {
        await signUpWithEmail(email.trim(), password, {
          username: username.trim(),
          displayName: displayName.trim(),
        });
        toast({
          title: "Account created! ✨",
          description: "Let's complete your onboarding profile.",
        });
        navigate("/", { replace: true });
      }
    } catch (error: any) {
      console.error("[Auth error]", error);
      let msg = error?.message || "Authentication failed. Please check your details.";
      if (error?.code === "auth/invalid-credential" || error?.code === "auth/wrong-password") {
        msg = "Invalid email or password.";
      } else if (error?.code === "auth/email-already-in-use") {
        msg = "An account with this email already exists. Try signing in.";
      } else if (error?.code === "auth/weak-password") {
        msg = "Password should be at least 6 characters.";
      }
      toast({
        title: "Sign in error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    try {
      await signInWithGoogle();
      toast({ title: "Signed in with Google! 🌟" });
      navigate("/", { replace: true });
    } catch (error: any) {
      console.error("[Google Auth Error]", error);
      if (error?.code !== "auth/popup-closed-by-user") {
        toast({
          title: "Google sign-in error",
          description: error?.message || "Failed to sign in with Google.",
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm space-y-7">
        {/* Logo / Header */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-emerald-brand shadow-glow">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            <span className="text-emerald-brand">Muslim</span>{" "}
            <span className="text-gold">Community</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isLogin ? "Welcome back to your digital ummah" : "Join the global Muslim network"}
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-secondary/60 p-1 border border-border">
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
              isLogin ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
              !isLogin ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* One-Click Google Sign-In */}
        <div>
          <button
            type="button"
            onClick={handleGoogle}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground transition-all hover:bg-secondary hover:border-primary/40 active:scale-[0.99] disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground">or email</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {!isLogin && (
            <>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Username (@handle)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  className="bg-card pl-10 border-border focus:border-primary text-sm"
                  required
                />
              </div>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Display Name (Full name)"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-card pl-10 border-border focus:border-primary text-sm"
                  required
                />
              </div>
            </>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-card pl-10 border-border focus:border-primary text-sm"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password (min 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-card pl-10 pr-10 border-border focus:border-primary text-sm"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full gradient-primary text-primary-foreground font-semibold h-11 shadow-glow mt-1"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isLogin ? (
              "Sign In to Muslim Community"
            ) : (
              "Create My Account"
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          {isLogin ? "New to Muslim Community?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-emerald-brand font-medium hover:underline ml-1"
          >
            {isLogin ? "Sign up with email" : "Sign in instead"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
