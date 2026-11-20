import { describe, expect, it } from "vitest";
import { checkoutUrl, pixelId, readPublicConfig } from "./public-config-server";

describe("public runtime config", () => {
  it("accepts only https SuperProfile checkout links", () => {
    expect(checkoutUrl("https://superprofile.bio/vp/pmforge-monthly")).toBe("https://superprofile.bio/vp/pmforge-monthly");
    expect(checkoutUrl("http://superprofile.bio/vp/x")).toBeNull();
    expect(checkoutUrl("https://superprofile.bio.evil.example/vp/x")).toBeNull();
    expect(checkoutUrl("javascript:alert(1)")).toBeNull();
    expect(checkoutUrl("")).toBeNull();
  });

  it("accepts only a numeric pixel id", () => {
    expect(pixelId("958344247157036")).toBe("958344247157036");
    expect(pixelId("958344<script>")).toBeNull();
    expect(pixelId(undefined)).toBeNull();
  });

  it("reads everything from the environment at runtime", () => {
    expect(readPublicConfig({ META_PIXEL_ID: "958344247157036", SUPERPROFILE_YEARLY_URL: "https://superprofile.bio/vp/y" }))
      .toEqual({ metaPixelId: "958344247157036", monthlyUrl: null, yearlyUrl: "https://superprofile.bio/vp/y" });
  });
});
