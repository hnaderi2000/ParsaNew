import { useState, useEffect } from "react";
import axios from "axios";
import Styles from "./SearchSelects.module.css";
import serverAddress from "./constants/contants";
import { useAuth } from "./AuthContext";

function SearchSelects({ onStatusChange, onFacultyChange, onDepartmentChange, selectedRole }) {
  const { userFacultyId, userDepartmentId  } = useAuth();

  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [select, setSelect] = useState({
    faculty: "",
    department: "",
    status: "",
  });

  // نقش‌ها
  const isAdmin = ["مدیر سیستم", "معاون پژوهشی دانشگاه", "مدیر امور پژوهشی", "کارشناس پژوهشی معاونت پژوهشی"].includes(selectedRole);
  const isFacultyUser = ["کارشناس پژوهشی دانشکده", "معاون پژوهشی دانشکده","کارشناس مالی دانشکده"].includes(selectedRole);
  const isDepartmentManager = selectedRole == "مدیر گروه";

  // هماهنگ کردن selectها با فیلترهای AuthContext
const { facultyFilter, departmentFilter } = useAuth();

useEffect(() => {

  setSelect({
    faculty: facultyFilter || "",
    department: departmentFilter || "",
    status: ""
  });
  onFacultyChange(facultyFilter);
  onDepartmentChange(departmentFilter);
  if (facultyFilter) {
    fetchDepartments(facultyFilter);
  }
}, [selectedRole, facultyFilter, departmentFilter]);


useEffect(() => {
    if (["معاون پژوهشی دانشکده", "کارشناس پژوهشی دانشکده", "کارشناس مالی دانشکده" ].includes(selectedRole)) {
      setSelect((p) => ({ ...p, status: "null" }));
      onStatusChange("null");
    } else {
      setSelect((p) => ({ ...p, status: "" }));
      onStatusChange(null);
    }
  }, [selectedRole]);
  // دریافت دانشکده‌ها
  useEffect(() => {
    const fetchFaculties = async () => {
      try {
        const token = localStorage.getItem("token");
        const { data } = await axios.get(`${serverAddress}/faculties`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        let filtered = data;

        if (!isAdmin && userFacultyId) {
          filtered = data.filter((f) => f.FacultyID == userFacultyId);
        }

        setFaculties(filtered);

        // انتخاب پیش‌فرض اگر فقط یک دانشکده موجود باشد
        if (filtered.length == 1 && !isAdmin) {
          const facultyId = filtered[0].FacultyID;
          setSelect((p) => ({ ...p, faculty: facultyId }));
          onFacultyChange(facultyId);
          fetchDepartments(facultyId);
        }
      } catch (err) {
        console.error("Error fetching faculties:", err);
      }
    };
    fetchFaculties();
  }, [selectedRole, userFacultyId]);

  // دریافت گروه‌ها
  const fetchDepartments = async (facultyId) => {
    if (!facultyId) return;
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.get(
        `${serverAddress}/departments/faculty/${facultyId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      let filtered = data;
      if (isDepartmentManager) {
        filtered = data.filter((d) => d.DepartmentID == userDepartmentId);
      }
      setDepartments(filtered);

      // انتخاب پیش‌فرض گروه
      if (filtered.length === 1 || isDepartmentManager) {
        const defaultDept = isDepartmentManager
          ? userDepartmentId
          : filtered[0].DepartmentID;
        setSelect((p) => ({ ...p, department: defaultDept }));
        onDepartmentChange(defaultDept);
      }
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  };

  // تغییر دانشکده
  const handleFacultyChange = (e) => {
    const facultyId = e.target.value;
    setSelect({ ...select, faculty: facultyId, department: "" });
    onFacultyChange(facultyId);
    fetchDepartments(facultyId);
  };

  // تغییر گروه
  const handleDepartmentChange = (e) => {
    const departmentId = e.target.value;
    setSelect({ ...select, department: departmentId });
    onDepartmentChange(departmentId);
  };

  // تغییر وضعیت
  const handleStatusChange = (e) => {
    const value = e.target.value;
    setSelect({ ...select, status: value });
    onStatusChange(value || null);
  };

  return (
    <div className={Styles.searchContainer}>
      {/* انتخاب دانشکده */}
      <select
        className={Styles.searchSelect}
        value={select.faculty || ""}
        onChange={handleFacultyChange}
      >
        <option value="" disabled hidden>
          انتخاب دانشکده
        </option>
        {isAdmin && <option value="">همه دانشکده‌ها</option>}
        {faculties.map((f) => (
          <option key={f.FacultyID} value={f.FacultyID}>
            {f.FacultyName}
          </option>
        ))}
      </select>

      {/* انتخاب گروه */}
      <select
        className={Styles.searchSelect}
        value={select.department || ""}
        onChange={handleDepartmentChange}
        disabled={!select.faculty}
      >
        <option value="" disabled hidden>
          انتخاب گروه
        </option>
        {isAdmin && <option value="">همه گروه‌ها</option>}
        {departments.map((d) => (
          <option key={d.DepartmentID} value={d.DepartmentID}>
            {d.DepartmentName}
          </option>
        ))}
      </select>

      {/* انتخاب وضعیت */}
      <select
        className={Styles.searchSelect}
        value={select.status || ""}
        onChange={handleStatusChange}
      >
        <option value="" disabled >
          جستجو بر اساس وضعیت تایید یا پذیرش
        </option>
        <option value="">همه</option>
        <option value="1">تأیید شده</option>
        <option value="0">رد شده</option>
        <option value="null">نامشخص</option>
      </select>
    </div>
  );
}

export default SearchSelects;
