/**
 * Instagram Graph API (Business API) — uses graph.facebook.com
 * Requires EAAw token with instagram_basic + instagram_manage_insights permissions
 * and Instagram accounts linked to Facebook Pages.
 */
const BASE_URL = "https://graph.facebook.com/v19.0";

export type AccountSlug = "william" | "madruga";

const IG_USER_IDS: Record<AccountSlug, string> = {
  william: "17841403558309059", // @williamnmadruga
  madruga: "17841406953451809", // @madrugacontabilidade
};

function getToken(): string {
  const token = process.env.INSTAGRAM_GRAPH_TOKEN;
  if (!token) throw new Error("INSTAGRAM_GRAPH_TOKEN não configurado");
  return token;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InstagramProfile {
  id: string;
  username: string;
  name: string;
  biography: string;
  profile_picture_url: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
}

export interface InstagramMedia {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
}

export interface InsightsTimeSeries {
  date: string;   // "06 Abr"
  alcance: number;
  seguidores: number;
}

export interface InsightsTotals {
  profile_views: number;
  total_interactions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

export interface AudienceDemographics {
  genderAge: Array<{ gender: string; age: string; value: number }>;
  cities:    Array<{ name: string; value: number }>;
  countries: Array<{ code: string; value: number }>;
}

export interface MediaInsights {
  reach: number;
  saved: number;
  shares: number;
  likes: number;
  comments: number;
  views: number;
}

// ─── Profile & Media ──────────────────────────────────────────────────────────

export async function fetchProfile(account: AccountSlug): Promise<InstagramProfile | null> {
  try {
    const token    = getToken();
    const igUserId = IG_USER_IDS[account];
    const fields   = "id,username,name,biography,profile_picture_url,followers_count,follows_count,media_count";
    const res = await fetch(`${BASE_URL}/${igUserId}?fields=${fields}&access_token=${token}`, { cache: "no-store" });
    if (!res.ok) { console.error(`[instagram] fetchProfile ${account}:`, res.status, await res.text()); return null; }
    return res.json();
  } catch (e) { console.error(`[instagram] fetchProfile ${account}:`, e); return null; }
}

export async function fetchMedia(account: AccountSlug, limit = 12): Promise<InstagramMedia[]> {
  try {
    const token    = getToken();
    const igUserId = IG_USER_IDS[account];
    const fields   = "id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count";
    const res = await fetch(`${BASE_URL}/${igUserId}/media?fields=${fields}&limit=${limit}&access_token=${token}`, { cache: "no-store" });
    if (!res.ok) { console.error(`[instagram] fetchMedia ${account}:`, res.status, await res.text()); return []; }
    const data = await res.json();
    return data.data ?? [];
  } catch (e) { console.error(`[instagram] fetchMedia ${account}:`, e); return []; }
}

// ─── Account Insights ─────────────────────────────────────────────────────────

export async function fetchAccountInsights(account: AccountSlug, days = 30): Promise<{
  timeSeries: InsightsTimeSeries[];
  totals: InsightsTotals;
} | null> {
  try {
    const token    = getToken();
    const igUserId = IG_USER_IDS[account];
    const since    = Math.floor((Date.now() - days * 86400000) / 1000);
    const until    = Math.floor(Date.now() / 1000);

    const [tsRes, totalsRes] = await Promise.all([
      // Time-series: reach + follower_count per day
      fetch(
        `${BASE_URL}/${igUserId}/insights?metric=reach,follower_count&period=day&metric_type=time_series&since=${since}&until=${until}&access_token=${token}`,
        { cache: "no-store" }
      ),
      // Totals for the period
      fetch(
        `${BASE_URL}/${igUserId}/insights?metric=profile_views,total_interactions,likes,comments,shares,saves&period=day&metric_type=total_value&since=${since}&until=${until}&access_token=${token}`,
        { cache: "no-store" }
      ),
    ]);

    if (!tsRes.ok || !totalsRes.ok) return null;

    const tsData     = await tsRes.json();
    const totalsData = await totalsRes.json();

    // Build time-series map indexed by date string
    const reachMap:     Record<string, number> = {};
    const followersMap: Record<string, number> = {};

    for (const metric of tsData.data ?? []) {
      const map = metric.name === "reach" ? reachMap : followersMap;
      for (const pt of metric.values ?? []) {
        const d = new Date(pt.end_time);
        const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
        map[key] = pt.value;
      }
    }

    // Merge into unified array sorted by date
    const allDates = Array.from(new Set([...Object.keys(reachMap), ...Object.keys(followersMap)]));
    const timeSeries: InsightsTimeSeries[] = allDates.map((date) => ({
      date,
      alcance:    reachMap[date]     ?? 0,
      seguidores: followersMap[date] ?? 0,
    }));

    // Totals
    const totalsArr = totalsData.data ?? [];
    const getTotal  = (name: string) =>
      totalsArr.find((m: { name: string }) => m.name === name)?.total_value?.value ?? 0;

    const totals: InsightsTotals = {
      profile_views:      getTotal("profile_views"),
      total_interactions: getTotal("total_interactions"),
      likes:              getTotal("likes"),
      comments:           getTotal("comments"),
      shares:             getTotal("shares"),
      saves:              getTotal("saves"),
    };

    return { timeSeries, totals };
  } catch (e) {
    console.error(`[instagram] fetchAccountInsights ${account}:`, e);
    return null;
  }
}

// ─── Audience Demographics ────────────────────────────────────────────────────

export async function fetchAudienceDemographics(account: AccountSlug): Promise<AudienceDemographics | null> {
  try {
    const token    = getToken();
    const igUserId = IG_USER_IDS[account];

    const [genderRes, cityRes, countryRes] = await Promise.all([
      fetch(`${BASE_URL}/${igUserId}/insights?metric=follower_demographics&period=lifetime&metric_type=total_value&breakdown=gender,age&access_token=${token}`, { cache: "no-store" }),
      fetch(`${BASE_URL}/${igUserId}/insights?metric=follower_demographics&period=lifetime&metric_type=total_value&breakdown=city&access_token=${token}`, { cache: "no-store" }),
      fetch(`${BASE_URL}/${igUserId}/insights?metric=follower_demographics&period=lifetime&metric_type=total_value&breakdown=country&access_token=${token}`, { cache: "no-store" }),
    ]);

    const [genderData, cityData, countryData] = await Promise.all([
      genderRes.ok ? genderRes.json() : null,
      cityRes.ok   ? cityRes.json()   : null,
      countryRes.ok ? countryRes.json() : null,
    ]);

    const genderAge = (genderData?.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [])
      .map((r: { dimension_values: string[]; value: number }) => ({
        gender: r.dimension_values[0],
        age:    r.dimension_values[1],
        value:  r.value,
      }));

    const cities = (cityData?.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [])
      .map((r: { dimension_values: string[]; value: number }) => ({
        name:  r.dimension_values[0],
        value: r.value,
      }))
      .sort((a: { value: number }, b: { value: number }) => b.value - a.value)
      .slice(0, 8);

    const countries = (countryData?.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [])
      .map((r: { dimension_values: string[]; value: number }) => ({
        code:  r.dimension_values[0],
        value: r.value,
      }))
      .sort((a: { value: number }, b: { value: number }) => b.value - a.value)
      .slice(0, 5);

    return { genderAge, cities, countries };
  } catch (e) {
    console.error(`[instagram] fetchAudienceDemographics ${account}:`, e);
    return null;
  }
}

// ─── Per-post Insights ────────────────────────────────────────────────────────

export async function fetchMediaInsights(mediaId: string): Promise<MediaInsights | null> {
  try {
    const token = getToken();
    const res   = await fetch(
      `${BASE_URL}/${mediaId}/insights?metric=reach,saved,shares,likes,comments,views&access_token=${token}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();

    const get = (name: string): number => {
      const item = (data.data ?? []).find((m: { name: string }) => m.name === name);
      return item?.values?.[0]?.value ?? item?.value ?? 0;
    };

    return {
      reach:    get("reach"),
      saved:    get("saved"),
      shares:   get("shares"),
      likes:    get("likes"),
      comments: get("comments"),
      views:    get("views"),
    };
  } catch (e) {
    console.error(`[instagram] fetchMediaInsights ${mediaId}:`, e);
    return null;
  }
}
