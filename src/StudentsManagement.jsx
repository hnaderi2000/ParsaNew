// StudentsManagement.jsx

import { useState, useEffect } from "react";
import axios from "axios";
import Styles from "./StudentsManagement.module.css";
import serverAddress from "./constants/contants";
import { useNotification } from "./contexts/NotificationContext";
import Loader from "../src/components/Loader";

// Icons
import { MdEdit, MdOutlineSkipNext, MdOutlineSkipPrevious, MdSave } from "react-icons/md";
import { AiOutlineCloseCircle } from "react-icons/ai";
import { FaTrashAlt } from "react-icons/fa";
import { FaPlus } from "react-icons/fa6";
import { IoSearch } from "react-icons/io5";
// تابع نرمال‌سازی

function StudentsManagement() {
  const [students, setStudents] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [educationLevels, setEducationLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isAllowed, setIsAllowed] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState({
    StudentID: "",
    FirstName: "",
    LastName: "",
    NationalID: "",
    FacultyID: null,
    DepartmentID: null,
    LevelID: null,
    gender: null,
    major: "",
    phone: "",
  });

  // Pagination and search
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const pageSize = 5;

  const currentUser = JSON.parse(localStorage.getItem("user"));
  const { addNotification } = useNotification();

  // Notifications
  useEffect(() => {
    if (error) addNotification({ type: "error", text: error });
    if (success) addNotification({ type: "success", text: success });
  }, [error, success, addNotification]);

  // Init
  useEffect(() => {
    const roles = currentUser?.roles || [];
    const allowed = roles.includes("مدیر سیستم") || roles.includes("کارشناس پژوهشی دانشکده");
    setIsAllowed(allowed);

    if (allowed) {
      if (roles.includes("کارشناس پژوهشی دانشکده") && !currentUser.FacultyID) {
        setError("دانشکده شما مشخص نشده است. لطفاً با مدیر سیستم تماس بگیرید.");
        setLoading(false);
        return;
      }

      fetchFaculties();
      fetchEducationLevels();
      fetchStudents(currentPage, searchQuery);
    } else {
      setLoading(false);
    }
  }, []);



  const fetchStudents = async (page = 1, search = "") => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const params = new URLSearchParams({
        page,
        limit: pageSize,
        search,
      });

      // اگر نقش کارشناس پژوهشی دانشکده است → facultyId حتما اضافه شود
      if (currentUser.roles.includes("کارشناس پژوهشی دانشکده") && currentUser.FacultyID) {
        params.append("facultyId", currentUser.FacultyID);
      }

      const url = `${serverAddress}/students?${params.toString()}`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setStudents(response.data.students);
      setTotalPages(Math.ceil(response.data.total / pageSize));
      setCurrentPage(page);
    } catch (err) {
      setError(err.response?.data?.message || "خطا در دریافت لیست دانشجویان");
    } finally {
      setLoading(false);
    }
  };

  // Fetch faculties
  const fetchFaculties = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${serverAddress}/faculties`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFaculties(response.data);
    } catch (err) {
      setError(err.message);
    }
  };

  // Fetch levels
  const fetchEducationLevels = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${serverAddress}/educationlevels1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEducationLevels(response.data);
    } catch (err) {
      setError(err.message);
    }
  };

  // Fetch departments when faculty changes
  const fetchDepartments = async (facultyId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${serverAddress}/departments/faculty/${facultyId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDepartments(response.data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (formData.FacultyID) {
      fetchDepartments(formData.FacultyID);
    } else {
      setDepartments([]);
    }
  }, [formData.FacultyID]);

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenderChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      gender: e.target.value === "male" ? 1 : 0,
    }));
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    // fetchStudents(1, query);
  };
  const handleSearchClick = () => {
    fetchStudents(1, searchQuery);
  };

  const handleFacultyChange = (e) => {
    const facultyId = e.target.value ? parseInt(e.target.value) : null;
    setFormData((prev) => ({
      ...prev,
      FacultyID: facultyId,
      DepartmentID: null,
    }));
  };

  const handleEditStudent = (student) => {
    setEditingStudent(student);
    setFormData({
      StudentID: student.StudentID,
      FirstName: student.FirstName,
      LastName: student.LastName,
      NationalID: student.NationalID,
      FacultyID: student.FacultyID,
      DepartmentID: student.DepartmentID,
      LevelID: student.LevelID,
      gender: student.gender,
      major: student.major,
      phone: student.phone,
    });
    setShowAddForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      let payload = { ...formData };

      // اگر کارشناس پژوهشی دانشکده است، FacultyID رو قفل می‌کنیم
      if (currentUser.roles.includes("کارشناس پژوهشی دانشکده")) {
        payload.FacultyID = currentUser.FacultyID;
      }

      if (editingStudent) {
        await axios.put(`${serverAddress}/students/${editingStudent.StudentID}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccess("دانشجو با موفقیت ویرایش شد");
      } else {
        await axios.post(`${serverAddress}/students`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccess("دانشجوی جدید با موفقیت افزوده شد");
      }

      setShowAddForm(false);
      setEditingStudent(null);
      fetchStudents(currentPage, searchQuery);
    } catch (err) {
      setError(err.response?.data || "پر کردن تمامی فیلدها الزامی است");
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (window.confirm("آیا از حذف این دانشجو مطمئن هستید؟")) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`${serverAddress}/students/${studentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccess("دانشجو با موفقیت حذف شد");
        fetchStudents(currentPage, searchQuery);
      } catch (err) {
        setError(err.response?.data?.message || "خطا در حذف دانشجو");
      }
    }
  };

  // Pagination
  const handlePreviousPage = () => {
    if (currentPage > 1) fetchStudents(currentPage - 1, searchQuery);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) fetchStudents(currentPage + 1, searchQuery);
  };

  if (loading) {
    return (
      <div className={Styles.container}>
        <Loader />
      </div>
    );
  }



  return (
    <div className={Styles.container}>
      {isAllowed ? (
        <>
          <div className={Styles.header}>
            <h2>مدیریت دانشجویان</h2>
            <button
              onClick={() => {
                setEditingStudent(null);
                setFormData({
                  StudentID: "",
                  FirstName: "",
                  LastName: "",
                  NationalID: "",
                  FacultyID: currentUser.FacultyID || null,
                  DepartmentID: null,
                  LevelID: null,
                  gender: null,
                  major: "",
                  phone: "",
                });
                setShowAddForm(true);
              }}
              className="bigButton success"
            >
              <FaPlus />
              افزودن دانشجوی جدید
            </button>
          </div>

          {/* Search */}
          <div style={{ marginBottom: "10px" }}>
            <label>جستجو:</label>
            <div className={Styles.searchRow}>
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault(); // جلوگیری از رفرش شدن صفحه
                    handleSearchClick();
                  }
                }}
                placeholder="جستجو بر اساس نام، نام خانوادگی، کد ملی یا شماره دانشجویی"
                className={Styles.searchInput}
              />
              <button
                onClick={handleSearchClick}
                className={Styles.searchButton}
                title="جستجو"
              >
                <IoSearch />

              </button>
            </div>
          </div>

          {/* Form */}
          {showAddForm && (
            <div className={Styles.formContainer}>
              <h3>{editingStudent ? "ویرایش دانشجو" : "افزودن دانشجوی جدید"}</h3>
              <form onSubmit={handleSubmit}>
                {/* Row 1 */}
                <div className={Styles.formRow}>
                  <div className={Styles.formGroup}>
                    <label>شماره دانشجویی:</label>
                    <input
                      type="text"
                      name="StudentID"
                      value={formData.StudentID}
                      onChange={handleInputChange}
                      required
                      maxLength={10}
                    />
                  </div>
                  <div className={Styles.formGroup}>
                    <label>نام:</label>
                    <input
                      type="text"
                      name="FirstName"
                      value={formData.FirstName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className={Styles.formGroup}>
                    <label>نام خانوادگی:</label>
                    <input
                      type="text"
                      name="LastName"
                      value={formData.LastName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className={Styles.formGroup}>
                    <label>کد ملی:</label>
                    <input
                      type="text"
                      name="NationalID"
                      value={formData.NationalID}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className={Styles.formGroup}>
                    <label>شماره همراه:</label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      maxLength={11}
                    />
                  </div>
                  <div className={Styles.formGroup}>
                    <label>رشته:</label>
                    <input
                      type="text"
                      name="major"
                      value={formData.major}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className={Styles.formGroup}>
                    <label>جنسیت:</label>
                    <select
                      name="gender"
                      value={formData.gender === 1 ? "male" : "female"}
                      onChange={handleGenderChange}
                    >
                      <option value="">انتخاب جنسیت</option>
                      <option value="male">مرد</option>
                      <option value="female">زن</option>
                    </select>
                  </div>
                </div>

                {/* Row 2 */}
                <div style={{ display: "flex" }}>
                  <div className={Styles.formGroup}>
                    <label>دانشکده:</label>
                    <select
                      name="FacultyID"
                      value={formData.FacultyID || ""}
                      onChange={handleFacultyChange}
                      required
                      disabled={currentUser.roles.includes("کارشناس پژوهشی دانشکده")}
                      className={Styles.facultySelect}
                    >
                      <option value="">انتخاب دانشکده</option>
                      {faculties.map((faculty) => (
                        <option key={faculty.FacultyID} value={faculty.FacultyID}>
                          {faculty.FacultyName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={Styles.formGroup}>
                    <label>گروه:</label>
                    <select
                      name="DepartmentID"
                      value={formData.DepartmentID || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          DepartmentID: e.target.value ? parseInt(e.target.value) : null,
                        }))
                      }
                      required
                      className={Styles.departmentSelect}
                    >
                      <option value="">انتخاب گروه</option>
                      {departments.map((d) => (
                        <option key={d.DepartmentID} value={d.DepartmentID}>
                          {d.DepartmentName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={Styles.formGroup}>
                    <label>مقطع تحصیلی:</label>
                    <select
                      name="LevelID"
                      value={formData.LevelID || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          LevelID: e.target.value ? parseInt(e.target.value) : null,
                        }))
                      }
                      required
                    >
                      <option value="">انتخاب مقطع</option>
                      {educationLevels.map((level) => (
                        <option key={level.LevelID} value={level.LevelID}>
                          {level.LevelName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={Styles.formActions}>
                  <button type="submit" className="miniButton success" title="ذخیره">
                    <MdSave />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="miniButton error"
                    title="انصراف"
                  >
                    <AiOutlineCloseCircle />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Table */}
          <div className={Styles.usersTable}>
            <table>
              <thead>
                <tr>
                  <th>شماره دانشجویی</th>
                  <th>نام</th>
                  <th>نام خانوادگی</th>
                  <th>کد ملی</th>
                  <th>دانشکده</th>
                  <th>گروه</th>
                  <th>مقطع</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.StudentID}>
                    <td>{s.StudentID}</td>
                    <td>{s.FirstName}</td>
                    <td>{s.LastName}</td>
                    <td>{s.NationalID}</td>
                    <td>{s.FacultyName || "-"}</td>
                    <td>{s.DepartmentName || "-"}</td>
                    <td>{s.LevelName || "-"}</td>
                    <td>
                      <button
                        onClick={() => handleEditStudent(s)}
                        className="miniButton warning"
                        title="ویرایش"
                      >
                        <MdEdit />
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(s.StudentID)}
                        className="miniButton error"
                        title="حذف"
                      >
                        <FaTrashAlt />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className={Styles.pagination}>
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className={currentPage === 1 ? Styles.disabled : ""}
            >
              <MdOutlineSkipNext />
              قبلی
            </button>
            <span>
              صفحه {currentPage} از {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className={currentPage === totalPages ? Styles.disabled : ""}
            >
              بعدی
              <MdOutlineSkipPrevious />
            </button>
          </div>
        </>
      ) : (
        <div className={Styles.nonAdminView}>
          <h2>مدیریت دانشجویان</h2>
          <p>شما دسترسی به مدیریت دانشجویان ندارید.</p>
        </div>
      )}
    </div>
  );
}

export default StudentsManagement;