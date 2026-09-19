import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Users,
  Phone,
  Mail,
  Plus,
  Calendar,
  TrendingUp,
  Clock,
  Sparkles,
  Pencil,
  Trash2,
  MessageCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageTransition } from '@/components/shared/page-transition';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/shared/status-badges';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  cn,
  formatCurrency,
  formatDate,
  formatTime,
  generateWhatsAppUrl,
} from '@/lib/utils';
import type { Customer, Booking, Service } from '@/lib/types';
import { AddCustomerModal } from '@/components/customers/add-customer-modal';
import { QuickBookingModal } from '@/components/booking/quick-booking-modal';
import { toast } from 'sonner';

export function CustomersPage() {
  const [searchParams] = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [filter, setFilter] = useState('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [quickBookingOpen, setQuickBookingOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [custRes, bookRes] = await Promise.all([
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase
        .from('bookings')
        .select('*, customer:customers(*), service:services(*)')
        .order('booking_date', { ascending: false }),
    ]);
    setCustomers(custRes.data ?? []);
    setBookings(bookRes.data ?? []);
    setLoading(false);
  };

  const customerStats = useMemo(() => {
    const stats = new Map<string, {
      totalVisits: number;
      totalSpending: number;
      lastVisit: string | null;
      nextBooking: string | null;
      favoriteService: string | null;
    }>();

    customers.forEach((c) => {
      const custBookings = bookings.filter((b) => b.customer_id === c.id);
      const completed = custBookings.filter((b) => b.status === 'COMPLETED');
      const totalSpending = completed.reduce((sum, b) => sum + (b.service?.price ?? 0), 0);
      const lastVisit = completed.length > 0
        ? completed[0]?.booking_date ?? null
        : null;
      const upcoming = custBookings
        .filter((b) => b.booking_date >= new Date().toISOString().split('T')[0] && !['CANCELLED', 'NO_SHOW', 'COMPLETED'].includes(b.status))
        .sort((a, b) => a.booking_date.localeCompare(b.booking_date));
      const nextBooking = upcoming.length > 0 ? upcoming[0].booking_date : null;

      const serviceCount = new Map<string, number>();
      custBookings.forEach((b) => {
        if (b.service) {
          serviceCount.set(b.service.name, (serviceCount.get(b.service.name) ?? 0) + 1);
        }
      });
      const favorite = Array.from(serviceCount.entries()).sort((a, b) => b[1] - a[1])[0];

      stats.set(c.id, {
        totalVisits: custBookings.length,
        totalSpending,
        lastVisit,
        nextBooking,
        favoriteService: favorite?.[0] ?? null,
      });
    });
    return stats;
  }, [customers, bookings]);

  const filtered = useMemo(() => {
    let result = customers;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.email?.toLowerCase().includes(q) ?? false),
      );
    }
    if (filter === 'NEW') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      result = result.filter((c) => new Date(c.created_at) >= monthAgo);
    } else if (filter === 'VIP') {
      result = result.filter((c) => (customerStats.get(c.id)?.totalSpending ?? 0) > 500000);
    } else if (filter === 'RETURNING') {
      result = result.filter((c) => (customerStats.get(c.id)?.totalVisits ?? 0) > 1);
    } else if (filter === 'INACTIVE') {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      result = result.filter(
        (c) => !customerStats.get(c.id)?.lastVisit ||
          new Date(customerStats.get(c.id)!.lastVisit!) < threeMonthsAgo,
      );
    }
    return result;
  }, [customers, search, filter, customerStats]);

  const openCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDrawerOpen(true);
  };

  const deleteCustomer = async (id: string) => {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete customer');
    } else {
      toast.success('Customer deleted');
      fetchData();
      setDrawerOpen(false);
    }
  };

  return (
    <PageTransition>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {customers.length} total customers
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Customers</SelectItem>
            <SelectItem value="NEW">New Customers</SelectItem>
            <SelectItem value="RETURNING">Returning</SelectItem>
            <SelectItem value="VIP">VIP</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted shimmer" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers found"
          description="Add your first customer to get started."
          action={<Button onClick={() => setAddOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Add Customer</Button>}
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Email</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Visits</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Spending</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Last Visit</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Next Booking</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer, i) => {
                  const stats = customerStats.get(customer.id);
                  return (
                    <motion.tr
                      key={customer.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => openCustomer(customer)}
                      className="border-b border-border last:border-0 hover:bg-accent/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
                            {customer.name[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium text-sm">{customer.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm hidden md:table-cell">{customer.phone}</td>
                      <td className="px-4 py-3 text-sm hidden lg:table-cell">{customer.email ?? '-'}</td>
                      <td className="px-4 py-3 text-sm text-right">{stats?.totalVisits ?? 0}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium hidden sm:table-cell">
                        {formatCurrency(stats?.totalSpending ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-sm hidden md:table-cell">
                        {stats?.lastVisit ? formatDate(stats.lastVisit) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm hidden lg:table-cell">
                        {stats?.nextBooking ? formatDate(stats.nextBooking) : '-'}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-xl font-serif">Customer Profile</SheetTitle>
          </SheetHeader>
          {selectedCustomer && (
            <CustomerDetail
              customer={selectedCustomer}
              bookings={bookings.filter((b) => b.customer_id === selectedCustomer.id)}
              stats={customerStats.get(selectedCustomer.id)}
              onEdit={() => setEditOpen(true)}
              onDelete={() => deleteCustomer(selectedCustomer.id)}
              onNewBooking={() => {
                setQuickBookingOpen(true);
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Modals */}
      <AddCustomerModal open={addOpen} onOpenChange={setAddOpen} />
      {editOpen && selectedCustomer && (
        <EditCustomerModal
          customer={selectedCustomer}
          open={editOpen}
          onOpenChange={(o) => {
            setEditOpen(o);
            if (!o) fetchData();
          }}
        />
      )}
      <QuickBookingModal
        open={quickBookingOpen}
        onOpenChange={setQuickBookingOpen}
        presetCustomerId={selectedCustomer?.id}
      />
    </PageTransition>
  );
}

function CustomerDetail({
  customer,
  bookings,
  stats,
  onEdit,
  onDelete,
  onNewBooking,
}: {
  customer: Customer;
  bookings: Booking[];
  stats?: { totalVisits: number; totalSpending: number; lastVisit: string | null; nextBooking: string | null; favoriteService: string | null };
  onEdit: () => void;
  onDelete: () => void;
  onNewBooking: () => void;
}) {
  const waUrl = customer.phone
    ? generateWhatsAppUrl(customer.phone, `Halo ${customer.name}!`)
    : '#';

  const sortedBookings = [...bookings].sort((a, b) =>
    b.booking_date.localeCompare(a.booking_date),
  );

  return (
    <div className="space-y-6 mt-6">
      {/* Profile Header */}
      <div className="rounded-xl border border-border p-4 text-center">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xl">
          {customer.name[0]?.toUpperCase()}
        </div>
        <h3 className="mt-3 font-semibold text-lg">{customer.name}</h3>
        <div className="flex items-center justify-center gap-4 mt-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Phone className="h-3.5 w-3.5" />{customer.phone}
          </span>
          {customer.email && (
            <span className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" />{customer.email}
            </span>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <Button size="sm" variant="outline" className="flex-1" onClick={onNewBooking}>
            <Plus className="h-3.5 w-3.5 mr-1" />Booking
          </Button>
          <a href={waUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button size="sm" variant="outline" className="w-full">
              <MessageCircle className="h-3.5 w-3.5 mr-1" />WhatsApp
            </Button>
          </a>
        </div>
        <div className="flex gap-2 mt-2">
          <Button size="sm" variant="ghost" className="flex-1" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5 mr-1" />Edit
          </Button>
          <Button size="sm" variant="ghost" className="flex-1 text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border p-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-xs">Total Visits</span>
          </div>
          <p className="text-xl font-bold mt-1">{stats?.totalVisits ?? 0}</p>
        </div>
        <div className="rounded-xl border border-border p-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs">Total Spending</span>
          </div>
          <p className="text-xl font-bold mt-1">{formatCurrency(stats?.totalSpending ?? 0)}</p>
        </div>
        <div className="rounded-xl border border-border p-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-xs">Last Visit</span>
          </div>
          <p className="text-sm font-medium mt-1">{stats?.lastVisit ? formatDate(stats.lastVisit) : '-'}</p>
        </div>
        <div className="rounded-xl border border-border p-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs">Favorite</span>
          </div>
          <p className="text-sm font-medium mt-1">{stats?.favoriteService ?? '-'}</p>
        </div>
      </div>

      {/* Notes */}
      {customer.notes && (
        <div className="rounded-xl border border-border p-4">
          <h4 className="text-sm font-semibold mb-2">Notes</h4>
          <p className="text-sm text-muted-foreground">{customer.notes}</p>
        </div>
      )}

      {/* Timeline */}
      <div>
        <h4 className="text-sm font-semibold mb-3">Booking History</h4>
        {sortedBookings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No bookings yet</p>
        ) : (
          <div className="space-y-3">
            {sortedBookings.map((booking, i) => (
              <div key={booking.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold">
                    {i + 1}
                  </div>
                  {i < sortedBookings.length - 1 && (
                    <div className="w-px flex-1 bg-border my-1" />
                  )}
                </div>
                <div className="flex-1 rounded-xl border border-border p-3 mb-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{booking.service?.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(booking.booking_date)} · {formatTime(booking.start_time)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(booking.service?.price)}</p>
                      <StatusBadge status={booking.status} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EditCustomerModal({
  customer,
  open,
  onOpenChange,
}: {
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);
  const [email, setEmail] = useState(customer.email ?? '');
  const [notes, setNotes] = useState(customer.notes ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('customers')
      .update({ name, phone, email: email || null, notes })
      .eq('id', customer.id);
    setSaving(false);
    if (error) toast.error('Failed to update customer');
    else {
      toast.success('Customer updated');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif">Edit Customer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
