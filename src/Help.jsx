import React, { useEffect } from "react";
import Styles from "./Help.module.css";
import { TbX } from "react-icons/tb";

function Help({ onClose }) {
  // مدیریت کلید ESC
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    
    // جلوگیری از اسکرول صفحه پشت مودال
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [onClose]);

  return (
    <div className={Styles.overlay} onClick={onClose}>
      <div className={Styles.helpContainer} onClick={(e) => e.stopPropagation()}>
        <div className={Styles.helpHeader}>
          <h2>راهنمای فعال‌سازی ثبت هزینه کرد</h2>
          <button className={Styles.closeButton} onClick={onClose} aria-label="بستن">
            <TbX />
          </button>
        </div>
        
        <div className={Styles.helpContent}>
          <p>با سلام و احترام</p>
          <p>
            احتراماً به استحضار می‌رساند سامانه پارسا جهت بارگذاری هزینه کرد پایان‌نامه و رساله‌های دانشجویان تحصیلات تکمیلی فعال شده است. مبلغ مصوب پایان‌نامه‌ها و رساله‌هایی که تاریخ ثبت در سیستم آن‌ها در سامانه از اول فروردین تا ۲۹ بهمن ۱۴۰۴ می‌باشد، به حساب گرنت قرض‌الحسنه مهر (بن کارت رفاه سابق) واریز شده است. لذا لازم است اعضای هیئت علمی نسبت به تسویه حساب با اسناد مثبته تا پایان سال ۱۴۰۵ اقدام نمایند.
          </p>
          <p>
            * لازم به ذکر است مبلغ مصوب تعدادی از پایان‌نامه‌ها و رساله‌ها به طور کامل پرداخت نشده است و بعد از تأمین اعتبار این مابه‌التفاوت پرداخت می‌شود. برای این موارد هم سامانه فعال می‌باشد و اعضای هیئت علمی می‌توانند اسناد مثبته را بارگذاری نمایند.
          </p>
          <p>
            * راهنمای ورود به سامانه و نحوه ثبت هزینه کرد توسط اعضای هیات علمی در فایل پیوست خدمتتان ارسال شده است.
          </p>
          <p>
            * راهنمای کارپردازان مالی پارسا دانشکده‌ها جهت تنظیم اسناد ضمیمه می‌باشد.
          </p>

          <div className={Styles.downloadButtons}>
            <a 
              href="/ostadan.pdf" 
              download 
              className={Styles.downloadBtn}
              target="_blank" 
              rel="noopener noreferrer"
            >
              دانلود راهنمای استادان (PDF)
            </a>
            <a 
              href="/karpardazan.pdf" 
              download 
              className={Styles.downloadBtn}
              target="_blank" 
              rel="noopener noreferrer"
            >
              دانلود راهنمای کارپردازان مالی (PDF)
            </a>
          </div>

          <div className={Styles.staffList}>
            <h3>لیست کارپردازان مالی پارسا دانشکده‌ها:</h3>
            <ul>
              <li><strong>دانشکده کشاورزی:</strong> خانم مرضیه براتی</li>
              <li><strong>دانشکده منابع طبیعی:</strong> خانم مرضیه پایمزد</li>
              <li><strong>دانشکده علوم پایه:</strong> آقای محسن زمانی</li>
              <li><strong>دانشکده علوم ریاضی:</strong> خانم زینب بلالی</li>
              <li><strong>دانشکده دامپزشکی:</strong> آقای عبداله کیانی</li>
              <li><strong>دانشکده ادبیات:</strong> خانم ناهید نعمتی</li>
              <li><strong>دانشکده فنی و مهندسی:</strong> آقایان مجید رفیعی و مهدی طاهری</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Help;