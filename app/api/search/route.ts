import { NextResponse } from "next/server";
import { searchKpopTracks, searchTracksRaw } from "@/lib/spotify";
import type { SpotifyTrack } from "@/lib/spotify";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.max(1, Math.min(10, Number(searchParams.get("limit") || 5)));
  if (!q) return NextResponse.json({ results: [] });

  // Heuristics: if user types "Artist - Title" split it to improve accuracy
  const dashIdx = q.indexOf(" - ");
  const artist = dashIdx > 0 ? q.slice(0, dashIdx).trim() : undefined;
  const title = dashIdx > 0 ? q.slice(dashIdx + 3).trim() : undefined;

  const queries: string[] = [];
  if (title && artist) {
    queries.push(`track:"${title}" artist:"${artist}"`);
    queries.push(`${title} ${artist} genre:k-pop`);
  } else {
    // Try exact track match, then genre-biased
    queries.push(`track:"${q}"`);
    queries.push(`${q} genre:k-pop`);
  }

  // Try a few likely markets to improve relevance
  const markets = ["KR", "US", "JP"];

  const seen = new Set<string>();
  const out: any[] = [];

  try {
    // First pass: simple k-pop search
    const kpopFirst = await searchKpopTracks(q, limit);
    for (const t of kpopFirst) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      out.push(t);
      if (out.length >= limit) break;
    }
    // Second pass: crafted queries across markets
    if (out.length < limit) {
      for (const query of queries) {
        for (const m of markets) {
          const batch = await searchTracksRaw(query, limit, m);
          for (const t of batch) {
            if (seen.has(t.id)) continue;
            seen.add(t.id);
            out.push(t);
            if (out.length >= limit) break;
          }
          if (out.length >= limit) break;
        }
        if (out.length >= limit) break;
      }
    }

    // Filter out common non-official terms
    const badTerms = [
      "remix",
      "sped up",
      "speed up",
      "slowed",
      "nightcore",
      "8d",
      "cover",
      "karaoke",
      "reverb",
      "mashup",
      "edit",
      "instrumental",
      "lofi",
    ];
    const norm = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

    const artistNorm = artist ? norm(artist) : undefined;
    const titleNorm = title ? norm(title) : undefined;

    let filtered = out.filter((t: SpotifyTrack) => {
      const label = `${t.artists.map((a: { name: string }) => a.name).join(" ")} ${t.name}`;
      const nl = norm(label);
      if (badTerms.some((bt) => nl.includes(bt))) return false;
      if (artistNorm && titleNorm) {
        const an = norm(t.artists.map((a) => a.name).join(" "));
        const tn = norm(t.name);
        // Require both artist and title match when provided
        if (!(an.includes(artistNorm) && (tn === titleNorm || tn.includes(titleNorm)))) return false;
      }
      return true;
    });

    // If we got too few after filtering, fall back to original list
    if (filtered.length < Math.min(3, limit)) filtered = out;

    const results = filtered.slice(0, limit).map((t: SpotifyTrack) => ({
      id: t.id,
      label: `${t.artists.map((a: { name: string }) => a.name).join(", ")} - ${t.name}`,
      preview_url: t.preview_url,
      album_image: t.album?.images?.[0]?.url ?? null,
    }));
    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "search failed", results: [] }, { status: 500 });
  }
}
