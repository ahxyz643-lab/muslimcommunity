import { useState, useEffect } from "react";

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 2200);
    const done = setTimeout(onFinish, 2800);
    return () => { clearTimeout(timer); clearTimeout(done); };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${fadeOut ? "opacity-0" : "opacity-100"}`}
    >
      {/* Rotating Logo */}
      <div className="relative flex h-28 w-28 items-center justify-center">
        {/* Outer rotating ring - weather-like animation */}
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary border-r-accent" style={{ animationDuration: "2.5s" }} />
        <div className="absolute inset-2 animate-spin rounded-full border-4 border-transparent border-b-primary border-l-accent" style={{ animationDuration: "3.5s", animationDirection: "reverse" }} />

        {/* Inner glowing logo */}
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full gradient-primary shadow-glow">
          <span className="font-display text-2xl font-bold text-primary-foreground">MC</span>
        </div>
      </div>

      <h1 className="mt-6 font-display text-2xl font-bold">
        <span className="text-emerald-brand">Muslim</span>
        <span className="text-gold">Community</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground animate-pulse">Connecting the Ummah</p>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute h-2 w-2 rounded-full bg-primary/20"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default SplashScreen;
