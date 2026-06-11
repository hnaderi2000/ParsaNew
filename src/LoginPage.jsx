import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Styles from "./LoginPage.module.css";
import { useAuth } from "./AuthContext";
import { useNotification } from "./contexts/NotificationContext";

//importing icons
import { TbLogin } from "react-icons/tb";

function LoginPage() {
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addNotification } = useNotification();

  //نمایش نوتیف موفقیت یا خطا
  useEffect(() => {
    const timer = setTimeout(() => {
      if (error) setError("");
      else if (success) setSuccess("");
    }, 0);

    if (error) addNotification({ typeof: "error", text: error });
    if (success) addNotification({ type: "success", text: success });

    return () => clearTimeout(timer);
  }, [error, success, addNotification]);

  const persianCheckHandler = (e) => {
    const value = e.target.value;
    const englishRegex = /^[A-Za-z0-9_@.-]*$/;

    if (englishRegex.test(value)) {
      setUserName(value);
      // setError(""); // پاک کردن خطا وقتی ورودی درست شد
    } else {
      setError("نام کاربری باید فقط شامل حروف انگلیسی باشد");
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(userName, password);

      if (result.success) {
        navigate("/dashboard");
      } else {
        setError(result.message || "خطا در ورود");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={Styles.container}>
        <img src="/graduation.png" alt="Logo" />
        <h1>پارسا</h1>
        <sub>سامانه پژوهشی ثبت پژوهانه پارسا</sub>

        {/* {error && <div className={Styles.error}>{error}</div>} */}

        <form onSubmit={handleLogin} className={Styles.form}>
          {/* <div className={Styles.LoginRow}>
            <label htmlFor="username">نام کاربری</label>
            <input
              type="text"
              name="username"
              value={userName}

             onChange={(e) => {
    const value = e.target.value;
    // فقط حروف انگلیسی، اعداد و برخی کاراکترهای مجاز
    const englishRegex = /^[A-Za-z0-9_@.-]*$/;
    if (englishRegex.test(value)) {
      setUserName(value);
    }
  }}
   onInvalid={() => setError("نام کاربری باید فقط شامل حروف انگلیسی باشد")}
              required
            />
          </div> */}

          <div className={Styles.LoginRow}>
            <label htmlFor="username">نام کاربری</label>
            <input
              type="text"
              name="username"
              value={userName}
              onChange={persianCheckHandler}
              required
            />
            {/* نمایش برچسب خطا زیر input */}
            {/* {error && <span className={Styles.inputError}>{error}</span>} */}
          </div>

          <div className={Styles.LoginRow}>
            <label htmlFor="password">رمز عبور</label>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={Styles.loginButton}
          >
            {/* {loading ? "در حال ورود..." : "ورود"} */}
            {loading ? (
              "در حال ورود..."
            ) : (
              <>
                ورود <TbLogin />
              </>
            )}
          </button>
        </form>
      </div>
      <footer className={Styles.footer}>
        COPYRIGHT (c) 2025 ّHassan Naderi/Fatemeh Heidari. All rights reserved.
      </footer>
    </>
  );
}

export default LoginPage;
