import type { MetadataRoute } from "next";

const baseUrl = "https://app.villiersdorpskou.co.za";
const lastModified = new Date("2026-09-03T00:00:00+02:00");

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: "/", priority: 1 },
    { path: "/kaartjies", priority: 0.8 },
    { path: "/pos", priority: 0.7 },
    { path: "/kroeg", priority: 0.7 },
    { path: "/perde", priority: 0.6 },
    { path: "/horses", priority: 0.5 },
    { path: "/terreinbesprekings", priority: 0.6 },
    { path: "/verhurings", priority: 0.6 },
    { path: "/status", priority: 0.4 },
  ];

  return routes.map(({ path, priority }) => ({
    url: `${baseUrl}${path}`,
    lastModified,
    changeFrequency: "weekly",
    priority,
  }));
}
