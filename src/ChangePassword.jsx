import { useEffect, useState } from "react";
import axios from "axios";
import serverAddress from "./constants/contants";
import Styles from "./ChangePassword.module.css";
import { useNotification } from "../src/contexts/NotificationContext";

// importing icons
import { AiOutlineCloseCircle } from "react-icons/ai";
import { TbLockPassword } from "react-icons/tb";
import { FaCheck } from "react-icons/fa6";

function ChangePassword({ onClose }) {
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { addNotification } = useNotification();

  //نمایش نوتیف موفقیت یا خطا
  useEffect(() => {
    const timer = setTimeout(() => {
      if (error) setError("");
      else if (success) setSuccess("");
    }, 0);

    if (error) {
      addNotification({ type: "error", text: error });
    } else if (success) addNotification({ type: "success", text: success });
    return () => clearTimeout(timer);
  }, [error, success, addNotification]);

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("رمز عبور جدید و تکرار آن مطابقت ندارند");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${serverAddress}/change-password`,
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSuccess("رمز عبور با موفقیت تغییر یافت");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      // بستن فرم پس از 2 ثانیه
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "خطا در تغییر رمز عبور");
      console.error(err);
    }
  };

  return (
    <div className={Styles.container}>
      <div className={Styles.formContainer}>
        <h2>
          <TbLockPassword />
          تغییر رمز عبور
        </h2>

        <form onSubmit={handleSubmit}>
          <div className={Styles.formGroup}>
            <label>رمز عبور فعلی:</label>
            <input
              type="password"
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              required
            />
          </div>

          <div className={Styles.formGroup}>
            <label>رمز عبور جدید:</label>
            <input
              type="password"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              required
            />
          </div>

          <div className={Styles.formGroup}>
            <label>تکرار رمز عبور جدید:</label>
            <input
              type="password"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              required
            />
          </div>

          <div className={Styles.formActions}>
            <button
              type="submit"
              className="miniButton success"
              title="تغییر رمز"
            >
              <FaCheck />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="miniButton error"
              title="بستن پنجره"
            >
              <AiOutlineCloseCircle />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChangePassword;
