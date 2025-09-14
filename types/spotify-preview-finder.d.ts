declare module 'spotify-preview-finder' {
  const finder: (
    songName: string,
    artistOrLimit?: string | number,
    limit?: number
  ) => Promise<{
    success: boolean;
    searchQuery?: string;
    results: Array<{
      name: string;
      spotifyUrl?: string;
      previewUrls: string[];
      trackId?: string;
      albumName?: string;
      releaseDate?: string;
      popularity?: number;
      durationMs?: number;
    }>;
    error?: string;
  }>;
  export default finder;
}
