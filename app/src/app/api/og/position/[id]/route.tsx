import { ImageResponse } from "next/og";
import { getPublicPositionProfile } from "@/lib/actions/matching";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { data: position } = await getPublicPositionProfile(params.id);

  if (!position) {
    return new Response("Position not found", { status: 404 });
  }

  const suburb = position.suburb ?? "Sydney";
  const rate = position.hourlyRate ? `$${position.hourlyRate}/hr` : "";
  const hoursLabel = position.hoursPerWeek ? `~${position.hoursPerWeek} hrs/week` : "";
  const refCode = params.id.slice(-5);

  // Fetch Inter Bold font
  const fontData = await fetch(
    "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf"
  ).then((res) => res.arrayBuffer());

  const response = new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          position: "relative",
          display: "flex",
          overflow: "hidden",
          backgroundColor: "white",
        }}
      >
        {/* Background: Exponential Growth Layers */}
        <svg
          viewBox="0 0 1200 630"
          style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630 }}
        >
          <path
            d="M0 630 L0 625 C300 620, 600 610, 800 570 C950 535, 1050 460, 1120 340 C1160 265, 1185 150, 1200 0 L1200 630 Z"
            fill="#DDD6FE"
          />
          <path
            d="M0 630 L0 628 C350 625, 650 618, 840 585 C980 555, 1070 490, 1135 380 C1170 310, 1190 200, 1200 70 L1200 630 Z"
            fill="#E9D5FF"
          />
          <path
            d="M0 630 L0 630 C400 628, 700 624, 880 598 C1010 572, 1090 515, 1150 420 C1180 355, 1195 250, 1200 140 L1200 630 Z"
            fill="#F3E8FF"
          />
          <path
            d="M0 630 C450 630, 750 628, 920 610 C1040 595, 1110 545, 1165 460 C1190 400, 1198 300, 1200 210 L1200 630 Z"
            fill="#FAF5FF"
          />
        </svg>

        {/* Main layout: circle left, text right */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            width: "100%",
            height: "100%",
            paddingLeft: 60,
          }}
        >
          {/* Baby circle */}
          <div
            style={{
              width: 480,
              height: 480,
              borderRadius: "50%",
              border: "16px solid #DDD6FE",
              backgroundColor: "#F3E8FF",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
            }}
          >
            <span style={{ fontSize: 280, display: "flex" }}>👶</span>
          </div>

          {/* Text content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginLeft: 60,
              gap: 0,
            }}
          >
            {/* Nanny */}
            <div
              style={{
                display: "flex",
                fontSize: 84,
                fontWeight: 700,
                lineHeight: 1.1,
                color: "#0f172a",
              }}
            >
              Nanny
            </div>
            {/* Needed! */}
            <div
              style={{
                display: "flex",
                fontSize: 84,
                fontWeight: 700,
                lineHeight: 1.1,
                color: "#0f172a",
                marginTop: 4,
              }}
            >
              Needed!
            </div>

            {/* Suburb with pin */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 24,
                fontSize: 40,
                fontWeight: 700,
                color: "#8B5CF6",
              }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {suburb}
            </div>

            {/* Rate + Hours */}
            <div style={{ display: "flex", flexDirection: "column", marginTop: 16 }}>
              {rate && (
                <div
                  style={{
                    display: "flex",
                    fontSize: 38,
                    fontWeight: 700,
                    color: "#16a34a",
                  }}
                >
                  {rate}
                </div>
              )}
              {hoursLabel && (
                <div
                  style={{
                    display: "flex",
                    fontSize: 26,
                    fontWeight: 600,
                    color: "#64748b",
                    marginTop: 2,
                  }}
                >
                  {hoursLabel}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reference code — bottom right above logo */}
        <div
          style={{
            position: "absolute",
            bottom: 52,
            right: 16,
            display: "flex",
            fontSize: 24,
            fontWeight: 700,
            color: "#94a3b8",
            letterSpacing: 1,
          }}
        >
          {refCode}
        </div>

        {/* BabyBloom Logo — bottom right */}
        <div
          style={{
            position: "absolute",
            bottom: 6,
            right: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 12h.01" />
            <path d="M15 12h.01" />
            <path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5" />
            <path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1" />
          </svg>
          <span
            style={{
              fontSize: 30,
              fontWeight: 700,
              display: "flex",
            }}
          >
            <span style={{ color: "#0f172a", display: "flex" }}>Baby</span>
            <span style={{ color: "#8B5CF6", display: "flex" }}>Bloom</span>
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Inter",
          data: fontData,
          weight: 700,
          style: "normal",
        },
      ],
    }
  );

  response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
  return response;
}
