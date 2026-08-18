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
          background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #22d3ee 100%)",
          color: "white",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 34, opacity: 0.95 }}>RefereeRequest</div>
        <div style={{ fontSize: 74, fontWeight: 700, marginTop: 16, lineHeight: 1.1 }}>
          References without the chase
        </div>
        <div style={{ fontSize: 32, marginTop: 28, opacity: 0.95 }}>
          Candidate creates request • Referee submits in minutes
        </div>
      </div>
    ),
    size,
  );
}
