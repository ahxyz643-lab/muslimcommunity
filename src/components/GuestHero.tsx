import { useNavigate } from "react-router-dom";

const GuestHero = ({ onContinueGuest }: { onContinueGuest?: () => void }) => {
  const navigate = useNavigate();

  return (
    <section className="px-3 pt-3 pb-4">
      <div
        className="relative w-full overflow-hidden rounded-[32px] border border-white/10 shadow-2xl animate-fade-in"
        style={{ backgroundColor: "#064e3b" }}
      >
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full opacity-40 blur-[80px]"
          style={{ backgroundColor: "#c9a84c" }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full opacity-30 blur-[80px]"
          style={{ backgroundColor: "#0d7a5f" }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center px-6 pt-9 pb-8 text-center">
          {/* Arabic eyebrow */}
          <div className="mb-4 rounded-full border border-white/10 bg-white/5 px-4 py-1 backdrop-blur-xl">
            <p
              dir="rtl"
              className="font-body text-[13px] tracking-wide"
              style={{ color: "#c9a84c" }}
            >
              بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
            </p>
          </div>

          {/* Headline */}
          <h1
            className="mb-3 font-serif text-[44px] leading-[1.05] tracking-tight"
            style={{ color: "#f5f0e0" }}
          >
            Your digital <span className="italic">ummah</span>
          </h1>

          {/* Subhead */}
          <p
            className="mb-8 max-w-[280px] font-body text-[15px] leading-relaxed"
            style={{ color: "rgba(245,240,224,0.72)" }}
          >
            Connect with the community, explore reels, and support causes worldwide.
          </p>

          {/* CTAs */}
          <div className="mb-8 w-full space-y-3">
            <button
              onClick={() => navigate("/auth")}
              className="w-full rounded-2xl py-4 font-body text-sm font-semibold transition-transform active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #c9a84c 0%, #e0c278 100%)",
                color: "#064e3b",
                boxShadow: "0 12px 30px -8px rgba(201,168,76,0.45)",
              }}
            >
              Join the community
            </button>
            <button
              onClick={onContinueGuest}
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 font-body text-sm font-medium backdrop-blur-2xl transition-colors hover:bg-white/10 active:scale-[0.98]"
              style={{ color: "#f5f0e0" }}
            >
              Continue as guest
            </button>
          </div>

          {/* Trust row */}
          <div className="flex flex-wrap justify-center gap-2">
            {["Halal space", "Verified voices", "Real-time ummah"].map((label) => (
              <div
                key={label}
                className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/5 px-3 py-1.5 backdrop-blur-3xl"
              >
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#34d399" }} />
                <span
                  className="font-body text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "rgba(245,240,224,0.65)" }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom hairline highlight */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>
    </section>
  );
};

export default GuestHero;