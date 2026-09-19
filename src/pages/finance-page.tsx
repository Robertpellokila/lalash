import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageTransition } from '@/components/shared/page-transition';
import { StatCard } from '@/components/shared/stat-card';
import { EmptyState } from '@/components/shared/empty-state';
import { PaymentBadge } from '@/components/shared/status-badges';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AddExpenseModal } from '@/components/finance/add-expense-modal';
import type { Payment, Expense, Booking } from '@/lib/types';
import { toast } from 'sonner';

export function FinancePage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [payRes, expRes, bookRes] = await Promise.all([
      supabase
        .from('payments')
        .select('*, booking:bookings(*, customer:customers(*), service:services(*))')
        .order('payment_date', { ascending: false }),
      supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
      supabase.from('bookings').select('*, customer:customers(*), service:services(*)'),
    ]);
    setPayments(payRes.data ?? []);
    setExpenses(expRes.data ?? []);
    setBookings(bookRes.data ?? []);
    setLoading(false);
  };

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const yearStart = new Date(now.getFullYear(), 0, 1)
      .toISOString()
      .split('T')[0];

    const totalRevenue = payments.reduce((s, p) => s + Number(p.amount), 0);
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const todayRevenue = payments
      .filter((p) => p.payment_date === today)
      .reduce((s, p) => s + Number(p.amount), 0);
    const weekRevenue = payments
      .filter((p) => p.payment_date >= weekStart.toISOString().split('T')[0])
      .reduce((s, p) => s + Number(p.amount), 0);
    const monthRevenue = payments
      .filter((p) => p.payment_date >= monthStart)
      .reduce((s, p) => s + Number(p.amount), 0);
    const yearRevenue = payments
      .filter((p) => p.payment_date >= yearStart)
      .reduce((s, p) => s + Number(p.amount), 0);

    return {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      todayRevenue,
      weekRevenue,
      monthRevenue,
      yearRevenue,
    };
  }, [payments, expenses]);

  const chartData = useMemo(() => {
    const data: { date: string; revenue: number; expenses: number; profit: number }[] = [];
    for (let i = 29; i >= 0; i--) {
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
        profit: rev - exp,
      });
    }
    return data;
  }, [payments, expenses]);

  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) toast.error('Failed to delete expense');
    else {
      toast.success('Expense deleted');
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 bg-muted rounded shimmer" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-2xl shimmer" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold">Finance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your revenue and expenses
          </p>
        </div>
        <Button onClick={() => setAddExpenseOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={TrendingUp}
          gradient="from-emerald-50 to-green-50"
        />
        <StatCard
          title="Total Expenses"
          value={formatCurrency(stats.totalExpenses)}
          icon={TrendingDown}
          gradient="from-rose-50 to-red-50"
        />
        <StatCard
          title="Net Profit"
          value={formatCurrency(stats.netProfit)}
          icon={Wallet}
          gradient="from-sky-50 to-blue-50"
        />
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(stats.todayRevenue)}
          icon={DollarSign}
          gradient="from-amber-50 to-orange-50"
        />
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'This Week', value: stats.weekRevenue },
          { label: 'This Month', value: stats.monthRevenue },
          { label: 'This Year', value: stats.yearRevenue },
          { label: 'All Time', value: stats.totalRevenue },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="text-lg font-bold mt-1">{formatCurrency(item.value)}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft mb-8">
        <h3 className="text-lg font-serif font-semibold mb-4">Revenue vs Expenses (30 days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="finRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(140 60% 45%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(140 60% 45%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="finExp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0 72% 51%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(0 72% 51%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--popover))' }}
              formatter={(v: number) => formatCurrency(v)}
            />
            <Area type="monotone" dataKey="revenue" stroke="hsl(140 60% 45%)" strokeWidth={2} fill="url(#finRev)" />
            <Area type="monotone" dataKey="expenses" stroke="hsl(0 72% 51%)" strokeWidth={2} fill="url(#finExp)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Transactions</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {payments.length === 0 ? (
            <EmptyState icon={DollarSign} title="No transactions yet" description="Payments will appear here once bookings are completed." />
          ) : (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Customer</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Service</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Method</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment, i) => (
                      <motion.tr
                        key={payment.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b border-border last:border-0 hover:bg-accent/30"
                      >
                        <td className="px-4 py-3 text-sm">{formatDate(payment.payment_date)}</td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {payment.booking?.customer?.name ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-sm hidden md:table-cell">
                          {payment.booking?.service?.name ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-sm hidden lg:table-cell">
                          {payment.payment_method ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                          +{formatCurrency(Number(payment.amount))}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="expenses">
          {expenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No expenses recorded"
              description="Track your business expenses to see net profit."
              action={<Button onClick={() => setAddExpenseOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Add Expense</Button>}
            />
          ) : (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Description</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Category</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Method</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Amount</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense, i) => (
                      <motion.tr
                        key={expense.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b border-border last:border-0 hover:bg-accent/30"
                      >
                        <td className="px-4 py-3 text-sm">{formatDate(expense.expense_date)}</td>
                        <td className="px-4 py-3 text-sm font-medium">{expense.description}</td>
                        <td className="px-4 py-3 text-sm hidden md:table-cell">
                          <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                            {expense.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm hidden lg:table-cell">{expense.payment_method ?? '-'}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-red-500">
                          -{formatCurrency(Number(expense.amount))}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteExpense(expense.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            Delete
                          </Button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AddExpenseModal open={addExpenseOpen} onOpenChange={setAddExpenseOpen} />
    </PageTransition>
  );
}
