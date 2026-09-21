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
            const listTotalPrice = (booking.service?.price ?? 0) + (booking.additional_fee ?? 0);

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
}: {
  booking: Booking;
  onUpdateStatus: (id: string, status: BookingStatus) => void;
  onUpdatePayment: (id: string, status: string, method?: string) => void;
  onRecordPayment: (id: string, amount: number, method: string) => void;
  onClose: () => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [notes, setNotes] = useState(booking.notes ?? "");

  // Hitung total harga (Harga Service + Additional Fee jika ada)
  const servicePrice = booking.service?.price ?? 0;
  const additionalFee = booking.additional_fee ?? 0;
  const totalPrice = servicePrice + additionalFee;

  const waMessage = [
    `Halo Kak ${booking.customer?.name} 🤍`,
    ``,
    `Kami dari *Lalash* ingin mengonfirmasi jadwal appointment Kakak dengan detail berikut:`,
    ``,
    `✨ *Service*`,
    `${booking.service?.name}`,
    ``,
    `📅 *Date*`,
    `${formatDate(booking.booking_date)}`,
    ``,
    `⏰ *Time*`,
    `${formatTime(booking.start_time)}`,
    ``,
    `Mohon konfirmasi kembali apakah jadwal tersebut sudah sesuai dengan waktu yang Kakak inginkan.`,
    ``,
    `Jika sudah sesuai, Kakak dapat membalas pesan ini dengan *“CONFIRM”* agar booking dapat kami catat sebagai terkonfirmasi.`,
    ``,
    `Apabila Kakak ingin melakukan perubahan jadwal atau memiliki pertanyaan, jangan ragu untuk menghubungi kami. Kami dengan senang hati akan membantu. 😊`,
    ``,
    `Terima kasih telah mempercayakan beauty appointment Kakak kepada *Lalash*. 🤍`,
    ``,
    `Sampai bertemu di *Lalash* ✨`,
  ].join("\n");

  const saveNotes = async () => {
    const { error } = await supabase
      .from("bookings")
      .update({ notes })
      .eq("id", booking.id);
    if (error) toast.error("Failed to save notes");
    else toast.success("Notes saved");
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
      </div>

      {/* Service Info & Additional Fee */}
      <div className="rounded-xl border border-border p-4 space-y-2">
        <h4 className="text-sm font-semibold mb-1">Service & Breakdown</h4>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{booking.service?.name}</span>
          <span className="font-medium">
            {formatCurrency(servicePrice)}
          </span>
        </div>

        {/* Tampilkan Additional Fee & Reason Jika Ada */}
        {additionalFee > 0 && (
          <div className="flex justify-between text-sm text-amber-600 dark:text-amber-400">
            <span>
              Additional Fee
              {booking.additional_fee_reason && (
                <span className="block text-[11px] text-muted-foreground">
                  Reason: {booking.additional_fee_reason}
                </span>
              )}
            </span>
            <span className="font-medium">+{formatCurrency(additionalFee)}</span>
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
                onRecordPayment(
                  booking.id,
                  totalPrice, // Otomatis mencatat pembayaran sesuai total harga
                  paymentMethod,
                )
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