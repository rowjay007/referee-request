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
          background: "#DC6243",
          color: "#181426",
          fontSize: 88,
          fontWeight: 800,
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        R
      </div>
    ),
    size,
  );
}
