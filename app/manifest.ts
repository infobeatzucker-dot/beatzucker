import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Beatzucker – Adaptive Audio Mastering",
    short_name: "Beatzucker",
    description:
      "Professional adaptive audio mastering in seconds. Upload your track and get a release-ready master.",
    start_url: "/",
    display: "standalone",
    background_color: "#080a0f",
    theme_color: "#8b5cf6",
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
