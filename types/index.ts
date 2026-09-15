export type Category = "livestock" | "feed";

export type ListingStatus = "active" | "sold" | "removed";

export type LivestockTuri =
  | "mol"
  | "qoy"
  | "echki"
  | "tovuq"
  | "ot"
  | "boshqa";

export type FeedTuri = "pichan" | "don" | "kombikorm" | "silos" | "boshqa";

export interface LivestockDetails {
  turi: LivestockTuri;
  yoshi?: number; // oyda
  jinsi?: "erkak" | "urgochi";
  soni?: number; // necha bosh
}

export interface FeedDetails {
  turi: FeedTuri;
  ogirligi?: number;
  birligi?: "kg" | "tonna" | "bog";
}

export type ListingDetails = LivestockDetails | FeedDetails;

export interface Listing {
  id: string;
  user_id: string;
  category: Category;
  title: string;
  description: string | null;
  price: number;
  region: string;
  district: string;
  phone: string;
  telegram_username: string | null;
  images: string[];
  details: ListingDetails | Record<string, never>;
  status: ListingStatus;
  created_at: string;
  updated_at: string;
}

export interface AppUser {
  id: string;
  telegram_id: number;
  telegram_username: string | null;
  name: string;
  phone: string | null;
  region: string | null;
  district: string | null;
  created_at: string;
  updated_at: string;
}

export interface TelegramLoginPayload {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}
