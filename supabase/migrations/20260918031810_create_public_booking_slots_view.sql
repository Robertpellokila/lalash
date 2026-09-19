/*
# Create public_booking_slots view

## Purpose
The public booking page needs to check which time slots are already taken to show
available slots to customers. However, the `bookings` table is protected by RLS —
only authenticated users can SELECT from it. This view exposes only the minimal
information needed (date, start/end time, status) without any customer data,
and is readable by the anon role.

## Changes
- Create view `public_booking_slots` with columns: booking_date, start_time, end_time, status
- Only includes non-cancelled, non-no-show bookings
- Grant SELECT on this view to anon and authenticated
*/

CREATE OR REPLACE VIEW public_booking_slots AS
SELECT
  booking_date,
  start_time,
  end_time,
  status
FROM bookings
WHERE status NOT IN ('CANCELLED', 'NO_SHOW');

GRANT SELECT ON public_booking_slots TO anon, authenticated;