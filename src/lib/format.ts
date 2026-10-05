// Text and date helpers for feed content.

const namedEntities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function decodeEntities(text: string) {
  return text.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (match, code: string) => {
      if (code.startsWith("#")) {
        const hex = code[1].toLowerCase() === "x";
        const n = parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
        // Out-of-range code points would throw; leave those as written.
        return Number.isNaN(n) || n > 0x10ffff
          ? match
          : String.fromCodePoint(n);
      }
      return namedEntities[code.toLowerCase()] ?? match;
    },
  );
}

/** Strips tags without gluing neighboring words together, and decodes entities. */
export function toText(html: string) {
  return decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/** Cuts at a word boundary and adds an ellipsis. */
export function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:.\s]+$/, "") + "…";
}

/** Zone-less dates ("2024-12-08", "2025-03-02 18:45:05") are UTC. */
function parseDate(value: string) {
  const match = /^(\d{4}-\d{2}-\d{2})(?: (\d{2}:\d{2}:\d{2}))?$/.exec(value);
  if (match) return new Date(`${match[1]}T${match[2] ?? "00:00:00"}Z`);
  return new Date(value);
}

/** Formats in UTC, like "Dec 8, 2024", so the server and every visitor agree on the day. */
export function formatDate(value: string) {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}
