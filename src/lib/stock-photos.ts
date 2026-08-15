/**
 * Stock dish photos via Pexels (PLAN follow-up): instant defaults at
 * onboarding so a generated site never looks empty. Owners replace them with
 * real photos from the menu editor. Degrades to no photo when PEXELS_API_KEY
 * is absent — never blocks onboarding.
 */
export async function findStockPhoto(dishName: string): Promise<string | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  try {
    const query = encodeURIComponent(`${dishName} food dish`);
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${query}&per_page=1&orientation=landscape`,
      { headers: { Authorization: key } },
    );
    if (!res.ok) {
      console.error(`[stock-photos] Pexels ${res.status} for "${dishName}"`);
      return null;
    }
    const json = (await res.json()) as {
      photos?: { src?: { medium?: string; large?: string } }[];
    };
    return json.photos?.[0]?.src?.medium ?? null;
  } catch (err) {
    console.error("[stock-photos] lookup failed", err);
    return null;
  }
}

/** Best-effort batch lookup with bounded concurrency (Pexels: 200 req/hour). */
export async function findStockPhotos(
  dishNames: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!process.env.PEXELS_API_KEY) return out;
  const BATCH = 5;
  for (let i = 0; i < dishNames.length; i += BATCH) {
    const batch = dishNames.slice(i, i + BATCH);
    const results = await Promise.allSettled(batch.map((n) => findStockPhoto(n)));
    results.forEach((r, j) => {
      if (r.status === "fulfilled" && r.value) out.set(batch[j], r.value);
    });
  }
  return out;
}
