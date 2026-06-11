import { useState, useEffect } from "react";
import axios from "axios";
import serverAddress from "./constants/contants";
import Styles from "./ThesisHistory.module.css";
import Loader from "../src/components/Loader";
import { useNotification } from "./contexts/NotificationContext";

function ThesisHistory({ thesisId, onClose }) {
  // اضافه کردن prop onClose
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { addNotification } = useNotification();

  useEffect(() => {
    if (error) setError("");

    if (error) addNotification({ type: "error", text: error });
  }, [error, addNotification]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${serverAddress}/theses/${thesisId}/history`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setHistory(response.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching thesis history:", err);
        setError("خطا در دریافت تاریخچه پایان‌نامه");
        setLoading(false);
      }
    };

    fetchHistory();
  }, [thesisId]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose(); // فراخوانی تابع onClose هنگام فشردن دکمه ESC
      }
    };

    // اضافه کردن event listener
    window.addEventListener("keydown", handleKeyDown);

    // حذف event listener هنگام unmount
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]); // وابستگی به onClose

  if (loading)
    return (
      <div className={Styles.loading}>
        <Loader />
      </div>
    );
  if (error) return <div className={Styles.error}>{error}</div>;

  return (
    <div className={Styles.historyContainer}>
      <h3>تاریخچه تغییرات</h3>
      {/* This is wrong, in case of error, history would be empty */}
      {history.length === 0 ? (
        // <div className={Styles.noHistory}>
        //   تاریخچه‌ای برای این پایان‌نامه ثبت نشده است
        // </div>
        <button
          // className={Styles.retryButton}
          onClick={() => window.location.reload()}
          className="bigButton info"
        >
          تلاش مجدد
        </button>
      ) : (
        <table className={Styles.historyTable}>
          <thead>
            <tr>
              <th>عملیات</th>
              <th>توضیحات</th>
              <th>تاریخ</th>
              <th>زمان</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr key={item.HistoryID}>
                <td>{item.Status}</td>
                <td>{item.Description}</td>
                <td>{item.PersianDate}</td>
                <td>{item.PersianTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ThesisHistory;
