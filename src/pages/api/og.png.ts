import { ImageResponse } from "@vercel/og";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ request }) => {
  const { searchParams } = new URL(request.url);
  const rawTitle = searchParams.get("title") || "David Mostoller";

  // Parse the title - pages pass "Blog — David Mostoller" format
  // Split on em dash (—) or en dash (–), not hyphens to avoid false splits
  const titleParts = rawTitle.split(/\s*[—–]\s*/);
  const isHomePage =
    rawTitle === "David Mostoller" ||
    titleParts[0] === "David Mostoller";

  const title = isHomePage ? "David Mostoller" : titleParts[0];
  const subtitle = isHomePage ? "Software Engineer" : null;

  // For home page, split name into two lines
  const [firstName, lastName] = isHomePage
    ? ["David", "Mostoller"]
    : [title, null];

  return new ImageResponse(
    {
      type: "div",
      key: "og",
      props: {
        style: {
          display: "flex",
          width: "100%",
          height: "100%",
          background: "#121212",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          overflow: "hidden",
        },
        children: [
          // Grid background
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              },
            },
          },

          // Grid fade - hides grid in center
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background:
                  "radial-gradient(ellipse 70% 70% at 50% 50%, #121212 0%, #121212 10%, transparent 100%)",
              },
            },
          },
          // Grid fade - hides top-right corner
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background:
                  "radial-gradient(ellipse 70% 180% at 100% 0%, #121212 0%, transparent 45%)",
              },
            },
          },
          // Grid fade - hides bottom-left corner
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background:
                  "radial-gradient(ellipse 80% 120% at 0% 100%, #121212 0%, transparent 50%)",
              },
            },
          },

          // Glow orb - top left (teal) - subtle
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: "-300px",
                left: "-300px",
                width: "900px",
                height: "900px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(61, 186, 177, 0.06) 0%, rgba(61, 186, 177, 0.02) 40%, transparent 70%)",
              },
            },
          },

          // Glow orb - bottom right (teal) - subtle
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                bottom: "-350px",
                right: "-100px",
                width: "1000px",
                height: "1000px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(61, 186, 177, 0.04) 0%, rgba(61, 186, 177, 0.01) 45%, transparent 70%)",
              },
            },
          },

          // Glow orb - mid right (teal accent) - subtle
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: "-50px",
                right: "-250px",
                width: "800px",
                height: "800px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(61, 186, 177, 0.02) 0%, rgba(61, 186, 177, 0.005) 50%, transparent 70%)",
              },
            },
          },

          // Concentric arcs - top right (pushed further off-canvas, more cropped)
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: "-320px",
                right: "-320px",
                width: "600px",
                height: "600px",
                borderRadius: "50%",
                border: "1px solid rgba(61, 186, 177, 0.1)",
              },
            },
          },
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: "-250px",
                right: "-250px",
                width: "480px",
                height: "480px",
                borderRadius: "50%",
                border: "1px solid rgba(61, 186, 177, 0.15)",
              },
            },
          },
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: "-180px",
                right: "-180px",
                width: "360px",
                height: "360px",
                borderRadius: "50%",
                border: "1px solid rgba(61, 186, 177, 0.22)",
                background:
                  "radial-gradient(circle, rgba(61, 186, 177, 0.03) 0%, transparent 70%)",
              },
            },
          },

          // Corner accent - top left
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: "40px",
                left: "40px",
                width: "50px",
                height: "50px",
                borderTop: "2px solid #262626",
                borderLeft: "2px solid #262626",
              },
            },
          },

          // Corner accent - bottom right
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                bottom: "40px",
                right: "40px",
                width: "50px",
                height: "50px",
                borderBottom: "2px solid #262626",
                borderRight: "2px solid #262626",
              },
            },
          },

          // Main content - pushed to lower left (asymmetric)
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                width: "100%",
                height: "100%",
                padding: "0 80px 80px 80px",
                position: "relative",
              },
              children: [
                // Name block
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      flexDirection: "column",
                      gap: "0px",
                    },
                    children: isHomePage
                      ? [
                          // First name - lighter weight
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: 88,
                                fontWeight: 300,
                                color: "#fafafa",
                                lineHeight: 0.95,
                                letterSpacing: "-0.02em",
                                textTransform: "uppercase",
                              },
                              children: firstName,
                            },
                          },
                          // Last name - heavy weight with gradient-like effect
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: 88,
                                fontWeight: 700,
                                color: "#fafafa",
                                lineHeight: 0.95,
                                letterSpacing: "-0.02em",
                                textTransform: "uppercase",
                              },
                              children: lastName,
                            },
                          },
                        ]
                      : [
                          // Page title for non-home pages
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: 96,
                                fontWeight: 700,
                                color: "#fafafa",
                                lineHeight: 1,
                                letterSpacing: "-0.03em",
                              },
                              children: title,
                            },
                          },
                        ],
                  },
                },

                // Horizontal divider with gradient
                {
                  type: "div",
                  props: {
                    style: {
                      width: "100%",
                      height: "2px",
                      background:
                        "linear-gradient(90deg, #3DBAB1 0%, rgba(61, 186, 177, 0.5) 50%, transparent 100%)",
                      marginTop: "28px",
                      marginBottom: "24px",
                    },
                  },
                },

                // Footer row
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    },
                    children: [
                      // Left: subtitle or attribution
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            alignItems: "center",
                            gap: "14px",
                          },
                          children: [
                            // Signal dot with gradient color
                            {
                              type: "div",
                              props: {
                                style: {
                                  width: "8px",
                                  height: "8px",
                                  background: "#3DBAB1",
                                  borderRadius: "50%",
                                },
                              },
                            },
                            {
                              type: "div",
                              props: {
                                style: {
                                  fontSize: 20,
                                  fontWeight: 400,
                                  color: isHomePage ? "#737373" : "#3DBAB1",
                                  letterSpacing: "0.1em",
                                  textTransform: "uppercase",
                                },
                                children: isHomePage
                                  ? subtitle
                                  : "David Mostoller",
                              },
                            },
                          ],
                        },
                      },
                      // Right: domain
                      {
                        type: "div",
                        props: {
                          style: {
                            fontSize: 14,
                            fontWeight: 500,
                            color: "#525252",
                            letterSpacing: "0.05em",
                          },
                          children: "davidmostoller.com",
                        },
                      },
                    ],
                  },
                },
              ],
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
