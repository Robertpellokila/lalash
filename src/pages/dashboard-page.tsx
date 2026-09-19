import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Calendar,
  Users,
  UserPlus,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ArrowRight,
  Lightbulb,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { PageTransition } from '@/components/shared/page-transition';
import { StatCard } from '@/components/shared/stat-card';
import { AnimatedCounter } from '@/components/shared/animated-counter';
import { StatusBadge } from '@/components/shared/status-badges';
import { EmptyState } from '@/components/shared/empty-state';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import type { Booking, Service, Customer, Expense, Payment } from '@/lib/types';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

const CHART_COLORS = [
  'hsl(340 70% 55%)',
  'hsl(180 50% 45%)',
  'hsl(30 80% 60%)',
  'hsl(200 70% 55%)',
  'hsl(280 50% 60%)',
  'hsl(160 60% 45%)',
  'hsl(45 80% 55%)',
];

export function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [revenueFilter, setRevenueFilter] = useState('30');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [bookingsRes, servicesRes, customersRes, expensesRes, paymentsRes] =
      await Promise.all([
        supabase
          .from('bookings')
          .select('*, customer:customers(*), service:services(*)')
          .gte('booking_date', sixMonthsAgo.toISOString().split('T')[0])
          .order('booking_date', { ascending: false })
          .order('start_time', { ascending: true }),
        supabase.from('services').select('*'),
        supabase.from('customers').select('*'),
        supabase.from('expenses').select('*').gte('expense_date', sixMonthsAgo.toISOString().split('T')[0]),
        supabase.from('payments').select('*, booking:bookings(*)').gte('payment_date', sixMonthsAgo.toISOString().split('T')[0]),
      ]);

    setBookings(bookingsRes.data ?? []);
    setServices(servicesRes.data ?? []);
    setCustomers(customersRes.data ?? []);
    setExpenses(expensesRes.data ?? []);
    setPayments(paymentsRes.data ?? []);
    setLoading(false);
  };

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];

    const todayBookings = bookings.filter((b) => b.booking_date === today);
    const todayRevenue = payments
      .filter((p) => p.payment_date === today)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const monthlyRevenue = payments
      .filter((p) => p.payment_date >= monthStart)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const upcomingBookings = bookings.filter(
      (b) =>
        b.booking_date >= today &&
        !['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(b.status),
    );
    const completedBookings = bookings.filter((b) => b.status === 'COMPLETED');
    const pendingBookings = bookings.filter((b) => b.status === 'PENDING');
    const newCustomers = customers.filter((c) => c.created_at >= monthStart);

    return {
      todayRevenue,
      monthlyRevenue,
      todayBookingsCount: todayBookings.length,
      upcomingBookingsCount: upcomingBookings.length,
      totalCustomers: customers.length,
      newCustomersCount: newCustomers.length,
      completedCount: completedBookings.length,
      pendingCount: pendingBookings.length,
    };
  }, [bookings, customers, payments]);

  const todaySchedule = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return bookings
      .filter((b) => b.booking_date === today && b.status !== 'CANCELLED')
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [bookings]);

  const upcomingAppointments = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return bookings
      .filter(
        (b) =>
          b.booking_date >= today &&
          !['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(b.status),
      )
      .sort((a, b) =>
        (a.booking_date + a.start_time).localeCompare(b.booking_date + b.start_time),
      )
      .slice(0, 5);
  }, [bookings]);

  const revenueChartData = useMemo(() => {
    const days = parseInt(revenueFilter);
    const data: { date: string; revenue: number; expenses: number }[] = [];

    if (days <= 30) {
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const rev = payments
          .filter((p) => p.payment_date === dateStr)
          .reduce((s, p) => s + Number(p.amount), 0);
        const exp = expenses
          .filter((e) => e.expense_date === dateStr)
          .reduce((s, e) => s + Number(e.amount), 0);
        data.push({
          date: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
          revenue: rev,
          expenses: exp,
        });
      }
    } else {
      const months = days === 90 ? 3 : days === 180 ? 6 : 12;
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
          .toISOString()
          .split('T')[0];
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
          .toISOString()
          .split('T')[0];
        const rev = payments
          .filter((p) => p.payment_date >= monthStart && p.payment_date <= monthEnd)
          .reduce((s, p) => s + Number(p.amount), 0);
        const exp = expenses
          .filter((e) => e.expense_date >= monthStart && e.expense_date <= monthEnd)
          .reduce((s, e) => s + Number(e.amount), 0);
        data.push({
          date: d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
          revenue: rev,
          expenses: exp,
        });
      }
    }
    return data;
  }, [payments, expenses, revenueFilter]);

  const serviceRevenueData = useMemo(() => {
    const revenueByService = new Map<string, number>();
    payments.forEach((p) => {
      if (p.booking) {
        const booking = bookings.find((b) => b.id === p.booking_id);
        if (booking?.service) {
          const name = booking.service.name;
          revenueByService.set(name, (revenueByService.get(name) ?? 0) + Number(p.amount));
        }
      }
    });
    return Array.from(revenueByService.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }, [payments, bookings]);

  const bookingStatusData = useMemo(() => {
    const statuses = ['COMPLETED', 'CONFIRMED', 'PENDING', 'CANCELLED', 'NO_SHOW'];
    return statuses.map((status) => ({
      name: status.replace('_', ' '),
      count: bookings.filter((b) => b.status === status).length,
    }));
  }, [bookings]);

  const customerGrowthData = useMemo(() => {
    const months: { date: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const count = customers.filter((c) => {
        const created = new Date(c.created_at);
        return created >= monthStart && created <= monthEnd;
      }).length;
      months.push({
        date: d.toLocaleDateString('id-ID', { month: 'short' }),
        count,
      });
    }
    return months;
  }, [customers]);

  const insights = useMemo(() => {
    const result: { icon: typeof TrendingUp; text: string; positive: boolean }[] = [];

    if (bookings.length === 0 && customers.length === 0) return result;

    // Revenue trend
    const now = new Date();
    const thisMonthRev = payments
      .filter((p) => {
        const d = new Date(p.payment_date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, p) => s + Number(p.amount), 0);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthRev = payments
      .filter((p) => {
        const d = new Date(p.payment_date);
        return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
      })
      .reduce((s, p) => s + Number(p.amount), 0);

    if (lastMonthRev > 0) {
      const change = ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100;
      result.push({
        icon: change >= 0 ? TrendingUp : TrendingDown,
        text: `Revenue this month ${change >= 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}% compared to last month.`,
        positive: change >= 0,
      });
    }

    // Most popular service
    const serviceCount = new Map<string, number>();
    bookings.forEach((b) => {
      if (b.service) {
        serviceCount.set(b.service.name, (serviceCount.get(b.service.name) ?? 0) + 1);
      }
    });
    const topService = Array.from(serviceCount.entries()).sort((a, b) => b[1] - a[1])[0];
    if (topService) {
      result.push({
        icon: Sparkles,
        text: `${topService[0]} is your most popular service with ${topService[1]} bookings.`,
        positive: true,
      });
    }

    // Busiest day
    const dayCount = new Map<string, number>();
    bookings.forEach((b) => {
      const day = new Date(b.booking_date).toLocaleDateString('en-US', { weekday: 'long' });
      dayCount.set(day, (dayCount.get(day) ?? 0) + 1);
    });
    const busiestDay = Array.from(dayCount.entries()).sort((a, b) => b[1] - a[1])[0];
    if (busiestDay) {
      result.push({
        icon: Calendar,
        text: `${busiestDay[0]} is your busiest day with ${busiestDay[1]} bookings.`,
        positive: true,
      });
    }

    // Average spending
    if (customers.length > 0 && payments.length > 0) {
      const totalRev = payments.reduce((s, p) => s + Number(p.amount), 0);
      const avg = totalRev / customers.length;
      result.push({
        icon: DollarSign,
        text: `Average spending per customer is ${formatCurrency(avg)}.`,
        positive: true,
      });
    }

    // Top customer
    const customerVisits = new Map<string, number>();
    bookings.forEach((b) => {
      if (b.customer) {
        customerVisits.set(b.customer.name, (customerVisits.get(b.customer.name) ?? 0) + 1);
      }
    });
    const topCustomer = Array.from(customerVisits.entries()).sort((a, b) => b[1] - a[1])[0];
    if (topCustomer) {
      result.push({
        icon: Users,
        text: `${topCustomer[0]} has the most visits with ${topCustomer[1]} appointments.`,
        positive: true,
      });
    }

    return result;
  }, [bookings, customers, payments]);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded-lg shimmer" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-2xl shimmer" />
          ))}
        </div>
        <div className="h-80 bg-muted rounded-2xl shimmer" />
      </div>
    );
  }

  return (
    <PageTransition>
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-bold text-foreground">
          {greeting}, Admin
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here's what's happening at your studio today, {formatDate(new Date())}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(stats.todayRevenue)}
          icon={DollarSign}
          gradient="from-rose-50 to-pink-50"
          delay={0}
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(stats.monthlyRevenue)}
          icon={TrendingUp}
          gradient="from-amber-50 to-orange-50"
          delay={0.05}
        />
        <StatCard
          title="Today's Bookings"
          value={stats.todayBookingsCount}
          icon={Calendar}
          gradient="from-sky-50 to-blue-50"
          delay={0.1}
        />
        <StatCard
          title="Upcoming Bookings"
          value={stats.upcomingBookingsCount}
          icon={Clock}
          gradient="from-violet-50 to-purple-50"
          delay={0.15}
        />
        <StatCard
          title="Total Customers"
          value={stats.totalCustomers}
          icon={Users}
          gradient="from-emerald-50 to-green-50"
          delay={0.2}
        />
        <StatCard
          title="New Customers"
          value={stats.newCustomersCount}
          icon={UserPlus}
          gradient="from-rose-50 to-red-50"
          delay={0.25}
        />
        <StatCard
          title="Completed"
          value={stats.completedCount}
          icon={CheckCircle2}
          gradient="from-teal-50 to-cyan-50"
          delay={0.3}
        />
        <StatCard
          title="Pending"
          value={stats.pendingCount}
          icon={Clock}
          gradient="from-amber-50 to-yellow-50"
          delay={0.35}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-soft"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-serif font-semibold">Revenue Overview</h3>
              <p className="text-sm text-muted-foreground">Revenue vs expenses over time</p>
            </div>
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {[
                { label: '7D', value: '7' },
                { label: '30D', value: '30' },
                { label: '3M', value: '90' },
                { label: '6M', value: '180' },
                { label: '1Y', value: '365' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRevenueFilter(opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    revenueFilter === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueChartData}>
              <defs>
                <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS[3]} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={CHART_COLORS[3]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--popover))',
                }}
                formatter={(v: number) => formatCurrency(v)}
              />
              <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS[0]} strokeWidth={2} fill="url(#revGradient)" />
              <Area type="monotone" dataKey="expenses" stroke={CHART_COLORS[3]} strokeWidth={2} fill="url(#expGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Revenue by Service Donut */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-2xl border border-border bg-card p-6 shadow-soft"
        >
          <h3 className="text-lg font-serif font-semibold">Revenue by Service</h3>
          <p className="text-sm text-muted-foreground mb-4">Distribution across services</p>
          {serviceRevenueData.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
              No revenue data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={serviceRevenueData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {serviceRevenueData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Second Row Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Booking Status Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-border bg-card p-6 shadow-soft"
        >
          <h3 className="text-lg font-serif font-semibold">Booking Overview</h3>
          <p className="text-sm text-muted-foreground mb-4">Bookings by status</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={bookingStatusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--popover))',
                }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {bookingStatusData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Customer Growth */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="rounded-2xl border border-border bg-card p-6 shadow-soft"
        >
          <h3 className="text-lg font-serif font-semibold">Customer Growth</h3>
          <p className="text-sm text-muted-foreground mb-4">New customers per month</p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={customerGrowthData}>
              <defs>
                <linearGradient id="custGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS[1]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS[1]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--popover))',
                }}
              />
              <Area type="monotone" dataKey="count" stroke={CHART_COLORS[1]} strokeWidth={2} fill="url(#custGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Today's Schedule & Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl border border-border bg-card p-6 shadow-soft"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-serif font-semibold">Today's Schedule</h3>
            <Link to="/calendar" className="text-sm text-primary hover:underline">
              View calendar
            </Link>
          </div>
          {todaySchedule.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No bookings today"
              description="Your schedule is clear for today."
            />
          ) : (
            <div className="space-y-3">
              {todaySchedule.map((booking, i) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.05 }}
                  className="flex gap-4"
                >
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-semibold text-foreground">
                      {formatTime(booking.start_time)}
                    </span>
                    <div className="w-px flex-1 bg-border my-1" />
                  </div>
                  <div className="flex-1 rounded-xl border border-border bg-background p-3 hover:shadow-soft transition-shadow">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">
                          {booking.customer?.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {booking.service?.name} · {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {formatCurrency(booking.service?.price)}
                        </span>
                        <StatusBadge status={booking.status} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="rounded-2xl border border-border bg-card p-6 shadow-soft"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-serif font-semibold">Upcoming Appointments</h3>
            <Link to="/bookings" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          {upcomingAppointments.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No upcoming appointments"
              description="New bookings will appear here."
            />
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((booking, i) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.55 + i * 0.05 }}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 hover:shadow-soft transition-shadow"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent">
                    <span className="text-xs font-semibold text-accent-foreground">
                      {formatTime(booking.start_time)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {booking.customer?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {booking.service?.name} · {formatDate(booking.booking_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatCurrency(booking.service?.price)}
                    </p>
                    <StatusBadge status={booking.status} />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Business Insights */}
      {insights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-2xl border border-border bg-card p-6 shadow-soft"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Lightbulb className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-lg font-serif font-semibold">Business Insights</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((insight, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl bg-muted/50 p-4"
              >
                <insight.icon
                  className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                    insight.positive ? 'text-green-500' : 'text-red-500'
                  }`}
                />
                <p className="text-sm text-foreground">{insight.text}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </PageTransition>
  );
}
