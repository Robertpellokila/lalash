import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Calendar,
  Clock,
  Phone,
  MessageCircle,
  X,
  CheckCircle2,
  XCircle,
  UserCheck,
  Play,
  PlayCircle,
  CalendarClock,
  CalendarX,
  Sparkles,
  Plus,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PageTransition } from "@/components/shared/page-transition";
import { StatusBadge, PaymentBadge } from "@/components/shared/status-badges";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  cn,
  formatCurrency,
  formatDate,
  formatTime,
  generateWhatsAppUrl,
} from "@/lib/utils";
import type { Booking, BookingStatus, Service, Customer } from "@/lib/types";
import { toast } from "sonner";

const statusActions: {
  status: BookingStatus;
  label: string;
  icon: typeof CheckCircle2;
}[] = [
  { status: "CONFIRMED", label: "Confirm", icon: CheckCircle2 },
  { status: "ARRIVED", label: "Mark Arrived", icon: UserCheck },
  { status: "IN_PROGRESS", label: "Start", icon: Play },
  { status: "COMPLETED", label: "Complete", icon: PlayCircle },
  { status: "CANCELLED", label: "Cancel", icon: XCircle },
  { status: "NO_SHOW", label: "No Show", icon: CalendarX },
];

export function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [paymentFilter, setPaymentFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("bookings")
      .select("*, customer:customers(*), service:services(*)")
      .order("booking_date", { ascending: false })
      .order("start_time", { ascending: true });

    if (error) {
      console.error("FETCH BOOKINGS ERROR:", error);
      toast.error(error.message);
      setBookings([]);
    } else {
      setBookings(data ?? []);
    }

    setLoading(false);
  };

  const filtered = useMemo(() => {
    let result = bookings;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.customer?.name?.toLowerCase().includes(q) ||
          b.service?.name?.toLowerCase().includes(q) ||
          b.customer?.phone?.includes(q),
      );
    }
    if (statusFilter !== "ALL") {
      result = result.filter((b) => b.status === statusFilter);
    }
    if (paymentFilter !== "ALL") {
      result = result.filter((b) => b.payment_status === paymentFilter);
    }
    if (sortBy === "newest") {
      result = [...result].sort((a, b) =>
        (b.booking_date + b.start_time).localeCompare(
          a.booking_date + a.start_time,
        ),
      );
    } else if (sortBy === "oldest") {
      result = [...result].sort((a, b) =>
        (a.booking_date + a.start_time).localeCompare(
          b.booking_date + b.start_time,
        ),
      );
    }
    return result;
  }, [bookings, search, statusFilter, paymentFilter, sortBy]);

  const updateBookingStatus = async (
    bookingId: string,
    status: BookingStatus,
  ) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", bookingId);
    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Booking marked as ${status.replace("_", " ")}`);
      fetchBookings();
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking({ ...selectedBooking, status });
      }
    }
  };

  const updatePaymentStatus = async (
    bookingId: string,
    paymentStatus: string,
    paymentMethod?: string,
  ) => {
    const update: Record<string, unknown> = { payment_status: paymentStatus };
    if (paymentMethod) update.payment_method = paymentMethod;
    const { error } = await supabase
      .from("bookings")
      .update(update)
      .eq("id", bookingId);
    if (error) {
      toast.error("Failed to update payment");
    } else {
      toast.success("Payment status updated");
      fetchBookings();
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking({
          ...selectedBooking,
          payment_status: paymentStatus as never,
        });
      }
    }
  };

  const recordPayment = async (
    bookingId: string,
    amount: number,
    method: string,
  ) => {
    const { error } = await supabase.from("payments").insert({
      booking_id: bookingId,
      amount,
      payment_method: method,
      payment_date: new Date().toISOString().split("T")[0],
    });
    if (error) {
      toast.error("Failed to record payment");
    } else {
      await updatePaymentStatus(bookingId, "PAID", method);
    }
  };

  const openBookingDetail = (booking: Booking) => {
    setSelectedBooking(booking);
    setDrawerOpen(true);
  };

  return (
    <PageTransition>
      <div className="mb-6">
        <h1 className="text-2xl font-serif font-bold">Bookings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage all your appointments and their status
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer, service, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            {[
              "PENDING",
              "CONFIRMED",
              "ARRIVED",
              "IN_PROGRESS",
              "COMPLETED",
              "CANCELLED",
              "NO_SHOW",
            ].map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Payments</SelectItem>
            {["UNPAID", "DP", "PAID", "REFUNDED"].map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted shimmer" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No bookings found"
          description="Try adjusting your filters or create a new booking."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((booking, i) => {
            // HITUNG TOTAL HARGA DI SINI (Service + Additional Fee)
            const activePrice =
              booking.service?.discount_price &&
              booking.service.discount_price > 0
                ? booking.service.discount_price
                : (booking.service?.price ?? 0);
            const listTotalPrice = activePrice + (booking.additional_fee ?? 0);
            return (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => openBookingDetail(booking)}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:shadow-soft cursor-pointer transition-shadow"
              >
                <div className="flex flex-col items-center justify-center min-w-[70px]">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(booking.booking_date)}
                  </span>
                  <span className="text-sm font-semibold mt-0.5">
                    {formatTime(booking.start_time)}
                  </span>
                </div>
                <div className="w-px h-12 bg-border" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {booking.customer?.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {booking.service?.name} · {formatTime(booking.start_time)}-
                    {formatTime(booking.end_time)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium hidden sm:block">
                    {/* TAMPILKAN TOTAL HARGA */}
                    {formatCurrency(listTotalPrice)}
                  </span>
                  <StatusBadge status={booking.status} />
                  {booking.source === "PUBLIC" && (
                    <span className="text-[10px] bg-accent text-accent-foreground rounded-full px-2 py-0.5 font-medium">
                      Public
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Booking Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-xl font-serif">
              Booking Details
            </SheetTitle>
          </SheetHeader>
          {selectedBooking && (
            <BookingDetail
              booking={selectedBooking}
              onUpdateStatus={updateBookingStatus}
              onUpdatePayment={updatePaymentStatus}
              onRecordPayment={recordPayment}
              onClose={() => setDrawerOpen(false)}
              onUpdate={fetchBookings}
            />
          )}
        </SheetContent>
      </Sheet>
    </PageTransition>
  );
}

function BookingDetail({
  booking,
  onUpdateStatus,
  onUpdatePayment,
  onRecordPayment,
  onClose,
  onUpdate,
}: {
  booking: Booking;
  onUpdateStatus: (id: string, status: BookingStatus) => void;
  onUpdatePayment: (id: string, status: string, method?: string) => void;
  onRecordPayment: (id: string, amount: number, method: string) => void;
  onClose: () => void;
  onUpdate?: () => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [notes, setNotes] = useState(booking.notes ?? "");

  // State untuk Royalty Card Action
  const [loyaltyPoints, setLoyaltyPoints] = useState(
    booking.customer?.loyalty_points ?? 0,
  );
  const [processingLoyalty, setProcessingLoyalty] = useState(false);

  // State untuk mencegah klik stamp berkali-kali pada booking yang sama
  const [stampGiven, setStampGiven] = useState(booking.is_stamp_given ?? false);

  // Sync state ketika booking/customer berubah
  useEffect(() => {
    setLoyaltyPoints(booking.customer?.loyalty_points ?? 0);
    setStampGiven(booking.is_stamp_given ?? false);
  }, [booking]);

  // Hitung total harga (Harga Service + Additional Fee jika ada)
  const hasDiscount =
    booking.service?.discount_price && booking.service.discount_price > 0;
  const servicePrice = hasDiscount
    ? booking.service!.discount_price!
    : (booking.service?.price ?? 0);
  const additionalFee = booking.additional_fee ?? 0;
  const totalPrice = servicePrice + additionalFee;

  const waMessage = [
    `Halo Kak ${booking.customer?.name} 🤍`,
    ``,
    `Konfirmasi appointment *Lalash* ✨`,
    ``,
    `💆 *Service:* ${booking.service?.name}`,
    `📅 *Date:* ${formatDate(booking.booking_date)}`,
    `⏰ *Time:* ${formatTime(booking.start_time)}`,
    ``,
    `Apakah jadwal tersebut sudah sesuai, Kak?`,
    `Balas *CONFIRM* untuk mengonfirmasi booking.`,
    ``,
    `Jika ingin mengubah jadwal, silakan hubungi kami. 😊`,
    ``,
    `Sampai bertemu di *Lalash*! 🤍`,
  ].join("\n");

  const waThankYouMessage = [
    `Halo Kak ${booking.customer?.name} 🤍`,
    ``,
    `Terima kasih banyak sudah mempercayakan perawatan beauty-nya di *Lalash* hari ini ✨`,
    `Semoga Kakak suka dengan hasilnya yaa.`,
    ``,
    `Ditunggu kedatangannya kembali! Kalau ada pertanyaan, jangan ragu untuk chat kami ya Kak.`,
    ``,
    `Have a great day! 🥰`,
  ].join("\n");

  const saveNotes = async () => {
    const { error } = await supabase
      .from("bookings")
      .update({ notes })
      .eq("id", booking.id);
    if (error) toast.error("Failed to save notes");
    else toast.success("Notes saved");
  };

  const handleAddStamp = async () => {
    if (stampGiven) return;

    setProcessingLoyalty(true);

    const { data: custData } = await supabase
      .from("customers")
      .select("loyalty_points")
      .eq("id", booking.customer_id)
      .single();

    const currentPoints = custData?.loyalty_points ?? loyaltyPoints;

    if (currentPoints >= 10) {
      toast.error("Royalty card is already full (10/10)!");
      setProcessingLoyalty(false);
      return;
    }

    const newPoints = currentPoints + 1;

    // 1. Update poin customer di database
    const { error: custError } = await supabase
      .from("customers")
      .update({ loyalty_points: newPoints })
      .eq("id", booking.customer_id);

    // 2. Tandai booking ini sudah diberi stamp
    const { error: bookError } = await supabase
      .from("bookings")
      .update({ is_stamp_given: true })
      .eq("id", booking.id);

    if (custError || bookError) {
      toast.error("Failed to add stamp");
    } else {
      setLoyaltyPoints(newPoints);
      setStampGiven(true);
      toast.success(`1 Loyalty Stamp Added! (${newPoints}/10)`);

      if (onUpdate) {
        onUpdate();
      }

      // --- TAMBAHKAN BARIS INI ---
      // Memaksa halaman utama/list booking mengambil data terbaru dari database secara otomatis
      // ---------------------------
    }
    setProcessingLoyalty(false);
  };

  const handleApplyLoyaltyDiscount = async () => {
    setProcessingLoyalty(true);

    // Potongan harga 30% dari servicePrice
    const discountAmount = -(servicePrice * 0.3);

    // 1. Terapkan diskon ke booking ini
    const { error: bookError } = await supabase
      .from("bookings")
      .update({
        additional_fee: discountAmount,
        additional_fee_reason: "Royalty 30% Reward (Card Full)",
      })
      .eq("id", booking.id);

    // 2. Reset point customer ke 0 di tabel customers
    const { error: custError } = await supabase
      .from("customers")
      .update({ loyalty_points: 0 })
      .eq("id", booking.customer_id);

    if (bookError || custError) {
      toast.error("Failed to apply royalty discount");
    } else {
      toast.success("30% Royalty Discount Applied & Points Reset!");
      if (onUpdate) onUpdate();
      onClose();
    }
    setProcessingLoyalty(false);
  };

  return (
    <div className="space-y-6 mt-6">
      {/* Customer Info */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{booking.customer?.name}</h3>
          <StatusBadge status={booking.status} />
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-4 w-4" />
            {booking.customer?.phone}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {formatDate(booking.booking_date)}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={() => {
            if (!booking.customer?.phone) {
              toast.error("Customer phone number is not available");
              return;
            }
            const url = generateWhatsAppUrl(booking.customer.phone, waMessage);
            window.open(url, "_blank", "noopener,noreferrer");
          }}
        >
          <MessageCircle className="h-4 w-4" />
          Contact via WhatsApp
        </Button>

        {booking.status === "COMPLETED" && (
          <Button
            size="sm"
            className="w-full gap-2 bg-green-600 text-white hover:bg-green-700"
            onClick={() => {
              if (!booking.customer?.phone)
                return toast.error("Phone not available");
              const url = generateWhatsAppUrl(
                booking.customer.phone,
                waThankYouMessage,
              );
              window.open(url, "_blank", "noopener,noreferrer");
            }}
          >
            <MessageCircle className="h-4 w-4" />
            Send Thank You Message
          </Button>
        )}
      </div>

      {/* ROYALTY ACTION BANNER */}
      {/* ROYALTY ACTION BANNER */}
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/20">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" /> Royalty Card
          </h4>
          <span className="text-xs font-bold bg-white dark:bg-zinc-900 px-2.5 py-1 rounded-full text-rose-600 shadow-sm">
            {loyaltyPoints}/10 Stamps
          </span>
        </div>
        
        {/* Jika poin masih di bawah 9, tombol tambah stamp muncul (selama belum diberi stamp untuk booking ini) */}
        {loyaltyPoints < 10 && (
          <Button 
            size="sm" 
            variant={stampGiven ? "secondary" : "outline"}
            className={cn(
              "w-full mb-2",
              stampGiven 
                ? "bg-muted text-muted-foreground cursor-not-allowed" 
                : "border-rose-200 text-rose-700 hover:bg-rose-100 hover:text-rose-800"
            )}
            onClick={handleAddStamp}
            disabled={processingLoyalty || stampGiven}
          >
            {stampGiven ? (
              <>Stamp Given for this Visit ✓</>
            ) : (
              <><Plus className="h-4 w-4 mr-1" /> {processingLoyalty ? 'Adding...' : 'Give 1 Stamp for this visit'}</>
            )}
          </Button>
        )}

        {/* Jika poin sudah 9 (kunjungan ke-10), tawarkan opsi klaim diskon 30% */}
        {loyaltyPoints >= 10 && (
          <div className="space-y-2 mt-2">
            <p className="text-xs font-bold text-rose-600 text-center animate-pulse">
              🎉 Card is at 9/10! Ready for 30% Reward if physical card is brought.
            </p>
            <Button 
              size="sm" 
              className="w-full bg-rose-600 hover:bg-rose-700 text-white shadow-md"
              onClick={handleApplyLoyaltyDiscount}
              disabled={processingLoyalty}
            >
              <Sparkles className="h-4 w-4 mr-1" /> Apply 30% OFF & Reset Stamps
            </Button>
          </div>
        )}
      </div>

      {/* Service Info & Additional Fee */}
      <div className="rounded-xl border border-border p-4 space-y-2">
        <h4 className="text-sm font-semibold mb-1">Service & Breakdown</h4>
        <div className="flex justify-between text-sm items-start">
          <span className="text-muted-foreground">{booking.service?.name}</span>
          <div className="flex flex-col items-end">
            {hasDiscount ? (
              <>
                <span className="text-[10px] text-muted-foreground line-through leading-none mb-0.5">
                  {formatCurrency(booking.service?.price)}
                </span>
                <span className="font-medium text-rose-500 leading-none">
                  {formatCurrency(servicePrice)}
                </span>
              </>
            ) : (
              <span className="font-medium">
                {formatCurrency(servicePrice)}
              </span>
            )}
          </div>
        </div>

        {additionalFee !== 0 && (
          <div className="flex justify-between text-sm text-amber-600 dark:text-amber-400">
            <span>
              {additionalFee < 0 ? "Discount applied" : "Additional Fee"}
              {booking.additional_fee_reason && (
                <span className="block text-[11px] text-muted-foreground">
                  Reason: {booking.additional_fee_reason}
                </span>
              )}
            </span>
            <span className="font-medium">
              {additionalFee > 0 ? "+" : ""}
              {formatCurrency(additionalFee)}
            </span>
          </div>
        )}

        <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold">
          <span>Total Price</span>
          <span className="text-primary">{formatCurrency(totalPrice)}</span>
        </div>

        <div className="flex justify-between text-xs text-muted-foreground pt-1">
          <span>Duration</span>
          <span>{booking.service?.duration_minutes} min</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Source</span>
          <span>{booking.source}</span>
        </div>
      </div>

      {/* Payment */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Payment</h4>
          <PaymentBadge status={booking.payment_status} />
        </div>
        {booking.payment_status !== "PAID" && (
          <>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Cash", "Bank Transfer", "QRIS", "E-wallet", "Other"].map(
                  (m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="w-full"
              onClick={() =>
                onRecordPayment(booking.id, totalPrice, paymentMethod)
              }
            >
              Record Full Payment ({formatCurrency(totalPrice)})
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onUpdatePayment(booking.id, "DP", paymentMethod)}
            >
              Record DP
            </Button>
          </>
        )}
        {booking.payment_method && (
          <p className="text-xs text-muted-foreground">
            Method: {booking.payment_method}
          </p>
        )}
      </div>

      {/* Status Actions */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Update Status</h4>
        <div className="grid grid-cols-2 gap-2">
          {statusActions.map((action) => (
            <Button
              key={action.status}
              variant={booking.status === action.status ? "default" : "outline"}
              size="sm"
              onClick={() => onUpdateStatus(booking.id, action.status)}
              className="gap-1.5"
              disabled={booking.status === action.status}
            >
              <action.icon className="h-3.5 w-3.5" />
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Add internal notes..."
        />
        <Button variant="outline" size="sm" onClick={saveNotes}>
          Save Notes
        </Button>
      </div>
    </div>
  );
}
