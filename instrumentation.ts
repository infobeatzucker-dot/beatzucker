export async function register() {
  // Validate required environment variables at startup
  const required = [
    "DATABASE_URL",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`[startup] Missing required env vars: ${missing.join(", ")}`);
    process.exit(1);
  }

  // Warn about optional but recommended vars
  const recommended = [
    "RESEND_API_KEY",
    "ADMIN_EMAIL",
  ];

  const missingRecommended = recommended.filter((key) => !process.env[key]);
  if (missingRecommended.length > 0) {
    console.warn(`[startup] Missing recommended env vars: ${missingRecommended.join(", ")}`);
  }

  if (process.env.NEXTAUTH_SECRET === "change-this-to-a-random-secret-in-production") {
    console.error("[startup] NEXTAUTH_SECRET is using the default placeholder — change it!");
    if (process.env.NODE_ENV === "production") process.exit(1);
  }
}
