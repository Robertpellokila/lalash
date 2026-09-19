import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Download, FileText, TrendingUp, TrendingDown, Users, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageTransition } from '@/components/shared/page-transition';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Payment, Expense, Booking, Customer } from '@/lib/types';
import { toast } from 'sonner';

type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [payRes, expRes, bookRes, custRes] = await Promise.all([
      supabase.from('payments').select('*, booking:bookings(*, customer:customers(*), service:services(*))'),
      supabase.from('expenses').select('*'),
      supabase.from('bookings').select('*, customer:customers(*), service:services(*)'),
      supabase.from('customers').select('*'),
    ]);
    setPayments(payRes.data ?? []);
    setExpenses(expRes.data ?? []);
    setBookings(bookRes.data ?? []);
    setCustomers(custRes.data ?? []);
    setLoading(false);
  };

  const reportData = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    if (period === 'daily') {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
    } else if (period === 'weekly') {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 84); // 12 weeks
    } else if (period === 'monthly') {
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 12);
    } else {
      startDate = new Date(now);
      startDate.setFullYear(startDate.getFullYear() - 5);
    }

    const startStr = startDate.toISOString().split('T')[0];

    const periodPayments = payments.filter((p) => p.payment_date >= startStr);
    const periodExpenses = expenses.filter((e) => e.expense_date >= startStr);
    const periodBookings = bookings.filter((b) => b.booking_date >= startStr);
    const periodCustomers = customers.filter((c) => c.created_at >= startStr);

    const grossRevenue = periodPayments.reduce((s, p) => s + Number(p.amount), 0);
    const totalExpenses = periodExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const netProfit = grossRevenue - totalExpenses;
    const completedBookings = periodBookings.filter((b) => b.status === 'COMPLETED');
    const avgTransaction = completedBookings.length > 0
      ? grossRevenue / completedBookings.length
      : 0;

    // Chart data based on period
    const chartData: { label: string; revenue: number; expenses: number; profit: number }[] = [];

    if (period === 'daily') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const rev = periodPayments.filter((p) => p.payment_date === dateStr).reduce((s, p) => s + Number(p.amount), 0);
        const exp = periodExpenses.filter((e) => e.expense_date === dateStr).reduce((s, e) => s + Number(e.amount), 0);
        chartData.push({
          label: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
          revenue: rev, expenses: exp, profit: rev - exp,
        });
      }
    } else if (period === 'weekly') {
      for (let i = 11; i >= 0; i--) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - i * 7 - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const wsStr = weekStart.toISOString().split('T')[0];
        const weStr = weekEnd.toISOString().split('T')[0];
        const rev = periodPayments.filter((p) => p.payment_date >= wsStr && p.payment_date <= weStr).reduce((s, p) => s + Number(p.amount), 0);
        const exp = periodExpenses.filter((e) => e.expense_date >= wsStr && e.expense_date <= weStr).reduce((s, e) => s + Number(e.amount), 0);
        chartData.push({
          label: `W${12 - i}`,
          revenue: rev, expenses: exp, profit: rev - exp,
        });
      }
    } else if (period === 'monthly') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const ms = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
        const me = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
        const rev = periodPayments.filter((p) => p.payment_date >= ms && p.payment_date <= me).reduce((s, p) => s + Number(p.amount), 0);
        const exp = periodExpenses.filter((e) => e.expense_date >= ms && e.expense_date <= me).reduce((s, e) => s + Number(e.amount), 0);
        chartData.push({
          label: d.toLocaleDateString('id-ID', { month: 'short' }),
          revenue: rev, expenses: exp, profit: rev - exp,
        });
      }
    } else {
      for (let i = 4; i >= 0; i--) {
        const d = new Date();
        d.setFullYear(d.getFullYear() - i);
        const ys = `${d.getFullYear()}-01-01`;
        const ye = `${d.getFullYear()}-12-31`;
        const rev = periodPayments.filter((p) => p.payment_date >= ys && p.payment_date <= ye).reduce((s, p) => s + Number(p.amount), 0);
        const exp = periodExpenses.filter((e) => e.expense_date >= ys && e.expense_date <= ye).reduce((s, e) => s + Number(e.amount), 0);
        chartData.push({
          label: `${d.getFullYear()}`,
          revenue: rev, expenses: exp, profit: rev - exp,
        });
      }
    }

    return {
      grossRevenue,
      totalExpenses,
      netProfit,
      numCustomers: periodCustomers.length,
      numAppointments: periodBookings.length,
      avgTransaction,
      chartData,
    };
  }, [period, payments, expenses, bookings, customers]);

  const exportCSV = () => {
    const rows = [
      ['Date', 'Type', 'Description', 'Category', 'Amount'],
      ...payments.map((p) => [
        p.payment_date,
        'Revenue',
        p.booking?.customer?.name ?? '',
        p.booking?.service?.name ?? '',
        String(p.amount),
      ]),
      ...expenses.map((e) => [
        e.expense_date,
        'Expense',
        e.description,
        e.category,
        String(e.amount),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lashflow-report-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const exportPDF = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>LashFlow Report</title>
      <style>
        body { font-family: Inter, sans-serif; padding: 40px; color: #333; }
        h1 { color: hsl(340 70% 55%); }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #eee; }
        th { background: #faf5f7; }
        .stat { display: inline-block; margin: 10px 20px 10px 0; }
        .stat-value { font-size: 24px; font-weight: bold; }
        .stat-label { font-size: 12px; color: #999; }
      </style></head><body>
      <h1>LashFlow Studio - ${period.charAt(0).toUpperCase() + period.slice(1)} Report</h1>
      <p>Generated: ${new Date().toLocaleString('id-ID')}</p>
      <div class="stat"><div class="stat-label">Gross Revenue</div><div class="stat-value">${formatCurrency(reportData.grossRevenue)}</div></div>
      <div class="stat"><div class="stat-label">Total Expenses</div><div class="stat-value">${formatCurrency(reportData.totalExpenses)}</div></div>
      <div class="stat"><div class="stat-label">Net Profit</div><div class="stat-value">${formatCurrency(reportData.netProfit)}</div></div>
      <div class="stat"><div class="stat-label">Appointments</div><div class="stat-value">${reportData.numAppointments}</div></div>
      <div class="stat"><div class="stat-label">New Customers</div><div class="stat-value">${reportData.numCustomers}</div></div>
      <div class="stat"><div class="stat-label">Avg Transaction</div><div class="stat-value">${formatCurrency(reportData.avgTransaction)}</div></div>
      <table><tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th></tr>
      ${payments.map((p) => `<tr><td>${p.payment_date}</td><td>Revenue</td><td>${p.booking?.customer?.name ?? ''} - ${p.booking?.service?.name ?? ''}</td><td>${formatCurrency(Number(p.amount))}</td></tr>`).join('')}
      ${expenses.map((e) => `<tr><td>${e.expense_date}</td><td>Expense</td><td>${e.description}</td><td>-${formatCurrency(Number(e.amount))}</td></tr>`).join('')}
      </table>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 500);
    toast.success('PDF export ready');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 bg-muted rounded shimmer" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-2xl shimmer" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Financial analysis and business performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" onClick={exportPDF} className="gap-2">
            <FileText className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Gross Revenue', value: formatCurrency(reportData.grossRevenue), icon: TrendingUp, color: 'text-green-600' },
          { label: 'Total Expenses', value: formatCurrency(reportData.totalExpenses), icon: TrendingDown, color: 'text-red-500' },
          { label: 'Net Profit', value: formatCurrency(reportData.netProfit), icon: BarChart3, color: 'text-primary' },
          { label: 'Appointments', value: String(reportData.numAppointments), icon: Calendar, color: 'text-blue-500' },
          { label: 'New Customers', value: String(reportData.numCustomers), icon: Users, color: 'text-purple-500' },
          { label: 'Avg Transaction', value: formatCurrency(reportData.avgTransaction), icon: TrendingUp, color: 'text-amber-500' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-border bg-card p-5 shadow-soft"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <p className="text-xl font-bold">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft mb-6">
        <h3 className="text-lg font-serif font-semibold mb-4 capitalize">{period} Performance</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={reportData.chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--popover))' }}
              formatter={(v: number) => formatCurrency(v)}
            />
            <Bar dataKey="revenue" fill="hsl(140 60% 45%)" radius={[4, 4, 0, 0]} name="Revenue" />
            <Bar dataKey="expenses" fill="hsl(0 72% 51%)" radius={[4, 4, 0, 0]} name="Expenses" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Profit Trend */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h3 className="text-lg font-serif font-semibold mb-4">Profit Trend</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={reportData.chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--popover))' }}
              formatter={(v: number) => formatCurrency(v)}
            />
            <Line type="monotone" dataKey="profit" stroke="hsl(340 70% 55%)" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </PageTransition>
  );
}
