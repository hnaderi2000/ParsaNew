





import { useState, useEffect } from "react";
import axios from "axios";
import Styles from "./UserManagement.module.css";
import serverAddress from "./constants/contants";
import { useNotification } from "./contexts/NotificationContext";
import Loader from "../src/components/Loader";

// Importing icons
import { MdEdit, MdOutlineSkipNext, MdOutlineSkipPrevious, MdSave } from "react-icons/md";
import { AiOutlineCloseCircle } from "react-icons/ai";
import { FaTrashAlt, FaFileImage } from "react-icons/fa";
import { FaPlus } from "react-icons/fa6";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
function UserManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState(""); // اضافه کردن state برای نقش انتخاب شده
  const [signaturePreview, setSignaturePreview] = useState(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    nationalCode: "",
    userName: "",
    password: "",
    roles: [],
    facultyId: null,
    departmentId: null,
    phoneNumber: "",
    signatureFile: null,


  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 5;

  const currentUser = JSON.parse(localStorage.getItem("user"));
  const { addNotification } = useNotification();

  // Display success or error notification
  useEffect(() => {
    const timer = setTimeout(() => {
      if (error) setError("");
      else if (success) setSuccess("");
    }, 3000);

    if (error) addNotification({ type: "error", text: error });
    else if (success) addNotification({ type: "success", text: success });

    return () => clearTimeout(timer);
  }, [error, success, addNotification]);

  useEffect(() => {
    const adminStatus = currentUser?.roles?.includes("مدیر سیستم");
    setIsAdmin(adminStatus);

    if (adminStatus) {
      fetchRoles();
      fetchFaculties();
      fetchUsers(currentPage, searchQuery);
    } else {
      setLoading(false);
    }
  }, []);

  // const fetchUsers = async (page = 1, query = "") => {
  //   try {
  //     const token = localStorage.getItem("token");
  //     const response = await axios.get(
  //       `${serverAddress}/users?page=${page}&limit=${pageSize}&search=${encodeURIComponent(query)}`,
  //       {
  //         headers: { Authorization: `Bearer ${token}` },
  //       }
  //     );
  //     setUsers(response.data.users);
  //     setTotalPages(Math.ceil(response.data.total / pageSize));
  //     setCurrentPage(page);
  //     setLoading(false);
  //   } catch (err) {
  //     setError("خطا در دریافت لیست کاربران");
  //     setLoading(false);
  //   }
  // };

    const fetchUsers = async (page = 1, query = "", roleId = "") => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${serverAddress}/users?page=${page}&limit=${pageSize}&search=${encodeURIComponent(query)}&roleId=${roleId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUsers(response.data.users);
      setTotalPages(Math.ceil(response.data.total / pageSize));
      setCurrentPage(page);
      setLoading(false);
    } catch (err) {
      setError("خطا در دریافت لیست کاربران");
      setLoading(false);
    }
  };


  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${serverAddress}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRoles(response.data);
    } catch (err) {
      setError(err.message);
    }
  };

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

  const fetchDepartments = async (facultyId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${serverAddress}/departments/faculty/${facultyId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setDepartments(response.data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (formData.facultyId) {
      fetchDepartments(formData.facultyId);
    } else {
      setDepartments([]);
    }
  }, [formData.facultyId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    fetchUsers(1, query);
  };


    // تابع تغییر فیلتر نقش
  const handleRoleFilterChange = (e) => {
    const roleId = e.target.value;
    setSelectedRoleId(roleId);
    fetchUsers(1, searchQuery, roleId);
  };
  const handleRoleChange = (roleId) => {
    setFormData((prev) => {
      let newRoles;
      if (prev.roles.includes(roleId)) {
        newRoles = prev.roles.filter((id) => id !== roleId);
      } else {
        newRoles = [...prev.roles, roleId];
      }

      const hasFacultyRole = newRoles.some((id) => {
        const role = roles.find((r) => r.id === id);
        return (
          role &&
          [
            "معاون پژوهشی دانشکده",
            "کارشناس پژوهشی دانشکده",
            "مدیر گروه",
          ].includes(role.name)
        );
      });

      const hasDepartmentRole = newRoles.some((id) => {
        const role = roles.find((r) => r.id === id);
        return role && role.name === "مدیر گروه";
      });

      return {
        ...prev,
        roles: newRoles,
        facultyId: hasFacultyRole ? prev.facultyId : null,
        departmentId: hasDepartmentRole ? prev.departmentId : null,
      };
    });
  };

  const handleFacultyChange = (e) => {
    const facultyId = e.target.value ? parseInt(e.target.value) : null;
    setFormData((prev) => ({
      ...prev,
      facultyId,
      departmentId: null, // Reset department when faculty changes
    }));
  };

  const handleSignatureChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setSignaturePreview(null);
      setFormData((prev) => ({ ...prev, signatureFile: null }));
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setSignaturePreview(null);
      setFormData((prev) => ({ ...prev, signatureFile: null }));
      setError("فقط فایل‌های تصویری (JPG, PNG, WEBP) قابل قبول هستند");
      return;
    }

    setFormData((prev) => ({ ...prev, signatureFile: file }));
    const imageUrl = URL.createObjectURL(file);
    setSignaturePreview(imageUrl);
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      nationalCode: user.nationalCode,
      userName: user.userName,
      password: "",
      roles: user.roles
        ? user.roles
          .split(", ")
          .map((role) => {
            const foundRole = roles.find((r) => r.name === role);
            return foundRole ? foundRole.id : null;
          })
          .filter((id) => id !== null)
        : [],
      facultyId: user.FacultyID || null,
      departmentId: user.DepartmentID || null,
      phoneNumber: user.PhoneNumber,
      signatureFile: null,
     
    });
    setSignaturePreview(user.SignaturePath ? `${serverAddress}${user.SignaturePath}` : null);
    setShowAddForm(true);
  };

  const handleCopyNationalCode = () => {
    if (!editingUser && formData.nationalCode) {
      setFormData((prev) => ({
        ...prev,
        userName: formData.nationalCode,
      }));
    }
  };

  const handleNationalCodeKeyDown = (e) => {
    if (e.key === "Tab" && !editingUser && formData.nationalCode) {
      setFormData((prev) => ({
        ...prev,
        userName: formData.nationalCode,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (!/^\d{10}$/.test(formData.nationalCode)) {
    setError("کد ملی باید دقیقا ۱۰ رقم باشد");
    return;
  }

  if (!/^09\d{9}$/.test(formData.phoneNumber)) {
    setError("شماره همراه باید با 09 شروع شده و 11 رقم باشد");
    return;
  }

  // بررسی الزامی بودن تاریخ شروع برای نقش‌های ویژه
const specialRoleNames = ["مدیر امور پژوهشی", "معاون پژوهشی دانشگاه", "کارشناس پژوهشی معاونت پژوهشی"];
const hasSpecialRole = formData.roles.some(roleId => {
  const role = roles.find(r => r.id === roleId);
  return role && specialRoleNames.includes(role.name);
});

// if (hasSpecialRole && !formData.roleStartDate) {
//   setError("برای نقش‌های مدیریتی (مدیر امور پژوهشی، معاون پژوهشی دانشگاه، کارشناس پژوهشی معاونت پژوهشی) وارد کردن تاریخ شروع الزامی است.");
//   return;
// }
    try {
      const token = localStorage.getItem("token");
      const formDataToSend = new FormData();
      formDataToSend.append("firstName", formData.firstName);
      formDataToSend.append("lastName", formData.lastName);
      formDataToSend.append("nationalCode", formData.nationalCode);
      formDataToSend.append("userName", formData.userName);
      formDataToSend.append("roles", JSON.stringify(formData.roles));
      formDataToSend.append("facultyId", formData.facultyId);
      formDataToSend.append("departmentId", formData.departmentId);
      formDataToSend.append("phoneNumber", formData.phoneNumber);
      
      if (formData.password) formDataToSend.append("password", formData.password);
      if (formData.signatureFile) formDataToSend.append("signature", formData.signatureFile);

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      };

      if (editingUser) {
        await axios.put(`${serverAddress}/users/${editingUser.id}`, formDataToSend, config);
        setSuccess("کاربر با موفقیت ویرایش شد");
      } else {
        await axios.post(`${serverAddress}/users`, formDataToSend, config);
        setSuccess("کاربر جدید با موفقیت افزوده شد");
      }

      setShowAddForm(false);
      setEditingUser(null);
      setSignaturePreview(null);
      fetchUsers(currentPage, searchQuery);
    } catch (err) {
      setError(err.response?.data?.message || "پر کردن تمامی فیلدها الزامی است");
  //       // اگر خطا مربوط به تکراری بودن نقش مدیریتی است
  // if (err.response?.data?.conflict) {
  //   const { roleName, user } = err.response.data.conflict;
  //   setError(`❌ نقش "${roleName}" قبلاً به کاربر "${user.firstName} ${user.lastName}" (کد ملی: ${user.nationalCode}) اختصاص دارد. 
  //              برای اختصاص این نقش به کاربر جدید، ابتدا باید نقش مذکور از کاربر قبلی حذف شود.`);
  // } else {
  //   setError(errorMessage);
  // }

   if (err.response?.data?.conflict) {
    const { roleName, type, facultyName, user } = err.response.data.conflict;
    
    if (type === 'faculty') {
      setError(`❌ نقش "${roleName}" برای دانشکده "${facultyName}" قبلاً به کاربر "${user.firstName} ${user.lastName}" (کد ملی: ${user.nationalCode}) اختصاص دارد. 
                 برای اختصاص این نقش به کاربر جدید، ابتدا باید نقش مذکور از کاربر قبلی حذف شود.`);
    } else {
      setError(`❌ نقش "${roleName}" قبلاً به کاربر "${user.firstName} ${user.lastName}" (کد ملی: ${user.nationalCode}) اختصاص دارد. 
                 برای اختصاص این نقش به کاربر جدید، ابتدا باید نقش مذکور از کاربر قبلی حذف شود.`);
    }
  } else {
    setError(errorMessage);
  }
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm("آیا از حذف این کاربر مطمئن هستید؟")) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`${serverAddress}/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccess("کاربر با موفقیت حذف شد");
        fetchUsers(currentPage, searchQuery);
      } catch (err) {
        setError(err.response?.data?.message || "خطا در حذف کاربر");
        console.error(err);
      }
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");

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

      setShowChangePassword(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setSuccess("رمز عبور با موفقیت تغییر یافت");
    } catch (err) {
      setError(err.response?.data?.message || "خطا در تغییر رمز عبور");
      console.error(err);
    }
  };

  const showFacultySelect = formData.roles.some((id) => {
    const role = roles.find((r) => r.id === id);
    return (
      role &&
      ["معاون پژوهشی دانشکده", "کارشناس پژوهشی دانشکده", "مدیر گروه", "کارشناس مالی دانشکده"].includes(
        role.name
      )
    );
  });

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      fetchUsers(currentPage - 1, searchQuery);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      fetchUsers(currentPage + 1, searchQuery);
    }
  };

  if (loading) {
    return (
      <div className={Styles.container}>
        <Loader />
      </div>
    );
  }
  

  const showResearchRoleDates = formData.roles.some((id) => {
  const role = roles.find((r) => r.id === id);

  return (
    role &&
    [
      "معاون پژوهشی دانشکده",
      "مدیر امور پژوهشی",
      "معاون پژوهشی دانشگاه",
      "کارشناس پژوهشی معاونت پژوهشی",
    ].includes(role.name)
  );
});
  return (
    <div className={Styles.container}>
      {isAdmin ? (
        <>
          <div className={Styles.header}>
            <h2>مدیریت کاربران</h2>
            <button
              onClick={() => {
                setEditingUser(null);
                setFormData({
                  firstName: "",
                  lastName: "",
                  nationalCode: "",
                  userName: "",
                  password: "",
                  roles: [],
                  facultyId: null,
                  departmentId: null,
                  phoneNumber: "",
                  signatureFile: null,
                  
                });
                setSignaturePreview(null);
                setShowAddForm(true);
              }}
              className="bigButton success"
            >
              <FaPlus />
              افزودن کاربر جدید
            </button>
          </div>

          {/* <div style={{ marginBottom: "10px" }}>
            <label>جستجو:</label>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="جستجو بر اساس نام، نام خانوادگی، کد ملی یا نام کاربری"
              className={Styles.searchInput}
            />
          </div> */}
          <div style={{ marginBottom: "10px", display: "flex", gap: "15px", alignItems: "center" }}>
  <div style={{ flex: 1 }}>
    <label>جستجو:</label>
    <input
      type="text"
      value={searchQuery}
      onChange={handleSearchChange}
      placeholder="جستجو بر اساس نام، نام خانوادگی، کد ملی یا نام کاربری"
      className={Styles.searchInput}
    />
  </div>

  <div style={{ minWidth: "200px" }}>
    <label>فیلتر بر اساس نقش:</label>
    <select
     
     value={selectedRoleId}
                onChange={handleRoleFilterChange}
                
      className={Styles.departmentSelect} // یا هر کلاسی که استایل مناسبی داره
      style={{ width: "100%" }}
    >
      <option value="">همه نقش‌ها</option>
      {roles.map((role) => (
        <option key={role.id} value={role.id}>
          {role.name}
        </option>
      ))}
    </select>
  </div>
</div>

          {showAddForm && (
            <div className={Styles.formContainer}>
              <h3>{editingUser ? "ویرایش کاربر" : "افزودن کاربر جدید"}</h3>
              <form onSubmit={handleSubmit}>
                <div className={Styles.formRow}>
                  <div className={Styles.formGroup}>
                    <label>نام:</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className={Styles.formGroup}>
                    <label>نام خانوادگی:</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className={Styles.formGroup}>
                    <label>کد ملی:</label>
                    <input
                      type="text"
                      name="nationalCode"
                      value={formData.nationalCode}
                      onChange={handleInputChange}
                      onKeyDown={handleNationalCodeKeyDown}
                      required
                    />
                  </div>

                  <div className={Styles.formGroup}>
                    <label>نام کاربری:</label>
                    <input
                      type="text"
                      name="userName"
                      value={formData.userName}
                      onChange={handleInputChange}
                      onFocus={handleCopyNationalCode}
                      required
                    />
                  </div>

                  <div className={Styles.formGroup}>
                    <label>شماره همراه:</label>
                    <input
                      type="text"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      required

                    />
                  </div>

                  <div className={Styles.formGroup}>
                    <label>رمز عبور:</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required={!editingUser}
                      placeholder={
                        editingUser ? "در صورت عدم تغییر خالی بگذارید" : ""
                      }
                    />
                  </div>

                  <div className={Styles.formGroup}>
                    <label htmlFor="signature">تصویر امضا:</label>
                    <div className={Styles.fileInputContainer}>
                      <label htmlFor="signature" className={Styles.fileInputLabel}>
                        <FaFileImage /> انتخاب فایل
                        <input
                          type="file"
                          id="signature"
                          name="signature"
                          onChange={handleSignatureChange}
                          accept="image/*"
                        />
                      </label>
                      {signaturePreview && (
                        <img
                          src={signaturePreview}
                          alt="پیش‌نمایش امضا"
                          style={{
                            maxWidth: "150px",
                            marginTop: "10px",
                            borderRadius: "8px",
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className={Styles.formRow}>
                  <label>نقش‌ها:</label>
                  <div className={Styles.rolesContainer}>
                    {roles.map((role) => (
                      <div key={role.id} className={Styles.roleItem}>
                        <input
                          type="checkbox"
                          id={`role-${role.id}`}
                          checked={formData.roles.includes(role.id)}
                          onChange={() => handleRoleChange(role.id)}
                        />
                        <label htmlFor={`role-${role.id}`}>{role.name}</label>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex" }}>
                  {showFacultySelect && (
                    <div className={Styles.formGroup}>
                      <label>دانشکده:</label>
                      <select
                        name="facultyId"
                        value={formData.facultyId || ""}
                        onChange={handleFacultyChange}
                        required
                        className={Styles.facultySelect}
                      >
                        <option value="">انتخاب دانشکده</option>
                        {faculties.map((faculty) => (
                          <option
                            key={faculty.FacultyID}
                            value={faculty.FacultyID}
                          >
                            {faculty.FacultyName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.roles.some((id) => {
                    const role = roles.find((r) => r.id === id);
                    return role && role.name === "مدیر گروه";
                  }) && (
                      <div className={Styles.formGroup}>
                        <label>گروه:</label>
                        <select
                          name="departmentId"
                          value={formData.departmentId || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              departmentId: e.target.value
                                ? parseInt(e.target.value)
                                : null,
                            }))
                          }
                          required
                          className={Styles.departmentSelect}
                        >
                          <option value="">انتخاب گروه</option>
                          {departments.map((department) => (
                            <option
                              key={department.DepartmentID}
                              value={department.DepartmentID}
                            >
                              {department.DepartmentName}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                </div>
                {/* {showResearchRoleDates && (
  <div className={Styles.formRow}>
    <div className={Styles.formGroup}>
      <label>تاریخ شروع نقش</label> <span style={{ color: "red" }}>*</span>

      <DatePicker
        calendar={persian}
        value={formData.roleStartDate}
        format="YYYY/MM/DD"
        onChange={(date) =>
          setFormData((prev) => ({
            ...prev,
            roleStartDate: date?.format?.("YYYY/MM/DD") || "",
          }))
        }
      />
    </div>

    <div className={Styles.formGroup}>
      <label>تاریخ پایان نقش</label>

      <DatePicker
        calendar={persian}
        value={formData.roleEndDate}
        format="YYYY/MM/DD"
        onChange={(date) =>
          setFormData((prev) => ({
            ...prev,
            roleEndDate: date?.format?.("YYYY/MM/DD") || "",
          }))
        }
      />
    </div>
  </div>
)} */}
                <div className={Styles.formActions}>
                  <button
                    type="submit"
                    className="miniButton success"
                    title="ذخیره"
                  >
                    <MdSave />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setSignaturePreview(null);
                    }}
                    className="miniButton error"
                    title="انصراف"
                  >
                    <AiOutlineCloseCircle />
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className={Styles.usersTable}>
            <table>
              <thead>
                <tr>
                  <th>نام</th>
                  <th>نام خانوادگی</th>
                  <th>کد ملی</th>
                  <th>نام کاربری</th>
                  <th>نقش‌ها</th>
                  <th>دانشکده</th>
                  <th>گروه</th>
                  <th>تصویر امضا</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.firstName}</td>
                    <td>{user.lastName}</td>
                    <td>{user.nationalCode}</td>
                    <td>{user.userName}</td>
                    <td>{user.roles}</td>
                    <td>{user.FacultyName || "-"}</td>
                    <td>{user.DepartmentName || "-"}</td>
                    <td>
                      {user.SignaturePath ? (
                        <img
                          src={`${serverAddress}${user.SignaturePath}`}
                          alt="امضا"
                          style={{ maxWidth: "50px" }}
                        />
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => handleEditUser(user)}
                        className="miniButton warning"
                        title="ویرایش"
                      >
                        <MdEdit />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
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
          <h2>تغییر رمز عبور</h2>
          <p>
            شما دسترسی به مدیریت کاربران ندارید، فقط می‌توانید رمز عبور خود را
            تغییر دهید.
          </p>

          <button
            onClick={() => setShowChangePassword(true)}
            className={Styles.changePasswordButton}
          >
            تغییر رمز عبور
          </button>

          {showChangePassword && (
            <div className={Styles.passwordForm}>
              <form onSubmit={handleChangePassword}>
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
                  <button type="submit">تغییر رمز</button>
                  <button
                    type="button"
                    onClick={() => setShowChangePassword(false)}
                    className={Styles.cancelButton}
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default UserManagement;