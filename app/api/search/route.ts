import { NextResponse } from "next/server";
import { searchKpopTracks, searchTracksRaw } from "@/lib/spotify";
import type { SpotifyTrack } from "@/lib/spotify";
import { supabaseServer } from "@/lib/supabaseClient";

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

  const seenIds = new Set<string>();
  const seenLabels = new Set<string>();
  const out: SpotifyTrack[] = [];

  try {
    // Curated-first: search in our Supabase songs table
    const sb = supabaseServer();
    const like = `%${q.replace(/[_%]/g, "")}%`;
    const { data: curated } = await sb
      .from("songs")
      .select("spotify_id, title, artist, preview_url, album_image")
      .or(`title.ilike.${like},artist.ilike.${like}`)
      .limit(limit);
    if (curated && curated.length) {
      for (const row of curated) {
        const label = `${row.artist} - ${row.title}`;
        if (seenLabels.has(label)) continue;
        seenLabels.add(label);
        out.push({
          id: row.spotify_id,
          name: row.title,
          artists: [{ name: row.artist }],
          preview_url: row.preview_url ?? null,
          album: { images: row.album_image ? [{ url: row.album_image, width: 640, height: 640 }] : [] },
        } as SpotifyTrack);
        if (out.length >= limit) break;
      }
    }

    // First pass: simple k-pop search
    const kpopFirst = await searchKpopTracks(q, limit);
    for (const t of kpopFirst) {
      if (seenIds.has(t.id)) continue;
      const lbl = `${t.artists.map((a: { name: string }) => a.name).join(", ")} - ${t.name}`;
      if (seenLabels.has(lbl)) continue;
      seenIds.add(t.id);
      seenLabels.add(lbl);
      out.push(t);
      if (out.length >= limit) break;
    }
    // Second pass: crafted queries across markets
    if (out.length < limit) {
      for (const query of queries) {
        for (const m of markets) {
          const batch = await searchTracksRaw(query, limit, m);
          for (const t of batch) {
            if (seenIds.has(t.id)) continue;
            const lbl = `${t.artists.map((a: { name: string }) => a.name).join(", ")} - ${t.name}`;
            if (seenLabels.has(lbl)) continue;
            seenIds.add(t.id);
            seenLabels.add(lbl);
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
