import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./LoginPage";
import Dashboard from "./Dashboard";
import ProtectedRoute from "./ProtectedRoute";
import SystemVariables from "./SystemVariables";
import { AuthProvider } from "./AuthContext";
import { NotificationProvider } from "../src/contexts/NotificationContext";
import NotFound from "./NotFound";

function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/login" replace />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/system-variables"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "مدیر سیستم",
                    "مدیر امور پژوهشی",
                    "معاون پژوهشی دانشگاه",
                  ]}
                >
                  <SystemVariables />
                </ProtectedRoute>
              }
            />
            <Route path="/*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;
