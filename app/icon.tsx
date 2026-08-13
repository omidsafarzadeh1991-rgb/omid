import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0EA5E9",
          borderRadius: 7,
        }}
      >
        <div
          style={{
            width: 13,
            height: 17,
            border: "2.5px solid #ffffff",
            borderTop: "none",
            borderRadius: "0 0 6px 6px",
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
