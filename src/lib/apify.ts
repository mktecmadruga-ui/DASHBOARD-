/**
 * Apify Instagram Scraper client
 * Actor: apify~instagram-scraper
 */

const APIFY_TOKEN  = process.env.APIFY_TOKEN!;
const ACTOR_ID     = "apify~instagram-scraper";
const BASE_URL     = "https://api.apify.com/v2";

/** Concorrentes por perfil */
export const COMPETITORS_BY_ACCOUNT: Record<string, string[]> = {
  william: ["gustavocerbasi", "infomoney", "mundode3segundos"],
  madruga: ["contabilizei", "contaazul", "nasajon"],
};

export interface CompetitorPost {
  id: string;
  username: string;
  url: string;
  shortCode: string;
  caption: string;
  mediaType: "Image" | "Video" | "Sidecar";
  thumbnailUrl: string;
  likeCount: number;
  commentCount: number;
  timestamp: string;
  engagement: number; // likeCount + commentCount
}

export interface CompetitorData {
  username: string;
  posts: CompetitorPost[];
}

/** Kick off an async Apify run for the given IG usernames. Returns the run ID. */
export async function startCompetitorRun(usernames: string[]): Promise<string> {
  const directUrls = usernames.map((u) => `https://www.instagram.com/${u}/`);

  const res = await fetch(
    `${BASE_URL}/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        directUrls,
        resultsType: "posts",
        resultsLimit: 12,
        addParentData: false,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Apify run start failed: ${res.status} — ${err}`);
  }

  const data = await res.json();
  return data.data.id as string; // runId
}

function toPost(item: Record<string, unknown>, username: string): CompetitorPost {
  return {
    id:           String(item.id ?? ""),
    username,
    url:          String(item.url ?? `https://www.instagram.com/p/${item.shortCode}/`),
    shortCode:    String(item.shortCode ?? ""),
    caption:      String(item.caption ?? ""),
    mediaType:    (item.type as CompetitorPost["mediaType"]) ?? "Image",
    thumbnailUrl: String(item.displayUrl ?? ""),
    likeCount:    Number(item.likesCount ?? 0),
    commentCount: Number(item.commentsCount ?? 0),
    timestamp:    String(item.timestamp ?? new Date().toISOString()),
    engagement:   Number(item.likesCount ?? 0) + Number(item.commentsCount ?? 0),
  };
}

/** Fetch the 3 most recent successful runs in parallel and merge results. */
export async function fetchLastRunPosts(usernames: string[]): Promise<CompetitorData[]> {
  // 1. Get last 3 successful runs
  const runsRes = await fetch(
    `${BASE_URL}/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}&status=SUCCEEDED&limit=3&desc=1`,
    { cache: "no-store" }
  );
  if (!runsRes.ok) return usernames.map((u) => ({ username: u, posts: [] }));

  const runsData = await runsRes.json();
  const runs: Array<{ defaultDatasetId: string }> = runsData.data?.items ?? [];
  if (!runs.length) return usernames.map((u) => ({ username: u, posts: [] }));

  // 2. Fetch all datasets in parallel
  const allItemsArrays = await Promise.all(
    runs.map((run) =>
      fetch(`${BASE_URL}/datasets/${run.defaultDatasetId}/items?token=${APIFY_TOKEN}&clean=true`, { cache: "no-store" })
        .then((r) => r.ok ? r.json() as Promise<Record<string, unknown>[]> : [])
        .catch(() => [] as Record<string, unknown>[])
    )
  );

  // 3. Merge all items — deduplicate by post ID, keep newest occurrence
  const byUsername: Record<string, Map<string, CompetitorPost>> = {};

  for (const items of allItemsArrays) {
    for (const item of items) {
      const username = String(item.ownerUsername ?? "");
      if (!usernames.includes(username)) continue;
      const post = toPost(item, username);
      if (!post.id || post.id === "undefined") continue;
      if (!byUsername[username]) byUsername[username] = new Map();
      if (!byUsername[username].has(post.id)) {
        byUsername[username].set(post.id, post);
      }
    }
  }

  // 4. Sort by engagement, return top 3
  return usernames.map((username) => ({
    username,
    posts: Array.from(byUsername[username]?.values() ?? [])
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 3),
  }));
}
