



import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";

import Styles from "./Expenses.module.css";
  import DatePicker from "react-multi-date-picker";
  import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { MdSave, MdCancel, MdDelete } from "react-icons/md";
import { FaFilePdf, FaFileImage } from "react-icons/fa";
import { useNotification } from "./contexts/NotificationContext";
import SearchSelects from "./SearchSelects";
import Loader from "../src/components/Loader";
import { toPersianNum } from "./helpers/toPersianNum";
import serverAddress from "./constants/contants";

function Expenses({ thesisId, paymentType, onClose, onSuccess }) {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [thesisInfo, setThesisInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    factorNumber: "",
    factorDate: "",
    amount: "",
    description: "",
    file: null,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [factors, setFactors] = useState([]);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    factorId: null,
    factorInfo: null,
  });

  // تابع برای فرمت کردن اعداد با جداکننده هزارگان
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // تابع برای حذف جداکننده‌ها و تبدیل به عدد
  const parseNumber = (formattedNum) => {
    return formattedNum.replace(/,/g, '');
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    const numericValue = parseNumber(value);
    
    setFormData({
      ...formData,
      amount: numericValue,
    });
  };

  // نمایش نوتیفیکیشن‌ها
  useEffect(() => {
    const timer = setTimeout(() => {
      if (error) setError("");
      else if (errors.factorNumber) setErrors({ ...errors, factorNumber: "" });
      else if (errors.factorDate) setErrors({ ...errors, factorDate: "" });
      else if (errors.amount) setErrors({ ...errors, amount: "" });
        else if (errors.description) setErrors({ ...errors, description: "" }); // اضافه شده
      else if (errors.file) setErrors({ ...errors, file: "" });
    }, 3000);

    if (error) addNotification({ type: "error", text: error });
    else if (errors.factorNumber)
      addNotification({ type: "error", text: errors.factorNumber });
    else if (errors.factorDate)
      addNotification({ type: "error", text: errors.factorDate });
    else if (errors.amount)
      addNotification({ type: "error", text: errors.amount });
     else if (errors.description)  // اضافه شده
    addNotification({ type: "error", text: errors.description });
    else if (errors.file) addNotification({ type: "error", text: errors.file });
    return () => clearTimeout(timer);
  }, [errors, error, addNotification]);

  useEffect(() => {
    const fetchThesisInfo = async () => {
      if (!thesisId || isNaN(thesisId)) {
        console.error("Invalid thesisId:", thesisId);
        setError("شناسه پایان‌نامه نامعتبر است");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("token");

        const thesisResponse = await axios.get(
          `${serverAddress}/theses/${thesisId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setThesisInfo(thesisResponse.data);

        const factorsResponse = await axios.get(
          `${serverAddress}/theses/${thesisId}/factors`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setFactors(factorsResponse.data);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.response?.data?.message || "خطا در دریافت اطلاعات");
      } finally {
        setLoading(false);
      }
    };

    fetchThesisInfo();
  }, [thesisId, addNotification]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (deleteModal.isOpen) {
          closeDeleteModal();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteModal.isOpen, onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (!file) {
      setFilePreview(null);
      setFormData((prev) => ({ ...prev, file: null }));
      setErrors((prev) => ({ ...prev, file: "فایل فاکتور الزامی است" }));
      return;
    }

    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      setFilePreview(null);
      setFormData((prev) => ({ ...prev, file: null }));
      setErrors((prev) => ({
        ...prev,
        file: "فقط فایل‌های PDF و تصاویر (JPG, PNG, GIF, WEBP) قابل قبول هستند",
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, file }));
    if (file.type.startsWith("image/")) {
      const imageUrl = URL.createObjectURL(file);
      setFilePreview(imageUrl);
    } else {
      setFilePreview(file.name);
    }

    setErrors((prev) => ({ ...prev, file: "" }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.factorNumber.trim()) {
      newErrors.factorNumber = "شماره فاکتور الزامی است";
    }

    if (!selectedDate) {
      newErrors.factorDate = "تاریخ فاکتور الزامی است";
    }

    if (
      !formData.amount ||
      isNaN(formData.amount) ||
      parseFloat(formData.amount) <= 0
    ) {
      newErrors.amount = "مبلغ فاکتور باید عددی مثبت باشد";
    }

    if (!formData.description.trim()) {
    newErrors.description = "شرح کالا الزامی است";
  }

    if (!formData.file) {
      newErrors.file = "فایل فاکتور الزامی است";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const openDeleteModal = (factorId, factorInfo) => {
    setDeleteModal({
      isOpen: true,
      factorId,
      factorInfo,
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      factorId: null,
      factorInfo: null,
    });
  };

  const confirmDelete = async () => {
    if (!deleteModal.factorId) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${serverAddress}/factors/${deleteModal.factorId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setFactors(factors.filter((factor) => factor.FactorID !== deleteModal.factorId));
      closeDeleteModal();
      addNotification({ type: "success", text: "فاکتور با موفقیت حذف شد" });
    } catch (err) {
      console.error("Error deleting factor:", err);
      setError(err.response?.data || "خطا در حذف فاکتور");
      addNotification({ type: "error", text: err.response?.data || "خطا در حذف فاکتور" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const currentProfessor = thesisInfo.professors?.find(
      (p) => p.nationalCode === user.nationalCode
    );
    let professorShare = currentProfessor
      ? thesisInfo.ApprovedAmount * (currentProfessor.participation / 100)
      : 0;
      
    if (paymentType === "first" || paymentType === "second") {
      professorShare = professorShare / 2;
    }

    let professorFactors = factors.filter(
      (factor) => factor.ProfessorNationalCode === user.nationalCode
    );
    if (paymentType == "first") {
      professorFactors = professorFactors.filter(f => f.ForFirstFiftyPercent);
    }
    if (paymentType == "second") {
      professorFactors = professorFactors.filter(f => f.ForSecondFiftyPercent);
    }

    const totalProfessorFactorsAmount = professorFactors.reduce(
      (sum, factor) => sum + parseFloat(factor.Amount),
      0
    );
    const newAmount = parseFloat(formData.amount);
    const totalProfessorAfterAddition = totalProfessorFactorsAmount + newAmount;

    if (totalProfessorAfterAddition > professorShare) {
      const errorMessage = `مجموع مبالغ فاکتورهای شما (${toPersianNum(formatNumber(Math.floor(
        totalProfessorAfterAddition))
      )} ریال) از سهم شما (${toPersianNum(formatNumber(Math.floor(
        professorShare))
      )} ریال) بیشتر است`;
      setError(errorMessage);
      return;
    }

    const totalExistingAmount = factors.reduce(
      (sum, factor) => sum + parseFloat(factor.Amount),
      0
    );
    const totalAfterAddition = totalExistingAmount + newAmount;

    if (totalAfterAddition > thesisInfo.ApprovedAmount) {
      const errorMessage = `مجموع مبالغ فاکتورها (${toPersianNum(formatNumber(Math.floor(
        totalAfterAddition))
      )} ریال) از مبلغ مصوب (${toPersianNum((formatNumber(Math.floor(
        thesisInfo.ApprovedAmount)))
      )} ریال) بیشتر است`;
      setError(errorMessage);
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const formDataToSend = new FormData();
      formDataToSend.append("factorNumber", formData.factorNumber);
      formDataToSend.append("factorDate", selectedDate);
      formDataToSend.append("amount", formData.amount);
      formDataToSend.append("description", formData.description || "");
      formDataToSend.append("file", formData.file);
      formDataToSend.append("professorNationalCode", user.nationalCode);
      
      if (paymentType == "first") {
        formDataToSend.append("ForFirstFiftyPercent", true);
      }
      if (paymentType == "second") {
        formDataToSend.append("ForSecondFiftyPercent", true);
      }
      if (paymentType == "second") {
        const firstHalfTotal = factors
          .filter(f => f.ProfessorNationalCode === user.nationalCode && f.ForFirstFiftyPercent)
          .reduce((sum, f) => sum + parseFloat(f.Amount), 0);

        if (totalProfessorAfterAddition + firstHalfTotal > professorShare * 2) {
          setError("مجموع فاکتورهای ۵۰٪ اول و دوم از کل سهم شما بیشتر است");
          return;
        }
      }

      await axios.post(
        `${serverAddress}/theses/${thesisId}/factors`,
        formDataToSend,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      addNotification({ type: "success", text: "فاکتور با موفقیت ثبت شد" });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response.data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalFactorsAmount = factors.reduce(
    (sum, factor) => sum + parseFloat(factor.Amount),
    0
  );
  const remainingAmount = thesisInfo
    ? thesisInfo.ApprovedAmount - totalFactorsAmount
    : 0;

  const halfAmount = thesisInfo ? thesisInfo.ApprovedAmount / 2 : 0;
  const sumFirst = factors.filter(f => f.ForFirstFiftyPercent).reduce((sum, f) => sum + parseFloat(f.Amount), 0);
  const sumSecond = factors.filter(f => f.ForSecondFiftyPercent).reduce((sum, f) => sum + parseFloat(f.Amount), 0);
  const remainingFirst = halfAmount - sumFirst;
  const remainingSecond = halfAmount - sumSecond;
  const totalRemaining = remainingFirst + remainingSecond;


  // توابع کمکی برای بررسی تاریخ اعتبار
const toEnglishDigits = (str) => {
  if (!str) return '';
  
  const persianNumbers = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const arabicNumbers = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  const englishNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  
  let result = str;
  
  for (let i = 0; i < 10; i++) {
    result = result.replace(persianNumbers[i], englishNumbers[i]);
    result = result.replace(arabicNumbers[i], englishNumbers[i]);
  }
  
  return result;
};

const convertPersianDateToNumber = (persianDate) => {
  if (!persianDate || persianDate === 'نامشخص' || persianDate === '') return null;
  
  const englishDate = toEnglishDigits(persianDate);
  const numbersOnly = englishDate.replace(/\D/g, '');
  
  if (numbersOnly.length === 8) {
    return parseInt(numbersOnly, 10);
  }
  
  return null;
};

const getTodayPersianDate = () => {
  const today = new Date();
  
  const formatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(today);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  
  return `${year}/${month}/${day}`;
};

const isDatePassed = (dateString) => {
  if (!dateString || dateString === 'نامشخص' || dateString === '') return false;
  
  const dateNumber = convertPersianDateToNumber(dateString);
  if (dateNumber === null) return false;
  
  const todayPersian = getTodayPersianDate();
  const todayNumber = convertPersianDateToNumber(todayPersian);
  
  if (todayNumber === null) return false;
  
  return dateNumber < todayNumber;
};

const getDateStyle = (dateString) => {
  if (!dateString || dateString === 'نامشخص' || dateString === '') {
    return {
      color: '#999999',
      fontWeight: 'normal',
      backgroundColor: 'transparent',
      padding: '6px 4px',
      animation: 'none'
    };
  }
  
  const passed = isDatePassed(dateString);
  
  if (passed) {
    return {
      color: '#ff0000',
      fontWeight: 'bold',
      backgroundColor: '#ffe6e6',
      padding: '6px 4px',
      animation: 'blink 1s step-end infinite',
      borderRadius: '4px'
    };
  }
  
  return {
    color: '#000000',
    fontWeight: 'normal',
    backgroundColor: 'transparent',
    padding: '6px 4px',
    animation: 'none'
  };
};
  if (loading) {
    return (
      <div className={Styles.loadingContainer}>
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className={Styles.errorContainer}>
        <p>{error}</p>
        <button
          className={Styles.retryButton}
          onClick={() => window.location.reload()}
        >
          تلاش مجدد
        </button>
      </div>
    );
  }

  if (!thesisInfo) {
    return (
      <div className={Styles.errorContainer}>
        <p>اطلاعات پایان‌نامه یافت نشد</p>
      </div>
    );
  }

  let displayApprovedAmount = thesisInfo.ApprovedAmount;
  if (paymentType === "first" || paymentType === "second") {
    displayApprovedAmount = thesisInfo.ApprovedAmount / 2;
  }

  const professorsWithShare = thesisInfo.professors?.map((professor) => {
    let share = thesisInfo.ApprovedAmount * (professor.participation / 100);
    if (paymentType === "first" || paymentType === "second") {
      share = share / 2;
    }
    return {
      ...professor,
      displayShare: share
    };
  });

  return (
    <div className={Styles.container}>
      <h2 className={Styles.title}>
        {paymentType === "first"
          ? "ثبت هزینه فاکتور 50% اول"
          : paymentType === "second"
          ? "ثبت هزینه فاکتور 50% دوم"
          : "ثبت هزینه فاکتور"}
      </h2>

      <div className={Styles.thesisInfo}>
        <h3>اطلاعات پایان‌نامه</h3>
        <div className={Styles.infoRow}>
          <span className={Styles.infoLabel}>شماره دانشجویی:</span>
          <span>{toPersianNum(thesisInfo.StudentID)}</span>
        </div>
        <div className={Styles.infoRow}>
          <span className={Styles.infoLabel}>نام و نام خانوادگی:</span>
          <span>{thesisInfo.StudentName}</span>
        </div>
        <div className={Styles.infoRow}>
          <span className={Styles.infoLabel}>
            عنوان {thesisInfo.ParsaType == "p" ? "پایان نامه" : "رساله"}:
          </span>
          <span>{toPersianNum(thesisInfo.Title)}</span>
        </div>
        <div className={Styles.infoRow}>
          <span className={Styles.infoLabel}>مقطع تحصیلی:</span>
          <span>{thesisInfo.LevelName}</span>
        </div>
        <div className={Styles.infoRow}>
          <span className={Styles.infoLabel}>
            مبلغ مصوب {paymentType ? "در این بخش" : ""} به ریال:
          </span>
          <span>{toPersianNum(formatNumber(Math.floor(displayApprovedAmount)))}</span>
        </div>
        {paymentType === "second" ? (
          <>
            <div className={Styles.infoRow}>
              <span className={Styles.infoLabel}>باقیمانده از ۵۰٪ دوم:</span>
              <span>{toPersianNum(formatNumber(Math.floor(remainingSecond)))} ریال</span>
            </div>
          </>
        ) : (
          <div className={Styles.infoRow}>
            <span className={Styles.infoLabel}>باقیمانده مبلغ مصوب به ریال:</span>
            <span>{toPersianNum(formatNumber(remainingAmount))}</span>
          </div>
        )}
        {professorsWithShare?.map((professor, index) => (
          <div className={Styles.infoRow} key={index}>
            <span className={Styles.infoLabel}>
              سهم دکتر {professor.professorName} به ریال
              ({paymentType ? "۵۰٪ از " : ""}{professor.participation}%):
            </span>
            <span>{toPersianNum(formatNumber(Math.floor(professor.displayShare)))}</span>
          </div>

          
        ))}
{/*         
        <div className={Styles.infoRow}>
          <span className={Styles.infoLabel}>
            تاریخ اعتبار پارسا: 
          </span>
          <span>{toPersianNum((thesisInfo.ExpiryDate))}</span>
        </div> */}

        <div className={Styles.infoRow}>
  <span className={Styles.infoLabel}>
    تاریخ اعتبار پارسا: 
  </span>
  <span 
    className={isDatePassed(thesisInfo.ExpiryDate) ? Styles.expiredDate : ""}
    style={getDateStyle(thesisInfo.ExpiryDate)}
  >
    {toPersianNum(thesisInfo.ExpiryDate)}
  </span>
</div>

{isDatePassed(thesisInfo?.ExpiryDate) && (
  <div className={Styles.expiryWarning}>
    ⚠️ تاریخ اعتبار پایان‌نامه به پایان رسیده است و امکان ثبت فاکتور جدید وجود ندارد.
  </div>
)}
              </div>

      {factors.length > 0 && (
        <div className={Styles.factorsList}>
          <h3>فاکتورهای ثبت شده توسط دکتر {user.firstName} {user.lastName}</h3>
          <table className={Styles.factorsTable}>
            <thead>
              <tr>
                <th>شماره فاکتور</th>
                <th>تاریخ</th>
                <th>مبلغ (ریال)</th>
                <th>تایید کارشناس مالی دانشکده</th>
                <th>تایید معاون پژوهشی دانشکده</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {factors
                .filter(factor => {
                  if (paymentType === "first") return factor.ForFirstFiftyPercent && factor.ProfessorNationalCode === user.nationalCode;
                  if (paymentType === "second") return factor.ForSecondFiftyPercent && factor.ProfessorNationalCode === user.nationalCode;
                  return factor.ProfessorNationalCode === user.nationalCode;
                })
                .map((factor) => (
                  <tr key={factor.FactorID}>
                    <td>{toPersianNum(factor.FactorNumber)}</td>
                    <td>{factor.FactorDate}</td>
                    <td>{toPersianNum(factor.Amount.toLocaleString())}</td>
                    <td>
                      {factor.IsConfirmedByExpert == null ? (
                        <span className={Styles.unknownStatus}>نامشخص</span>
                      ) : factor.IsConfirmedByExpert == 1 ? (
                        <span className={Styles.confirmed}>تایید شده</span>
                      ) : (
                        <span className={Styles.rejectedStatus}>رد شده</span>
                      )}
                    </td>
                    <td>
                      {factor.IsConfirmedByDeputy == null ? (
                        <span className={Styles.unknownStatus}>نامشخص</span>
                      ) : factor.IsConfirmedByDeputy == 1 ? (
                        <span className={Styles.confirmed}>تایید شده</span>
                      ) : (
                        <span className={Styles.rejectedStatus}>رد شده</span>
                      )}
                    </td>
                    <td>
                      {factor.IsConfirmedByExpert == null && factor.IsConfirmedByDeputy == null && (
                        <button
                          className={Styles.deleteButton}
                          onClick={() => openDeleteModal(factor.FactorID, factor)}
                          title="حذف فاکتور"
                        >
                          <MdDelete />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={handleSubmit} className={Styles.form}>
        <div className={Styles.formGroup}>
          <label htmlFor="factorNumber">شماره فاکتور:</label>
          <input
            type="text"
            id="factorNumber"
            name="factorNumber"
            value={formData.factorNumber}
            onChange={handleChange}
            className={errors.factorNumber ? Styles.errorInput : ""}
          />
        </div>

       <div className={`${Styles.formGroup} ${Styles.datePickerGroup}`}>
          <label>تاریخ فاکتور:</label>
          <DatePicker
            value={selectedDate}
            onChange={setSelectedDate}
            calendar={persian}
            // locale={persian_fa}
            format="YYYY/MM/DD"
            inputClass={errors.factorDate ? Styles.errorInput : ""}
            className={Styles.datePicker}
          />
        </div>

        <div className={Styles.formGroup}>
          <label htmlFor="amount">مبلغ فاکتور (ریال):</label>
          <input
            type="text"
            id="amount"
            name="amount"
            value={formatNumber(formData.amount)}
            onChange={handleAmountChange}
            className={errors.amount ? Styles.errorInput : ""}
            min="0"
          />
        </div>

        <div className={Styles.formGroup}>
          <label htmlFor="description">شرح کالا <span style={{ color: 'red' }}>*</span>:</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="3"
          />
        </div>

        <div className={Styles.formGroup}>
          <label htmlFor="file">فایل فاکتور (PDF یا تصویر):</label>
          <div className={Styles.fileInputContainer}>
            <label htmlFor="file" className={Styles.fileInputLabel}>
              {formData.file?.type?.includes("pdf") ? (
                <FaFilePdf />
              ) : (
                <FaFileImage />
              )}{" "}
              انتخاب فایل
              <input
                type="file"
                id="file"
                name="file"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,application/pdf,image/*"
              />
            </label>
            <p className={Styles.fileHelpText}>
      در صورتی که چند فاکتور دارید و قصد دارید در یک درخواست بفرستید، 
      همه فاکتورها را در قالب یک فایل پی دی اف ارسال نمایید.
    </p>
            {filePreview &&
              (formData.file?.type?.startsWith("image/") ? (
                <img
                  src={filePreview}
                  alt="پیش‌نمایش"
                  style={{
                    maxWidth: "150px",
                    marginTop: "10px",
                    borderRadius: "8px",
                  }}
                />
              ) : (
                <span className={Styles.filePreview}>{filePreview}</span>
              ))}
          </div>
        </div>

        {/* <div className={Styles.formActions}>
          <button
            type="submit"
            className={`${Styles.submitButton} ${
              isSubmitting ? Styles.disabled : ""
            }`}
            disabled={isSubmitting}
          >
            <MdSave /> {isSubmitting ? "در حال ثبت..." : "ثبت فاکتور"}
          </button>
          <button
            type="button"
            className={Styles.cancelButton}
            onClick={onClose}
          >
            <MdCancel /> انصراف
          </button>
        </div> */}
<div className={Styles.formActions}>
  <button
    type="submit"
    className={`${Styles.submitButton} ${
      isSubmitting || isDatePassed(thesisInfo?.ExpiryDate) ? Styles.disabled : ""
    }`}
    disabled={isSubmitting || isDatePassed(thesisInfo?.ExpiryDate)}
  >
    <MdSave /> {isSubmitting ? "در حال ثبت..." : "ثبت فاکتور"}
  </button>
  <button
    type="button"
    className={Styles.cancelButton}
    onClick={onClose}
  >
    <MdCancel /> انصراف
  </button>
</div>

      </form>

      {deleteModal.isOpen && (
        <div className={Styles.modalOverlay}>
          <div className={Styles.modal}>
            <h3>حذف فاکتور</h3>
            <p>
              آیا از حذف فاکتور شماره {toPersianNum(deleteModal.factorInfo?.FactorNumber)} به
              مبلغ {toPersianNum(deleteModal.factorInfo?.Amount.toLocaleString())} ریال
              اطمینان دارید؟
            </p>
            <p>این عمل قابل بازگشت نیست.</p>
            <div className={Styles.modalActions}>
              <button
                onClick={closeDeleteModal}
                className={Styles.cancelButton}
              >
                انصراف
              </button>
              <button
                onClick={confirmDelete}
                className={Styles.deleteButton}
              >
                حذف فاکتور
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Expenses;