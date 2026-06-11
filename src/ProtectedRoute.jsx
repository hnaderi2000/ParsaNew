import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, hasRole } = useAuth();

  // اگر کاربر لاگین نکرده باشد
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // اگر نقش‌های مورد نیاز مشخص شده‌اند و کاربر آن نقش‌ها را ندارد
  if (allowedRoles && !hasRole(allowedRoles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
