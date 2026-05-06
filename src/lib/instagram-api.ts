const BASE_URL = "https://graph.instagram.com/v18.0";

export type AccountSlug = "william" | "madruga";

const TOKENS: Record<AccountSlug, string | undefined> = {
  william: process.env.NEXT_PUBLIC_INSTAGRAM_TOKEN_WILLIAM,
  madruga: process.env.NEXT_PUBLIC_INSTAGRAM_TOKEN_MADRUGA,
};

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

function getToken(account: AccountSlug): string {
  const token = TOKENS[account];
  if (!token) throw new Error(`Token não configurado para: ${account}`);
  return token;
}

export async function fetchProfile(account: AccountSlug): Promise<InstagramProfile | null> {
  try {
    const token = getToken(account);
    const fields = "id,username,name,biography,profile_picture_url,followers_count,follows_count,media_count";
    const res = await fetch(`${BASE_URL}/me?fields=${fields}&access_token=${token}`, {
      next: { revalidate: 3600 }, // cache 1h
    });
    if (!res.ok) {
      console.error(`[instagram] fetchProfile ${account}:`, res.status, await res.text());
      return null;
    }
    return res.json();
  } catch (e) {
    console.error(`[instagram] fetchProfile ${account}:`, e);
    return null;
  }
}

export async function fetchMedia(account: AccountSlug, limit = 12): Promise<InstagramMedia[]> {
  try {
    const token = getToken(account);
    const fields = "id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count";
    const res = await fetch(
      `${BASE_URL}/me/media?fields=${fields}&limit=${limit}&access_token=${token}`,
      { next: { revalidate: 1800 } } // cache 30 min
    );
    if (!res.ok) {
      console.error(`[instagram] fetchMedia ${account}:`, res.status, await res.text());
      return [];
    }
    const data = await res.json();
    return data.data ?? [];
  } catch (e) {
    console.error(`[instagram] fetchMedia ${account}:`, e);
    return [];
  }
}
