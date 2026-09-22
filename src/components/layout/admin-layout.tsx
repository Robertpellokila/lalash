import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Users,
  Wallet,
  BarChart3,
  Sparkles,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  Search,
  Bell,
  Plus,
  UserPlus,
  Receipt,
  Scissors,
  LayoutTemplate,
  Clock,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/lib/hooks";
import { supabase } from "@/lib/supabase";
import type { Settings, Customer } from "@/lib/types"; // Ditambahkan tipe Customer
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { QuickBookingModal } from "@/components/booking/quick-booking-modal";
import { AddCustomerModal } from "@/components/customers/add-customer-modal";
import { AddExpenseModal } from "@/components/finance/add-expense-modal";
import { toast } from "sonner";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/calendar", label: "Calendar", icon: Calendar },
  { path: "/bookings", label: "Bookings", icon: CalendarDays },
  { path: "/customers", label: "Customers", icon: Users },
  { path: "/finance", label: "Finance", icon: Wallet },
  { path: "/reports", label: "Reports", icon: BarChart3 },
  { path: "/available-hours", label: "Available Hours", icon: Clock },
  { path: "/services", label: "Services", icon: Scissors },
  { path: "/cms", label: "Landing Page", icon: LayoutTemplate },
  { path: "/settings", label: "Settings", icon: SettingsIcon },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, signOut } = useAuth();
  const { notifications, refetch: refetchNotifications } = useNotifications();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickBookingOpen, setQuickBookingOpen] = useState(false);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  
  // State untuk Pencarian Interaktif (Autocomplete Dropdown)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Fetch Settings dari Supabase
  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase
        .from("settings")
        .select("*")
        .maybeSingle();

      if (data) {
        setSettings(data);
      }
    }

    fetchSettings();
  }, []);

  // Real-time Search Effect untuk Dropdown Autocomplete
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      const { data } = await supabase
        .from("customers")
        .select("*")
        .or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
        .limit(5); // Batasi 5 hasil teratas agar dropdown tetap rapi

      setSearchResults(data ?? []);
      setIsSearching(false);
    };

    const timer = setTimeout(fetchSearchResults, 300); // Debounce untuk efisiensi query
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Tutup dropdown jika klik di luar area search bar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const markNotificationRead = async (id: string) => {
    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/notifications?id=eq.${id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ is_read: true }),
      }
    );
    refetchNotifications();
  };

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchResults([]);
      navigate(`/customers?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-sidebar/80 backdrop-blur-sm hidden lg:flex flex-col">
        <div className="flex h-16 items-center gap-3 px-6 border-b border-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-soft overflow-hidden">
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt="logo"
                className="h-full w-full object-cover"
              />
            ) : (
              <Sparkles className="h-5 w-5 text-white" />
            )}
          </div>
          <span className="text-xl font-serif font-bold text-foreground truncate">
            {settings?.business_name ?? "LaaLash"}
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-sidebar-foreground/70 hover:bg-accent hover:text-accent-foreground"
                )
              }
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border">
          <Link
            to="/book"
            target="_blank"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Calendar className="h-3.5 w-3.5" />
            Open Public Booking
          </Link>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 z-50 h-screen w-64 bg-sidebar border-r border-border lg:hidden flex flex-col"
            >
              <div className="flex h-16 items-center justify-between px-6 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary overflow-hidden">
                    {settings?.logo_url ? (
                      <img
                        src={settings.logo_url}
                        alt="logo"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Sparkles className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <span className="text-xl font-serif font-bold truncate">
                    {settings?.business_name ?? "LaaLash"}
                  </span>
                </div>
                <button onClick={() => setSidebarOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-sidebar-foreground/70 hover:bg-accent"
                      )
                    }
                  >
                    <item.icon className="h-4.5 w-4.5" />
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Nav */}
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-md px-4 lg:px-8 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-accent"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Interactive Search Bar with Dropdown Results */}
          <div className="hidden md:block flex-1 max-w-md relative" ref={searchRef}>
            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers by name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9 bg-muted/50 border-transparent focus-visible:bg-background"
                />
              </div>
            </form>

            {/* Dropdown Hasil Pencarian Interaktif */}
            {searchQuery.trim().length >= 2 && searchResults.length > 0 && (
              <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-border bg-popover shadow-soft-lg overflow-hidden py-1">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground border-b border-border/50">
                  Customers Found ({searchResults.length})
                </div>
                {searchResults.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                      navigate(`/customers?search=${encodeURIComponent(customer.name)}`);
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-accent text-sm flex items-center justify-between transition-colors border-b border-border/20 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-foreground">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.phone}</p>
                    </div>
                    <span className="text-[10px] bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 font-semibold px-2 py-0.5 rounded-full">
                      Stamps: {customer.loyalty_points ?? 0}/10
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden lg:block text-sm text-muted-foreground ml-auto">
            {today}
          </div>

          {/* Quick Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1.5 h-9">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Quick Add</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setQuickBookingOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Booking
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAddCustomerOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Customer
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAddExpenseOpen(true)}>
                <Receipt className="h-4 w-4 mr-2" />
                Add Expense
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative p-2 rounded-lg hover:bg-accent">
                <Bell className="h-5 w-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-white font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No notifications
                </div>
              ) : (
                notifications.slice(0, 8).map((notif) => (
                  <DropdownMenuItem
                    key={notif.id}
                    onClick={() => markNotificationRead(notif.id)}
                    className="flex-col items-start py-3"
                  >
                    <div className="flex items-center gap-2 w-full">
                      {!notif.is_read && (
                        <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                      <span className="font-medium text-sm">{notif.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notif.message}
                    </p>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-accent">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary font-medium text-sm">
                  {user?.email?.[0]?.toUpperCase() ?? "A"}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="text-sm font-medium">Admin</p>
                  <p className="text-xs text-muted-foreground font-normal">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <SettingsIcon className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>

      {/* Modals */}
      <QuickBookingModal
        open={quickBookingOpen}
        onOpenChange={setQuickBookingOpen}
      />
      <AddCustomerModal
        open={addCustomerOpen}
        onOpenChange={setAddCustomerOpen}
      />
      <AddExpenseModal open={addExpenseOpen} onOpenChange={setAddExpenseOpen} />
    </div>
  );
}