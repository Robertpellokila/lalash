import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth-context';
import { ProtectedRoute } from '@/components/protected-route';
import { AdminLayout } from '@/components/layout/admin-layout';
import { LoginPage } from '@/pages/auth/login-page';
import { ForgotPasswordPage } from '@/pages/auth/forgot-password-page';
import { DashboardPage } from '@/pages/dashboard-page';
import { CalendarPage } from '@/pages/calendar-page';
import { BookingsPage } from '@/pages/bookings-page';
import { CustomersPage } from '@/pages/customers-page';
import { FinancePage } from '@/pages/finance-page';
import { ReportsPage } from '@/pages/reports-page';
import { ServicesPage } from '@/pages/services-page';
import { SettingsPage } from '@/pages/settings-page';
import { CmsPage } from '@/pages/cms-page';
import { PublicBookingPage } from '@/pages/public-booking-page';
import { LandingPage } from '@/pages/landing-page';
import { Toaster } from '@/components/ui/sonner';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/book" element={<PublicBookingPage />} />

          {/* Protected admin routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Routes>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/calendar" element={<CalendarPage />} />
                    <Route path="/bookings" element={<BookingsPage />} />
                    <Route path="/customers" element={<CustomersPage />} />
                    <Route path="/finance" element={<FinancePage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/services" element={<ServicesPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/cms" element={<CmsPage />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </AdminLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  );
}

export default App;
