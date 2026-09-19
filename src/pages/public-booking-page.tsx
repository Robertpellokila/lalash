import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Calendar,
  Clock,
  Check,
  ChevronRight,
  ChevronLeft,
  Phone,
  Mail,
  User,
  MessageCircle,
  Instagram,
  MapPin,
  Scissors,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { cn, formatCurrency, formatTime, minutesToTime, timeToMinutes } from '@/lib/utils';
import { calculateAvailableSlots } from '@/lib/slots';
import type { Service, BusinessHour, BlockedDate, Settings } from '@/lib/types';
import { toast } from 'sonner';

const steps = ['Service', 'Date', 'Time', 'Details', 'Done'];

export function PublicBookingPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState(0);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [existingBookings, setExistingBookings] = useState<{ start_time: string; end_time: string; status: string }[]>([]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    fetchPublicData();
  }, []);

  const fetchPublicData = async () => {
    const [s, bh, bd, settingsRes] = await Promise.all([
      supabase.from('services').select('*').eq('active', true).order('name'),
      supabase.from('business_hours').select('*').order('day_of_week'),
      supabase.from('blocked_dates').select('*'),
      supabase.from('settings').select('*').maybeSingle(),
    ]);
    setServices(s.data ?? []);
    setBusinessHours(bh.data ?? []);
    setBlockedDates(bd.data ?? []);
    setSettings(settingsRes.data);
    setLoading(false);
  };

  // Fetch existing bookings when date changes
  useEffect(() => {
    if (selectedDate) {
      fetchBookingsForDate(selectedDate);
    }
  }, [selectedDate]);

  const fetchBookingsForDate = async (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const { data } = await supabase
      .from('public_booking_slots')
      .select('start_time, end_time, status')
      .eq('booking_date', dateStr);
    setExistingBookings(data ?? []);
  };

  const availableSlots = useMemo(() => {
    if (!selectedService || !selectedDate) return [];
    return calculateAvailableSlots(
      selectedDate,
      selectedService.duration_minutes,
      businessHours,
      blockedDates,
      existingBookings as never,
      settings?.min_booking_notice_hours ?? 2,
    );
  }, [selectedService, selectedDate, businessHours, blockedDates, existingBookings, settings]);

  const maxDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + (settings?.max_booking_days_ahead ?? 30));
    return d;
  }, [settings]);

  const handleNext = () => {
    if (step === 0 && !selectedService) return;
    if (step === 1 && !selectedDate) return;
    if (step === 2 && !selectedSlot) return;
    setStep((s) => Math.min(s + 1, 4));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedSlot || !name || !phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-public-booking`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          customer_name: name,
          customer_phone: phone,
          customer_email: email || undefined,
          service_id: selectedService.id,
          booking_date: selectedDate.toISOString().split('T')[0],
          start_time: selectedSlot,
          notes: notes || undefined,
        }),
      },
    );

    const result = await response.json();

    setSubmitting(false);

    if (!response.ok || result.error) {
      if (result.error?.includes('just booked') || result.error?.includes('slot')) {
        toast.error('Sorry, this slot was just booked. Please choose another available time.');
        setStep(2);
        setSelectedSlot('');
        if (selectedDate) fetchBookingsForDate(selectedDate);
      } else {
        toast.error(result.error || 'Failed to submit booking. Please try again.');
      }
    } else {
      setCompleted(true);
      setStep(4);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-pink-50/50 to-amber-50">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50/30 to-amber-50/20">
      {/* Header */}
      <header className="border-b border-rose-100/50 bg-white/60 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="logo" className="h-10 w-10 rounded-xl object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-soft">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
            )}
            <span className="text-lg font-serif font-bold">
              {settings?.business_name ?? 'LashFlow Studio'}
            </span>
          </div>
        </div>
      </header>

      {/* Hero */}
      {!completed && (
        <section className="max-w-3xl mx-auto px-4 pt-12 pb-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl font-serif font-bold text-foreground"
          >
            Book Your Lash Appointment
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-3 text-base text-muted-foreground max-w-lg mx-auto"
          >
            Choose your favorite lash service and find an available time that works for you.
          </motion.p>
        </section>
      )}

      {/* Progress Indicator */}
      {!completed && (
        <div className="max-w-3xl mx-auto px-4 mb-8">
          <div className="flex items-center justify-between">
            {steps.slice(0, 4).map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-all',
                      i < step && 'bg-primary text-primary-foreground',
                      i === step && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                      i > step && 'bg-muted text-muted-foreground',
                    )}
                  >
                    {i < step ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className={cn(
                    'mt-1.5 text-xs',
                    i <= step ? 'text-foreground font-medium' : 'text-muted-foreground',
                  )}>
                    {s}
                  </span>
                </div>
                {i < 3 && (
                  <div className={cn(
                    'flex-1 h-0.5 mx-2 -mt-5 transition-colors',
                    i < step ? 'bg-primary' : 'bg-border',
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 pb-16">
        <AnimatePresence mode="wait">
          {completed ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="relative"
            >
              {/* Success checkmark burst */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-green-100 relative"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1.8 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                  className="absolute inset-0 rounded-full bg-green-200/50"
                  style={{ originX: 0.5, originY: 0.5 }}
                />
                <motion.div
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
                >
                  <Check className="h-10 w-10 text-green-600 relative z-10" />
                </motion.div>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-6 text-2xl font-serif font-bold text-center"
              >
                Booking Request Received
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-2 text-sm text-muted-foreground text-center"
              >
                We'll confirm your appointment via WhatsApp shortly.
              </motion.p>

              {/* Receipt */}
              <motion.div
                initial={{ opacity: 0, y: 20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                transition={{ delay: 0.6, duration: 0.5, ease: 'easeOut' }}
                className="mt-6 relative max-w-sm mx-auto"
              >
                {/* Receipt paper with zigzag bottom */}
                <div className="relative bg-white border border-rose-100 rounded-t-2xl shadow-soft-lg overflow-hidden">
                  {/* Receipt header */}
                  <div className="bg-gradient-to-r from-rose-50 to-pink-50 px-6 py-4 text-center border-b border-dashed border-rose-200">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="font-serif font-bold text-lg">
                        {settings?.business_name ?? 'LashFlow Studio'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Booking Confirmation</p>
                  </div>

                  {/* Receipt body */}
                  <div className="px-6 py-4 space-y-3">
                    <div className="flex justify-between text-sm border-b border-dashed border-border pb-2">
                      <span className="text-muted-foreground">Service</span>
                      <span className="font-medium">{selectedService?.name}</span>
                    </div>
                    <div className="flex justify-between text-sm border-b border-dashed border-border pb-2">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-medium text-right">
                        {selectedDate?.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm border-b border-dashed border-border pb-2">
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-medium">{formatTime(selectedSlot)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-b border-dashed border-border pb-2">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">{selectedService?.duration_minutes} minutes</span>
                    </div>
                    <div className="flex justify-between text-sm pb-2">
                      <span className="text-muted-foreground">Customer</span>
                      <span className="font-medium">{name}</span>
                    </div>

                    {/* Total */}
                    <div className="flex justify-between items-center pt-3 border-t-2 border-dashed border-border">
                      <span className="text-sm font-semibold">Estimated Price</span>
                      <motion.span
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 }}
                        className="text-xl font-bold font-serif text-primary"
                      >
                        {formatCurrency(selectedService?.price)}
                      </motion.span>
                    </div>
                  </div>

                  {/* Status stamp */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, rotate: -15 }}
                    animate={{ opacity: 1, scale: 1, rotate: -8 }}
                    transition={{ delay: 1, type: 'spring', stiffness: 150 }}
                    className="absolute top-20 right-4 border-2 border-amber-400 rounded-lg px-3 py-1 bg-amber-50/80"
                  >
                    <span className="text-xs font-bold text-amber-600 tracking-wider">
                      PENDING
                    </span>
                  </motion.div>

                  {/* Zigzag bottom edge */}
                  <div
                    className="h-3 bg-white"
                    style={{
                      maskImage: 'linear-gradient(45deg, transparent 33%, black 33%, black 66%, transparent 66%)',
                      maskSize: '12px 6px',
                      maskRepeat: 'repeat-x',
                      WebkitMaskImage: 'linear-gradient(45deg, transparent 33%, black 33%, black 66%, transparent 66%)',
                      WebkitMaskSize: '12px 6px',
                      WebkitMaskRepeat: 'repeat-x',
                      backgroundImage: 'linear-gradient(45deg, hsl(var(--border)) 25%, transparent 25%, transparent 75%, hsl(var(--border)) 75%)',
                      backgroundSize: '12px 6px',
                    }}
                  />
                </div>

                {/* Receipt shadow tail */}
                <div className="max-w-sm mx-auto h-2 bg-rose-100/40 rounded-b-lg -mt-1 mx-4" />
              </motion.div>

              {/* Action button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="text-center mt-6"
              >
                <Button
                  onClick={() => {
                    setCompleted(false);
                    setStep(0);
                    setSelectedService(null);
                    setSelectedDate(undefined);
                    setSelectedSlot('');
                    setName('');
                    setPhone('');
                    setEmail('');
                    setNotes('');
                  }}
                  className="px-8"
                >
                  Book Another Appointment
                </Button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="rounded-3xl border border-rose-100 bg-white p-6 md:p-8 shadow-soft"
            >
              {/* Step 1: Service */}
              {step === 0 && (
                <div>
                  <h2 className="text-xl font-serif font-semibold mb-4">Choose a Service</h2>
                  <div className="space-y-3">
                    {services.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => {
                          setSelectedService(service);
                          setSelectedSlot('');
                        }}
                        className={cn(
                          'w-full text-left rounded-2xl border-2 p-4 transition-all',
                          selectedService?.id === service.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/30',
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                              <Scissors className="h-5 w-5 text-accent-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{service.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {service.duration_minutes} min · {formatCurrency(service.price)}
                              </p>
                            </div>
                          </div>
                          {selectedService?.id === service.id && (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>
                        {service.description && (
                          <p className="text-sm text-muted-foreground mt-2">{service.description}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Date */}
              {step === 1 && (
                <div>
                  <h2 className="text-xl font-serif font-semibold mb-4">Choose a Date</h2>
                  <div className="flex justify-center">
                    <CalendarPicker
                      mode="single"
                      selected={selectedDate}
                      onSelect={(d) => {
                        setSelectedDate(d);
                        setSelectedSlot('');
                      }}
                      disabled={(d) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return d < today || d > maxDate;
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Time */}
              {step === 2 && (
                <div>
                  <h2 className="text-xl font-serif font-semibold mb-4">Choose Available Time</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {selectedDate?.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  {availableSlots.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 mx-auto text-muted-foreground/40" />
                      <p className="mt-3 text-sm text-muted-foreground">
                        No available slots for this date. Please choose another date.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot.start}
                          disabled={!slot.available}
                          onClick={() => setSelectedSlot(slot.start)}
                          className={cn(
                            'rounded-xl border-2 py-3 text-sm font-medium transition-all',
                            !slot.available
                              ? 'border-border bg-muted/50 text-muted-foreground/40 cursor-not-allowed'
                              : selectedSlot === slot.start
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-white hover:border-primary/30',
                          )}
                        >
                          {slot.start}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Details */}
              {step === 3 && (
                <div>
                  <h2 className="text-xl font-serif font-semibold mb-4">Your Information</h2>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your full name"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number (WhatsApp) *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="08xxxxxxxxxx"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Email (optional)</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="email@example.com"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Notes (optional)</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any special requests or allergies..."
                        rows={3}
                      />
                    </div>
                    {/* Summary */}
                    <div className="rounded-2xl bg-muted/50 p-4 space-y-2">
                      <h4 className="text-sm font-semibold">Booking Summary</h4>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Service</span>
                        <span className="font-medium">{selectedService?.name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Date</span>
                        <span className="font-medium">
                          {selectedDate?.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Time</span>
                        <span className="font-medium">{formatTime(selectedSlot)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Price</span>
                        <span className="font-medium">{formatCurrency(selectedService?.price)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              {step < 4 && (
                <div className="flex justify-between mt-6 pt-6 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={step === 0}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>
                  {step < 3 ? (
                    <Button
                      onClick={handleNext}
                      disabled={
                        (step === 0 && !selectedService) ||
                        (step === 1 && !selectedDate) ||
                        (step === 2 && !selectedSlot)
                      }
                      className="gap-1"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting || !name || !phone}
                      className="gap-1"
                    >
                      {submitting ? 'Submitting...' : 'Submit Booking'}
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-rose-100/50 bg-white/60 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Business Hours</h4>
              <div className="space-y-1 text-muted-foreground">
                {businessHours.filter(bh => bh.is_open).map(bh => (
                  <div key={bh.id}>
                    {DAYS_SHORT[bh.day_of_week]}: {formatTime(bh.open_time)} - {formatTime(bh.close_time)}
                  </div>
                ))}
                {businessHours.some(bh => !bh.is_open) && (
                  <div className="text-muted-foreground/60">
                    {businessHours.filter(bh => !bh.is_open).map(bh => DAYS_SHORT[bh.day_of_week]).join(', ')}: Closed
                  </div>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Contact</h4>
              <div className="space-y-1 text-muted-foreground">
                {settings?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" />{settings.phone}
                  </div>
                )}
                {settings?.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />{settings.address}
                  </div>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Follow Us</h4>
              <div className="flex gap-3">
                {settings?.whatsapp && (
                  <a
                    href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-primary"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                )}
                {settings?.instagram && (
                  <a
                    href={`https://instagram.com/${settings.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-primary"
                  >
                    <Instagram className="h-4 w-4" /> Instagram
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

const DAYS_SHORT: Record<number, string> = {
  0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat',
};
