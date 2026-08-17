import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Beatzucker – AI-Powered Professional Audio Mastering";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#080a0f",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          padding: "60px",
        }}
      >
        {/* Grid pattern overlay */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(124,111,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,111,255,0.04) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Glow blob */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            width: 600,
            height: 300,
            background:
              "radial-gradient(ellipse, rgba(124,111,255,0.18) 0%, transparent 70%)",
            top: 80,
            left: "50%",
          }}
        />

        {/* Logo wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 32,
          }}
        >
          {/* Waveform icon */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {[20, 36, 28, 44, 32, 48, 36, 28, 22].map((h, i) => (
              <div
                key={i}
                style={{
                  width: 5,
                  height: h,
                  borderRadius: 3,
                  background:
                    i % 3 === 0
                      ? "#7c6fff"
                      : i % 3 === 1
                      ? "#00e5c4"
                      : "#f5c842",
                  opacity: 0.85,
                }}
              />
            ))}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 72,
              fontWeight: 800,
              color: "#e8eaf2",
              letterSpacing: "-2px",
            }}
          >
            <span>Beat</span>
            <span style={{ color: "#7c6fff" }}>zucker</span>
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            display: "flex",
            fontSize: 30,
            color: "#8890aa",
            textAlign: "center",
            maxWidth: 800,
            lineHeight: 1.4,
            marginBottom: 40,
          }}
        >
          AI-Powered Professional Audio Mastering
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: 12 }}>
          {["13-Stage DSP", "7 Formats", "11 Platforms", "AI Parameter Selection"].map(
            (label) => (
              <div
                key={label}
                style={{
                  padding: "8px 18px",
                  borderRadius: 999,
                  background: "rgba(124,111,255,0.12)",
                  border: "1px solid rgba(124,111,255,0.3)",
                  color: "#7c6fff",
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                {label}
              </div>
            )
          )}
        </div>

        {/* URL */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: 48,
            fontSize: 18,
            color: "#454d68",
            letterSpacing: "0.05em",
          }}
        >
          beatzucker.de
        </div>
      </div>
    ),
    { ...size }
  );
}
