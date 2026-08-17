import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Beatzucker – AI Audio Mastering",
    short_name: "Beatzucker",
    description:
      "Professional AI-powered audio mastering in seconds. Upload your track and get a studio-quality master.",
    start_url: "/",
    display: "standalone",
    background_color: "#080a0f",
    theme_color: "#7c6fff",
    orientation: "portrait-primary",
    categories: ["music", "productivity", "utilities"],
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
