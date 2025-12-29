import { ImageResponse } from "@vercel/og";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ request }) => {
  const { searchParams, origin } = new URL(request.url);
  const title = searchParams.get("title") || "David Mostoller";

  let logoBase64: string | null = null;
  try {
    const logoUrl = new URL("/DM-gear.png", origin);
    const logoRes = await fetch(logoUrl);
    if (logoRes.ok) {
      const logoData = await logoRes.arrayBuffer();
      logoBase64 = `data:image/png;base64,${Buffer.from(logoData).toString("base64")}`;
    }
  } catch {
    // Fallback: render without logo
  }

  return new ImageResponse(
    {
      type: "div",
      key: "og",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "60px 70px",
          backgroundColor: "#171717",
          fontFamily: "Inter, sans-serif",
          position: "relative",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "6px",
                background: "linear-gradient(90deg, #3DBAB1 0%, #2d8a84 100%)",
              },
            },
          },
          logoBase64
            ? {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "flex-start",
                  },
                  children: {
                    type: "img",
                    props: {
                      src: logoBase64,
                      width: 80,
                      height: 80,
                      style: {
                        opacity: 0.9,
                      },
                    },
                  },
                },
              }
            : null,
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: "20px",
                flex: 1,
                justifyContent: "center",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: 56,
                      fontWeight: 600,
                      color: "#fafafa",
                      lineHeight: 1.15,
                      maxWidth: "85%",
                      letterSpacing: "-0.02em",
                    },
                    children: title,
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    },
                    children: [
                      {
                        type: "div",
                        props: {
                          style: {
                            width: "40px",
                            height: "2px",
                            backgroundColor: "#3DBAB1",
                          },
                        },
                      },
                      {
                        type: "div",
                        props: {
                          style: {
                            fontSize: 24,
                            fontWeight: 500,
                            color: "#a3a3a3",
                          },
                          children: "David Mostoller",
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                justifyContent: "flex-start",
              },
              children: {
                type: "div",
                props: {
                  style: {
                    fontSize: 18,
                    color: "#525252",
                    fontFamily: "monospace",
                  },
                  children: "davidmostoller.com",
                },
              },
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
    },
  );
};
