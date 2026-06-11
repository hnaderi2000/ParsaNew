

import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import serverAddress from "./constants/contants";
import { useNotification } from "./contexts/NotificationContext";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);
  const [facultyFilter, setFacultyFilter] = useState(null);
  const [departmentFilter, setDepartmentFilter] = useState(null);
  const [error, setError] = useState("");
  const { addNotification } = useNotification();

  const navigate = useNavigate();

  // نمایش نوتیفیکیشن
  useEffect(() => {
    const timer = setTimeout(() => {
      if (error) setError("");
    }, 3000);

    if (error) addNotification({ type: "error", text: error });

    return () => clearTimeout(timer);
  }, [error, addNotification]);

  // بارگذاری کاربر از localStorage
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        const token = localStorage.getItem("token");
        const storedRole = localStorage.getItem("selectedRole");
         
        if (storedUser && token) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);

          // نقش انتخابی
          if (storedRole) {
            setSelectedRole(storedRole);
          } else if (parsedUser?.roles?.length > 0) {
            const defaultRole = parsedUser.roles[0];
            localStorage.setItem("selectedRole", defaultRole);
            setSelectedRole(defaultRole);
          }

          // فیلتر دانشکده برای نقش‌های خاص
          if (parsedUser?.roles?.includes("کارشناس پژوهشی دانشکده")) {
            if (!parsedUser.FacultyID) {
              setError("دانشکده شما مشخص نشده است. لطفاً با مدیر سیستم تماس بگیرید.");
              navigate("/login");
            } else {
              setFacultyFilter(parsedUser.FacultyID);
            }
          }

          navigate("/dashboard");
        } else {
          navigate("/login");
        }
      } catch (err) {
        setError(err.message || "خطا در بارگذاری اطلاعات کاربر");
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [navigate]);

  // تابع ورود
  const login = async (userName, password) => {
    try {
      const response = await axios.post(`${serverAddress}/login`, {
        userName,
        password,
      });
      const { token, user } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      setUser(user);

      const firstRole = user.roles.length > 0 ? user.roles[0] : null;
      localStorage.setItem("selectedRole", firstRole);
      setSelectedRole(firstRole);

      // فیلتر دانشکده
      if (user.roles.includes("کارشناس پژوهشی دانشکده")) {
        if (!user.FacultyID) {
          setError("دانشکده شما مشخص نشده است. لطفاً با مدیر سیستم تماس بگیرید.");
          return { success: false, message: "دانشکده شما مشخص نشده است." };
        }
        setFacultyFilter(user.FacultyID);
      } else {
        setFacultyFilter(null);
      }
      setDepartmentFilter(null);

      navigate("/dashboard");
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.message || "خطا در ورود");
      return {
        success: false,
        message: err.response?.data?.message || "خطا در ورود",
      };
    }
  };

  // تغییر نقش کاربر
  const changeRole = (role) => {
    if (!user?.roles?.includes(role)) return;

    localStorage.setItem("selectedRole", role);
    setSelectedRole(role);

    const superRoles = [
      "مدیر سیستم",
      "معاون پژوهشی دانشگاه",
      "مدیر امور پژوهشی",
      "کارشناس پژوهشی معاونت پژوهشی",
    ];
    const facultyRoles = ["کارشناس پژوهشی دانشکده", "معاون پژوهشی دانشکده","کارشناس مالی دانشکده"];

    if (superRoles.includes(role)) {
      setFacultyFilter(null);
      setDepartmentFilter(null);
    } else if (facultyRoles.includes(role)) {
      if (!user.FacultyID) {
        setError("دانشکده شما مشخص نشده است. لطفاً با مدیر سیستم تماس بگیرید.");
        return;
      }
      setFacultyFilter(user.FacultyID);
      setDepartmentFilter(null);
    } else if (role === "مدیر گروه") {
      if (!user.FacultyID || !user.DepartmentID) {
        setError("دانشکده یا گروه شما مشخص نشده است. لطفاً با مدیر سیستم تماس بگیرید.");
        return;
      }
      setFacultyFilter(user.FacultyID);
      setDepartmentFilter(user.DepartmentID);
    }

    navigate("/dashboard");
  };

  // خروج
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("selectedRole");
    setUser(null);
    setSelectedRole(null);
    setFacultyFilter(null);
    setDepartmentFilter(null);
    navigate("/login");
  };

  // چک نقش
  const hasRole = (requiredRoles) => {
    if (!selectedRole) return false;
    return requiredRoles.includes(selectedRole);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    hasRole,
    selectedRole,
    changeRole,
    roles: user?.roles || [],
    FacultyID: user?.FacultyID || null,
    DepartmentID: user?.DepartmentID || null,
    facultyFilter,
    departmentFilter,
   
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

