// Row types mirroring supabase/migrations/*_schema.sql.
// Regenerate with `supabase gen types typescript` if you prefer generated types.

export type UserRole = 'customer' | 'creator' | 'admin';
export type OrderStatus =
  | 'pending_payment' | 'paid' | 'processing' | 'shipped' | 'delivered'
  | 'cancelled' | 'refunded' | 'payment_failed';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';
export type SubmissionStatus = 'draft' | 'submitted' | 'in_review' | 'changes_requested' | 'approved' | 'rejected';
export type ProductionStatus = 'not_started' | 'prototyping' | 'tooling' | 'manufacturing' | 'released' | 'discontinued';
export type AgreementStatus = 'proposed' | 'active' | 'declined' | 'terminated';
export type EarningStatus = 'pending' | 'payable' | 'paid' | 'void';
export type ModelPreset = 'headphones' | 'speaker' | 'turntable' | 'keyboard' | 'earbuds' | 'radio' | 'generic';

export interface Address {
  full_name: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postal_code?: string;
  country: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: UserRole;
  default_address: Address | null;
  marketing_opt_in: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  accent: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface ProductFeature { icon: string; label: string }

export interface Product {
  id: string;
  slug: string;
  sku: string;
  name: string;
  tagline: string | null;
  description: string | null;
  category_id: string | null;
  price: number;
  compare_at_price: number | null;
  currency: string;
  stock: number;
  low_stock_threshold: number;
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  images: string[];
  model_url: string | null;
  model_preset: ModelPreset | null;
  accent_color: string;
  features: ProductFeature[];
  specs: Record<string, string>;
  creator_id: string | null;
  submission_id: string | null;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  category?: Pick<Category, 'id' | 'slug' | 'name'> | null;
}

export interface CreatorProfile {
  id: string;
  display_name: string;
  slug: string;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  website: string | null;
  socials: Record<string, string>;
  created_at: string;
}

export interface Creator extends CreatorProfile {
  user_id: string;
  payout_notes: string | null;
  status: 'active' | 'suspended';
}

export interface CreatorApplication {
  id: string;
  user_id: string;
  display_name: string;
  portfolio_url: string | null;
  location: string | null;
  bio: string;
  motivation: string;
  experience: string | null;
  disciplines: string[];
  status: ApplicationStatus;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface DesignSubmission {
  id: string;
  creator_id: string;
  title: string;
  category_id: string | null;
  summary: string | null;
  description: string;
  materials: string | null;
  target_price: number | null;
  image_paths: string[];
  model_path: string | null;
  status: SubmissionStatus;
  production_status: ProductionStatus;
  admin_notes: string | null;
  product_id: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommissionAgreement {
  id: string;
  creator_id: string;
  submission_id: string | null;
  product_id: string | null;
  royalty_percent: number;
  basis: string;
  terms: string;
  status: AgreementStatus;
  starts_at: string | null;
  ends_at: string | null;
  responded_at: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  status: OrderStatus;
  currency: string;
  subtotal: number;
  shipping_cost: number;
  total: number;
  contact_email: string;
  contact_phone: string | null;
  shipping_address: Address;
  customer_note: string | null;
  payment_reference: string | null;
  payment_id: string | null;
  carrier: string | null;
  tracking_number: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_sku: string;
  product_image: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  creator_id: string | null;
  royalty_percent: number | null;
}

export interface OrderStatusEvent {
  id: number;
  order_id: string;
  status: OrderStatus;
  note: string | null;
  created_at: string;
}

export interface CreatorEarning {
  id: string;
  creator_id: string;
  order_item_id: string;
  order_id: string;
  product_id: string | null;
  sale_amount: number;
  royalty_percent: number;
  amount: number;
  currency: string;
  status: EarningStatus;
  payout_id: string | null;
  created_at: string;
}

export interface CreatorPayout {
  id: string;
  creator_id: string;
  amount: number;
  currency: string;
  method: string;
  reference: string | null;
  note: string | null;
  status: 'recorded' | 'sent' | 'failed';
  paid_at: string;
}

export interface CreatorSale {
  order_item_id: string;
  order_id: string;
  order_number: string;
  order_status: OrderStatus;
  paid_at: string | null;
  product_id: string | null;
  product_name: string;
  quantity: number;
  line_total: number;
  royalty_percent: number | null;
}

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  author_name: string;
  rating: number;
  title: string | null;
  body: string;
  created_at: string;
}

export interface InventoryMovement {
  id: number;
  product_id: string;
  delta: number;
  reason: string;
  note: string | null;
  order_id: string | null;
  created_at: string;
}
