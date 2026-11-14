import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PMForge",
    short_name: "PMForge",
    description: "Build proof, not notes.",
    start_url: "/app",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
