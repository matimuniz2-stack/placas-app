import type { PlacaData } from '@/types';

export interface ExtractedListing extends Partial<PlacaData> {
  photoUrl?: string;
}

// Client-side extractor that tries our serverless endpoint first.
// Fallback: parse client-side using a CORS proxy isn't reliable.
export async function extractFromUrl(url: string): Promise<ExtractedListing | null> {
  if (!url || !/^https?:\/\//.test(url)) return null;

  try {
    const res = await fetch(`/api/extract?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
