// Shapes of the JSON the API returns. They mirror the Mongoose models in server/models/.
// Dates arrive as ISO strings and ObjectIds as strings.

export type PropertyType = "apartment" | "house" | "either";
export type RentalType = "short_term" | "long_term" | "flexible";
export type YesNoFlexible = "yes" | "no" | "flexible";
export type ContactStatus = "pending" | "approved" | "rejected";

export interface ApiPhoto {
  _id?: string;
  data: string; // Base64
  is_cover?: boolean;
}

export interface GeoPoint {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
}

export interface RentalRequest {
  _id: string;
  seeker_id: string;
  city: string;
  property_type: PropertyType;
  rental_type: RentalType;
  budget: { min: number; max: number };
  specs: {
    bedrooms: number;
    min_area_sqm?: number;
    furnished?: YesNoFlexible;
    pets?: YesNoFlexible;
  };
  neighborhoods?: string[];
  move_in_date?: string;
  location_preferences?: string;
  notes?: string;
  allow_brokers: "yes" | "owners_only" | "both";
  description: string;
  status: "active" | "closed";
  expires_at: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResponderProfile {
  _id: string;
  full_name: string;
  role: "seeker" | "broker" | "owner";
  phone?: string | null;
}

export interface Offer {
  _id: string;
  request_id: string;
  responder_id: string;
  saved_property_id?: string;
  price: number;
  property_type: PropertyType;
  rental_type: RentalType;
  size_sqm: number;
  bedrooms: number;
  furnished: YesNoFlexible;
  description: string;
  custom_note?: string;
  approx_location: string;
  location: GeoPoint;
  privacy_radius: number;
  photos?: ApiPhoto[];
  contact_status: ContactStatus;
  createdAt: string;
  updatedAt: string;
  // Added by GET /api/offers/:id and /api/offers/seeker-view/:id
  responder_profile?: ResponderProfile | null;
  request_city?: string;
  display_mode?: "circle";
}

export interface SavedProperty {
  _id: string;
  provider_id: string;
  price: number;
  property_type: string;
  rental_type: string;
  bedrooms: number;
  size_sqm: number;
  furnished: string;
  approx_location: string;
  description: string;
  status: string;
  location: GeoPoint;
  privacy_radius: number;
  photos?: ApiPhoto[];
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  _id: string;
  user_id: string;
  title: string;
  message: string;
  type: "new_response" | "contact_approved" | "offer_rejected" | "new_review" | "review_updated";
  read: boolean;
  metadata?: { response_id?: string; request_id?: string };
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  _id: string;
  reviewer_id: { _id: string; full_name: string } | null; // populated by the API
  provider_id: string;
  response_id: string;
  rating: number;
  text?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicProfile {
  _id?: string;
  id?: string;
  full_name: string;
  role?: "seeker" | "broker" | "owner";
  provider_type?: "agency" | "freelance" | "broker" | "owner" | null;
}

/** Message to show for an error caught in a try/catch. */
export const errorMessage = (error: unknown, fallback = "Възникна грешка"): string =>
  error instanceof Error && error.message ? error.message : fallback;
