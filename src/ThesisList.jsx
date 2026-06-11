// ThesisList.jsx - کد کامل با قابلیت ویرایش مبلغ مصوب

import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";
import Styles from "./ThesisList.module.css";
import NewParsa from "./NewParsa";
import serverAddress from "./constants/contants";
import ThesisHistory from "./ThesisHistory.JSX";
import SearchSelects from "./SearchSelects";
import { MdSave, MdAdd, MdEdit, MdHistory } from "react-icons/md";
import { AiOutlineCloseCircle } from "react-icons/ai";
import { FaTrash, FaReceipt, FaPlus, FaSearch } from "react-icons/fa";
import { useNotification } from "./contexts/NotificationContext";
import Expenses from "./Expenses";
import Loader from "../src/components/Loader";
import ViewExpense from "./ViewExpense";
import { toPersianNum } from "./helpers/toPersianNum";
import ExpensesStyles from "./Expenses.module.css";
import { generateDoc } from "./utils/generateDoc";
import { HiOutlineDocumentDownload } from "react-icons/hi";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

function ThesisList() {
  const { user, selectedRole } = useAuth();
  const [theses, setTheses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [professorSearchTerm, setProfessorSearchTerm] = useState("");
  const [editingThesis, setEditingThesis] = useState(null);
  const [educationLevels, setEducationLevels] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [showProfessorModal, setShowProfessorModal] = useState(false);
  const [selectedProfessor, setSelectedProfessor] = useState(null);
  const [participation, setParticipation] = useState(0);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [newParsa, setNewParsa] = useState(false);
  const [showHistoryForThesis, setShowHistoryForThesis] = useState(null);
  const { addNotification } = useNotification();
  const [showExpensesModal, setShowExpensesModal] = useState(false);
  const [selectedThesisId, setSelectedThesisId] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [facultyFilter, setFacultyFilter] = useState(null);
  const [departmentFilter, setDepartmentFilter] = useState(null);
  const [showViewExpenseModal, setShowViewExpenseModal] = useState(false);
  const [selectedThesisForExpense, setSelectedThesisForExpense] = useState(null);
  const [showThesisInfoModal, setShowThesisInfoModal] = useState(false);
  const [thesisInfoData, setThesisInfoData] = useState(null);
  const [factorsInfo, setFactorsInfo] = useState([]);
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoError, setInfoError] = useState(null);
  const [selectedPaymentType, setSelectedPaymentType] = useState(null);
  
  // حالت‌های جدید برای فیلتر تاریخ
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [dateFilterActive, setDateFilterActive] = useState(false);

  // حالت‌های جدید برای محاسبه مبلغ مصوب در ویرایش
  const [baseSalary, setBaseSalary] = useState(null);
  const [percentage, setPercentage] = useState(0);
  const [approvedAmount, setApprovedAmount] = useState(0);
  const [originalApprovedAmount, setOriginalApprovedAmount] = useState(0);

  // تابع برای محاسبه مبلغ مصوب (مشابه NewParsa)
  const calculateApprovedAmount = (thesisType, baseSalary, parsaType) => {
    if (!baseSalary) return 0;

    let percentageValue = 0;

    if (parsaType === "r") {
      // رساله
      switch (thesisType) {
        case "نظری":
          percentageValue = baseSalary.TheoreticalDissertationPercentage;
          break;
        case "میدانی":
          percentageValue = baseSalary.FieldDissertationPercentage;
          break;
        case "تجربی":
          percentageValue = baseSalary.ExperimentalDissertationPercentage;
          break;
        default:
          percentageValue = 0;
      }
    } else {
      // پایان‌نامه
      switch (thesisType) {
        case "نظری":
          percentageValue = baseSalary.TheoreticalThesisPercentage;
          break;
        case "میدانی":
          percentageValue = baseSalary.FieldThesisPercentage;
          break;
        case "تجربی":
          percentageValue = baseSalary.ExperimentalThesisPercentage;
          break;
        default:
          percentageValue = 0;
      }
    }

    setPercentage(percentageValue);
    const amount = (baseSalary.AssistantProfessorBaseSalary * percentageValue) / 100;
    return Math.round(amount);
  };

  // دریافت متغیرهای فعال
  const fetchActiveVariables = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${serverAddress}/systemvariables/active`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setBaseSalary(response.data);
    } catch (error) {
      console.error("Error fetching active variables:", error);
    }
  };

  // توابع مدیریت فیلترها
  const handleFacultyChange = (facultyId) => {
    setFacultyFilter(facultyId || null);
    setDepartmentFilter(null);
  };

  const handleDepartmentChange = (departmentId) => {
    setDepartmentFilter(departmentId || null);
  };

  const handleStatusChange = (status) => {
    setStatusFilter(status);
  };

  const handleCostRegistration = (thesisId, paymentType = null) => {
    setSelectedThesisId(thesisId);
    setSelectedPaymentType(paymentType);
    setShowExpensesModal(true);
  };

  const handleViewExpenses = (thesisId) => {
    setSelectedThesisForExpense(thesisId);
    setShowViewExpenseModal(true);
  };

  const handleShowThesisInfo = async (thesis) => {
    if (selectedRole == "کارشناس پژوهشی معاونت پژوهشی"||"عضو هیات علمی" || thesis.Deputy_Expert_Confirmation || thesis.Deputy_Expert_Confirmation_First || thesis.Deputy_Expert_Confirmation_Second) {
      setShowThesisInfoModal(true);
      await fetchThesisInfoForModal(thesis.ThesisID);
    } else {
      addNotification({
        type: "error",
        text: "منتظر تایید پرداخت وجه توسط کارشناس پژوهشی معاونت پژوهشی ",
      });
    }
  };

  const fetchThesisInfoForModal = async (thesisId) => {
    setInfoLoading(true);
    setInfoError(null);
    try {
      const token = localStorage.getItem("token");
      const thesisResponse = await axios.get(
        `${serverAddress}/theses/${thesisId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setThesisInfoData(thesisResponse.data);
      const factorsResponse = await axios.get(
        `${serverAddress}/theses/${thesisId}/factors`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setFactorsInfo(factorsResponse.data);
    } catch (err) {
      console.error("Error fetching thesis info:", err);
      setInfoError(err.response?.data?.message || "خطا در دریافت اطلاعات");
    } finally {
      setInfoLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (errors.participation) setErrors({ ...errors, participation: "" });
      else if (errors.professors) setErrors({ ...errors, professors: "" });
      else if (errors.text) setErrors({ ...errors, text: "" });
      else if (error) setError("");
      else if (success) setSuccess("");
    }, 3000);

    if (errors.participation)
      addNotification({ type: "error", text: errors.participation });
    else if (errors.professors)
      addNotification({ type: "error", text: errors.professors });
    else if (errors.text) addNotification({ type: "error", text: errors.text });
    else if (error) addNotification({ type: "error", text: error });
    else if (success) addNotification({ type: "success", text: success });

    return () => clearTimeout(timer);
  }, [errors, error, success, addNotification]);

  const canCreateNewParsa = ["کارشناس پژوهشی دانشکده", "مدیر سیستم"].includes(selectedRole);
  const canGenerateParsaForm = ["کارشناس مالی دانشکده"].includes(selectedRole);

  const fetchTheses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      let params = {};
      
      if (dateFilterActive && startDate && endDate) {
        const formattedStartDate = startDate
          .setDigits(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"])
          .format("YYYY/MM/DD");
        
        const formattedEndDate = endDate
          .setDigits(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"])
          .format("YYYY/MM/DD");
        
        params.startDate = formattedStartDate;
        params.endDate = formattedEndDate;
      }
      
      const response = await axios.get(`${serverAddress}/theses`, {
        params: params,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const thesesWithData = response.data.map((thesis) => ({
        ...thesis,
        FacultyName: thesis.FacultyName || "نامشخص",
        DepartmentName: thesis.DepartmentName || "نامشخص",
        student: {
          FacultyID: thesis.FacultyID || null,
          DepartmentID: thesis.DepartmentID || null,
        },
      }));

      setTheses(thesesWithData);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching theses:", err);
      setError("خطا در دریافت لیست پایان‌نامه‌ها");
      setLoading(false);
    }
  };

  const handleDateSearch = () => {
    if (!startDate || !endDate) {
      addNotification({
        type: "error",
        text: "لطفاً بازه تاریخ را انتخاب کنید"
      });
      return;
    }
    setDateFilterActive(true);
    fetchTheses();
  };

  const clearDateFilter = () => {
    setStartDate(null);
    setEndDate(null);
    setDateFilterActive(false);
    fetchTheses();
  };

  const fetchEducationLevels = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${serverAddress}/educationlevels`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setEducationLevels(response.data);
    } catch (error) {
      console.error("Error fetching education levels:", error);
    }
  };

  const fetchProfessors = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${serverAddress}/professors`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setProfessors(response.data);
    } catch (error) {
      console.error("Error fetching professors:", error);
    }
  };

  // به‌روزرسانی مبلغ مصوب هنگام تغییر نوع پایان‌نامه یا نوع پارسا در حالت ویرایش
  useEffect(() => {
    if (editingThesis && baseSalary) {
      const newAmount = calculateApprovedAmount(
        editingThesis.ThesisType,
        baseSalary,
        editingThesis.ParsaType === "p" ? "p" : "r"
      );
      setApprovedAmount(newAmount);
    }
  }, [editingThesis?.ThesisType, editingThesis?.ParsaType, baseSalary]);

  useEffect(() => {
    fetchTheses();
    fetchEducationLevels();
    fetchProfessors();
    fetchActiveVariables();
  }, [selectedRole]);

  useEffect(() => {
    if (!dateFilterActive) {
      fetchTheses();
    }
  }, [dateFilterActive]);

  const startEdit = async (thesis) => {
    if (!baseSalary) {
      await fetchActiveVariables();
    }
    
    let calculatedAmount = thesis.ApprovedAmount;
    if (baseSalary) {
      calculatedAmount = calculateApprovedAmount(
        thesis.ThesisType,
        baseSalary,
        thesis.ParsaType === "p" ? "p" : "r"
      );
    }
    
    setOriginalApprovedAmount(thesis.ApprovedAmount);
    setApprovedAmount(calculatedAmount);
    
    setEditingThesis({
      ...thesis,
      title: thesis.Title,
      professors: thesis.professors.map((p) => ({
        ...p,
        participation: p.percentforprefessor,
        nationalCode: p.professornationalcode,
      })),
      originalThesisType: thesis.ThesisType,
      originalParsaType: thesis.ParsaType,
    });
  };

  const cancelEdit = () => {
    setEditingThesis(null);
    setErrors({});
    setApprovedAmount(0);
    setOriginalApprovedAmount(0);
  };

  const handleAddProfessorEdit = () => {
    if (!selectedProfessor) {
      setErrors((prev) => ({ ...prev, professor: "استاد را انتخاب کنید" }));
      return;
    }

    if (participation <= 0 || participation > 100) {
      setErrors((prev) => ({
        ...prev,
        participation: "درصد مشارکت باید بین 1 تا 100 باشد",
      }));
      return;
    }

    if (editingThesis.professors.some((p) => p.id == selectedProfessor.id)) {
      setErrors((prev) => ({
        ...prev,
        professor: "این استاد قبلاً اضافه شده است",
      }));
      return;
    }

    setEditingThesis((prev) => ({
      ...prev,
      professors: [
        ...prev.professors,
        {
          id: selectedProfessor.id,
          name: `${selectedProfessor.firstName} ${selectedProfessor.lastName}`,
          participation: parseInt(participation),
          nationalCode: selectedProfessor.nationalCode,
        },
      ],
    }));

    setSelectedProfessor(null);
    setParticipation(0);
    setProfessorSearchTerm("");
    setShowProfessorModal(false);
    setErrors((prev) => ({ ...prev, professor: "", participation: "" }));
  };

  const handleRemoveProfessorEdit = (professorId) => {
    setEditingThesis((prev) => ({
      ...prev,
      professors: prev.professors.filter((p) => p.id !== professorId),
    }));
  };

  

  const handleSaveEdit = async () => {
  const newErrors = {};

  if (!editingThesis.Title) newErrors.title = "عنوان پایان‌نامه الزامی است";
  if (editingThesis.professors.length == 0)
    newErrors.professors = "حداقل یک استاد راهنما انتخاب کنید";

  const totalParticipation = editingThesis.professors.reduce(
    (sum, p) => sum + (parseInt(p.participation) || 0),
    0
  );
  if (totalParticipation !== 100) {
    newErrors.participation = "مجموع درصد مشارکت اساتید باید ۱۰۰ باشد";
  }

  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    return;
  }

  try {
    const token = localStorage.getItem("token");
    
    const newApprovedAmount = calculateApprovedAmount(
      editingThesis.ThesisType,
      baseSalary,
      editingThesis.ParsaType === "p" ? "p" : "r"
    );
    
    await axios.put(
      `${serverAddress}/theses/${editingThesis.ThesisID}`,
      {
        title: editingThesis.Title,
        thesisType: editingThesis.ThesisType,
        levelId: editingThesis.LevelID,
        studentId: editingThesis.StudentID,
        parsaType: editingThesis.ParsaType,  // اضافه شده
        professors: editingThesis.professors.map((p) => ({
          nationalCode: p.nationalCode,
          participation: p.participation,
        })),
        approvedAmount: newApprovedAmount,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setSuccess("پایان‌نامه با موفقیت ویرایش شد");
    setEditingThesis(null);
    fetchTheses();
  } catch (err) {
    setErrors({
      text:
        "خطا در ویرایش پایان‌نامه: " +
        (err.response?.data?.message || err.message),
    });
  }
};

  const handleDelete = async (thesisId) => {
    if (!window.confirm("آیا از حذف این پایان‌نامه مطمئن هستید؟")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await axios.delete(
        `${serverAddress}/theses/${thesisId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status == 200) {
        setSuccess("پایان‌نامه با موفقیت حذف شد");
        fetchTheses();
      }
    } catch (err) {
      setErrors({
        text:
          "خطا در حذف پایان‌نامه: " +
          (err.response?.status == 404
            ? "پایان‌نامه مورد نظر یافت نشد"
            : err.response?.data?.message || err.message),
      });
    }
  };

  const filteredTheses = theses.filter((thesis) => {
    const matchesSearch =
      thesis.Title?.includes(searchTerm) ||
      thesis.StudentID?.toString().includes(searchTerm) ||
      thesis.StudentName?.includes(searchTerm) ||
      thesis.professors?.some((p) => p.professorName?.includes(searchTerm));

    let matchesStatus = true;
    if (statusFilter != null && statusFilter !== "") {
      if (statusFilter == "null") {
        matchesStatus = thesis.Deputy_Confirmation == null;
      } else {
        matchesStatus = thesis.Deputy_Confirmation == parseInt(statusFilter);
      }
    }

    const matchesFaculty = facultyFilter
      ? thesis.FacultyID == facultyFilter
      : true;
    const matchesDepartment = departmentFilter
      ? thesis.DepartmentID == departmentFilter
      : true;

    return (
      matchesSearch && matchesStatus && matchesFaculty && matchesDepartment
    );
  });



  const handleConfirmThesis = async (thesisId) => {
  // نمایش پیام تأیید قبل از تایید
  const isConfirmed = window.confirm(
    "آیا از تایید این پایان‌نامه مطمئن هستید؟\n\nتوجه: پس از تایید، امکان رد کردن پایان‌نامه وجود نخواهد داشت!"
  );
  
  if (!isConfirmed) {
    return; // اگر کاربر انصراف داد، عملیات انجام نشود
  }
  
  try {
    const token = localStorage.getItem("token");
    await axios.put(
      `${serverAddress}/theses/${thesisId}/confirm`,
      { confirm: true },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    setSuccess("پایان‌نامه با موفقیت تایید شد");
    fetchTheses();
  } catch (err) {
    setErrors({
      text:
        "خطا در تایید پایان‌نامه: " +
        (err.response?.data?.message || err.message),
    });
  }
};
  const handleRejectThesis = async (thesisId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${serverAddress}/theses/${thesisId}/confirm`,
        { confirm: false },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSuccess("پایان‌نامه با موفقیت رد شد");
      fetchTheses();
    } catch (err) {
      setErrors({
        text:
          "خطا در رد پایان‌نامه: " +
          (err.response?.data?.message || err.message),
      });
    }
  };

  const handleExpertConfirmThesis = async (thesisId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${serverAddress}/theses/${thesisId}/expert-confirm`,
        { confirm: true },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSuccess("پرداخت وجه پایان نامه توسط دانشکده با موفقیت تایید شد");
      fetchTheses();
    } catch (err) {
      setErrors({
        text:
          "خطا در تایید پرداخت وجه توسط دانشکده: " +
          (err.response?.data?.message || err.message),
      });
    }
  };

  const handleExpertRejectThesis = async (thesisId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${serverAddress}/theses/${thesisId}/expert-confirm`,
        { confirm: false },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSuccess("پرداخت وجه پایان نامه توسط دانشکده رد شد");
      fetchTheses();
    } catch (err) {
      setErrors({
        text:
          "خطا در رد پایان‌نامه: " +
          (err.response?.data?.message || err.message),
      });
    }
  };

  const handleExpertConfirmFirst50 = async (thesisId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${serverAddress}/theses/${thesisId}/expert-confirm-first50`,
        { confirm: true },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSuccess("50% اول پرداخت وجه پایان نامه توسط دانشکده با موفقیت تایید شد");
      fetchTheses();
    } catch (err) {
      setErrors({
        text:
          "خطا در تایید 50% اول پرداخت وجه توسط دانشکده: " +
          (err.response?.data?.message || err.message),
      });
    }
  };

  const handleExpertRejectFirst50 = async (thesisId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${serverAddress}/theses/${thesisId}/expert-confirm-first50`,
        { confirm: false },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSuccess("50% اول پرداخت وجه پایان نامه توسط دانشکده رد شد");
      fetchTheses();
    } catch (err) {
      setErrors({
        text:
          "خطا در رد 50% اول پرداخت وجه توسط دانشکده: " +
          (err.response?.data?.message || err.message),
      });
    }
  };

  const handleExpertConfirmSecond50 = async (thesisId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${serverAddress}/theses/${thesisId}/expert-confirm-second50`,
        { confirm: true },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSuccess("50% دوم پرداخت وجه پایان نامه توسط دانشکده با موفقیت تایید شد");
      fetchTheses();
    } catch (err) {
      setErrors({
        text:
          "خطا در تایید 50% دوم پرداخت وجه توسط دانشکده: " +
          (err.response?.data?.message || err.message),
      });
    }
  };

  const handleExpertRejectSecond50 = async (thesisId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${serverAddress}/theses/${thesisId}/expert-confirm-second50`,
        { confirm: false },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSuccess("50% دوم پرداخت وجه پایان نامه توسط دانشکده رد شد");
      fetchTheses();
    } catch (err) {
      setErrors({
        text:
          "خطا در رد 50% دوم پرداخت وجه توسط دانشکده: " +
          (err.response?.data?.message || err.message),
      });
    }
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

  const data = {
    name: "حسن",
    lastName: "نادری",
    idNumber: "11226699",
    date: toPersianNum("1404/06/25"),
  };

  return (
    <div className={Styles.container}>
      <div className={Styles.header}>
        <h2 className={Styles.title}>لیست پارساها</h2>
        <div>
          {canGenerateParsaForm && (
            <button
              className="miniButton info"
              title="دریافت فرم پژوهانه"
              onClick={() => generateDoc(data)}
            >
              <HiOutlineDocumentDownload />
            </button>
          )}
          {canCreateNewParsa && (
            <button
              onClick={() => setNewParsa(true)}
              className="miniButton success"
              title="تعریف پارسا جدید"
            >
              <FaPlus />
            </button>
          )}
        </div>
      </div>

      {newParsa && (
        <div className={Styles.modal}>
          <div className={Styles.modalContent}>
            <NewParsa onClose={() => setNewParsa(false)} onSuccess={fetchTheses} />
          </div>
        </div>
      )}

      {/* بخش فیلتر تاریخ - فقط برای کارشناس پژوهشی معاونت پژوهشی */}
      {selectedRole === "کارشناس پژوهشی معاونت پژوهشی" && (
        <div className={Styles.dateFilterSection}>
          <div className={Styles.dateFilter}>
            <label>تاریخ ثبت در سیستم (اختیاری):</label>
            <div className={Styles.datePickerGroup}>
              <span>از تاریخ:</span>
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                calendar={persian}
                locale={persian_fa}
                format="YYYY/MM/DD"
                placeholder="انتخاب تاریخ شروع"
                className={Styles.datePicker}
              />
            </div>
            <div className={Styles.datePickerGroup}>
              <span>تا تاریخ:</span>
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                calendar={persian}
                locale={persian_fa}
                format="YYYY/MM/DD"
                placeholder="انتخاب تاریخ پایان"
                className={Styles.datePicker}
              />
            </div>
            <button
              onClick={handleDateSearch}
              className={Styles.dateSearchButton}
              disabled={!startDate || !endDate}
            >
              <FaSearch /> جستجو بر اساس تاریخ
            </button>
            {dateFilterActive && (
              <button
                onClick={clearDateFilter}
                className={Styles.clearDateButton}
              >
                لغو فیلتر تاریخ
              </button>
            )}
          </div>
          {dateFilterActive && (
            <div className={Styles.activeFilterBadge}>
              <span>فیلتر فعال: {startDate?.format("YYYY/MM/DD")} تا {endDate?.format("YYYY/MM/DD")}</span>
            </div>
          )}
        </div>
      )}

      <SearchSelects
        onFacultyChange={handleFacultyChange}
        onDepartmentChange={handleDepartmentChange}
        onStatusChange={handleStatusChange}
      />

      <input
        type="text"
        placeholder="جستجو بر اساس عنوان، نام دانشجو یا استاد..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className={Styles.searchInput}
      />

      <div className={Styles.tableContainer}>
        <table className={Styles.thesisTable}>
          <thead>
            <tr>
              <th>شماره</th>
              <th>شماره دانشجویی</th>
              <th>نام دانشجو</th>
              <th>دانشکده</th>
              <th>گروه</th>
              <th>عنوان</th>
              <th>نوع پارسا</th>
              <th>نوع رساله یا پایان نامه</th>
              <th>مقطع</th>
              <th>تاریخ ثبت در سیستم</th>
              <th>اساتید راهنما</th>
              <th>تایید معاون پژوهشی دانشکده</th>
              <th>تایید پرداخت وجه توسط کارشناس پژوهشی معاونت</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {filteredTheses.length > 0 ? (
              filteredTheses.map((thesis) => (
                <tr key={thesis.ThesisID}>
                  <td>{toPersianNum(thesis.ThesisID)}</td>
                  <td>{toPersianNum(thesis.StudentID)}</td>
                  <td>{thesis.StudentName}</td>
                  <td>{thesis.FacultyName}</td>
                  <td>{thesis.DepartmentName}</td>
                  <td>
                    {editingThesis?.ThesisID == thesis.ThesisID ? (
                      <input
                        type="text"
                        value={toPersianNum(editingThesis.Title)}
                        onChange={(e) =>
                          setEditingThesis({
                            ...editingThesis,
                            Title: e.target.value,
                          })
                        }
                        className={Styles.editInput}
                      />
                    ) : (
                      <span
                        className={Styles.clickableTitle}
                        onClick={() => handleShowThesisInfo(thesis)}
                      >
                        {toPersianNum(thesis.Title)}
                      </span>
                    )}
                  </td>
                  <td>
                    {editingThesis?.ThesisID == thesis.ThesisID ? (
                      <select
                        value={editingThesis.ParsaType}
                        onChange={(e) =>
                          setEditingThesis({
                            ...editingThesis,
                            ParsaType: e.target.value,
                          })
                        }
                        className={Styles.editSelect}
                      >
                        <option value="p">پایان‌نامه</option>
                        <option value="r">رساله</option>
                      </select>
                    ) : (
                      thesis.ParsaType == "p" ? "پایان‌نامه" : "رساله"
                    )}
                  </td>
                  <td>
                    {editingThesis?.ThesisID == thesis.ThesisID ? (
                      <>
                        <select
                          value={editingThesis.ThesisType}
                          onChange={(e) =>
                            setEditingThesis({
                              ...editingThesis,
                              ThesisType: e.target.value,
                            })
                          }
                          className={Styles.editSelect}
                        >
                          <option value="میدانی">میدانی</option>
                          <option value="نظری">نظری</option>
                          <option value="تجربی">تجربی</option>
                        </select>
                        {baseSalary && (
                          <div className={Styles.approvedAmountEdit}>
                            <small>
                              مبلغ مصوب جدید: {toPersianNum(approvedAmount.toLocaleString())} ریال
                              {approvedAmount !== originalApprovedAmount && (
                                <span style={{ color: "orange", marginRight: "5px" }}>
                                  (تغییر کرده)
                                </span>
                              )}
                            </small>
                          </div>
                        )}
                      </>
                    ) : (
                      thesis.ThesisType
                    )}
                  </td>
                  <td>
                    {editingThesis?.ThesisID == thesis.ThesisID ? (
                      <select
                        value={editingThesis.LevelID}
                        onChange={(e) =>
                          setEditingThesis({
                            ...editingThesis,
                            LevelID: e.target.value,
                          })
                        }
                        className={Styles.editSelect}
                      >
                        {educationLevels.map((level) => (
                          <option key={level.id} value={level.id}>
                            {level.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      thesis.LevelName
                    )}
                  </td>
                  <td>{thesis.SystemRegistrationDate ? toPersianNum(thesis.SystemRegistrationDate) : "---"}</td>
                  <td>
                    {editingThesis?.ThesisID == thesis.ThesisID ? (
                      <div className={Styles.professorsEditContainer}>
                        {editingThesis.professors.map((professor) => (
                          <div
                            key={professor.id}
                            className={Styles.professorTag}
                          >
                            <span>
                              {professor.name} -{" "}
                              {toPersianNum(professor.participation)}%
                            </span>
                            <button
                              onClick={() =>
                                handleRemoveProfessorEdit(professor.id)
                              }
                              className={Styles.removeProfessorBtn}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            fetchProfessors();
                            setShowProfessorModal(true);
                          }}
                          className="miniButton success"
                          title="افزودن استاد"
                        >
                          <FaPlus />
                        </button>
                      </div>
                    ) : (
                      <ul className={Styles.professorsList}>
                        {thesis.professors.map((professor, index) => (
                          <li key={index}>
                            {professor.professorName} -{" "}
                            {toPersianNum(professor.percentforprefessor)}%
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td>
                    {thesis.Deputy_Confirmation == null ? (
                      <span className={Styles.unknownStatus}>نامشخص</span>
                    ) : thesis.Deputy_Confirmation ? (
                      <span className={Styles.approvedStatus}>تایید شده</span>
                    ) : (
                      <span className={Styles.rejectedStatus}>رد شده</span>
                    )}
                  </td>
                  <td>
                    {thesis.LevelName === "PHD" ? (
                      <div>
                        <div>
                          50% اول: {thesis.Deputy_Expert_Confirmation_First == null ? (
                            <span className={Styles.unknownStatus}>نامشخص</span>
                          ) : thesis.Deputy_Expert_Confirmation_First ? (
                            <span className={Styles.approvedStatus}>تایید</span>
                          ) : (
                            <span className={Styles.rejectedStatus}>رد شده</span>
                          )}
                        </div>
                        <div>
                          50% دوم: {thesis.Deputy_Expert_Confirmation_Second == null ? (
                            <span className={Styles.unknownStatus}>نامشخص</span>
                          ) : thesis.Deputy_Expert_Confirmation_Second ? (
                            <span className={Styles.approvedStatus}>تایید</span>
                          ) : (
                            <span className={Styles.rejectedStatus}>رد شده</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        {thesis.Deputy_Expert_Confirmation == null ? (
                          <span className={Styles.unknownStatus}>نامشخص</span>
                        ) : thesis.Deputy_Expert_Confirmation ? (
                          <span className={Styles.approvedStatus}>تایید</span>
                        ) : (
                          <span className={Styles.rejectedStatus}>رد شده</span>
                        )}
                      </>
                    )}
                  </td>
                  <td>
                    {editingThesis?.ThesisID == thesis.ThesisID ? (
                      <div className={Styles.editActions}>
                        <button
                          onClick={handleSaveEdit}
                          className="miniButton success"
                          title="ذخیره"
                        >
                          <MdSave />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="miniButton error"
                          title="انصراف"
                        >
                          <AiOutlineCloseCircle />
                        </button>
                      </div>
                    ) : (
                      <div className={Styles.actions}>
                        {["مدیر سیستم", "کارشناس پژوهشی دانشکده"].includes(
                          selectedRole
                        )&&!thesis.Deputy_Confirmation && (
                            <>
                              <button
                                onClick={() => startEdit(thesis)}
                                className="miniButton warning"
                                title="ویرایش"
                              >
                                <MdEdit />
                              </button>
                              <button
                                onClick={() => handleDelete(thesis.ThesisID)}
                                className="miniButton error"
                                title="حذف"
                              >
                                <FaTrash />
                              </button>
                            </>
                          )}
                        {selectedRole == "عضو هیات علمی" && (
                          thesis.LevelName === "PHD" ? (
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <button
                                onClick={() => handleCostRegistration(thesis.ThesisID, "first")}
                                className="miniButton success"
                                title="ثبت هزینه کرد 50% اول"
                                disabled={!thesis.Deputy_Confirmation || !thesis.Deputy_Expert_Confirmation_First}
                              >
                                <FaReceipt /> 50% اول
                              </button>
                              <button
                                onClick={() => handleCostRegistration(thesis.ThesisID, "second")}
                                className="miniButton success"
                                title="ثبت هزینه کرد 50% دوم"
                                disabled={!thesis.Deputy_Confirmation || !thesis.Deputy_Expert_Confirmation_Second}
                              >
                                <FaReceipt /> 50% دوم
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleCostRegistration(thesis.ThesisID)}
                              className="miniButton success"
                              title="ثبت هزینه کرد"
                              disabled={!thesis.Deputy_Confirmation || !thesis.Deputy_Expert_Confirmation}
                            >
                              <FaReceipt />
                            </button>
                          )
                        )}
                        {["کارشناس مالی دانشکده",
                          "کارشناس پژوهشی دانشکده",
                          "معاون پژوهشی دانشکده",
                          "مدیر سیستم",
                          "معاون پژوهشی دانشگاه",
                          "مدیر امور پژوهشی"
                        ].includes(selectedRole) && (
                            <button
                              onClick={() => handleViewExpenses(thesis.ThesisID)}
                              className="miniButton info"
                              title="مشاهده هزینه‌کردها"
                            >
                              <FaReceipt />
                            </button>
                          )}
                        <button
                          onClick={() => setShowHistoryForThesis(thesis.ThesisID)}
                          className="miniButton info"
                          title="مشاهده تاریخچه"
                        >
                          <MdHistory />
                        </button>
                        {/* {selectedRole == "معاون پژوهشی دانشکده" && (
                          <label className={Styles.toggleSwitch}>
                            <input
                              type="checkbox"
                              className={Styles.toggleInput}
                              checked={thesis.Deputy_Confirmation == true}
                              onChange={() => {
                                if (thesis.Deputy_Confirmation == true) {
                                  handleRejectThesis(thesis.ThesisID);
                                } else {
                                  handleConfirmThesis(thesis.ThesisID);
                                }
                              }}
                            />
                            <span className={Styles.toggleSlider}></span>
                          </label>
                        )} */}

                        {/* {selectedRole == "معاون پژوهشی دانشکده" && (
  <label className={Styles.toggleSwitch}>
    <input
      type="checkbox"
      className={Styles.toggleInput}
      checked={thesis.Deputy_Confirmation == true}
      disabled={thesis.Deputy_Confirmation === true} // اضافه شده
      onChange={() => {
        if (thesis.Deputy_Confirmation == true) {
          handleRejectThesis(thesis.ThesisID);
        } else {
          handleConfirmThesis(thesis.ThesisID);
        }
      }}
    />
    <span className={Styles.toggleSlider}></span>
  </label>
)} */}

{selectedRole == "معاون پژوهشی دانشکده" && (
  <label className={Styles.toggleSwitch}>
    <input
      type="checkbox"
      className={Styles.toggleInput}
      checked={thesis.Deputy_Confirmation == true}
      disabled={thesis.Deputy_Confirmation === true} // غیرفعال شدن بعد از تایید
      onChange={() => {
        if (thesis.Deputy_Confirmation == true) {
          handleRejectThesis(thesis.ThesisID);
        } else {
          handleConfirmThesis(thesis.ThesisID);
        }
      }}
    />
    <span className={Styles.toggleSlider}></span>
  </label>
)}
                        {selectedRole == "کارشناس پژوهشی معاونت پژوهشی" && (
                          thesis.LevelName !== "PHD" ? (
                            <label className={Styles.toggleSwitch}>
                              <input
                                type="checkbox"
                                className={Styles.toggleInput}
                                checked={thesis.Deputy_Expert_Confirmation == true}
                                disabled={!thesis.Deputy_Confirmation}
                                onChange={() => {
                                  if (thesis.Deputy_Expert_Confirmation == true) {
                                    handleExpertRejectThesis(thesis.ThesisID);
                                  } else {
                                    handleExpertConfirmThesis(thesis.ThesisID);
                                  }
                                }}
                              />
                              <span className={Styles.toggleSlider}></span>
                            </label>
                          ) : (
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <label className={Styles.toggleSwitch} title="50% اول">
                                <input
                                  type="checkbox"
                                  className={Styles.toggleInput}
                                  checked={thesis.Deputy_Expert_Confirmation_First == true}
                                  disabled={!thesis.Deputy_Confirmation}
                                  onChange={() => {
                                    if (thesis.Deputy_Expert_Confirmation_First == true) {
                                      handleExpertRejectFirst50(thesis.ThesisID);
                                    } else {
                                      handleExpertConfirmFirst50(thesis.ThesisID);
                                    }
                                  }}
                                />
                                <span className={Styles.toggleSlider}></span>
                              </label>
                              <label className={Styles.toggleSwitch} title="50% دوم">
                                <input
                                  type="checkbox"
                                  className={Styles.toggleInput}
                                  checked={thesis.Deputy_Expert_Confirmation_Second == true}
                                  disabled={!thesis.Deputy_Confirmation || !thesis.Deputy_Expert_Confirmation_First}
                                  onChange={() => {
                                    if (thesis.Deputy_Expert_Confirmation_Second == true) {
                                      handleExpertRejectSecond50(thesis.ThesisID);
                                    } else {
                                      handleExpertConfirmSecond50(thesis.ThesisID);
                                    }
                                  }}
                                />
                                <span className={Styles.toggleSlider}></span>
                              </label>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="14" className={Styles.noResults}>
                  موردی یافت نشد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showProfessorModal && editingThesis && (
        <div className={Styles.modal}>
          <div className={Styles.modalContent}>
            <h3>انتخاب استاد راهنما</h3>
            <div className={Styles.searchContainer}>
              <input
                type="text"
                placeholder="جستجوی استاد..."
                value={professorSearchTerm}
                onChange={(e) => setProfessorSearchTerm(e.target.value)}
                className={Styles.searchInput}
              />
            </div>
            <div className={Styles.professorsListContainer}>
              {professors
                .filter((professor) =>
                  `${professor.firstName} ${professor.lastName} ${professor.nationalCode || ""
                    }`.includes(professorSearchTerm)
                )
                .map((professor) => (
                  <div
                    key={professor.id}
                    onClick={() => setSelectedProfessor(professor)}
                    className={`${Styles.professorItem} ${selectedProfessor?.id == professor.id
                        ? Styles.selected
                        : ""
                      }`}
                  >
                    <div>
                      {professor.firstName} {professor.lastName}
                    </div>
                    <div>{professor.nationalCode}</div>
                  </div>
                ))}
            </div>
            <div className={Styles.participationInput}>
              <label>درصد مشارکت: </label>
              <input
                type="number"
                min="1"
                max="100"
                value={participation}
                onChange={(e) => setParticipation(e.target.value)}
                className={Styles.participationField}
              />
              %
            </div>
            <div className={Styles.modalActions}>
              <button
                onClick={handleAddProfessorEdit}
                className="miniButton success"
                title="افزودن"
              >
                <MdAdd />
              </button>
              <button
                onClick={() => {
                  setShowProfessorModal(false);
                  setProfessorSearchTerm("");
                }}
                className="miniButton error"
                title="انصراف"
              >
                <AiOutlineCloseCircle />
              </button>
            </div>
          </div>
        </div>
      )}

      {showExpensesModal && (
        <div className={Styles.modal}>
          <div className={Styles.modalContent}>
            <Expenses
              thesisId={selectedThesisId}
              paymentType={selectedPaymentType}
              onClose={() => setShowExpensesModal(false)}
              onSuccess={fetchTheses}
            />
          </div>
        </div>
      )}

      {showViewExpenseModal && (
        <div className={Styles.modal1}>
          <div className={Styles.modalContent1}>
            <ViewExpense
              thesisId={selectedThesisForExpense}
              onClose={() => setShowViewExpenseModal(false)}
            />
          </div>
        </div>
      )}

      {showHistoryForThesis && (
        <div className={Styles.historyModal}>
          <div className={Styles.historyModalContent}>
            <ThesisHistory
              thesisId={showHistoryForThesis}
              onClose={() => setShowHistoryForThesis(null)}
            />
            <button
              onClick={() => setShowHistoryForThesis(null)}
              className="miniButton error"
              title="بستن پنجره"
            >
              <AiOutlineCloseCircle />
            </button>
          </div>
        </div>
      )}

      {showThesisInfoModal && (
        <div className={Styles.modal}>
          <div className={Styles.modalContent}>
            {infoLoading ? (
              <div className={ExpensesStyles.loadingContainer}>
                <Loader />
              </div>
            ) : infoError ? (
              <div className={ExpensesStyles.errorContainer}>
                <p>{infoError}</p>
              </div>
            ) : (
              thesisInfoData && (
                <>
                  <div className={ExpensesStyles.thesisInfo}>
                    <h3>اطلاعات پایان‌نامه</h3>
                    {thesisInfoData.LevelName == "PHD" && (
                      <div className={ExpensesStyles.infoRow}>
                        <span className={ExpensesStyles.infoLabel}>وضعیت پرداخت:</span>
                        <span>
                          {thesisInfoData.Deputy_Expert_Confirmation_First &&
                            !thesisInfoData.Deputy_Expert_Confirmation_Second ? (
                            "۵۰٪ اول"
                          ) : thesisInfoData.Deputy_Expert_Confirmation_First &&
                            thesisInfoData.Deputy_Expert_Confirmation_Second ? (
                            "۵۰٪ دوم"
                          ) : (
                            "پرداخت نشده"
                          )}
                        </span>
                      </div>
                    )}
                    <div className={ExpensesStyles.infoRow}>
                      <span className={ExpensesStyles.infoLabel}>شماره دانشجویی:</span>
                      <span>{toPersianNum(thesisInfoData.StudentID)}</span>
                    </div>
                    <div className={ExpensesStyles.infoRow}>
                      <span className={ExpensesStyles.infoLabel}>نام و نام خانوادگی:</span>
                      <span>{thesisInfoData.StudentName}</span>
                    </div>
                    <div className={ExpensesStyles.infoRow}>
                      <span className={ExpensesStyles.infoLabel}>
                        عنوان {thesisInfoData.ParsaType == "p" ? "پایان نامه" : "رساله"}:
                      </span>
                      <span>{toPersianNum(thesisInfoData.Title)}</span>
                    </div>
                    <div className={ExpensesStyles.infoRow}>
                      <span className={ExpensesStyles.infoLabel}>مقطع تحصیلی:</span>
                      <span>{thesisInfoData.LevelName}</span>
                    </div>
                    <div className={ExpensesStyles.infoRow}>
                      <span className={ExpensesStyles.infoLabel}>تاریخ ثبت در سیستم:</span>
                    <span>{thesisInfoData.SystemRegistrationDate ? toPersianNum(thesisInfoData.SystemRegistrationDate) : "---"}</span>
                    </div>
                    {thesisInfoData.LevelName === "PHD" ? (
                      <>
                        <div className={ExpensesStyles.infoRow}>
                          <span className={ExpensesStyles.infoLabel}>مبلغ مصوب کل به ریال:</span>
                          <span>{toPersianNum(thesisInfoData.ApprovedAmount.toLocaleString())}</span>
                        </div>
                        {thesisInfoData.Deputy_Expert_Confirmation_First &&
                          !thesisInfoData.Deputy_Expert_Confirmation_Second && (
                            <>
                              <div className={ExpensesStyles.infoRow}>
                                <span className={ExpensesStyles.infoLabel}>مبلغ مصوب ۵۰٪ اول به ریال:</span>
                                <span>{toPersianNum((thesisInfoData.ApprovedAmount * 0.5).toLocaleString())}</span>
                              </div>
                              <div className={ExpensesStyles.infoRow}>
                                <span className={ExpensesStyles.infoLabel}>باقیمانده مبلغ مصوب ۵۰٪ اول به ریال:</span>
                                <span>
                                  {toPersianNum(
                                    (
                                      (thesisInfoData.ApprovedAmount * 0.5) -
                                      factorsInfo.reduce((sum, factor) => sum + parseFloat(factor.Amount), 0)
                                    ).toLocaleString()
                                  )}
                                </span>
                              </div>
                              {thesisInfoData.professors?.map((professor, index) => (
                                <div className={ExpensesStyles.infoRow} key={index}>
                                  <span className={ExpensesStyles.infoLabel}>
                                    سهم دکتر {professor.professorName} به ریال (۵۰٪ از {professor.participation}٪):
                                  </span>
                                  <span>
                                    {toPersianNum(
                                      (
                                        (thesisInfoData.ApprovedAmount * 0.5) *
                                        (professor.participation / 100)
                                      ).toLocaleString()
                                    )}
                                  </span>
                                </div>
                              ))}
                            </>
                          )}
                        {thesisInfoData.Deputy_Expert_Confirmation_First &&
                          thesisInfoData.Deputy_Expert_Confirmation_Second && (
                            <>
                              <div className={ExpensesStyles.infoRow}>
                                <span className={ExpensesStyles.infoLabel}>مبلغ مصوب ۵۰٪ دوم به ریال:</span>
                                <span>{toPersianNum((thesisInfoData.ApprovedAmount * 0.5).toLocaleString())}</span>
                              </div>
                              <div className={ExpensesStyles.infoRow}>
                                <span className={ExpensesStyles.infoLabel}>باقیمانده مبلغ مصوب ۵۰٪ دوم به ریال:</span>
                                <span>
                                  {toPersianNum(
                                    (
                                      (thesisInfoData.ApprovedAmount * 0.5) -
                                      factorsInfo.reduce((sum, factor) => sum + parseFloat(factor.Amount), 0)
                                    ).toLocaleString()
                                  )}
                                </span>
                              </div>
                              {thesisInfoData.professors?.map((professor, index) => (
                                <div className={ExpensesStyles.infoRow} key={index}>
                                  <span className={ExpensesStyles.infoLabel}>
                                    سهم دکتر {professor.professorName} به ریال (۵۰٪ دوم از {professor.participation}٪):
                                  </span>
                                  <span>
                                    {toPersianNum(
                                      (
                                        (thesisInfoData.ApprovedAmount * 0.5) *
                                        (professor.participation / 100)
                                      ).toLocaleString()
                                    )}
                                  </span>
                                </div>
                              ))}
                            </>
                          )}
                        {!thesisInfoData.Deputy_Expert_Confirmation_First && (
                          <div className={ExpensesStyles.infoRow}>
                            <span className={ExpensesStyles.infoLabel}>وضعیت:</span>
                            <span>منتظر تایید پرداخت</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className={ExpensesStyles.infoRow}>
                          <span className={ExpensesStyles.infoLabel}>مبلغ مصوب به ریال:</span>
                          <span>{toPersianNum(thesisInfoData.ApprovedAmount.toLocaleString())}</span>
                        </div>
                        <div className={ExpensesStyles.infoRow}>
                          <span className={ExpensesStyles.infoLabel}>باقیمانده مبلغ مصوب به ریال:</span>
                          <span>
                            {toPersianNum(
                              (
                                thesisInfoData.ApprovedAmount -
                                factorsInfo.reduce((sum, factor) => sum + parseFloat(factor.Amount), 0)
                              ).toLocaleString()
                            )}
                          </span>
                        </div>
                        {thesisInfoData.professors?.map((professor, index) => (
                          <div className={ExpensesStyles.infoRow} key={index}>
                            <span className={ExpensesStyles.infoLabel}>
                              سهم دکتر {professor.professorName} به ریال( {professor.participation} %):
                            </span>
                            <span>
                              {toPersianNum(
                                (
                                  thesisInfoData.ApprovedAmount *
                                  (professor.participation / 100)
                                ).toLocaleString()
                              )}
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                  <button
                    className={ExpensesStyles.cancelButton}
                    onClick={() => {
                      setShowThesisInfoModal(false);
                      setThesisInfoData(null);
                      setFactorsInfo([]);
                    }}
                  >
                    بستن
                  </button>
                </>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ThesisList;