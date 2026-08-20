export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startStorageCleanup } = await import("@/lib/storage");
    startStorageCleanup();
    const { recoverInterruptedMasters } = await import("@/lib/masterRecovery");
    recoverInterruptedMasters()
      .then((count) => {
        if (count > 0) console.warn(`[startup] Recovered ${count} interrupted mastering job(s)`);
      })
      .catch((error) => console.error("[startup] Mastering recovery failed:", error));
  }

  // Validate required environment variables at startup
  const required = [
    "DATABASE_URL",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`[startup] Missing required env vars: ${missing.join(", ")}`);
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
    if (process.env.NODE_ENV === "production") {
      throw new Error("[startup] Refusing to start with the default NEXTAUTH_SECRET");
    }
  }

  const pythonSecret = process.env.PYTHON_SERVICE_SECRET ?? "";
  const isProductionRuntime = process.env.NODE_ENV === "production"
    && process.env.NEXT_PHASE !== "phase-production-build";
  if (isProductionRuntime && pythonSecret.length < 32) {
    throw new Error("[startup] PYTHON_SERVICE_SECRET must contain at least 32 characters in production");
  }
  if (!isProductionRuntime && pythonSecret && pythonSecret.length < 32) {
    console.warn("[startup] PYTHON_SERVICE_SECRET should contain at least 32 characters");
  }
}
