/**
 * Caches a feed request for `ttl` ms within one server instance, so a page
 * that renders the same feed twice (or a warm function serving many requests)
 * fetches it once. Empty results, which usually mean the feed failed, are
 * retried after a minute instead.
 */
export function cached<T>(load: () => Promise<T[]>, ttl: number) {
  let entry: { value: Promise<T[]>; expires: number } | undefined;
  return () => {
    const now = Date.now();
    if (!entry || now > entry.expires) {
      const value = load();
      entry = { value, expires: now + ttl };
      void value.then((items) => {
        if (items.length === 0 && entry?.value === value) entry.expires = Date.now() + 60_000;
      });
    }
    return entry.value;
  };
}
