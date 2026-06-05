export function getUserFriendlyError(err: unknown): string {
  const raw = (err as any)?.message?.toString?.() || String(err || "");
  const lower = raw.toLowerCase();
  if (lower.includes("duplicate key") || lower.includes("unique constraint")) {
    return "That value is already taken. Please try a different one.";
  }
  if (lower.includes("row-level security") || lower.includes("permission denied")) {
    return "You don't have permission to do that.";
  }
  if (lower.includes("violates not-null") || lower.includes("null value")) {
    return "Some required fields are missing.";
  }
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return "Invalid email or password.";
  }
  if (lower.includes("email not confirmed")) {
    return "Please verify your email before signing in.";
  }
  if (lower.includes("rate limit")) {
    return "Too many attempts. Please try again in a moment.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "Network error. Check your connection and try again.";
  }
  return "Something went wrong. Please try again.";
}