import type { Booking, BusinessHour, BlockedDate } from '@/lib/types';
import { timeToMinutes, minutesToTime } from '@/lib/utils';

export interface AvailableSlot {
  start: string;
  end: string;
  available: boolean;
}

export function getBusinessHourForDate(
  date: Date,
  businessHours: BusinessHour[],
): BusinessHour | null {
  const dayOfWeek = date.getDay();
  return businessHours.find((bh) => bh.day_of_week === dayOfWeek) ?? null;
}

export function isDateBlocked(
  date: Date,
  blockedDates: BlockedDate[],
): boolean {
  const dateStr = date.toISOString().split('T')[0];
  return blockedDates.some((bd) => bd.blocked_date === dateStr);
}

export function isDateInPast(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

export function isDateTooFarAhead(
  date: Date,
  maxDaysAhead: number,
): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + maxDaysAhead);
  return date > maxDate;
}

export function isWithinMinNotice(
  date: Date,
  startTime: string,
  minNoticeHours: number,
): boolean {
  const now = new Date();
  const slotStart = new Date(date);
  const [h, m] = startTime.split(':').map(Number);
  slotStart.setHours(h, m, 0, 0);
  const diffMs = slotStart.getTime() - now.getTime();
  return diffMs >= minNoticeHours * 60 * 60 * 1000;
}

export function calculateAvailableSlots(
  date: Date,
  serviceDurationMinutes: number,
  businessHours: BusinessHour[],
  blockedDates: BlockedDate[],
  existingBookings: Booking[],
  minNoticeHours: number = 2,
): AvailableSlot[] {
  if (isDateInPast(date)) return [];
  if (isDateBlocked(date, blockedDates)) return [];

  const bh = getBusinessHourForDate(date, businessHours);
  if (!bh || !bh.is_open) return [];

  const openMinutes = timeToMinutes(bh.open_time);
  const closeMinutes = timeToMinutes(bh.close_time);
  const breakStart = bh.break_start ? timeToMinutes(bh.break_start) : null;
  const breakEnd = bh.break_end ? timeToMinutes(bh.break_end) : null;

  const slots: AvailableSlot[] = [];

  for (let start = openMinutes; start + serviceDurationMinutes <= closeMinutes; start += 30) {
    const end = start + serviceDurationMinutes;

    // Check if slot overlaps with break time
    if (breakStart !== null && breakEnd !== null) {
      if (start < breakEnd && end > breakStart) continue;
    }

    // Check if slot overlaps with existing bookings
    const overlaps = existingBookings.some((booking) => {
      if (booking.status === 'CANCELLED' || booking.status === 'NO_SHOW') return false;
      const bookingStart = timeToMinutes(booking.start_time);
      const bookingEnd = timeToMinutes(booking.end_time);
      return start < bookingEnd && end > bookingStart;
    });

    // Check minimum notice
    const hasMinNotice = isWithinMinNotice(date, minutesToTime(start), minNoticeHours);

    slots.push({
      start: minutesToTime(start),
      end: minutesToTime(end),
      available: !overlaps && hasMinNotice,
    });
  }

  return slots;
}

export function isSlotAvailable(
  date: Date,
  startTime: string,
  endTime: string,
  existingBookings: Booking[],
  excludeBookingId?: string,
): boolean {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  return !existingBookings.some((booking) => {
    if (booking.id === excludeBookingId) return false;
    if (booking.status === 'CANCELLED' || booking.status === 'NO_SHOW') return false;
    const bookingStart = timeToMinutes(booking.start_time);
    const bookingEnd = timeToMinutes(booking.end_time);
    return start < bookingEnd && end > bookingStart;
  });
}
