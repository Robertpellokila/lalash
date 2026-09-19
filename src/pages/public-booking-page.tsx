import { useState, useEffect, useMemo, useRef } from "react";

import { motion, AnimatePresence } from "framer-motion";

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
  Printer,
  Volume2,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Calendar as CalendarPicker } from "@/components/ui/calendar";

import { cn, formatCurrency, formatTime } from "@/lib/utils";

import { calculateAvailableSlots } from "@/lib/slots";

import type { Service, BusinessHour, BlockedDate, Settings } from "@/lib/types";

import { toast } from "sonner";

const steps = ["Service", "Date", "Time", "Details", "Done"];

const DAYS_SHORT: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

const PRINT_DURATION = 6000;

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

interface ReceiptPrinterProps {
  printing: boolean;
  settings: Settings | null;
  selectedService: Service | null;
  selectedDate: Date | undefined;
  selectedSlot: string;
  name: string;
}

function ReceiptPrinter({
  printing,
  settings,
  selectedService,
  selectedDate,
  selectedSlot,
  name,
}: ReceiptPrinterProps) {
  return (
    <div className="flex flex-col items-center">
      {/* Printer status */}
      <AnimatePresence mode="wait">
        {printing ? (
          <motion.div
            key="printing-status"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-5 flex items-center gap-2 text-sm text-muted-foreground"
          >
            <motion.div
              animate={{ rotate: [0, -8, 8, -8, 0] }}
              transition={{
                duration: 0.25,
                repeat: Infinity,
                repeatDelay: 0.15,
              }}
            >
              <Printer className="h-4 w-4" />
            </motion.div>

            <span>Printing your booking receipt...</span>

            <Volume2 className="h-4 w-4 text-primary animate-pulse" />
          </motion.div>
        ) : (
          <motion.div
            key="completed-status"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-5 flex items-center gap-2 text-sm text-green-600 font-medium"
          >
            <Check className="h-4 w-4" />
            Receipt printed successfully
          </motion.div>
        )}
      </AnimatePresence>

      {/* PRINTER CONTAINER */}
      <div className="relative flex flex-col items-center w-full max-w-[340px]">
        {/* ==================== PRINTER BODY (TOP) ==================== */}
        <div className="relative z-20 w-[300px]">
          {/* Top casing */}
          <div className="relative h-[75px] rounded-t-[24px] border border-zinc-300 bg-gradient-to-b from-zinc-100 to-zinc-200 shadow-md">
            <div className="absolute left-5 right-5 top-2.5 h-1.5 rounded-full bg-white/80" />

            <div className="absolute bottom-3 left-5 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
              <span className="text-xs font-semibold text-zinc-600">
                {settings?.business_name ?? "LaaLash"}
              </span>
            </div>

            <motion.div
              animate={{
                opacity: printing ? [0.35, 1, 0.35] : 1,
              }}
              transition={{
                duration: 0.8,
                repeat: printing ? Infinity : 0,
              }}
              className="absolute bottom-4 right-5 flex items-center gap-1.5"
            >
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-medium">
                {printing ? "Printing" : "Ready"}
              </span>
            </motion.div>
          </div>

          {/* Slot Output Area */}
          <div className="relative h-[30px] border-x border-b border-zinc-300 bg-gradient-to-b from-zinc-200 to-zinc-300 rounded-b-xl shadow-md flex items-center justify-center">
            <div className="relative w-[260px] h-[10px] rounded-full bg-zinc-900 shadow-inner overflow-hidden">
              <motion.div
                animate={printing ? { x: [-10, 10, -5, 8, 0] } : { x: 0 }}
                transition={{
                  duration: 0.2,
                  repeat: printing ? Infinity : 0,
                }}
                className="h-full w-full bg-zinc-800"
              />
            </div>
          </div>
        </div>

        {/* ==================== PAPER ANIMATION AREA ==================== */}
        <div className="relative z-10 -mt-2 w-[270px] overflow-hidden pt-2 pb-6 flex flex-col items-center">
          <motion.div
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            transition={{
              duration: PRINT_DURATION / 1000,
              ease: "linear",
            }}
            className="w-full"
          >
            <div className="relative border-x border-b border-zinc-200 bg-white shadow-lg">
              {/* Receipt Header */}
              <div className="border-b border-dashed border-zinc-300 px-5 pb-4 pt-5 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-serif text-base font-bold">
                    {settings?.business_name ?? "LaaLash Studio"}
                  </span>
                </div>
                <p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                  Booking Confirmation
                </p>
              </div>

              {/* Receipt Content */}
              <div className="space-y-3 px-5 py-4">
                <div className="flex justify-between gap-4 border-b border-dashed border-zinc-200 pb-2 text-xs">
                  <span className="text-muted-foreground">Service</span>
                  <span className="text-right font-medium">
                    {selectedService?.name}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-b border-dashed border-zinc-200 pb-2 text-xs">
                  <span className="text-muted-foreground">Date</span>
                  <span className="text-right font-medium">
                    {selectedDate?.toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-b border-dashed border-zinc-200 pb-2 text-xs">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium">
                    {formatTime(selectedSlot)}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-b border-dashed border-zinc-200 pb-2 text-xs">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">
                    {selectedService?.duration_minutes} min
                  </span>
                </div>

                <div className="flex justify-between gap-4 pb-1 text-xs">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="text-right font-medium">{name}</span>
                </div>

                <div className="flex items-center justify-between border-t-2 border-dashed border-zinc-300 pt-3">
                  <span className="text-xs font-semibold">Estimated Price</span>
                  <span className="font-serif text-base font-bold text-primary">
                    {formatCurrency(selectedService?.price)}
                  </span>
                </div>
              </div>

              {/* Stamp */}
              <motion.div
                initial={{ opacity: 0, scale: 0.4, rotate: -15 }}
                animate={{
                  opacity: printing ? 0 : 1,
                  scale: printing ? 0.4 : 1,
                  rotate: -8,
                }}
                transition={{ duration: 0.4, type: "spring" }}
                className="absolute right-3 top-[135px] rounded-lg border-2 border-amber-400 bg-amber-50/90 px-2.5 py-1 shadow-sm"
              >
                <span className="text-[9px] font-bold tracking-wider text-amber-600">
                  PENDING
                </span>
              </motion.div>

              {/* Barcode */}
              <div className="px-5 pb-4 pt-2">
                <div className="flex h-8 items-end justify-center gap-[2px] opacity-70">
                  {Array.from({ length: 32 }).map((_, index) => (
                    <div
                      key={index}
                      className="bg-zinc-800"
                      style={{
                        width: index % 4 === 0 ? "3px" : "1px",
                        height:
                          index % 3 === 0
                            ? "30px"
                            : index % 2 === 0
                              ? "22px"
                              : "26px",
                      }}
                    />
                  ))}
                </div>
                <p className="mt-2 text-center text-[8px] tracking-[0.35em] text-muted-foreground">
                  THANK YOU
                </p>
              </div>

              {/* Zigzag bottom edge */}
              <div
                className="h-3 w-full"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, transparent 50%, white 50%), linear-gradient(45deg, transparent 50%, white 50%)",
                  backgroundSize: "12px 12px",
                  backgroundPosition: "0 0, 6px 0",
                }}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function PublicBookingPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState("");

  const [existingBookings, setExistingBookings] = useState<
    { start_time: string; end_time: string; status: string }[]
  >([]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [printing, setPrinting] = useState(false);

  const printerAudioRef = useRef<HTMLAudioElement | null>(null);

  /*
   * Corrected Sound path: thermal-print.mp3
   */
  useEffect(() => {
    const audio = new Audio("/sounds/thermal-print.mp3");

    audio.preload = "auto";
    audio.volume = 0.65;

    printerAudioRef.current = audio;

    return () => {
      audio.pause();
      audio.currentTime = 0;
      printerAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!printing) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPrinting(false);
      if (printerAudioRef.current) {
        printerAudioRef.current.pause();
        printerAudioRef.current.currentTime = 0;
      }
    }, PRINT_DURATION);

    return () => {
      window.clearTimeout(timer);
    };
  }, [printing]);

  useEffect(() => {
    fetchPublicData();
  }, []);

  const fetchPublicData = async () => {
    const [
      servicesResponse,
      businessHoursResponse,
      blockedDatesResponse,
      settingsResponse,
    ] = await Promise.all([
      supabase.from("services").select("*").eq("active", true).order("name"),
      supabase.from("business_hours").select("*").order("day_of_week"),
      supabase.from("blocked_dates").select("*"),
      supabase.from("settings").select("*").maybeSingle(),
    ]);

    setServices(servicesResponse.data ?? []);
    setBusinessHours(businessHoursResponse.data ?? []);
    setBlockedDates(blockedDatesResponse.data ?? []);
    setSettings(settingsResponse.data);

    setLoading(false);
  };

  useEffect(() => {
    if (selectedDate) {
      fetchBookingsForDate(selectedDate);
    }
  }, [selectedDate]);

  const fetchBookingsForDate = async (date: Date) => {
    const dateString = toLocalDateString(date);

    const { data } = await supabase
      .from("public_booking_slots")
      .select("start_time, end_time, status")
      .eq("booking_date", dateString);

    setExistingBookings(data ?? []);
  };

  const availableSlots = useMemo(() => {
    if (!selectedService || !selectedDate) {
      return [];
    }

    return calculateAvailableSlots(
      selectedDate,
      selectedService.duration_minutes,
      businessHours,
      blockedDates,
      existingBookings as never,
      settings?.min_booking_notice_hours ?? 2,
    );
  }, [
    selectedService,
    selectedDate,
    businessHours,
    blockedDates,
    existingBookings,
    settings,
  ]);

  const maxDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + (settings?.max_booking_days_ahead ?? 30));
    return date;
  }, [settings]);

  const stopPrinterSound = () => {
    if (printerAudioRef.current) {
      printerAudioRef.current.pause();
      printerAudioRef.current.currentTime = 0;
    }
  };

  const playPrinterSound = () => {
    const audio = printerAudioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    audio.volume = 0.65;

    audio.play().catch((error) => {
      console.error("Printer sound failed:", error);
    });
  };

  const handleNext = () => {
    if (step === 0 && !selectedService) {
      toast.error("Please choose a service");
      return;
    }

    if (step === 1 && !selectedDate) {
      toast.error("Please choose a date");
      return;
    }

    if (step === 2 && !selectedSlot) {
      toast.error("Please choose a time");
      return;
    }

    setStep((currentStep) => Math.min(currentStep + 1, 4));
  };

  const handleBack = () => {
    setStep((currentStep) => Math.max(currentStep - 1, 0));
  };

  const handleSubmit = async () => {
    if (
      !selectedService ||
      !selectedDate ||
      !selectedSlot ||
      !name.trim() ||
      !phone.trim()
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);

    // Trigger sound instantly on user click gesture
    playPrinterSound();

    const payload = {
      customer_name: name.trim(),
      customer_phone: phone.trim(),
      customer_email: email.trim() || undefined,
      service_id: selectedService.id,
      booking_date: toLocalDateString(selectedDate),
      start_time: selectedSlot,
      notes: notes.trim() || undefined,
    };

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-public-booking`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify(payload),
        },
      );

      const responseText = await response.text();
      let result: { error?: string; message?: string } = {};

      try {
        result = JSON.parse(responseText);
      } catch {
        // Ignore
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            result.message ||
            `Request failed with status ${response.status}`,
        );
      }

      setCompleted(true);
      setPrinting(true);
      setStep(4);
    } catch (error) {
      stopPrinterSound();
      const message =
        error instanceof Error
          ? error.message
          : "Failed to submit booking. Please try again.";

      if (
        message.toLowerCase().includes("just booked") ||
        message.toLowerCase().includes("slot")
      ) {
        toast.error(
          "Sorry, this slot was just booked. Please choose another available time.",
        );
        setStep(2);
        setSelectedSlot("");
        if (selectedDate) fetchBookingsForDate(selectedDate);
      } else {
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookAnother = () => {
    stopPrinterSound();

    setCompleted(false);
    setPrinting(false);
    setStep(0);

    setSelectedService(null);
    setSelectedDate(undefined);
    setSelectedSlot("");

    setName("");
    setPhone("");
    setEmail("");
    setNotes("");

    setExistingBookings([]);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-50 via-pink-50/50 to-amber-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50/30 to-amber-50/20">
      <header className="sticky top-0 z-30 border-b border-rose-100/50 bg-white/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt="Logo"
                className="h-10 w-10 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-soft">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
            )}

            <span className="font-serif text-lg font-bold">
              {settings?.business_name ?? "LaaLash Studio"}
            </span>
          </div>
        </div>
      </header>

      {!completed && (
        <section className="mx-auto max-w-3xl px-4 pb-8 pt-12 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-serif text-3xl font-bold text-foreground md:text-4xl"
          >
            Book Your Lash Appointment
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-3 max-w-lg text-base text-muted-foreground"
          >
            Choose your favorite lash service and find an available time that
            works for you.
          </motion.p>
        </section>
      )}

      {!completed && (
        <div className="mx-auto mb-8 max-w-xl px-4">
          <div className="relative flex items-center justify-between">
            {/* GARIS LATAR BELAKANG (INACTIVE) */}
            <div className="absolute left-0 top-4 -z-0 h-0.5 w-full bg-border" />

            {/* GARIS PROGRESS AKTIF (ANIMASI FILL) */}
            <div
              className="absolute left-0 top-4 -z-0 h-0.5 bg-primary transition-all duration-300 ease-in-out"
              style={{
                width: `${(step / (steps.slice(0, 4).length - 1)) * 100}%`,
              }}
            />

            {/* ANGKAH & LABEL STEP */}
            {steps.slice(0, 4).map((stepName, index) => {
              const isCompleted = index < step;
              const isCurrent = index === step;

              return (
                <div
                  key={stepName}
                  className="relative z-10 flex flex-col items-center"
                >
                  {/* LINGKARAN ANGKAH */}
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200 bg-white ring-4 ring-white shadow-sm",

                      isCompleted &&
                        "bg-primary text-primary-foreground ring-white",

                      isCurrent &&
                        "bg-primary text-primary-foreground ring-4 ring-primary/20",

                      !isCompleted &&
                        !isCurrent &&
                        "bg-muted text-muted-foreground ring-white",
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4 stroke-[2.5]" />
                    ) : (
                      index + 1
                    )}
                  </div>

                  {/* TEXT LABEL */}
                  <span
                    className={cn(
                      "mt-2 text-xs transition-colors text-center",

                      index <= step
                        ? "font-semibold text-foreground"
                        : "font-medium text-muted-foreground",
                    )}
                  >
                    {stepName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-3xl px-4 pb-16">
        <AnimatePresence mode="wait">
          {completed ? (
            <motion.div
              key="completed"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-3xl border border-rose-100 bg-white p-5 shadow-soft md:p-8"
            >
              <div className="mb-7 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100"
                >
                  <Check className="h-8 w-8 text-green-600" />
                </motion.div>

                <h2 className="mt-4 font-serif text-2xl font-bold">
                  Booking Request Received
                </h2>

                <p className="mt-2 text-sm text-muted-foreground">
                  We'll confirm your appointment via WhatsApp shortly.
                </p>
              </div>

              <ReceiptPrinter
                printing={printing}
                settings={settings}
                selectedService={selectedService}
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
                name={name}
              />

              <AnimatePresence>
                {!printing && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mt-5 text-center"
                  >
                    <p className="mx-auto max-w-md text-sm text-muted-foreground">
                      Your booking has been received. Please wait for
                      confirmation from our team via WhatsApp.
                    </p>

                    <Button
                      onClick={handleBookAnother}
                      className="mt-6 gap-2 px-8"
                    >
                      <Calendar className="h-4 w-4" />
                      Book Another Appointment
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="rounded-3xl border border-rose-100 bg-white p-6 shadow-soft md:p-8"
            >
              {/* SERVICE */}
              {step === 0 && (
                <div>
                  <h2 className="mb-4 font-serif text-xl font-semibold text-foreground">
                    Choose a Service
                  </h2>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {services.map((service) => {
                      const isSelected = selectedService?.id === service.id;

                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => {
                            setSelectedService(service);
                            setSelectedSlot("");
                          }}
                          className={cn(
                            "group relative flex flex-col overflow-hidden rounded-2xl border-2 bg-white text-left transition-all duration-200 hover:shadow-md",
                            isSelected
                              ? "border-primary bg-primary/[0.02] ring-2 ring-primary/20 shadow-sm"
                              : "border-border hover:border-primary/40",
                          )}
                        >
                          {/* GAMBAR BESAR DI ATAS CARD */}
                          <div className="relative h-44 w-full overflow-hidden bg-muted">
                            {service.image_url ? (
                              <img
                                src={service.image_url}
                                alt={service.name}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  e.currentTarget.parentElement?.classList.add(
                                    "flex",
                                    "items-center",
                                    "justify-center",
                                    "bg-accent",
                                  );
                                }}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-accent text-accent-foreground">
                                <Scissors className="h-10 w-10 opacity-70" />
                              </div>
                            )}

                            {/* OVERLAY DURASI / BADGE */}
                            <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md">
                              {service.duration_minutes} min
                            </div>

                            {/* CHECKMARK INDICATOR */}
                            <div
                              className={cn(
                                "absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border shadow-sm transition-all duration-200",
                                isSelected
                                  ? "border-primary bg-primary text-white scale-100"
                                  : "border-white/80 bg-white/70 text-transparent backdrop-blur-md scale-90",
                              )}
                            >
                              <Check className="h-4 w-4 stroke-[3]" />
                            </div>
                          </div>

                          {/* DETAIL KONTEN DI BAWAH GAMBAR */}
                          <div className="flex flex-1 flex-col justify-between p-4">
                            <div>
                              <h3 className="font-semibold text-foreground text-base group-hover:text-primary transition-colors">
                                {service.name}
                              </h3>

                              {service.description && (
                                <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                                  {service.description}
                                </p>
                              )}
                            </div>

                            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                              <span className="text-xs font-medium text-muted-foreground">
                                Estimated Price
                              </span>
                              <span className="font-serif text-base font-bold text-primary">
                                {formatCurrency(service.price)}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div>
                  <h2 className="mb-4 font-serif text-xl font-semibold">
                    Choose a Date
                  </h2>

                  <div className="flex justify-center">
                    <CalendarPicker
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setSelectedSlot("");
                      }}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today || date > maxDate;
                      }}
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h2 className="mb-4 font-serif text-xl font-semibold">
                    Choose Available Time
                  </h2>

                  <p className="mb-4 text-sm text-muted-foreground">
                    {selectedDate?.toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </p>

                  {availableSlots.length === 0 ? (
                    <div className="py-8 text-center">
                      <Calendar className="mx-auto h-12 w-12 text-muted-foreground/40" />

                      <p className="mt-3 text-sm text-muted-foreground">
                        No available slots for this date. Please choose another
                        date.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot.start}
                          disabled={!slot.available}
                          onClick={() => setSelectedSlot(slot.start)}
                          className={cn(
                            "rounded-xl border-2 py-3 text-sm font-medium transition-all",
                            !slot.available &&
                              "cursor-not-allowed border-border bg-muted/50 text-muted-foreground/40",
                            slot.available &&
                              selectedSlot === slot.start &&
                              "border-primary bg-primary text-primary-foreground",
                            slot.available &&
                              selectedSlot !== slot.start &&
                              "border-border bg-white hover:border-primary/30",
                          )}
                        >
                          {slot.start}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div>
                  <h2 className="mb-4 font-serif text-xl font-semibold">
                    Your Information
                  </h2>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          placeholder="Your full name"
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Phone Number (WhatsApp) *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={phone}
                          onChange={(event) => setPhone(event.target.value)}
                          placeholder="08xxxxxxxxxx"
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Email (optional)</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="email@example.com"
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Notes (optional)</Label>
                      <Textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        placeholder="Any special requests or allergies..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2 rounded-2xl bg-muted/50 p-4">
                      <h4 className="text-sm font-semibold">Booking Summary</h4>

                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Service</span>
                        <span className="font-medium">
                          {selectedService?.name}
                        </span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Date</span>
                        <span className="font-medium">
                          {selectedDate?.toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Time</span>
                        <span className="font-medium">
                          {formatTime(selectedSlot)}
                        </span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Price</span>
                        <span className="font-medium">
                          {formatCurrency(selectedService?.price)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-between border-t border-border pt-6">
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
                    disabled={submitting || !name.trim() || !phone.trim()}
                    className="gap-1"
                  >
                    {submitting ? "Submitting..." : "Submit Booking"}
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-rose-100/50 bg-white/60 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="grid grid-cols-1 gap-6 text-sm sm:grid-cols-3">
            <div>
              <h4 className="mb-2 font-semibold">Business Hours</h4>
              <div className="space-y-1 text-muted-foreground">
                {businessHours
                  .filter((hour) => hour.is_open)
                  .map((hour) => (
                    <div key={hour.id}>
                      {DAYS_SHORT[hour.day_of_week]}:{" "}
                      {formatTime(hour.open_time)} -{" "}
                      {formatTime(hour.close_time)}
                    </div>
                  ))}

                {businessHours.some((hour) => !hour.is_open) && (
                  <div className="text-muted-foreground/60">
                    {businessHours
                      .filter((hour) => !hour.is_open)
                      .map((hour) => DAYS_SHORT[hour.day_of_week])
                      .join(", ")}
                    : Closed
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-semibold">Contact</h4>
              <div className="space-y-2 text-muted-foreground">
                {settings?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" />
                    {settings.phone}
                  </div>
                )}

                {settings?.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    {settings.address}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-semibold">Follow Us</h4>
              <div className="flex flex-col gap-2">
                {settings?.whatsapp && (
                  <a
                    href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-primary"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>
                )}

                {settings?.instagram && (
                  <a
                    href={`https://instagram.com/${settings.instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-primary"
                  >
                    <Instagram className="h-4 w-4" />
                    Instagram
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
