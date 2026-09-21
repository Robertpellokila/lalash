import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate, minutesToTime, timeToMinutes } from '@/lib/utils';
import { calculateAvailableSlots } from '@/lib/slots';
import type { Service, Customer, BusinessHour, BlockedDate, Booking } from '@/lib/types';
import { CalendarIcon, ChevronDown, Search } from 'lucide-react';

interface QuickBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presetCustomerId?: string;
}

// Helper untuk format tanggal lokal (menghindari bug shift hari akibat UTC)
const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function QuickBookingModal({
  open,
  onOpenChange,
  presetCustomerId,
}: QuickBookingModalProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  
  // State untuk booking yang sudah ada pada tanggal yang dipilih
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [status, setStatus] = useState('CONFIRMED');
  const [paymentStatus, setPaymentStatus] = useState('UNPAID');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // State untuk Additional Fee
  const [additionalFee, setAdditionalFee] = useState<number>(0);
  const [additionalFeeReason, setAdditionalFeeReason] = useState<string>('');

  useEffect(() => {
    if (open) {
      fetchData();
      if (presetCustomerId) setSelectedCustomerId(presetCustomerId);
    }
  }, [open, presetCustomerId]);

  // Fetch Existing Bookings saat tanggal dipilih (agar bisa blokir slot yang sudah penuh, baik hari ini atau masa lalu)
  useEffect(() => {
    if (selectedDate) {
      const fetchBookingsForDate = async () => {
        const formattedDate = formatLocalDate(selectedDate);
        const { data } = await supabase
          .from('bookings')
          .select('*')
          .eq('booking_date', formattedDate)
          .neq('status', 'CANCELLED')
          .neq('status', 'NO_SHOW');
          
        setExistingBookings(data ?? []);
      };
      
      fetchBookingsForDate();
    } else {
      setExistingBookings([]);
    }
  }, [selectedDate]);

  const fetchData = async () => {
    const [servicesRes, customersRes, bhRes, bdRes] = await Promise.all([
      supabase.from('services').select('*').eq('active', true).order('name'),
      supabase.from('customers').select('*').order('name'),
      supabase.from('business_hours').select('*').order('day_of_week'),
      supabase.from('blocked_dates').select('*'),
    ]);
    setServices(servicesRes.data ?? []);
    setCustomers(customersRes.data ?? []);
    setBusinessHours(bhRes.data ?? []);
    setBlockedDates(bdRes.data ?? []);
  };

  const selectedService = services.find((s) => s.id === selectedServiceId);
  
  // Hitung ketersediaan slot (isAdmin = true agar tanggal lampau tetap bisa dicek)
  const availableSlots = selectedService && selectedDate
    ? calculateAvailableSlots(
        selectedDate,
        selectedService.duration_minutes,
        businessHours,
        blockedDates,
        existingBookings, // Kirim booking yang ada di tanggal tsb
        0, // minNoticeHours
        true // isAdmin flag = true
      )
    : [];

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch),
  );

  const handleSubmit = async () => {
    if (!selectedCustomerId || !selectedServiceId || !selectedDate || !selectedSlot) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    const service = services.find((s) => s.id === selectedServiceId);
    if (!service) return;

    const endTime = minutesToTime(timeToMinutes(selectedSlot) + service.duration_minutes);
    const formattedDate = formatLocalDate(selectedDate);

    // Double-check for conflicts di database sebelum insert
    const { data: conflicts } = await supabase
      .from('bookings')
      .select('id')
      .eq('booking_date', formattedDate)
      .neq('status', 'CANCELLED')
      .neq('status', 'NO_SHOW')
      .lt('start_time', endTime)
      .gt('end_time', selectedSlot);

    if (conflicts && conflicts.length > 0) {
      toast.error('That slot was just booked. Please choose another time.');
      setSaving(false);
      return;
    }

    // Insert Booking ke Supabase dengan menyertakan additional_fee
    const { error } = await supabase.from('bookings').insert({
      customer_id: selectedCustomerId,
      service_id: selectedServiceId,
      booking_date: formattedDate,
      start_time: selectedSlot,
      end_time: endTime,
      status,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      source: 'ADMIN',
      notes,
      additional_fee: additionalFee,
      additional_fee_reason: additionalFeeReason,
    });

    setSaving(false);

    if (error) {
      toast.error('Failed to create booking: ' + error.message);
    } else {
      toast.success('Booking created successfully');
      resetForm();
      onOpenChange(false);
    }
  };

  const resetForm = () => {
    setSelectedCustomerId('');
    setSelectedServiceId('');
    setSelectedDate(undefined);
    setSelectedSlot('');
    setStatus('CONFIRMED');
    setPaymentStatus('UNPAID');
    setPaymentMethod('Cash');
    setNotes('');
    setCustomerSearch('');
    setAdditionalFee(0);
    setAdditionalFeeReason('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif">New Booking</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Customer */}
          <div className="space-y-2">
            <Label>Customer</Label>
            <div className="relative">
              <button
                onClick={() => setCustomerDropdownOpen(!customerDropdownOpen)}
                className="w-full flex items-center justify-between rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
              >
                <span className={cn(!selectedCustomerId && 'text-muted-foreground')}>
                  {selectedCustomerId
                    ? customers.find((c) => c.id === selectedCustomerId)?.name
                    : 'Search customer...'}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
              {customerDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-soft-lg max-h-64 overflow-y-auto">
                  <div className="p-2 border-b border-border">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or phone..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="pl-9 h-9"
                        autoFocus
                      />
                    </div>
                  </div>
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setCustomerDropdownOpen(false);
                        setCustomerSearch('');
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center justify-between"
                    >
                      <span>{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.phone}</span>
                    </button>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                      No customers found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Service */}
          <div className="space-y-2">
            <Label>Service</Label>
            <Select
              value={selectedServiceId}
              onValueChange={(v) => {
                setSelectedServiceId(v);
                setSelectedSlot('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} — {formatCurrency(s.price)} ({s.duration_minutes}min)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal h-10',
                  !selectedDate && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? formatDate(selectedDate) : 'Select date'}
              </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => {
                    setSelectedDate(d);
                    setSelectedSlot('');
                  }}
                  initialFocus
                  // Prop disabled dihilangkan agar admin bisa pilih tanggal lalu
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Slots */}
          {selectedDate && selectedService && (
            <div className="space-y-2">
              <Label>Available Time</Label>
              {availableSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center bg-muted/50 rounded-lg">
                  No available slots for this date
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.start}
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slot.start)}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-sm font-medium transition-all',
                        !slot.available
                          ? 'border-border bg-muted/50 text-muted-foreground/40 cursor-not-allowed'
                          : selectedSlot === slot.start
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background hover:border-primary hover:bg-accent',
                      )}
                    >
                      {slot.start}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Price & Additional Fee Section */}
          {selectedService && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Input Additional Fee */}
                <div className="space-y-2">
                  <Label>Additional Fee (Optional)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 20000"
                    value={additionalFee || ''}
                    onChange={(e) => setAdditionalFee(Number(e.target.value) || 0)}
                  />
                </div>
                {/* Input Reason */}
                <div className="space-y-2">
                  <Label>Fee Reason</Label>
                  <Input
                    placeholder="e.g. Transport, Home service..."
                    value={additionalFeeReason}
                    onChange={(e) => setAdditionalFeeReason(e.target.value)}
                    disabled={!additionalFee || additionalFee <= 0}
                  />
                </div>
              </div>

              {/* Order Summary UI */}
              <div className="rounded-lg bg-accent/50 px-4 py-3 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Service Price</span>
                  <span>{formatCurrency(selectedService.price)}</span>
                </div>
                {additionalFee > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Additional Fee</span>
                    <span>+{formatCurrency(additionalFee)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-border">
                  <span className="text-sm font-medium">Total Price</span>
                  <span className="text-lg font-semibold text-primary">
                    {formatCurrency(selectedService.price + (additionalFee || 0))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Status & Payment */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['PENDING', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'].map(
                    (s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace('_', ' ')}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['UNPAID', 'DP', 'PAID', 'REFUNDED'].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {paymentStatus !== 'UNPAID' && (
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['Cash', 'Bank Transfer', 'QRIS', 'E-wallet', 'Other'].map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1"
            >
              {saving ? 'Creating...' : 'Create Booking'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}