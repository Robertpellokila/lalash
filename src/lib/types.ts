export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type PaymentStatus = "UNPAID" | "DP" | "PAID" | "REFUNDED";

export type BookingSource = "ADMIN" | "PUBLIC";

export type PaymentMethod =
  | "Cash"
  | "Bank Transfer"
  | "QRIS"
  | "E-wallet"
  | "Other";

export type ExpenseCategory =
  | "Rent"
  | "Electricity"
  | "Water"
  | "Internet"
  | "Lash Supplies"
  | "Equipment"
  | "Marketing"
  | "Salary"
  | "Transportation"
  | "Other";

export interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  active: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  discount_price?: number | null;
}

export interface LandingContent {
  id: string;
  hero_badge: string;
  hero_title: string;
  hero_subtitle: string;
  hero_image_url: string | null;
  gallery_image_1: string | null;
  gallery_image_2: string | null;
  gallery_image_3: string | null;
  feature_1_title: string;
  feature_1_desc: string;
  feature_2_title: string;
  feature_2_desc: string;
  feature_3_title: string;
  feature_3_desc: string;
  cta_title: string;
  cta_subtitle: string;
  footer_tagline: string | null;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  loyalty_points?: number;
  is_stamp_given?: boolean;
}

export interface Booking {
  id: string;
  customer_id: string;
  service_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  payment_method: string | null;
  source: BookingSource;
  notes: string | null;
  additional_fee?: number;
  additional_fee_reason?: string | null;
  is_stamp_given?: boolean;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  service?: Service;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  payment_method: string | null;
  payment_date: string;
  notes: string | null;
  created_at: string;
  booking?: Booking;
}

export interface Expense {
  id: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  expense_date: string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
}

export interface BusinessHour {
  id: string;
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
  break_start: string | null;
  break_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlockedDate {
  id: string;
  blocked_date: string;
  reason: string;
  created_at: string;
}

export interface Settings {
  id: string;
  business_name: string;
  logo_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  address: string | null;
  currency: string;
  timezone: string;
  min_booking_notice_hours: number;
  max_booking_days_ahead: number;
  cancellation_policy: string | null;
  allow_public_booking: boolean;
  auto_confirm_public_booking: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  booking_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface BookingWithRelations extends Booking {
  customer: Customer;
  service: Service;
}
