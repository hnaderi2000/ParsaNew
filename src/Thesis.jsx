import { useState } from "react";
import Styles from "./Thesis.module.css";
import NewParsa from "./NewParsa";
import { useAuth } from "./AuthContext";
function Thesis() {
  const [newParsa, setNewParsa] = useState(false);
  const { user } = useAuth(); // دریافت اطلاعات کاربر فعلی

  // بررسی آیا کاربر مجوز تعریف پارسای جدید را دارد یا نه
  const canCreateNewParsa = user?.roles?.some(
    (role) => role === "کارشناس پژوهشی دانشکده" || role === "مدیر سیستم"
  );
  return (
    <div className={Styles.container}>
      {/* نمایش دکمه فقط برای کاربران مجاز */}
      {canCreateNewParsa && (
        <button
          className="bigButtton success"
          onClick={() => setNewParsa(true)}
        >
          تعریف پارسای جدید
        </button>
      )}

      {newParsa ? <NewParsa setNewParsa={setNewParsa} /> : ""}
    </div>
  );
}

export default Thesis;
