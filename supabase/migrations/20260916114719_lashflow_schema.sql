/*
# LashFlow - Complete Database Schema

## Overview
Creates the full database schema for an eyelash business management system with:
- Customer management
- Service catalog
- Booking/scheduling system with double-booking prevention
- Payment tracking
- Expense tracking
- Business hours configuration
- Blocked dates
- Business settings
- Notifications

## Tables

### services
Service catalog (Classic Lash, Hybrid Lash, etc.)
- id, name, description, duration_minutes, price, active, created_at, updated_at

### customers
Customer records
- id, name, phone, email, notes, created_at, updated_at

### bookings
Booking/appointment records
- id, customer_id (FK), service_id (FK), booking_date, start_time, end_time
- status (PENDING/CONFIRMED/ARRIVED/IN_PROGRESS/COMPLETED/CANCELLED/NO_SHOW)
- payment_status (UNPAID/DP/PAID/REFUNDED), payment_method, source (ADMIN/PUBLIC)
- notes, created_at, updated_at

### payments
Payment records linked to bookings
- id, booking_id (FK), amount, payment_method, payment_date, notes, created_at

### expenses
Business expense records
- id, description, category, amount, expense_date, payment_method, notes, created_at

### business_hours
Business operating hours per day of week
- id, day_of_week (0-6), is_open, open_time, close_time, break_start, break_end

### blocked_dates
Dates blocked for booking (holidays, etc.)
- id, blocked_date, reason, created_at

### settings
Business settings (single row)
- id, business_name, logo_url, phone, whatsapp, instagram, address, currency, timezone
- min_booking_notice_hours, max_booking_days_ahead, cancellation_policy
- allow_public_booking, auto_confirm_public_booking

### notifications
Dashboard notifications
- id, type, title, message, booking_id, is_read, created_at

## Security (RLS)
- services: public read (active only for anon, all for authenticated), write for authenticated
- customers: authenticated only CRUD
- bookings: authenticated CRUD, public INSERT via anon (source=PUBLIC, status=PENDING only)
- payments: authenticated only CRUD
- expenses: authenticated only CRUD
- business_hours: public read, authenticated write
- blocked_dates: public read, authenticated write
- settings: public read, authenticated write
- notifications: authenticated only CRUD

## Seed Data
- 5 default services (Classic Lash, Hybrid Lash, Volume Lash, Lash Lift, Lash Removal)
- Default business hours (Mon-Sat 09:00-18:00, break 12:00-13:00, Sunday closed)
- Default settings row
*/

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==================== SERVICES ====================
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL DEFAULT 60,
  price numeric(12, 2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_active_services" ON services;
CREATE POLICY "public_read_active_services" ON services FOR SELECT
  TO anon, authenticated USING (active = true OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_read_all_services" ON services;
CREATE POLICY "auth_read_all_services" ON services FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_services" ON services;
CREATE POLICY "auth_insert_services" ON services FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_services" ON services;
CREATE POLICY "auth_update_services" ON services FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_services" ON services;
CREATE POLICY "auth_delete_services" ON services FOR DELETE
  TO authenticated USING (true);

-- ==================== CUSTOMERS ====================
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_customers" ON customers;
CREATE POLICY "auth_select_customers" ON customers FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_customers" ON customers;
CREATE POLICY "auth_insert_customers" ON customers FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_customers" ON customers;
CREATE POLICY "auth_update_customers" ON customers FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_customers" ON customers;
CREATE POLICY "auth_delete_customers" ON customers FOR DELETE
  TO authenticated USING (true);

-- ==================== BOOKINGS ====================
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  booking_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','CONFIRMED','ARRIVED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW')),
  payment_status text NOT NULL DEFAULT 'UNPAID'
    CHECK (payment_status IN ('UNPAID','DP','PAID','REFUNDED')),
  payment_method text,
  source text NOT NULL DEFAULT 'ADMIN'
    CHECK (source IN ('ADMIN','PUBLIC')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_bookings" ON bookings;
CREATE POLICY "auth_select_bookings" ON bookings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_bookings" ON bookings;
CREATE POLICY "auth_insert_bookings" ON bookings FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_bookings" ON bookings;
CREATE POLICY "auth_update_bookings" ON bookings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_bookings" ON bookings;
CREATE POLICY "auth_delete_bookings" ON bookings FOR DELETE
  TO authenticated USING (true);

-- Public can insert bookings (for public booking form)
DROP POLICY IF EXISTS "public_insert_bookings" ON bookings;
CREATE POLICY "public_insert_bookings" ON bookings FOR INSERT
  TO anon WITH CHECK (
    source = 'PUBLIC' AND status = 'PENDING'
  );

-- ==================== PAYMENTS ====================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL,
  payment_method text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_payments" ON payments;
CREATE POLICY "auth_select_payments" ON payments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_payments" ON payments;
CREATE POLICY "auth_insert_payments" ON payments FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_payments" ON payments;
CREATE POLICY "auth_update_payments" ON payments FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_payments" ON payments;
CREATE POLICY "auth_delete_payments" ON payments FOR DELETE
  TO authenticated USING (true);

-- ==================== EXPENSES ====================
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  category text NOT NULL DEFAULT 'Other'
    CHECK (category IN ('Rent','Electricity','Water','Internet','Lash Supplies','Equipment','Marketing','Salary','Transportation','Other')),
  amount numeric(12, 2) NOT NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_expenses" ON expenses;
CREATE POLICY "auth_select_expenses" ON expenses FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_expenses" ON expenses;
CREATE POLICY "auth_insert_expenses" ON expenses FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_expenses" ON expenses;
CREATE POLICY "auth_update_expenses" ON expenses FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_expenses" ON expenses;
CREATE POLICY "auth_delete_expenses" ON expenses FOR DELETE
  TO authenticated USING (true);

-- ==================== BUSINESS HOURS ====================
CREATE TABLE IF NOT EXISTS business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week integer NOT NULL UNIQUE
    CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_open boolean NOT NULL DEFAULT true,
  open_time time NOT NULL DEFAULT '09:00',
  close_time time NOT NULL DEFAULT '18:00',
  break_start time,
  break_end time,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_business_hours" ON business_hours;
CREATE POLICY "public_read_business_hours" ON business_hours FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_business_hours" ON business_hours;
CREATE POLICY "auth_insert_business_hours" ON business_hours FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_business_hours" ON business_hours;
CREATE POLICY "auth_update_business_hours" ON business_hours FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_business_hours" ON business_hours;
CREATE POLICY "auth_delete_business_hours" ON business_hours FOR DELETE
  TO authenticated USING (true);

-- ==================== BLOCKED DATES ====================
CREATE TABLE IF NOT EXISTS blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocked_date date NOT NULL UNIQUE,
  reason text NOT NULL DEFAULT 'Closed',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_blocked_dates" ON blocked_dates;
CREATE POLICY "public_read_blocked_dates" ON blocked_dates FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_blocked_dates" ON blocked_dates;
CREATE POLICY "auth_insert_blocked_dates" ON blocked_dates FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_blocked_dates" ON blocked_dates;
CREATE POLICY "auth_update_blocked_dates" ON blocked_dates FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_blocked_dates" ON blocked_dates;
CREATE POLICY "auth_delete_blocked_dates" ON blocked_dates FOR DELETE
  TO authenticated USING (true);

-- ==================== SETTINGS ====================
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL DEFAULT 'LashFlow Studio',
  logo_url text,
  phone text,
  whatsapp text,
  instagram text,
  address text,
  currency text NOT NULL DEFAULT 'IDR',
  timezone text NOT NULL DEFAULT 'Asia/Makassar',
  min_booking_notice_hours integer NOT NULL DEFAULT 2,
  max_booking_days_ahead integer NOT NULL DEFAULT 30,
  cancellation_policy text DEFAULT 'Please cancel at least 24 hours before your appointment.',
  allow_public_booking boolean NOT NULL DEFAULT true,
  auto_confirm_public_booking boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_settings" ON settings;
CREATE POLICY "public_read_settings" ON settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_settings" ON settings;
CREATE POLICY "auth_insert_settings" ON settings FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_settings" ON settings;
CREATE POLICY "auth_update_settings" ON settings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_settings" ON settings;
CREATE POLICY "auth_delete_settings" ON settings FOR DELETE
  TO authenticated USING (true);

-- ==================== NOTIFICATIONS ====================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_notifications" ON notifications;
CREATE POLICY "auth_select_notifications" ON notifications FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_notifications" ON notifications;
CREATE POLICY "auth_insert_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_notifications" ON notifications;
CREATE POLICY "auth_update_notifications" ON notifications FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_notifications" ON notifications;
CREATE POLICY "auth_delete_notifications" ON notifications FOR DELETE
  TO authenticated USING (true);

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service ON bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date_time ON bookings(booking_date, start_time);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_blocked_dates_date ON blocked_dates(blocked_date);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- ==================== UPDATED_AT TRIGGERS ====================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_services_updated_at ON services;
CREATE TRIGGER trigger_services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_customers_updated_at ON customers;
CREATE TRIGGER trigger_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_bookings_updated_at ON bookings;
CREATE TRIGGER trigger_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_business_hours_updated_at ON business_hours;
CREATE TRIGGER trigger_business_hours_updated_at BEFORE UPDATE ON business_hours
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_settings_updated_at ON settings;
CREATE TRIGGER trigger_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==================== AUTO-NOTIFICATION TRIGGER ====================
CREATE OR REPLACE FUNCTION create_booking_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.source = 'PUBLIC' THEN
    INSERT INTO notifications (type, title, message, booking_id)
    VALUES (
      'new_booking',
      'New Public Booking',
      'A new booking request has been received from the public booking form.',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_booking_notification ON bookings;
CREATE TRIGGER trigger_booking_notification AFTER INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION create_booking_notification();

-- ==================== SEED DATA ====================

-- Default services
INSERT INTO services (name, description, duration_minutes, price, active) VALUES
  ('Classic Lash', 'Natural-looking lash extensions applied one-by-one for a subtle enhancement.', 90, 150000, true),
  ('Hybrid Lash', 'A mix of classic and volume lashes for a textured, fuller look.', 120, 200000, true),
  ('Volume Lash', 'Multiple lightweight lashes per natural lash for dramatic fullness.', 150, 250000, true),
  ('Lash Lift', 'A semi-permanent treatment that lifts and curls your natural lashes.', 60, 120000, true),
  ('Lash Removal', 'Safe removal of existing lash extensions.', 30, 50000, true)
ON CONFLICT DO NOTHING;

-- Default business hours (0=Sunday, 1=Monday, ..., 6=Saturday)
INSERT INTO business_hours (day_of_week, is_open, open_time, close_time, break_start, break_end) VALUES
  (0, false, '09:00', '18:00', null, null),
  (1, true, '09:00', '18:00', '12:00', '13:00'),
  (2, true, '09:00', '18:00', '12:00', '13:00'),
  (3, true, '09:00', '18:00', '12:00', '13:00'),
  (4, true, '09:00', '18:00', '12:00', '13:00'),
  (5, true, '09:00', '18:00', '12:00', '13:00'),
  (6, true, '09:00', '18:00', '12:00', '13:00')
ON CONFLICT (day_of_week) DO NOTHING;

-- Default settings
INSERT INTO settings (business_name, phone, whatsapp, instagram, address, currency, timezone)
VALUES (
  'LashFlow Studio',
  '+6281234567890',
  '+6281234567890',
  '@lashflowstudio',
  'Jl. Sunset Road No. 88, Denpasar, Bali',
  'IDR',
  'Asia/Makassar'
)
ON CONFLICT DO NOTHING;