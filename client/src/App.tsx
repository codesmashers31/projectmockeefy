import React, { Suspense, lazy } from "react";
import { Toaster } from "./components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { RoleBasedRoute } from "./routes/RoleBasedRoute";
import { GuestRoute } from "./routes/GuestRoute";
import { useAuth } from "./context/AuthContext";
import ExpertLayout from "./components/ExpertLayout";
import DashboardLayout from "./components/DashboardLayout";
import UserShell from "./components/UserShell";
import { ResumeProvider } from "./context/ResumeContext";
import ScrollToTop from "./ScrollToTop";
import { usePageTitle } from "./hooks/usePageTitle";
import MockeefyLogo from "./components/MockeefyLogo";
import axios from "./lib/axios";

// ---------------- Route-Level Code Splitting (Phase B) ----------------
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./components/Login"));
const Register = lazy(() => import("./components/Register"));
const ForgotPassword = lazy(() => import("./components/ForgotPassword"));
const CompleteProfile = lazy(() => import("./components/CompleteProfile"));
const BookSessionPage = lazy(() => import("./components/BookSessionPage"));
const MySessions = lazy(() => import("./components/MySessions"));
const PaymentPage = lazy(() => import("./components/PaymentPage"));
const TermsConditions = lazy(() => import("./pages/TermsConditions"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const RefundCancellation = lazy(() => import("./pages/RefundCancellation"));
const ReturnPolicy = lazy(() => import("./pages/ReturnPolicy"));
const ShippingPolicy = lazy(() => import("./pages/ShippingPolicy"));
const SubscriptionPlans = lazy(() => import("./pages/SubscriptionPlans"));
const ResumeBuilderPage = lazy(() => import("./pages/ResumeBuilder"));
const FindMentor = lazy(() => import("./pages/FindMentor"));
const ExpertProfilePage = lazy(() => import("./pages/ExpertProfilePage"));
const LiveMeeting = lazy(() => import("./pages/LiveMeeting"));
const TipsPage = lazy(() => import("./pages/TipsPage"));
const CertificatesPage = lazy(() => import("./pages/CertificatesPage"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const Notifications = lazy(() => import("./pages/Notifications"));
const WatchMock = lazy(() => import("./pages/WatchMock"));
const AiInterview = lazy(() => import("./pages/AiInterview"));

// Expert Dashboard Pages
const DashboardIndex = lazy(() => import("./pages/expert/Index"));
const ProfilePage = lazy(() => import("./pages/expert/Profile"));
const SessionsPage = lazy(() => import("./pages/expert/Sessions"));
const AvailabilityPage = lazy(() => import("./pages/expert/Availability"));
const EditAvailabilityPage = lazy(() => import("./pages/expert/EditAvailability"));
const SkillsPage = lazy(() => import("./pages/expert/Skills"));
const SettingsPage = lazy(() => import("./pages/expert/Settings"));
const WithdrawalPage = lazy(() => import("./pages/expert/WithdrawalPage"));
const AgreementPage = lazy(() => import("./pages/expert/Agreement"));
const ReportsPage = lazy(() => import("./pages/expert/Reports"));

// Admin Control Panel Pages & Tables
const AdminPage = lazy(() => import("./pages/AdminPage"));
const AdminDashboardIndex = lazy(() => import("./components/AdminDashboardIndex"));
const SessionManagement = lazy(() => import("./components/SessionManagement"));
const PendingExpertsTable = lazy(() => import("./components/PendingExpertsTable"));
const VerifiedExpertsTable = lazy(() => import("./components/VerifiedExpertsTable"));
const RejectedExpertsTable = lazy(() => import("./components/RejectedExpertsTable"));
const UsersTable = lazy(() => import("./components/UsersTable"));
const PricingRules = lazy(() => import("./pages/admin/PricingRules"));
const CertificationRules = lazy(() => import("./pages/admin/CertificationRules"));
const HrContacts = lazy(() => import("./pages/admin/HrContacts"));
const Reports = lazy(() => import("./pages/admin/Reports"));
const JobManagement = lazy(() => import("./pages/admin/JobManagement"));
const SkillManagement = lazy(() => import("./pages/admin/SkillManagement"));
const BookingSearch = lazy(() => import("./pages/admin/BookingSearch"));
const PayoutManagement = lazy(() => import("./pages/admin/PayoutManagement"));
const AdminAgreements = lazy(() => import("./pages/admin/AdminAgreements"));
const CategoriesPanel = lazy(() => import("./components/CategoriesPanel"));

const queryClient = new QueryClient();

// Immediately trigger prefetching of the interviewers query on root and discovery pages
if (
  typeof window !== "undefined" &&
  (window.location.pathname === "/" ||
    window.location.pathname === "/mentors" ||
    window.location.pathname === "/find-mentor")
) {
  queryClient.prefetchQuery({
    queryKey: ["allMentorsList"],
    queryFn: async () => {
      const response = await axios.get("/api/expert/verified");
      return Array.isArray(response.data) ? response.data : response.data.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

function MentorsRedirect() {
  const location = useLocation();
  return <Navigate to={{ pathname: "/", search: location.search }} replace />;
}

// Lightweight route transition fallback
function PageFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] bg-slate-50/50">
      <div className="relative flex items-center justify-center">
        <MockeefyLogo className="h-12 w-12 rounded-xl shadow-md relative z-10 animate-pulse" />
      </div>
      <p className="mt-4 text-[10px] font-black tracking-widest text-[#0755E8] uppercase animate-pulse">
        Loading...
      </p>
    </div>
  );
}

// Initial Auth Check Loader
function AppRoutes() {
  const { user, isLoading } = useAuth();
  
  // Apply dynamic page title and favicon
  usePageTitle();

  // Root & discovery routes (/ or /mentors or /find-mentor) are public discovery views.
  // We do NOT block them during background auth checking.
  const isRootOrDiscovery =
    window.location.pathname === "/" ||
    window.location.pathname === "/mentors" ||
    window.location.pathname === "/find-mentor";

  if (isLoading && !isRootOrDiscovery) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50/50">
        <style>{`
          @keyframes zoomInOut {
            0%, 100% {
              transform: scale(0.85);
              opacity: 0.7;
            }
            50% {
              transform: scale(1.15);
              opacity: 1;
            }
          }
          .animate-zoom-logo {
            animation: zoomInOut 1.8s ease-in-out infinite;
          }
        `}</style>
        <div className="relative flex items-center justify-center">
          <MockeefyLogo className="h-16 w-16 rounded-2xl shadow-lg relative z-10 animate-zoom-logo" />
        </div>
        <p className="mt-5 text-[10px] font-black tracking-widest text-[#0755E8] uppercase animate-zoom-logo">
          Loading Mockeefy...
        </p>
      </div>
    );
  }

  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* DEMO ROUTE */}
          <Route path="/demo/booking" element={<BookingSearch />} />

          {/* PUBLIC / GUEST ROUTES */}
          <Route path="/" element={
            user ? (
              (user.userType?.toLowerCase() === "expert") ? <Navigate to="/dashboard" replace /> :
                (user.userType?.toLowerCase() === "admin") ? <Navigate to="/admin" replace /> :
                  <Index />
            ) : (
              <Index />
            )
          } />

          {/* Public Mentors routes redirect seamlessly to / */}
          <Route path="/mentors" element={<MentorsRedirect />} />
          <Route path="/find-mentor" element={<MentorsRedirect />} />

          <Route path="/signin" element={<ErrorBoundary><GuestRoute><Login /></GuestRoute></ErrorBoundary>} />
          <Route path="/signup" element={<GuestRoute><Register /></GuestRoute>} />
          <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/terms" element={<TermsConditions />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/refund-cancellation" element={<RefundCancellation />} />
          <Route path="/return-policy" element={<ReturnPolicy />} />
          <Route path="/shipping-policy" element={<ShippingPolicy />} />
          <Route path="/plans" element={<SubscriptionPlans />} />

          {/* PUBLIC & SHARED AVAILABLE EXPERT PROFILE ROUTES */}
          <Route path="/expert-profile/:expertId" element={<DashboardLayout><ErrorBoundary><ExpertProfilePage /></ErrorBoundary></DashboardLayout>} />
          <Route path="/expert/:expertId" element={<DashboardLayout><ErrorBoundary><ExpertProfilePage /></ErrorBoundary></DashboardLayout>} />

          {/* SHARED PROTECTED ROUTES */}
          <Route element={<RoleBasedRoute allowedRoles={['expert', 'candidate', 'user']} />}>
            <Route path="/watch-mock" element={<WatchMock />} />
            <Route path="/payment" element={<Navigate to="/my-sessions" replace />} />
            <Route path="/live-meeting/:sessionId?" element={<LiveMeeting />} />

            {/* App shell */}
            <Route element={<UserShell />}>
              <Route path="/book-session" element={<ErrorBoundary><BookSessionPage /></ErrorBoundary>} />
              <Route path="/ai-video" element={<AiInterview />} />
              <Route path="/ai-mock" element={<AiInterview />} />
              <Route path="/ai-mock-interview" element={<AiInterview />} />
              <Route path="/resume-builder" element={<ResumeBuilderPage />} />
              <Route path="/mentors" element={<MentorsRedirect />} />
              <Route path="/find-mentor" element={<MentorsRedirect />} />
              <Route path="/my-sessions" element={<MySessions key="my-sessions" />} />
              <Route path="/saved-experts" element={<MySessions key="saved-experts" initialViewOverride="saved" />} />
              <Route path="/liked-mentors" element={<MySessions key="liked-mentors" initialViewOverride="saved" />} />
              <Route path="/tips" element={<TipsPage />} />
              <Route path="/certificates" element={<CertificatesPage />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/notifications" element={<Notifications />} />
            </Route>
          </Route>

          {/* ---------------- EXPERT DASHBOARD ---------------- */}
          <Route path="/dashboard/*" element={<RoleBasedRoute allowedRoles={['expert']} />}>
            <Route element={<ExpertLayout />}>
              <Route index element={<DashboardIndex />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="sessions" element={<SessionsPage />} />
              <Route path="availability" element={<ErrorBoundary><AvailabilityPage /></ErrorBoundary>} />
              <Route path="availability/edit" element={<ErrorBoundary><EditAvailabilityPage /></ErrorBoundary>} />
              <Route path="skills" element={<SkillsPage />} />
              <Route path="withdraw" element={<WithdrawalPage />} />
              <Route path="agreement" element={<AgreementPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* ---------------- ADMIN DASHBOARD ---------------- */}
          <Route path="/admin/*" element={<RoleBasedRoute allowedRoles={['admin']} />}>
            <Route element={<AdminPage />}>
              <Route index element={<AdminDashboardIndex />} />
              <Route path="sessions" element={<SessionManagement />} />
              <Route path="experts/pending" element={<PendingExpertsTable />} />
              <Route path="experts/verified" element={<VerifiedExpertsTable />} />
              <Route path="experts/rejected" element={<RejectedExpertsTable />} />
              <Route path="agreements" element={<AdminAgreements />} />
              <Route path="users" element={<UsersTable />} />
              <Route path="jobs" element={<JobManagement />} />
              <Route path="categories" element={<CategoriesPanel />} />
              <Route path="reports" element={<Reports />} />
              <Route path="certifications" element={<CertificationRules />} />
              <Route path="pricing" element={<PricingRules />} />
              <Route path="hr-contacts" element={<HrContacts />} />
              <Route path="payouts" element={<PayoutManagement />} />
              <Route path="skills" element={<SkillManagement />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <ResumeProvider>
          <Toaster richColors position="top-right" />
          <AppRoutes />
        </ResumeProvider>
      </QueryClientProvider>
    </>
  );
}
