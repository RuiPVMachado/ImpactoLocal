import type { ReactNode } from "react";
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

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Events from "./pages/Events";
import EventDetails from "./pages/EventDetails";
import MyApplications from "./pages/MyApplications";
import Profile from "./pages/Profile";
import OrganizationDashboard from "./pages/OrganizationDashboard";
import OrganizationEvents from "./pages/OrganizationEvents";
import CreateEvent from "./pages/CreateEvent";
import EditEvent from "./pages/EditEvent";
import AdminPanel from "./pages/AdminPanel";
import SobreNos from "./pages/SobreNos";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import MapExplorer from "./pages/MapExplorer";
import Organizations from "./pages/Organizations";
import OrganizationProfilePublic from "./pages/OrganizationProfilePublic";
import VolunteerProfilePublic from "./pages/VolunteerProfilePublic";

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
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Navbar />
          <main className="flex-grow">
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
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminPanel />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
          <Footer />
        </div>
        <Toaster position="top-right" />
      </PasswordResetBoundary>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
