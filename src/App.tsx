import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
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

function AppRoutes() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:id" element={<EventDetails />} />
            <Route path="/sobre-nos" element={<SobreNos />} />

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
