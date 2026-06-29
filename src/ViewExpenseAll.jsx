


import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";
import serverAddress from "./constants/contants";
import Styles from "./ViewExpenseAll.module.css";
import { useNotification } from "./contexts/NotificationContext";
import Loader from "../src/components/Loader";
import { toPersianNum } from "./helpers/toPersianNum";
import { FaCheck, FaTimes, FaTrash, FaEdit } from "react-icons/fa";
import { AiOutlineCloseCircle } from "react-icons/ai";
import { MdSave } from "react-icons/md";
import { FaFilePdf, FaFileImage } from "react-icons/fa";
import SearchSelects from "./SearchSelects";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";

function ViewExpenseAll({ onClose }) {
  // ==================== همه هوک‌ها در ابتدا ====================
  const {
    user,
    selectedRole,
    facultyFilter: authFacultyFilter,
    departmentFilter: authDepartmentFilter,
  } = useAuth();
  const { addNotification } = useNotification();
  
  // Stateهای اصلی
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupedExpenses, setGroupedExpenses] = useState({});
  const [facultyFilter, setFacultyFilter] = useState(authFacultyFilter || null);
  const [departmentFilter, setDepartmentFilter] = useState(authDepartmentFilter || null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredGrouped, setFilteredGrouped] = useState({});
  const [selectedFactors, setSelectedFactors] = useState({});
  
  // State برای مودال فایل
  const [fileModal, setFileModal] = useState({
    isOpen: false,
    fileUrl: null,
    fileType: null,
  });
  
  // State برای مودال حذف
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    factorId: null,
    factorInfo: null,
  });
  
  // State برای مودال ویرایش
  const [editModal, setEditModal] = useState({
    isOpen: false,
    factorId: null,
    factorData: null,
    editFile: null,
    editFilePreview: null,
  });
  
  // تعریف نقش‌های کاربر
  const isDeputy = user.roles.includes("معاون پژوهشی دانشکده");
  const isExpert = user.roles.includes("کارشناس مالی دانشکده");
  const isResearchDirector = user.roles.includes("مدیر امور پژوهشی");
  const isUniversityDeputy = user.roles.includes("معاون پژوهشی دانشگاه");
  const isResearchExpert = user.roles.includes("کارشناس پژوهشی دانشکده");
  const isSystemManager = user.roles.includes("مدیر سیستم");
  const isProfessor = user.roles.includes("عضو هیات علمی");
  
  // ==================== useEffectها ====================
  
  // بارگذاری داده‌ها
  useEffect(() => {
    const fetchAllExpenses = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const response = await axios.get(`${serverAddress}/factors/all`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setExpenses(response.data);
        
        // گروه‌بندی بر اساس ThesisID
        const grouped = response.data.reduce((acc, item) => {
          if (!acc[item.ThesisID]) {
            acc[item.ThesisID] = [];
          }
          acc[item.ThesisID].push(item);
          return acc;
        }, {});
        setGroupedExpenses(grouped);
      } catch (err) {
        console.error("Error fetching all expenses:", err);
        setError("خطا در دریافت اطلاعات هزینه‌کردها");
        addNotification({ type: "error", text: "خطا در دریافت اطلاعات" });
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllExpenses();
  }, [addNotification, selectedRole]);
  
  // فیلتر کردن گروه‌بندی شده
  useEffect(() => {
    const filteredGrouped = Object.entries(groupedExpenses).reduce(
      (acc, [thesisId, factors]) => {
        const thesis = factors[0];
        let matches = true;
        
        // فیلتر دانشکده
        if (facultyFilter && thesis.FacultyID !== parseInt(facultyFilter)) {
          matches = false;
        }
        
        // فیلتر گروه
        if (departmentFilter && thesis.DepartmentID !== parseInt(departmentFilter)) {
          matches = false;
        }
        
        // فیلتر وضعیت
        let filteredFactors = factors;
        if (statusFilter != null) {
          const statusValue = statusFilter == "NULL" ? null : parseInt(statusFilter);
          
          let statusFieldToCheck;
          
          if (isExpert) {
            statusFieldToCheck = "IsConfirmedByExpert";
          } else if (isDeputy) {
            statusFieldToCheck = "IsConfirmedByDeputy";
          } else if (isResearchDirector) {
            statusFieldToCheck = "IsConfirmedByResearchDirector";
          } else if (isUniversityDeputy) {
            statusFieldToCheck = "IsConfirmedByUniversityDeputy";
          } else {
            statusFieldToCheck = "IsConfirmedByExpert";
          }
          
          filteredFactors = factors.filter(
            (f) => f[statusFieldToCheck] == statusValue
          );
          if (filteredFactors.length == 0) matches = false;
        }
        
        // فیلتر جستجوی متنی
        const matchesSearch =
          !searchTerm ||
          thesis.Title.includes(searchTerm) ||
          thesis.StudentName.includes(searchTerm);
        
        if (matches && matchesSearch) {
          acc[thesisId] = filteredFactors;
        }
        return acc;
      },
      {}
    );
    
    setFilteredGrouped(filteredGrouped);
  }, [
    groupedExpenses,
    facultyFilter,
    departmentFilter,
    statusFilter,
    searchTerm,
    isExpert,
    isDeputy,
    isResearchDirector,
    isUniversityDeputy,
  ]);
  
  // مدیریت کلید Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (fileModal.isOpen) {
          closeFileModal();
        } else if (deleteModal.isOpen) {
          closeDeleteModal();
        } else if (editModal.isOpen) {
          closeEditModal();
        } else {
          onClose();
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [fileModal.isOpen, deleteModal.isOpen, editModal.isOpen, onClose]);
  
  // ==================== توابع کمکی ====================
  
  const formatNumber = (num) => {
    if (!num && num !== 0) return "";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  const parseNumber = (formattedNum) => {
    if (!formattedNum) return "";
    return formattedNum.replace(/,/g, "");
  };
  
  // ==================== توابع فیلتر ====================
  const handleFacultyChange = (facultyId) => {
    setFacultyFilter(facultyId || null);
    setDepartmentFilter(null);
  };
  
  const handleDepartmentChange = (departmentId) => {
    setDepartmentFilter(departmentId || null);
  };
  
  const handleStatusChange = (status) => {
    setStatusFilter(status == "null" ? null : status);
  };
  
  // ==================== توابع انتخاب فاکتور ====================
  const handleSelectFactor = (factorId, factor) => {
    const isAllConfirmed = 
      factor.IsConfirmedByExpert == 1 &&
      factor.IsConfirmedByDeputy == 1 &&
      factor.IsConfirmedByResearchDirector == 1 &&
      factor.IsConfirmedByUniversityDeputy == 1;
    
    if (!isAllConfirmed) {
      addNotification({
        type: "warning",
        text: "برای انتخاب فاکتور، همه تاییدیه‌ها باید تایید شده باشند",
      });
      return;
    }
    
    setSelectedFactors(prev => ({
      ...prev,
      [factorId]: !prev[factorId]
    }));
  };
  
  const handleSelectAllForThesis = (factors, isSelected) => {
    const newSelected = { ...selectedFactors };
    
    factors.forEach(factor => {
      const isAllConfirmed = 
        factor.IsConfirmedByExpert == 1 &&
        factor.IsConfirmedByDeputy == 1 &&
        factor.IsConfirmedByResearchDirector == 1 &&
        factor.IsConfirmedByUniversityDeputy == 1;
      
      if (isAllConfirmed) {
        if (isSelected) {
          newSelected[factor.FactorID] = true;
        } else {
          delete newSelected[factor.FactorID];
        }
      }
    });
    
    setSelectedFactors(newSelected);
  };
  
  const areAllFactorsSelectable = (factors) => {
    return factors.every(factor => 
      factor.IsConfirmedByExpert == 1 &&
      factor.IsConfirmedByDeputy == 1 &&
      factor.IsConfirmedByResearchDirector == 1 &&
      factor.IsConfirmedByUniversityDeputy == 1
    );
  };
  
  const areAllFactorsSelected = (factors) => {
    return factors.length > 0 && 
      factors.every(factor => selectedFactors[factor.FactorID] === true);
  };
  
  // ==================== توابع تایید ====================
  const handleToggleExpert = async (factorId, currentStatus) => {
    try {
      const token = localStorage.getItem("token");
      const newStatus = currentStatus ? 0 : 1;
      
      await axios.put(
        `${serverAddress}/factors/${factorId}/confirm-expert`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const newExpenses = expenses.map((factor) =>
        factor.FactorID === factorId
          ? { ...factor, IsConfirmedByExpert: newStatus }
          : factor
      );
      setExpenses(newExpenses);
      
      const newGrouped = newExpenses.reduce((acc, item) => {
        if (!acc[item.ThesisID]) {
          acc[item.ThesisID] = [];
        }
        acc[item.ThesisID].push(item);
        return acc;
      }, {});
      setGroupedExpenses(newGrouped);
      
      addNotification({
        type: "success",
        text: `فاکتور ${newStatus ? "تایید" : "رد"} شد`,
      });
    } catch (err) {
      addNotification({
        type: "error",
        text: err.response?.data?.message || "خطا در تغییر وضعیت فاکتور",
      });
    }
  };
  
  const handleToggleDeputy = async (factorId, currentStatus) => {
    try {
      const token = localStorage.getItem("token");
      const newStatus = currentStatus ? 0 : 1;
      
      await axios.put(
        `${serverAddress}/factors/${factorId}/confirm-deputy`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const newExpenses = expenses.map((factor) =>
        factor.FactorID === factorId
          ? { ...factor, IsConfirmedByDeputy: newStatus }
          : factor
      );
      setExpenses(newExpenses);
      
      const newGrouped = newExpenses.reduce((acc, item) => {
        if (!acc[item.ThesisID]) {
          acc[item.ThesisID] = [];
        }
        acc[item.ThesisID].push(item);
        return acc;
      }, {});
      setGroupedExpenses(newGrouped);
      
      addNotification({
        type: "success",
        text: `فاکتور ${newStatus ? "تایید" : "رد"} شد توسط معاونت پژوهشی`,
      });
    } catch (err) {
      addNotification({
        type: "error",
        text: err.response?.data?.message || "خطا در تغییر وضعیت فاکتور توسط معاونت پژوهشی",
      });
    }
  };
  
  const handleToggleResearchDirector = async (factorId, currentStatus) => {
    try {
      const token = localStorage.getItem("token");
      const newStatus = currentStatus ? 0 : 1;
      
      await axios.put(
        `${serverAddress}/factors/${factorId}/confirm-research-director`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const newExpenses = expenses.map((factor) =>
        factor.FactorID == factorId
          ? { ...factor, IsConfirmedByResearchDirector: newStatus }
          : factor
      );
      setExpenses(newExpenses);
      
      const newGrouped = newExpenses.reduce((acc, item) => {
        if (!acc[item.ThesisID]) {
          acc[item.ThesisID] = [];
        }
        acc[item.ThesisID].push(item);
        return acc;
      }, {});
      setGroupedExpenses(newGrouped);
      
      addNotification({
        type: "success",
        text: `فاکتور ${newStatus ? "تایید" : "رد"} شد توسط مدیر امور پژوهشی`,
      });
    } catch (err) {
      addNotification({
        type: "error",
        text: err.response?.data?.message || "خطا در تغییر وضعیت فاکتور توسط مدیر امور پژوهشی",
      });
    }
  };
  
  const handleToggleUniversityDeputy = async (factorId, currentStatus) => {
    try {
      const token = localStorage.getItem("token");
      const newStatus = currentStatus ? 0 : 1;
      
      await axios.put(
        `${serverAddress}/factors/${factorId}/confirm-university-director`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const newExpenses = expenses.map((factor) =>
        factor.FactorID === factorId
          ? { ...factor, IsConfirmedByUniversityDeputy: newStatus }
          : factor
      );
      setExpenses(newExpenses);
      
      const newGrouped = newExpenses.reduce((acc, item) => {
        if (!acc[item.ThesisID]) {
          acc[item.ThesisID] = [];
        }
        acc[item.ThesisID].push(item);
        return acc;
      }, {});
      setGroupedExpenses(newGrouped);
      
      addNotification({
        type: "success",
        text: `فاکتور ${newStatus ? "تایید" : "رد"} شد توسط معاون پژوهشی دانشگاه`,
      });
    } catch (err) {
      addNotification({
        type: "error",
        text: err.response?.data?.message || "خطا در تغییر وضعیت فاکتور توسط معاون پژوهشی دانشگاه",
      });
    }
  };
  
  // ==================== توابع مدیریت فایل ====================
  const openFileModal = (filePath) => {
    const fileUrl = `${serverAddress}${filePath}`;
    const fileType = filePath.toLowerCase().endsWith(".pdf") ? "pdf" : "image";
    setFileModal({ isOpen: true, fileUrl, fileType });
  };
  
  const closeFileModal = () => {
    setFileModal({ isOpen: false, fileUrl: null, fileType: null });
  };
  
  // ==================== توابع حذف ====================
  const openDeleteModal = (factorId, factorInfo) => {
    setDeleteModal({ isOpen: true, factorId, factorInfo });
  };
  
  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, factorId: null, factorInfo: null });
  };
  
  const confirmDelete = async () => {
    if (!deleteModal.factorId) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${serverAddress}/factors/${deleteModal.factorId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const newExpenses = expenses.filter(
        (f) => f.FactorID !== deleteModal.factorId
      );
      setExpenses(newExpenses);
      
      const newGrouped = newExpenses.reduce((acc, item) => {
        if (!acc[item.ThesisID]) {
          acc[item.ThesisID] = [];
        }
        acc[item.ThesisID].push(item);
        return acc;
      }, {});
      setGroupedExpenses(newGrouped);
      
      addNotification({ type: "success", text: "فاکتور با موفقیت حذف شد" });
      closeDeleteModal();
    } catch (err) {
      addNotification({
        type: "error",
        text: err.response?.data?.message || "خطا در حذف فاکتور",
      });
    }
  };
  
  // ==================== توابع ویرایش ====================
  const openEditModal = (factor) => {
    // بررسی شرط: فقط اگر معاون پژوهشی دانشکده تایید نکرده باشد
    if (factor.IsConfirmedByDeputy == 1) {
      addNotification({
        type: "warning",
        text: "امکان ویرایش فاکتور پس از تایید معاون پژوهشی دانشکده وجود ندارد",
      });
      return;
    }
    
    setEditModal({
      isOpen: true,
      factorId: factor.FactorID,
      factorData: {
        factorNumber: factor.FactorNumber,
        factorDate: factor.FactorDate,
        amount: factor.Amount,
        description: factor.Description || "",
      },
      editFile: null,
      editFilePreview: null,
    });
  };
  
  const closeEditModal = () => {
    if (editModal.editFilePreview && editModal.editFilePreview.startsWith('blob:')) {
      URL.revokeObjectURL(editModal.editFilePreview);
    }
    setEditModal({
      isOpen: false,
      factorId: null,
      factorData: null,
      editFile: null,
      editFilePreview: null,
    });
  };
  
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditModal(prev => ({
      ...prev,
      factorData: {
        ...prev.factorData,
        [name]: value
      }
    }));
  };
  
  const handleEditAmountChange = (e) => {
    const value = e.target.value;
    const numericValue = parseNumber(value);
    
    setEditModal(prev => ({
      ...prev,
      factorData: {
        ...prev.factorData,
        amount: numericValue
      }
    }));
  };
  
  const handleEditFileChange = (e) => {
    const file = e.target.files[0];
    
    if (!file) {
      setEditModal(prev => ({
        ...prev,
        editFile: null,
        editFilePreview: null
      }));
      return;
    }
    
    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      addNotification({
        type: "error",
        text: "فقط فایل‌های PDF و تصاویر (JPG, JPEG) قابل قبول هستند",
      });
      return;
    }
    
    let preview = null;
    if (file.type.startsWith("image/")) {
      preview = URL.createObjectURL(file);
    } else {
      preview = file.name;
    }
    
    setEditModal(prev => ({
      ...prev,
      editFile: file,
      editFilePreview: preview
    }));
  };
  
  const submitEdit = async () => {
    // اعتبارسنجی
    if (!editModal.factorData?.factorNumber?.trim()) {
      addNotification({ type: "error", text: "شماره فاکتور الزامی است" });
      return;
    }
    
    if (!editModal.factorData?.factorDate) {
      addNotification({ type: "error", text: "تاریخ فاکتور الزامی است" });
      return;
    }
    
    if (!editModal.factorData?.amount || parseFloat(editModal.factorData.amount) <= 0) {
      addNotification({ type: "error", text: "مبلغ فاکتور باید عددی مثبت باشد" });
      return;
    }
    
    if (!editModal.factorData?.description?.trim()) {
      addNotification({ type: "error", text: "شرح کالا الزامی است" });
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("factorNumber", editModal.factorData.factorNumber);
      formData.append("factorDate", editModal.factorData.factorDate);
      formData.append("amount", editModal.factorData.amount);
      formData.append("description", editModal.factorData.description);
      
      if (editModal.editFile) {
        formData.append("file", editModal.editFile);
      }
      
      const response = await axios.put(
        `${serverAddress}/factors/${editModal.factorId}`,
        formData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
          },
        }
      );
      
      const updatedFactor = response.data;
      
      const newExpenses = expenses.map(factor =>
        factor.FactorID === editModal.factorId
          ? { ...factor, ...updatedFactor }
          : factor
      );
      setExpenses(newExpenses);
      
      const newGrouped = newExpenses.reduce((acc, item) => {
        if (!acc[item.ThesisID]) {
          acc[item.ThesisID] = [];
        }
        acc[item.ThesisID].push(item);
        return acc;
      }, {});
      setGroupedExpenses(newGrouped);
      
      addNotification({ type: "success", text: "فاکتور با موفقیت ویرایش شد" });
      closeEditModal();
    } catch (err) {
      console.error("Error editing factor:", err);
      addNotification({
        type: "error",
        text: err.response?.data?.message || "خطا در ویرایش فاکتور",
      });
    }
  };
  
  // ==================== تابع تولید گزارش ====================
  const generateReport = async () => {
    const selectedFactorsList = [];
    Object.entries(selectedFactors).forEach(([factorId, isSelected]) => {
      if (isSelected) {
        const factor = expenses.find(f => f.FactorID === parseInt(factorId));
        if (factor) {
          selectedFactorsList.push(factor);
        }
      }
    });
    
    if (selectedFactorsList.length === 0) {
      addNotification({
        type: "warning",
        text: "لطفا حداقل یک فاکتور را برای درخواست هزینه انتخاب کنید",
      });
      return;
    }
    
    const firstFactor = selectedFactorsList[0];
    const studentName = firstFactor.StudentName || "-";
    const professorName = firstFactor.ProfessorName || 
      (firstFactor.professors && firstFactor.professors.length > 0 ? 
        firstFactor.professors.find(p => p.nationalCode === firstFactor.ProfessorNationalCode)?.ProfessorName : "-");
    
    const facultyId = firstFactor.FacultyID;
    const facultyName = firstFactor.FacultyName || "-";
    const totalAmount = selectedFactorsList.reduce((sum, factor) => sum + (factor.Amount || 0), 0);
    
    let usersData = {};
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${serverAddress}/report-users`, {
        params: { 
          roles: "معاون پژوهشی دانشکده,مدیر امور پژوهشی,معاون پژوهشی دانشگاه",
          facultyId: facultyId
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      usersData = response.data;
    } catch (err) {
      console.error("Error fetching users data:", err);
      addNotification({
        type: "warning",
        text: "خطا در دریافت اطلاعات امضاها"
      });
    }
    
    const getSignatureImageHtml = (signaturePath, fallbackText) => {
      if (signaturePath && signaturePath !== 'null' && signaturePath !== '') {
        const signatureUrl = `${serverAddress}${signaturePath}`;
        return `<img src="${signatureUrl}" style="height: 60px; max-width: 150px; object-fit: contain;" alt="امضا" onerror="this.style.display='none'; this.nextSibling.style.display='inline';" />
                <span style="display: none; border-bottom: 1px solid #000; width: 150px;">${fallbackText}</span>`;
      }
      return `<span style="border-bottom: 1px solid #000; display: inline-block; width: 150px;">${fallbackText}</span>`;
    };
    
    const facultyDeputy = usersData["معاون پژوهشی دانشکده"]?.[0] || null;
    const researchDirector = usersData["مدیر امور پژوهشی"]?.[0] || null;
    const universityDeputy = usersData["معاون پژوهشی دانشگاه"]?.[0] || null;
    
    const reportHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="UTF-8">
        <title>صورتجلسه پرداخت هزینه پارساهای مقطع کارشناسی ارشد و دکتری</title>
        <span>موضوع ماده 38 آئین نامه مالی و معاملاتی</span>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Tahoma', 'Arial', sans-serif; padding: 8px; background: white; font-size: 12px; }
          .report-container { max-width: 1000px; margin: 0 auto; padding: 5px; }
          .info-box { position: absolute; top: 0; left: 0; border: 1px solid #000; padding: 6px 10px; border-radius: 4px; font-size: 11px; background-color: #f9f9f9; min-width: 150px; }
          .info-box p { margin: 2px 0; line-height: 1.5; }
          .info-box .label { font-weight: bold; margin-left: 5px; }
          .header { text-align: center; margin-bottom: 10px; }
          .bismillah { font-size: 18px; font-weight: bold; font-family: 'Traditional Arabic', 'Tahoma', serif; margin-bottom: 5px; }
          .form-title { font-size: 16px; font-weight: bold; color: #333; }
          .border-box { border: 1px solid black; padding: 10px; border-radius: 4px; margin-top: 8px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 11px; }
          .items-table th, .items-table td { border: 1px solid black; padding: 6px 8px; text-align: center; }
          .items-table th { background-color: #f5f5f5; font-weight: bold; }
          .total-row { font-weight: bold; background-color: #f9f9f9; }
          .info-section { margin-top: 10px; padding-top: 8px; border-top: 1px dashed #ccc; }
          .info-row { display: flex; margin-bottom: 6px; font-size: 11px; }
          .info-label { font-weight: bold; width: 200px; }
          .info-value { flex: 1; padding-bottom: 2px; }
          .signature-section { margin-top: 15px; display: flex; flex-wrap: wrap; gap: 8px; }
          .signature-card { border: 1px solid #000; padding: 8px; border-radius: 4px; background-color: #fff; flex: 1; min-width: 200px; }
          .signature-title { font-weight: bold; font-size: 11px; margin-bottom: 5px; background-color: #f5f5f5; padding: 4px 8px; border-radius: 4px; text-align: center; }
          .signature-content { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; flex-wrap: wrap; gap: 8px; }
          .signature-name { flex: 1; min-width: 150px; font-size: 10px; }
          .signature-image { flex: 1; text-align: left; min-width: 120px; font-size: 10px; }
          .approval-text { margin: 6px 0; font-size: 10px; line-height: 1.4; }
          .faculty-info { background-color: #f9f9f9; padding: 4px 8px; border-radius: 4px; margin-top: 5px; font-size: 11px; color: #555; display: inline-block; }
          @media print { body { padding: 0; margin: 0; } .print-hide { display: none; } .signature-card { break-inside: avoid; } .signature-image img { max-height: 40px; } }
          .print-button { display: block; width: 180px; margin: 15px auto 5px; padding: 8px 16px; background-color: #4a90e2; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-family: inherit; }
          .print-button:hover { background-color: #357ab8; }
          @page { size: A4; margin: 0.5cm; }
          .student-number { font-size: 9px; color: #666; margin-top: 2px; }
        </style>
      </head>
      <body>
        <div class="report-container">
          <div class="info-box">
            <p><span class="label">شماره:</span></p>
            <p><span class="label">تاریخ:</span> </p>
          </div>
          <div class="header">
            <div class="bismillah">بسمه تعالی</div>
            <div class="form-title">
                   صورتجلسه پرداخت هزینه پارساهای مقطع کارشناسی ارشد و دکتری
                   
            </div>
            <small>موضوع ماده 38 آئین نامه مالی و معاملاتی</small>
            <p>  <div class="faculty-info" style="margin-top: 10px; display: inline-block;">
              ${facultyName}
            </div></p>

          
          </div>
          <div class="border-box">
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 50px;">ردیف</th>
                  <th style="width: 140px;">دانشجو</th>
                  <th>شرح کالا / خدمات</th>
                  <th style="width: 150px;">مبلغ (ریال)</th>
                </tr>
              </thead>
              <tbody>
                ${selectedFactorsList.map((factor, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td style="text-align: center;">
                      ${factor.StudentName}
                      <div class="student-number">شماره دانشجویی: ${factor.StudentID}</div>
                    </td>
                    <td style="text-align: right;">
                      ${factor.Description || ''}
                      
                    </td>
                    <td>${factor.Amount.toLocaleString()}</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td colspan="3" style="text-align: left; font-weight: bold;">جمع کل</td>
                  <td style="font-weight: bold;">${totalAmount.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
            <div class="info-section">
              <div class="info-row">
                <div class="info-label">نام و نام خانوادگی استاد راهنما :</div>
                <div class="info-value">${professorName}</div>
              </div>
            </div>
          </div>
          <div class="signature-section">
            <div class="signature-card">
              <div class="signature-title">تأیید رابط مالی دانشکده</div>
              <p class="approval-text">
                مبلغ <strong>${totalAmount.toLocaleString()}</strong> ریال از مبلغ فوق، از محل اعتبار گرنت پارسا مورد تأیید است.
              </p>
              <div class="signature-content">
                <div class="signature-name">
                  نام و نام خانوادگی: ${user.firstName} ${user.lastName}
                </div>
                <div class="signature-image">
                  امضا: <span style="display: inline-block; width: 150px;"></span>
                </div>
              </div>
            </div>
            <div class="signature-card">
              <div class="signature-title">تأیید معاون پژوهشی  ${facultyName}</div>
              <p class="approval-text">
              هزینه کرد فوق مطابق آیین نامه گرنت جامع ، صورت جلسه شماره 190 هیات رئیسه محترم و موضوع ماده 38 آیین نامه مالی و معاملاتی می باشد و مورد تایید است 
              </p>
              <div class="signature-content">
                <div class="signature-name">
                  نام و نام خانوادگی: 
                  <span style="display: inline-block; min-width: 200px;">
                    ${facultyDeputy ? facultyDeputy.fullName : '_________________'}
                  </span>
                </div>
                <div class="signature-image">
                  امضا: 
                  ${facultyDeputy ? getSignatureImageHtml(facultyDeputy.signaturePath, '_________________') : '<span style="border-bottom: 1px solid #000; display: inline-block; width: 150px;">_________________</span>'}
                </div>
              </div>
            </div>
            <div class="signature-card">
              <div class="signature-title">تأیید مدیر امور پژوهشی دانشگاه</div>
               <p class="approval-text">
              هزینه کرد فوق مطابق آیین نامه گرنت جامع ، صورت جلسه شماره 190 هیات رئیسه محترم و موضوع ماده 38 آیین نامه مالی و معاملاتی می باشد و مورد تایید است 
              </p>
              <div class="signature-content">
                <div class="signature-name">
                  نام و نام خانوادگی: 
                  <span style="display: inline-block; min-width: 200px;">
                    ${researchDirector ? researchDirector.fullName : '_________________'}
                  </span>
                </div>
                <div class="signature-image">
                  امضا: 
                  ${researchDirector ? getSignatureImageHtml(researchDirector.signaturePath, '_________________') : '<span style="border-bottom: 1px solid #000; display: inline-block; width: 150px;">_________________</span>'}
                </div>
              </div>
            </div>
            <div class="signature-card">
              <div class="signature-title">تأیید معاون پژوهشی دانشگاه</div>
              <p class="approval-text">
              مدیر محترم امور مال دانشگاه پرداخت مبلغ فوق مطابق آیین نامه گرنت جامع،صورتجلسه شماره 490 هیات رئیسه محترم موضوع ماده 38 آئین نامه مالی و معاملاتی مورد تایید است 
              </p>
              <div class="signature-content">
                <div class="signature-name">
                  نام و نام خانوادگی: 
                  <span style="display: inline-block; min-width: 200px;">
                    ${universityDeputy ? universityDeputy.fullName : '_________________'}
                  </span>
                </div>
                <div class="signature-image">
                  امضا: 
                  ${universityDeputy ? getSignatureImageHtml(universityDeputy.signaturePath, '_________________') : '<span style="border-bottom: 1px solid #000; display: inline-block; width: 150px;">_________________</span>'}
                </div>
              </div>
            </div>
          </div>
          <div style="margin-top: 30px; text-align: left; font-size: 12px; color: #666;">
            تاریخ چاپ: ${new Date().toLocaleDateString('fa-IR')}
          </div>
          <button class="print-button print-hide" onclick="window.print(); setTimeout(() => window.close(), 500);">
            🖨️ چاپ گزارش
          </button>
        </div>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank', 'width=1000,height=800,scrollbars=yes');
    printWindow.document.write(reportHtml);
    printWindow.document.close();
  };
  
  // ==================== رندر شرطی (در انتها) ====================
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
        <button className={Styles.retryButton} onClick={() => window.location.reload()}>
          تلاش مجدد
        </button>
      </div>
    );
  }
  
  const hasNoResults = Object.keys(filteredGrouped).length == 0;
  
  // ==================== رندر اصلی ====================
  return (
    <div className={Styles.container}>
      <h2 className={Styles.title}>مشاهده همه هزینه‌کردها</h2>
      
      <div className={Styles.searchContainer}>
        <input
          type="text"
          placeholder="جستجو بر اساس عنوان، نام دانشجو..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={Styles.searchInput}
        />
        {selectedRole != "عضو هیات علمی" && (
          <SearchSelects
            onStatusChange={handleStatusChange}
            onFacultyChange={handleFacultyChange}
            onDepartmentChange={handleDepartmentChange}
            selectedRole={selectedRole}
          />
        )}
      </div>
      
      {hasNoResults ? (
        <p className={Styles.noResults}>هیچ فاکتوری یافت نشد</p>
      ) : (
        Object.entries(filteredGrouped).map(([thesisId, factors], index) => (
          <div key={thesisId}>
            <div className={Styles.thesisSection}>
              <h3>
                پایان‌نامه: {factors[0].Title} (دانشجو: {factors[0].StudentName}
                ، دانشکده: {factors[0].FacultyName || "نامشخص"}، گروه:{" "}
                {factors[0].DepartmentName || "نامشخص"}
                {factors[0].professors && factors[0].professors.length > 0 && (
                  <>، استاد راهنما: {factors[0].professors.map(p => p.ProfessorName).join('، ')}</>
                )}
              </h3>
              
              <table className={Styles.factorsTable}>
                <thead>
                  <tr>
                    <th>انتخاب</th>
                    <th>شماره فاکتور</th>
                    <th>تاریخ</th>
                    <th>مبلغ (ریال)</th>
                    <th>استاد راهنما</th>
                    <th>توضیحات</th>
                    <th>وضعیت تایید کارشناس مالی</th>
                    {isExpert && selectedRole != "عضو هیات علمی" && <th>تایید کارشناس مالی</th>}
                    <th>وضعیت تایید معاون پژوهشی دانشکده</th>
                    {isDeputy && selectedRole != "عضو هیات علمی" && <th>تایید معاون پژوهشی دانشکده</th>}
                    <th>وضعیت تایید مدیر امور پژوهشی</th>
                    {isResearchDirector && selectedRole != "عضو هیات علمی" && <th>تایید مدیر امور پژوهشی</th>}
                    <th>وضعیت تایید معاون پژوهشی دانشگاه</th>
                    {isUniversityDeputy && selectedRole != "عضو هیات علمی" && <th>تایید معاون پژوهشی دانشگاه</th>}
                    {isProfessor && <th>حذف</th>}
                    {isExpert && selectedRole != "عضو هیات علمی" && <th>ویرایش</th>}
                  </tr>
                </thead>
                <tbody>
                  <tr className={Styles.selectAllRow}>
                    <td colSpan="100%">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <label className={Styles.selectAllLabel}>
                          <input
                            type="checkbox"
                            checked={areAllFactorsSelected(factors)}
                            onChange={(e) => handleSelectAllForThesis(factors, e.target.checked)}
                            disabled={!areAllFactorsSelectable(factors)}
                          />
                          <span>انتخاب همه فاکتورهای این پایان‌نامه</span>
                        </label>
                        {(isExpert || selectedRole === "کارشناس مالی دانشکده") && (
                          <button onClick={generateReport} className={Styles.requestButton}>
                            📄 درخواست هزینه پارسا
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  
                  {factors.map((factor) => {
                    const isAllConfirmed = 
                      factor.IsConfirmedByExpert == 1 &&
                      factor.IsConfirmedByDeputy == 1 &&
                      factor.IsConfirmedByResearchDirector == 1 &&
                      factor.IsConfirmedByUniversityDeputy == 1;
                    
                    let professorName = '-';
                    if (factor.ProfessorName) {
                      professorName = factor.ProfessorName;
                    } else if (factor.professors && factor.professors.length > 0 && factor.ProfessorNationalCode) {
                      const professor = factor.professors.find(p => p.nationalCode === factor.ProfessorNationalCode);
                      professorName = professor ? professor.ProfessorName : factor.ProfessorNationalCode;
                    } else if (factor.ProfessorNationalCode) {
                      professorName = factor.ProfessorNationalCode;
                    }
                    
                    return (
                      <tr key={factor.FactorID}>
                        <td>
                          <input
                            type="checkbox"
                            className={Styles.selectCheckbox}
                            checked={selectedFactors[factor.FactorID] || false}
                            onChange={() => handleSelectFactor(factor.FactorID, factor)}
                            disabled={!isAllConfirmed}
                          />
                        </td>
                        <td>
                          <button
                            onClick={() => openFileModal(factor.Filepath)}
                            className={Styles.fileLink}
                            title="نمایش ضمیمه"
                          >
                            {toPersianNum(factor.FactorNumber)}
                          </button>
                        </td>
                        <td>{factor.FactorDate}</td>
                        <td>{toPersianNum(factor.Amount.toLocaleString())}</td>
                        <td>{professorName}</td>
                        <td>{factor.Description || "-"}</td>
                        <td>
                          {factor.IsConfirmedByExpert === null ? (
                            <span className={Styles.unknownStatus}>نامشخص</span>
                          ) : factor.IsConfirmedByExpert == 1 ? (
                            <span className={Styles.confirmed}>تایید شده</span>
                          ) : (
                            <span className={Styles.rejectedStatus}>رد شده</span>
                          )}
                        </td>
                        {isExpert && (
                          <td>
                            <label className={Styles.toggleSwitch}>
                              <input
                                type="checkbox"
                                className={Styles.toggleInput}
                                checked={factor.IsConfirmedByExpert == 1}
                                onChange={() => handleToggleExpert(factor.FactorID, factor.IsConfirmedByExpert == 1)}
                                disabled={factor.IsConfirmedByDeputy == 1}
                              />
                              <span className={Styles.toggleSlider}></span>
                            </label>
                          </td>
                        )}
                        <td>
                          {factor.IsConfirmedByDeputy === null ? (
                            <span className={Styles.unknownStatus}>نامشخص</span>
                          ) : factor.IsConfirmedByDeputy == 1 ? (
                            <span className={Styles.confirmed}>تایید شده</span>
                          ) : (
                            <span className={Styles.rejectedStatus}>رد شده</span>
                          )}
                        </td>
                        {isDeputy && selectedRole != "عضو هیات علمی" && (
                          <td>
                            <label className={Styles.toggleSwitch}>
                              <input
                                type="checkbox"
                                className={Styles.toggleInput}
                                checked={factor.IsConfirmedByDeputy == 1}
                                onChange={() => handleToggleDeputy(factor.FactorID, factor.IsConfirmedByDeputy == 1)}
                                disabled={
                                  !user.roles.includes("معاون پژوهشی دانشکده") ||
                                  factor.IsConfirmedByExpert != 1 ||
                                  factor.IsConfirmedByResearchDirector == 1
                                }
                              />
                              <span className={Styles.toggleSlider}></span>
                            </label>
                          </td>
                        )}
                        <td>
                          {factor.IsConfirmedByResearchDirector == null ? (
                            <span className={Styles.unknownStatus}>نامشخص</span>
                          ) : factor.IsConfirmedByResearchDirector == 1 ? (
                            <span className={Styles.confirmed}>تایید شده</span>
                          ) : (
                            <span className={Styles.rejectedStatus}>رد شده</span>
                          )}
                        </td>
                        {isResearchDirector && selectedRole != "عضو هیات علمی" && (
                          <td>
                            <label className={Styles.toggleSwitch}>
                              <input
                                type="checkbox"
                                className={Styles.toggleInput}
                                checked={factor.IsConfirmedByResearchDirector == 1}
                                onChange={() => handleToggleResearchDirector(factor.FactorID, factor.IsConfirmedByResearchDirector == 1)}
                                disabled={
                                  !user.roles.includes("مدیر امور پژوهشی") ||
                                  factor.IsConfirmedByExpert != 1 ||
                                  factor.IsConfirmedByDeputy != 1 ||
                                  factor.IsConfirmedByUniversityDeputy == 1
                                }
                              />
                              <span className={Styles.toggleSlider}></span>
                            </label>
                          </td>
                        )}
                        <td>
                          {factor.IsConfirmedByUniversityDeputy === null ? (
                            <span className={Styles.unknownStatus}>نامشخص</span>
                          ) : factor.IsConfirmedByUniversityDeputy == 1 ? (
                            <span className={Styles.confirmed}>تایید شده</span>
                          ) : (
                            <span className={Styles.rejectedStatus}>رد شده</span>
                          )}
                        </td>
                        {isUniversityDeputy && selectedRole != "عضو هیات علمی" && (
                          <td>
                            <label className={Styles.toggleSwitch}>
                              <input
                                type="checkbox"
                                className={Styles.toggleInput}
                                checked={factor.IsConfirmedByUniversityDeputy == 1}
                                onChange={() => handleToggleUniversityDeputy(factor.FactorID, factor.IsConfirmedByUniversityDeputy == 1)}
                                disabled={
                                  !user.roles.includes("معاون پژوهشی دانشگاه") ||
                                  factor.IsConfirmedByExpert != 1 ||
                                  factor.IsConfirmedByDeputy != 1 ||
                                  factor.IsConfirmedByResearchDirector != 1
                                }
                              />
                              <span className={Styles.toggleSlider}></span>
                            </label>
                          </td>
                        )}
                        {isProfessor && (
                          <td>
                            <button
                              onClick={() => openDeleteModal(factor.FactorID, factor)}
                              className={Styles.deleteButton}
                              disabled={factor.IsConfirmedByExpert == 1}
                              title={factor.IsConfirmedByExpert == 1 ? "فاکتور تایید شده توسط کارشناس مالی قابل حذف نیست" : "حذف فاکتور"}
                            >
                              <FaTrash />
                            </button>
                          </td>
                        )}
                        {isExpert && selectedRole != "عضو هیات علمی" && (
                          <td>
                            <button
                              onClick={() => openEditModal(factor)}
                              className={`${Styles.editButton} ${factor.IsConfirmedByDeputy == 1 ? Styles.disabledButton : ""}`}
                              disabled={factor.IsConfirmedByDeputy == 1}
                              title={factor.IsConfirmedByDeputy == 1 ? "فاکتور تایید شده توسط معاون پژوهشی دانشکده قابل ویرایش نیست" : "ویرایش فاکتور"}
                            >
                              <FaEdit />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {index < Object.keys(filteredGrouped).length - 1 && (
              <hr className={Styles.sectionDivider} />
            )}
          </div>
        ))
      )}
      
      {/* Modal نمایش فایل */}
      {fileModal.isOpen && (
        <div className={Styles.modalOverlay} onClick={closeFileModal}>
          <div className={Styles.fileModal} onClick={(e) => e.stopPropagation()}>
            <button className={Styles.closeButton} onClick={closeFileModal}>
              <FaTimes />
            </button>
            <div className={Styles.modalToolbar}>
              {fileModal.fileType == "pdf" && (
                <button onClick={() => window.open(fileModal.fileUrl, "_blank")} className={Styles.openInBrowserButton}>
                  بازکردن در مرورگر
                </button>
              )}
            </div>
            {fileModal.fileType == "pdf" ? (
              <div className={Styles.pdfContainer}>
                <embed src={`${fileModal.fileUrl}#view=FitH`} type="application/pdf" className={Styles.pdfEmbed} />
              </div>
            ) : (
              <img src={fileModal.fileUrl} alt="فاکتور" className={Styles.imagePreview} />
            )}
          </div>
        </div>
      )}
      
      {/* Modal حذف */}
      {deleteModal.isOpen && (
        <div className={Styles.modalOverlay}>
          <div className={Styles.modal}>
            <h3>حذف فاکتور</h3>
            <p>
              آیا از حذف فاکتور شماره {deleteModal.factorInfo?.FactorNumber} به
              مبلغ {deleteModal.factorInfo?.Amount.toLocaleString()} ریال
              اطمینان دارید؟
            </p>
            <p>این عمل قابل بازگشت نیست.</p>
            <div className={Styles.modalActions}>
              <button onClick={closeDeleteModal} className={Styles.cancelButton}>
                انصراف
              </button>
              <button onClick={confirmDelete} className={Styles.deleteButton}>
                حذف فاکتور
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal ویرایش فاکتور */}
      {editModal.isOpen && (
        <div className={Styles.modalOverlay} onClick={closeEditModal}>
          <div className={Styles.editModal} onClick={(e) => e.stopPropagation()}>
            <div className={Styles.editModalHeader}>
              <h3>ویرایش فاکتور</h3>
              <button className={Styles.closeButton} onClick={closeEditModal}>
                <FaTimes />
              </button>
            </div>
            
            <div className={Styles.editForm}>
              <div className={Styles.formGroup}>
                <label>شماره فاکتور <span className={Styles.required}>*</span></label>
                <input
                  type="text"
                  name="factorNumber"
                  value={editModal.factorData?.factorNumber || ""}
                  onChange={handleEditChange}
                  className={Styles.editInput}
                />
              </div>
              
              <div className={Styles.formGroup}>
                <label>تاریخ فاکتور <span className={Styles.required}>*</span></label>
                <DatePicker
                  value={editModal.factorData?.factorDate || ""}
                  onChange={(date) => setEditModal(prev => ({
                    ...prev,
                    factorData: { ...prev.factorData, factorDate: date }
                  }))}
                  calendar={persian}
                  format="YYYY/MM/DD"
                  inputClass={Styles.editInput}
                  className={Styles.datePicker}
                />
              </div>
              
              <div className={Styles.formGroup}>
                <label>مبلغ (ریال) <span className={Styles.required}>*</span></label>
                <input
                  type="text"
                  name="amount"
                  value={formatNumber(editModal.factorData?.amount || "")}
                  onChange={handleEditAmountChange}
                  className={Styles.editInput}
                />
              </div>
              
              <div className={Styles.formGroup}>
                <label>شرح کالا/خدمات <span className={Styles.required}>*</span></label>
                <textarea
                  name="description"
                  value={editModal.factorData?.description || ""}
                  onChange={handleEditChange}
                  rows="3"
                  className={Styles.editTextarea}
                />
              </div>
              
              <div className={Styles.formGroup}>
                <label>فایل فاکتور (اختیاری)</label>
                <div className={Styles.fileInputContainer}>
                  <label className={Styles.fileInputLabel}>
                    {editModal.editFile?.type?.includes("pdf") ? <FaFilePdf /> : <FaFileImage />}
                    انتخاب فایل جدید
                    <input
                      type="file"
                      onChange={handleEditFileChange}
                      accept=".pdf,.jpg,.jpeg,application/pdf,image/*"
                      style={{ display: "none" }}
                    />
                  </label>
                  {editModal.editFilePreview && (
                    <div className={Styles.filePreview}>
                      <span>فایل جدید: </span>
                      {editModal.editFile?.type?.startsWith("image/") ? (
                        <img src={editModal.editFilePreview} alt="پیش‌نمایش" className={Styles.previewImage} />
                      ) : (
                        <span>{editModal.editFilePreview}</span>
                      )}
                    </div>
                  )}
                </div>
                <p className={Styles.fileHelpText}>
                  در صورت تمایل می‌توانید فایل جدیدی جایگزین فایل قبلی کنید.
                </p>
              </div>
              
              <div className={Styles.modalActions}>
                <button onClick={closeEditModal} className={Styles.cancelButton}>
                  انصراف
                </button>
                <button onClick={submitEdit} className={Styles.submitButton}>
                  <MdSave /> ذخیره تغییرات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ViewExpenseAll;