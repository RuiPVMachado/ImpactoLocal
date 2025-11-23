import { Suspense, lazy, type ReactNode } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/useAuth";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import GuestRoute from "./components/GuestRoute";
import SkipToContentLink from "./components/SkipToContentLink";
import AccessibilityPanel from "./components/accessibility/AccessibilityPanel";
import LiveAnnouncements from "./components/accessibility/LiveAnnouncements";
import { AccessibilityProvider } from "./context/AccessibilityContext";

const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Events = lazy(() => import("./pages/Events"));
const EventDetails = lazy(() => import("./pages/EventDetails"));
const MyApplications = lazy(() => import("./pages/MyApplications"));
const Profile = lazy(() => import("./pages/Profile"));
const OrganizationDashboard = lazy(
  () => import("./pages/OrganizationDashboard")
);
const OrganizationEvents = lazy(() => import("./pages/OrganizationEvents"));
const CreateEvent = lazy(() => import("./pages/CreateEvent"));
const EditEvent = lazy(() => import("./pages/EditEvent"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const SobreNos = lazy(() => import("./pages/SobreNos"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQ = lazy(() => import("./pages/FAQ"));
const MapExplorer = lazy(() => import("./pages/MapExplorer"));
const Organizations = lazy(() => import("./pages/Organizations"));
const OrganizationProfilePublic = lazy(
  () => import("./pages/OrganizationProfilePublic")
);
const VolunteerProfilePublic = lazy(
  () => import("./pages/VolunteerProfilePublic")
);
const PersonalCalendar = lazy(() => import("./pages/PersonalCalendar"));
const ShareEventRecap = lazy(() => import("./pages/ShareEventRecap"));

function PasswordResetBoundary({ children }: { children: ReactNode }) {
  const { passwordResetPending } = useAuth();
  const location = useLocation();

  if (passwordResetPending && location.pathname !== "/reset-password") {
    return (
      <Navigate
        to="/reset-password"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Router>
      <PasswordResetBoundary>
        <SkipToContentLink />
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Navbar />
          <main id="principal" className="flex-grow" tabIndex={-1} role="main">
            <Suspense
              fallback={
                <div className="py-12 text-center text-brand-neutral">
                  A carregar...
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<Home />} />
                <Route
                  path="/login"
                  element={
                    <GuestRoute>
                      <Login />
                    </GuestRoute>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <GuestRoute>
                      <Register />
                    </GuestRoute>
                  }
                />
                <Route
                  path="/forgot-password"
                  element={
                    <GuestRoute>
                      <ForgotPassword />
                    </GuestRoute>
                  }
                />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/events" element={<Events />} />
                <Route path="/events/:id" element={<EventDetails />} />
                <Route path="/mapa" element={<MapExplorer />} />
                <Route path="/organizacoes" element={<Organizations />} />
                <Route
                  path="/organizacoes/:organizationId"
                  element={<OrganizationProfilePublic />}
                />
                <Route path="/sobre-nos" element={<SobreNos />} />
                <Route path="/contacto" element={<Contact />} />
                <Route path="/faq" element={<FAQ />} />
                <Route
                  path="/voluntarios/:volunteerId"
                  element={
                    <ProtectedRoute allowedRoles={["organization", "admin"]}>
                      <VolunteerProfilePublic />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/my-applications"
                  element={
                    <ProtectedRoute allowedRoles={["volunteer"]}>
                      <MyApplications />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/calendar"
                  element={
                    <ProtectedRoute allowedRoles={["volunteer"]}>
                      <PersonalCalendar />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/organization/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["organization"]}>
                      <OrganizationDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/organization/events"
                  element={
                    <ProtectedRoute allowedRoles={["organization"]}>
                      <OrganizationEvents />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/organization/events/create"
                  element={
                    <ProtectedRoute allowedRoles={["organization"]}>
                      <CreateEvent />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/organization/events/:id/edit"
                  element={
                    <ProtectedRoute allowedRoles={["organization"]}>
                      <EditEvent />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/organization/events/:id/recap"
                  element={
                    <ProtectedRoute allowedRoles={["organization"]}>
                      <ShareEventRecap />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <AdminPanel />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>
        <Toaster position="top-right" />
        <AccessibilityPanel />
        <LiveAnnouncements />
      </PasswordResetBoundary>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AccessibilityProvider>
        <AppRoutes />
      </AccessibilityProvider>
    </AuthProvider>
  );
}

export default App;
