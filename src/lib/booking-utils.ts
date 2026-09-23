interface BusinessHour {
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
  break_start?: string | null;
  break_end?: string | null;
}

interface BlockedDate {
  blocked_date: string;
}

interface ExistingBooking {
  start_time: string;
  end_time: string;
  status: string;
}

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
};

const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(
    2,
    "0"
  )}`;
};

export function calculateAvailableSlots(
  date: Date,
  durationMinutes: number,
  businessHours: BusinessHour[],
  blockedDates: BlockedDate[],
  existingBookings: ExistingBooking[],
  minBookingNoticeHours = 2
): string[] {
  const dateString = date.toISOString().split("T")[0];

  /**
   * ---------------------------------------------------------
   * Check blocked date
   * ---------------------------------------------------------
   */

  const isBlocked = blockedDates.some(
    (blocked) => blocked.blocked_date === dateString
  );

  if (isBlocked) {
    return [];
  }

  /**
   * ---------------------------------------------------------
   * Find business hours for selected day
   * ---------------------------------------------------------
   */

  const dayOfWeek = date.getDay();

  const businessHour = businessHours.find(
    (hour) => hour.day_of_week === dayOfWeek
  );

  if (!businessHour || !businessHour.is_open) {
    return [];
  }

  /**
   * ---------------------------------------------------------
   * Business hours
   * ---------------------------------------------------------
   */

  const openingMinutes = timeToMinutes(
    businessHour.open_time
  );

  const closingMinutes = timeToMinutes(
    businessHour.close_time
  );

  /**
   * ---------------------------------------------------------
   * Current time / minimum booking notice
   * ---------------------------------------------------------
   */

  const now = new Date();

  const selectedDateIsToday =
    dateString === now.toISOString().split("T")[0];

  let earliestAllowedMinutes = openingMinutes;

  if (selectedDateIsToday) {
    const currentMinutes =
      now.getHours() * 60 + now.getMinutes();

    earliestAllowedMinutes = Math.max(
      openingMinutes,
      currentMinutes + minBookingNoticeHours * 60
    );
  }

  /**
   * ---------------------------------------------------------
   * Break time
   * ---------------------------------------------------------
   */

  const breakStart =
    businessHour.break_start
      ? timeToMinutes(businessHour.break_start)
      : null;

  const breakEnd =
    businessHour.break_end
      ? timeToMinutes(businessHour.break_end)
      : null;

  /**
   * ---------------------------------------------------------
   * Generate slots
   *
   * Change this if you want a different interval.
   *
   * Currently:
   * 30-minute interval
   * ---------------------------------------------------------
   */

  const SLOT_INTERVAL = 30;

  const slots: string[] = [];

  for (
    let startMinutes = openingMinutes;
    startMinutes + durationMinutes <= closingMinutes;
    startMinutes += SLOT_INTERVAL
  ) {
    const endMinutes = startMinutes + durationMinutes;

    /**
     * Don't show slots before minimum notice.
     */

    if (startMinutes < earliestAllowedMinutes) {
      continue;
    }

    /**
     * -------------------------------------------------------
     * Don't allow booking across break time
     * -------------------------------------------------------
     */

    if (
      breakStart !== null &&
      breakEnd !== null
    ) {
      const overlapsBreak =
        startMinutes < breakEnd &&
        endMinutes > breakStart;

      if (overlapsBreak) {
        continue;
      }
    }

    /**
     * -------------------------------------------------------
     * Check existing bookings
     * -------------------------------------------------------
     */

    const overlapsBooking = existingBookings.some(
      (booking) => {
        /**
         * Cancelled and no-show bookings don't block slots.
         */

        if (
          booking.status === "CANCELLED" ||
          booking.status === "NO_SHOW"
        ) {
          return false;
        }

        const bookingStart = timeToMinutes(
          booking.start_time
        );

        const bookingEnd = timeToMinutes(
          booking.end_time
        );

        return (
          startMinutes < bookingEnd &&
          endMinutes > bookingStart
        );
      }
    );

    if (overlapsBooking) {
      continue;
    }

    slots.push(minutesToTime(startMinutes));
  }

  return slots;
}