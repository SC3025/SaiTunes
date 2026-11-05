export type CollectionKind = "album" | "year" | "special";

export interface Collection {
  id: string;
  slug: string;
  title: string;
  year: number | null;
  kind: CollectionKind;
  description: string | null;
  cover_key: string | null;
  is_featured: boolean;
  created_at: string;
}

export interface Song {
  id: string;
  collection_id: string;
  title: string;
  artist: string | null;
  track_number: number | null;
  duration_seconds: number | null;
  file_key: string;
  file_size: number | null;
  mime_type: string | null;
  original_filename: string | null;
  created_at: string;
}

/** A song plus the collection it belongs to (for search results and the player). */
export interface SongWithCollection extends Song {
  collections: Pick<Collection, "slug" | "title" | "year" | "cover_key"> | null;
}
