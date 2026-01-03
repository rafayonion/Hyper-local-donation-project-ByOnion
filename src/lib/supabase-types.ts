export type AppRole = 'general' | 'ngo';
export type ListingCategory = 'clothes' | 'food' | 'electronics' | 'furniture' | 'books' | 'toys' | 'medical' | 'other';
export type ListingStatus = 'active' | 'pending_pickup' | 'collected';

export interface Profile {
  id: string;
  role: AppRole;
  username: string | null;
  organization_name: string | null;
  is_verified: boolean;
  avatar_url: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  bio: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface DonationListing {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  category: ListingCategory;
  status: ListingStatus;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  preferred_time: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface NgoRequest {
  id: string;
  ngo_id: string;
  title: string;
  item_name: string;
  quantity_needed: number;
  quantity_pledged: number;
  is_urgent: boolean;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  category: ListingCategory;
  status: ListingStatus;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface NgoActivity {
  id: string;
  ngo_id: string;
  image_url: string | null;
  description: string;
  created_at: string;
}

export interface Pledge {
  id: string;
  request_id: string;
  user_id: string;
  amount: number;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  listing_id: string | null;
  request_id: string | null;
  content: string;
  created_at: string;
}

export const CATEGORIES: { value: ListingCategory; label: string; icon: string }[] = [
  { value: 'clothes', label: 'Clothes', icon: '👕' },
  { value: 'food', label: 'Food', icon: '🍎' },
  { value: 'electronics', label: 'Electronics', icon: '📱' },
  { value: 'furniture', label: 'Furniture', icon: '🪑' },
  { value: 'books', label: 'Books', icon: '📚' },
  { value: 'toys', label: 'Toys', icon: '🧸' },
  { value: 'medical', label: 'Medical', icon: '💊' },
  { value: 'other', label: 'Other', icon: '📦' },
];
