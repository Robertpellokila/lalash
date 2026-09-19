import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Clock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageTransition } from '@/components/shared/page-transition';
import { StatusBadge } from '@/components/shared/status-badges';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn, formatCurrency, formatDate, formatTime, timeToMinutes, minutesToTime } from '@/lib/utils';
import type { Booking, BusinessHour } from '@/lib/types';
import { QuickBookingModal } from '@/components/booking/quick-booking-modal';
import { toast } from 'sonner';

type ViewMode = 'month' | 'week' | 'day' | 'agenda';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickBookingOpen, setQuickBookingOpen] = useState(false);
  const [draggedBooking, setDraggedBooking] = useState<Booking | null>(null);
  const [dropTarget, setDropTarget] = useState<{ date: string; time: string } | null>(null);
  const [confirmMove, setConfirmMove] = useState<{
    booking: Booking;
    newDate: string;
    newStart: string;
    newEnd: string;
  } | null>(null);

  useEffect(() => {
    fetchBookings();
  }, [currentDate, viewMode]);

  const fetchBookings = async () => {
    setLoading(true);
    let startDate: Date;
    let endDate: Date;

    if (viewMode === 'month') {
      startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    } else if (viewMode === 'week') {
      const day = currentDate.getDay();
      startDate = new Date(currentDate);
      startDate.setDate(startDate.getDate() - day);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
    } else {
      startDate = new Date(currentDate);
      endDate = new Date(currentDate);
    }

    const { data } = await supabase
      .from('bookings')
      .select('*, customer:customers(*), service:services(*)')
      .gte('booking_date', startDate.toISOString().split('T')[0])
      .lte('booking_date', endDate.toISOString().split('T')[0])
      .order('start_time', { ascending: true });

    const normalized = (data ?? []).map((b) => ({
      ...b,
      start_time: b.start_time.slice(0, 5),
      end_time: b.end_time.slice(0, 5),
    }));

    setBookings(normalized);
    setLoading(false);
  };

  const navigate = (direction: number) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + direction * 7);
    } else {
      newDate.setDate(newDate.getDate() + direction);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => setCurrentDate(new Date());

  const getBookingsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return bookings.filter(
      (b) => b.booking_date === dateStr && b.status !== 'CANCELLED',
    );
  };

  const handleDragStart = (e: React.DragEvent, booking: Booking) => {
    setDraggedBooking(booking);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, date: string, time: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget({ date, time });
  };

  const handleDrop = (e: React.DragEvent, date: string, time: string) => {
    e.preventDefault();
    if (!draggedBooking) return;

    const service = draggedBooking.service;
    if (!service) return;

    const newStart = time;
    const newEnd = minutesToTime(timeToMinutes(time) + service.duration_minutes);

    setConfirmMove({
      booking: draggedBooking,
      newDate: date,
      newStart,
      newEnd,
    });

    setDraggedBooking(null);
    setDropTarget(null);
  };

  const confirmMoveBooking = async () => {
    if (!confirmMove) return;
    const { error } = await supabase
      .from('bookings')
      .update({
        booking_date: confirmMove.newDate,
        start_time: confirmMove.newStart,
        end_time: confirmMove.newEnd,
      })
      .eq('id', confirmMove.booking.id);

    if (error) {
      toast.error('Failed to move booking: ' + error.message);
    } else {
      toast.success('Booking moved successfully');
      fetchBookings();
    }
    setConfirmMove(null);
  };

  // Week view rendering
  const weekDays = useMemo(() => {
    const day = currentDate.getDay();
    const start = new Date(currentDate);
    start.setDate(start.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = 8; h <= 19; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
      slots.push(`${String(h).padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

  const headerTitle = useMemo(() => {
    if (viewMode === 'month') {
      return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    } else if (viewMode === 'week') {
      const start = weekDays[0];
      const end = weekDays[6];
      return `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  }, [viewMode, currentDate, weekDays]);

  return (
    <PageTransition>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-serif font-bold">Calendar</h1>
            <p className="text-sm text-muted-foreground mt-1">{headerTitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigate(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {(['month', 'week', 'day', 'agenda'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all',
                    viewMode === mode
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={() => setQuickBookingOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Booking
            </Button>
          </div>
        </div>

        {/* Calendar Content */}
        <div className="flex-1 rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
          ) : viewMode === 'month' ? (
            <MonthView
              currentDate={currentDate}
              bookings={bookings}
              onDayClick={(d) => {
                setCurrentDate(d);
                setViewMode('day');
              }}
            />
          ) : viewMode === 'week' ? (
            <WeekView
              weekDays={weekDays}
              timeSlots={timeSlots}
              getBookingsForDate={getBookingsForDate}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              dropTarget={dropTarget}
              currentDate={currentDate}
            />
          ) : viewMode === 'day' ? (
            <DayView
              date={currentDate}
              timeSlots={timeSlots}
              bookings={getBookingsForDate(currentDate)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              dropTarget={dropTarget}
            />
          ) : (
            <AgendaView
              currentDate={currentDate}
              bookings={bookings}
            />
          )}
        </div>
      </div>

      <QuickBookingModal open={quickBookingOpen} onOpenChange={setQuickBookingOpen} />

      {/* Move Confirmation Modal */}
      <Dialog open={!!confirmMove} onOpenChange={() => setConfirmMove(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif">Move appointment?</DialogTitle>
          </DialogHeader>
          {confirmMove && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Old</p>
                  <p className="text-sm font-medium">
                    {formatDate(confirmMove.booking.booking_date)},{' '}
                    {formatTime(confirmMove.booking.start_time)} - {formatTime(confirmMove.booking.end_time)}
                  </p>
                </div>
                <div className="border-t border-border pt-2">
                  <p className="text-xs text-muted-foreground">New</p>
                  <p className="text-sm font-medium">
                    {formatDate(confirmMove.newDate)},{' '}
                    {formatTime(confirmMove.newStart)} - {formatTime(confirmMove.newEnd)}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setConfirmMove(null)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={confirmMoveBooking} className="flex-1">
                  Confirm
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}

// Month View
function MonthView({
  currentDate,
  bookings,
  onDayClick,
}: {
  currentDate: Date;
  bookings: Booking[];
  onDayClick: (date: Date) => void;
}) {
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const startDay = firstDay.getDay();
  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0,
  ).getDate();
  const days: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
  }
  while (days.length % 7 !== 0) days.push(null);

  const today = new Date().toDateString();

  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-7 border-b border-border">
        {DAYS.map((day) => (
          <div key={day} className="px-2 py-3 text-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 auto-rows-fr">
        {days.map((date, i) => {
          if (!date) return <div key={i} className="border-r border-b border-border bg-muted/30" />;
          const dayBookings = bookings.filter(
            (b) => b.booking_date === date.toISOString().split('T')[0] && b.status !== 'CANCELLED',
          );
          const isToday = date.toDateString() === today;
          return (
            <div
              key={i}
              onClick={() => onDayClick(date)}
              className={cn(
                'border-r border-b border-border p-1.5 cursor-pointer hover:bg-accent/30 transition-colors min-h-[80px]',
                isToday && 'bg-primary/5',
              )}
            >
              <div
                className={cn(
                  'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium',
                  isToday ? 'bg-primary text-primary-foreground' : 'text-foreground',
                )}
              >
                {date.getDate()}
              </div>
              <div className="mt-1 space-y-1">
                {dayBookings.slice(0, 3).map((b) => (
                  <div
                    key={b.id}
                    className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary truncate"
                  >
                    {formatTime(b.start_time)} {b.customer?.name}
                  </div>
                ))}
                {dayBookings.length > 3 && (
                  <div className="text-[10px] text-muted-foreground px-1.5">
                    +{dayBookings.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Week View
function WeekView({
  weekDays,
  timeSlots,
  getBookingsForDate,
  onDragStart,
  onDragOver,
  onDrop,
  dropTarget,
  currentDate,
}: {
  weekDays: Date[];
  timeSlots: string[];
  getBookingsForDate: (d: Date) => Booking[];
  onDragStart: (e: React.DragEvent, b: Booking) => void;
  onDragOver: (e: React.DragEvent, date: string, time: string) => void;
  onDrop: (e: React.DragEvent, date: string, time: string) => void;
  dropTarget: { date: string; time: string } | null;
  currentDate: Date;
}) {
  const today = new Date().toDateString();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 8 * 60; // Scroll to 8:00 AM
    }
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
        <div className="border-r border-border" />
        {weekDays.map((day) => {
          const isToday = day.toDateString() === today;
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'border-r border-border py-2 text-center',
                isToday && 'bg-primary/5',
              )}
            >
              <div className="text-xs font-medium text-muted-foreground">
                {DAYS[day.getDay()]}
              </div>
              <div
                className={cn(
                  'inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium mt-0.5',
                  isToday ? 'bg-primary text-primary-foreground' : 'text-foreground',
                )}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>
      {/* Time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {timeSlots.map((time, timeIdx) => (
            <div key={time} className="contents">
              <div className="border-r border-b border-border py-1 pr-2 text-right text-[10px] text-muted-foreground">
                {timeIdx % 2 === 0 ? time : ''}
              </div>
              {weekDays.map((day) => {
                const dateStr = day.toISOString().split('T')[0];
                const dayBookings = getBookingsForDate(day).filter(
                  (b) => b.start_time <= time && b.end_time > time,
                );
                const isDropTarget =
                  dropTarget?.date === dateStr && dropTarget?.time === time;
                return (
                  <div
                    key={day.toISOString() + time}
                    onDragOver={(e) => onDragOver(e, dateStr, time)}
                    onDrop={(e) => onDrop(e, dateStr, time)}
                    className={cn(
                      'border-r border-b border-border min-h-[30px] relative calendar-slot',
                      isDropTarget && 'calendar-slot-drag-over',
                    )}
                  >
                    {dayBookings.map((booking) => {
                      const isStart = booking.start_time === time;
                      if (!isStart) return null;
                      const durationSlots = Math.ceil(
                        (timeToMinutes(booking.end_time) - timeToMinutes(booking.start_time)) / 30,
                      );
                      return (
                        <div
                          key={booking.id}
                          draggable
                          onDragStart={(e) => onDragStart(e, booking)}
                          className="absolute inset-x-0.5 rounded-md bg-primary/90 text-white px-2 py-1 text-[10px] cursor-grab hover:bg-primary shadow-soft z-10"
                          style={{
                            top: '1px',
                            height: `${durationSlots * 30 - 2}px`,
                          }}
                        >
                          <div className="font-medium truncate">
                            {booking.customer?.name}
                          </div>
                          <div className="truncate opacity-90">
                            {booking.service?.name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Day View
function DayView({
  date,
  timeSlots,
  bookings,
  onDragStart,
  onDragOver,
  onDrop,
  dropTarget,
}: {
  date: Date;
  timeSlots: string[];
  bookings: Booking[];
  onDragStart: (e: React.DragEvent, b: Booking) => void;
  onDragOver: (e: React.DragEvent, date: string, time: string) => void;
  onDrop: (e: React.DragEvent, date: string, time: string) => void;
  dropTarget: { date: string; time: string } | null;
}) {
  const dateStr = date.toISOString().split('T')[0];
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 8 * 60;
    }
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border py-3 px-4">
        <h3 className="text-sm font-semibold">
          {date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h3>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[80px_1fr]">
          {timeSlots.map((time) => {
            const slotBookings = bookings.filter(
              (b) => b.start_time <= time && b.end_time > time,
            );
            const isDropTarget = dropTarget?.time === time;
            return (
              <div key={time} className="contents">
                <div className="border-r border-b border-border py-2 px-3 text-xs text-muted-foreground">
                  {time}
                </div>
                <div
                  onDragOver={(e) => onDragOver(e, dateStr, time)}
                  onDrop={(e) => onDrop(e, dateStr, time)}
                  className={cn(
                    'border-b border-border min-h-[40px] relative calendar-slot',
                    isDropTarget && 'calendar-slot-drag-over',
                  )}
                >
                  {slotBookings.map((booking) => {
                    const isStart = booking.start_time === time;
                    if (!isStart) return null;
                    const durationSlots = Math.ceil(
                      (timeToMinutes(booking.end_time) - timeToMinutes(booking.start_time)) / 30,
                    );
                    return (
                      <div
                        key={booking.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, booking)}
                        className="absolute inset-x-2 rounded-lg bg-primary/90 text-white px-3 py-2 cursor-grab hover:bg-primary shadow-soft z-10"
                        style={{
                          top: '2px',
                          height: `${durationSlots * 40 - 4}px`,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {booking.customer?.name}
                          </span>
                          <StatusBadge status={booking.status} />
                        </div>
                        <div className="text-xs mt-0.5 opacity-90">
                          {booking.service?.name} · {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                        </div>
                        <div className="text-xs mt-0.5 font-medium">
                          {formatCurrency(booking.service?.price)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Agenda View
function AgendaView({
  currentDate,
  bookings,
}: {
  currentDate: Date;
  bookings: Booking[];
}) {
  const sorted = [...bookings]
    .filter((b) => b.status !== 'CANCELLED')
    .sort((a, b) =>
      (a.booking_date + a.start_time).localeCompare(b.booking_date + b.start_time),
    );

  const grouped = new Map<string, Booking[]>();
  sorted.forEach((b) => {
    const list = grouped.get(b.booking_date) ?? [];
    list.push(b);
    grouped.set(b.booking_date, list);
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (sorted.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        No bookings in this period
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      {Array.from(grouped.entries()).map(([date, dayBookings]) => {
        const d = new Date(date);
        return (
          <div key={date} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold">
                {dayNames[d.getDay()]}, {d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}
              </h3>
              <span className="text-xs text-muted-foreground">
                ({dayBookings.length} booking{dayBookings.length > 1 ? 's' : ''})
              </span>
            </div>
            <div className="space-y-2">
              {dayBookings.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-4 rounded-xl border border-border bg-background p-3 hover:shadow-soft transition-shadow"
                >
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-semibold">{formatTime(b.start_time)}</span>
                    <span className="text-xs text-muted-foreground">{formatTime(b.end_time)}</span>
                  </div>
                  <div className="w-px h-10 bg-border" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{b.customer?.name}</p>
                    <p className="text-xs text-muted-foreground">{b.service?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(b.service?.price)}</p>
                    <StatusBadge status={b.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
