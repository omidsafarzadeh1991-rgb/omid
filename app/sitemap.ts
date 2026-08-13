import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config";

const routes = ["", "/services", "/about", "/team", "/appointment", "/contact"];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((path) => ({
    url: `${siteConfig.url}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
