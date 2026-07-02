import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, MessageCircle, Shield, Star, Video, BookOpen, ChevronRight, ChevronLeft } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Join the Ummah",
    description: "Connect with Muslims worldwide. Share knowledge, support each other, and grow together as a community.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: MessageCircle,
    title: "Real-time Chat",
    description: "Send messages, share ideas, and have meaningful conversations with fellow community members.",
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    icon: Video,
    title: "Share Content",
    description: "Post photos, videos, and text. Share Islamic reminders, educational content, and daily inspiration.",
    color: "text-emerald-brand",
    bg: "bg-primary/10",
  },
  {
    icon: Shield,
    title: "Safe & Halal Space",
    description: "A moderated, respectful environment built on Islamic values. Earn your verified blue tick badge.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Star,
    title: "Creator Studio",
    description: "Track your engagement, grow your audience, and become a trusted voice in the community.",
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    icon: BookOpen,
    title: "Learn & Grow",
    description: "Access Islamic content, follow scholars, and participate in discussions about Quran and Hadith.",
    color: "text-emerald-brand",
    bg: "bg-primary/10",
  },
];

const Welcome = () => {
  const navigate = useNavigate();
  const [currentCard, setCurrentCard] = useState(0);

  const nextCard = () => {
    if (currentCard < features.length - 1) {
      setCurrentCard(currentCard + 1);
    } else {
      navigate("/auth");
    }
  };

  const prevCard = () => {
    if (currentCard > 0) setCurrentCard(currentCard - 1);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-between px-6 py-10">
      {/* Logo */}
      <div className="text-center">
        <h1 className="font-display text-4xl font-bold">
          <span className="text-emerald-brand">Muslim</span>
          <span className="text-gold">Community</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Your digital ummah awaits</p>
      </div>

      {/* Feature Card */}
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-glow animate-scale-in" key={currentCard}>
          <div className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${features[currentCard].bg}`}>
            {(() => {
              const Icon = features[currentCard].icon;
              return <Icon className={`h-8 w-8 ${features[currentCard].color}`} />;
            })()}
          </div>
          <h2 className="font-display text-center text-xl font-bold text-foreground">
            {features[currentCard].title}
          </h2>
          <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
            {features[currentCard].description}
          </p>
        </div>

        {/* Dots */}
        <div className="mt-6 flex items-center justify-center gap-2">
          {features.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentCard(i)}
              className={`h-2 rounded-full transition-all ${
                i === currentCard ? "w-6 bg-primary" : "w-2 bg-border"
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="mt-8 flex items-center gap-3">
          {currentCard > 0 && (
            <button
              onClick={prevCard}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={nextCard}
            className="flex-1 gradient-primary h-12 rounded-xl text-sm font-semibold text-primary-foreground shadow-glow flex items-center justify-center gap-2"
          >
            {currentCard === features.length - 1 ? "Join Community" : "Next"}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <button
          onClick={() => navigate("/auth")}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip — I already have an account
        </button>
        <button
          onClick={() => navigate("/")}
          className="mt-2 w-full text-center text-xs text-muted-foreground/70 hover:text-foreground transition-colors underline-offset-4 hover:underline"
        >
          Continue as guest
        </button>
      </div>

      {/* Footer */}
      <p className="text-xs text-muted-foreground/50">Built with ❤️ for the Ummah</p>
    </div>
  );
};

export default Welcome;
