const sizes = {
  sm: "h-3.5 w-3.5",
  md: "h-4.5 w-4.5",
  lg: "h-5 w-5",
};

const VerifiedBadge = ({ size = "sm" }: { size?: "sm" | "md" | "lg" }) => (
  <svg className={`${sizes[size]} text-blue-500 flex-shrink-0`} viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="11" r="11" fill="currentColor" />
    <path d="M7 11.5L9.5 14L15 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default VerifiedBadge;
