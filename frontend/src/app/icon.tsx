import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#DC6243",
          color: "#181426",
          fontSize: 34,
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
