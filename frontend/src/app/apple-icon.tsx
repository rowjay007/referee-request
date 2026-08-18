import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1d4ed8 0%, #06b6d4 100%)",
          color: "white",
          fontSize: 88,
          fontWeight: 800,
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        RR
      </div>
    ),
    size,
  );
}
