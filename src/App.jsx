import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from 'sonner'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { BusinessProvider } from '@/lib/businessContext';
import { LanguageProvider } from '@/lib/i18n';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';

// Public layout + pages
import PublicLayout from '@/components/public/PublicLayout';
import Home from '@/pages/Home';
import Features from '@/pages/Features';
import BusinessTypes from '@/pages/BusinessTypes';
import Pricing from '@/pages/Pricing';
import Contact from '@/pages/Contact';
import Demo from '@/pages/Demo';

// Auth pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

// Onboarding
import Onboarding from '@/pages/Onboarding';

// Dashboard layout + pages
import DashboardLayout from '@/pages/dashboard/DashboardLayout';
import Overview from '@/pages/dashboard/Overview';
import Customers from '@/pages/dashboard/Customers';
import Products from '@/pages/dashboard/Products';
import Orders from '@/pages/dashboard/Orders';
import Bookings from '@/pages/dashboard/Bookings';
import Inventory from '@/pages/dashboard/Inventory';
import Loyalty from '@/pages/dashboard/Loyalty';
import Payments from '@/pages/dashboard/Payments';
import Campaigns from '@/pages/dashboard/Campaigns';
import Reports from '@/pages/dashboard/Reports';
import DashboardSettings from '@/pages/dashboard/DashboardSettings';
import AIAssistants from '@/pages/dashboard/AIAssistants';
import BookingChat from '@/pages/BookingChat';
import ProductAdvisorChat from '@/pages/ProductAdvisorChat';
import RegistrationChat from '@/pages/RegistrationChat';
import BusinessStorefront from '@/pages/BusinessStorefront';
import RestaurantStorefront from '@/pages/RestaurantStorefront';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      {/* Auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Public business storefronts */}
      <Route path="/b/:slug" element={<BusinessStorefront />} />

      {/* Public marketing pages */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/features" element={<Features />} />
        <Route path="/business-types" element={<BusinessTypes />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/demo" element={<Demo />} />
      </Route>

      {/* Protected: onboarding + dashboard */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/book" element={<BookingChat />} />
        <Route path="/advisor" element={<ProductAdvisorChat />} />
        <Route path="/register-help" element={<RegistrationChat />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Overview />} />
          <Route path="customers" element={<Customers />} />
          <Route path="products" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="loyalty" element={<Loyalty />} />
          <Route path="payments" element={<Payments />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<DashboardSettings />} />
          <Route path="ai" element={<AIAssistants />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            {/* The restaurant storefront is independent from Base44 authentication. */}
            <Route path="/restaurant" element={<RestaurantStorefront />} />
            <Route path="/restaurant/:slug" element={<RestaurantStorefront />} />
            <Route path="/b/:slug" element={<RestaurantStorefront />} />
            <Route path="*" element={
              <AuthProvider>
                <BusinessProvider>
                  <AuthenticatedApp />
                </BusinessProvider>
              </AuthProvider>
            } />
          </Routes>
        </Router>
        <Toaster />
        <SonnerToaster position="top-right" richColors />
      </QueryClientProvider>
    </LanguageProvider>
  );
}

export default App;
