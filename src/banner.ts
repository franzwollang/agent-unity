import type { LoadedPoliciesConfig } from "./config.js";
import type { BannerStyle } from "./schema.js";

export function buildBannerText(config: LoadedPoliciesConfig): string {
  return `${config.banners.generated} Source: ${config.banners.policySource}`;
}

export function formatBanner(style: BannerStyle, text: string): string {
  if (style === "html-comment-top" || style === "html-comment-after-frontmatter") {
    return `<!-- ${text} -->`;
  }

  return text;
}
