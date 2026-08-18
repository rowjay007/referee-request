import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#F7F2E8",
          color: "#181426",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          fontFamily: "Inter, system-ui, sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 30,
            letterSpacing: "0.18em",
            fontWeight: 700,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: "#DC6243",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 800,
            }}
          >
            R
          </div>
          REFEREEREQUEST
        </div>
        <div
          style={{
            fontSize: 86,
            fontWeight: 800,
            marginTop: 26,
            lineHeight: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span>Make the ask.</span>
          <span style={{ color: "#DC6243" }}>Lose the chase.</span>
        </div>
        <div style={{ fontSize: 34, marginTop: 24, color: "#6E6486" }}>
          One link for referees. One clear flow for applicants.
        </div>
        <div
          style={{
            position: "absolute",
            right: 64,
            bottom: 60,
            width: 230,
            height: 130,
            borderRadius: 22,
            background: "#3C2770",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 42,
            fontWeight: 700,
            transform: "rotate(-7deg)",
          }}
        >
          Moving
        </div>
      </div>
    ),
    size,
  );
}
