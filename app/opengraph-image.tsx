import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/config";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0EA5E9",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 132,
            height: 132,
            borderRadius: 28,
            backgroundColor: "#ffffff",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 56,
              height: 72,
              border: "10px solid #0EA5E9",
              borderTop: "none",
              borderRadius: "0 0 26px 26px",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 60,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: -1,
          }}
        >
          TORENJ LAB
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 16,
            fontSize: 28,
            color: "rgba(255,255,255,0.88)",
          }}
        >
          {siteConfig.url.replace("https://", "")}
        </div>
      </div>
    ),
    { ...size },
  );
}
