import React, { useState, useEffect } from "react";
import Styles from "./Departments.module.css";
import axios from "axios";
import { useNotification } from "../src/contexts/NotificationContext";

//importing icons
import { MdEdit, MdSave } from "react-icons/md";
import { FaTrashAlt } from "react-icons/fa";
import { AiOutlineCloseCircle } from "react-icons/ai";
import { FaPlus } from "react-icons/fa6";
import serverAddress from "./constants/contants";

const Departments = () => {
  const [faculties, setFaculties] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [departments, setDepartments] = useState([]);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [editDepartmentName, setEditDepartmentName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { addNotification } = useNotification();

  const token = localStorage.getItem("token");

  // دریافت دانشکده‌ها
  useEffect(() => {
    const fetchFaculties = async () => {
      try {
        const response = await axios.get(`${serverAddress}/faculties`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFaculties(response.data);
      } catch (err) {
        setError("خطا در بارگذاری دانشکده‌ها");
      }
    };
    fetchFaculties();
  }, []);

  // دریافت گروه‌ها وقتی دانشکده انتخاب می‌شود
  useEffect(() => {
    if (selectedFaculty) {
      const fetchDepartments = async () => {
        try {
          const response = await axios.get(
            `${serverAddress}/departments/faculty/${selectedFaculty}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          setDepartments(response.data);
        } catch (err) {
          setError("خطا در بارگذاری گروه‌ها");
        }
      };
      fetchDepartments();
    }
  }, [selectedFaculty]);

  //نمایش نوتیف موفقیت یا خطا
  useEffect(() => {
    const timer = setTimeout(() => {
      if (error) setError("");
      if (success) setSuccess("");
    }, 0);

    if (success) {
      addNotification({ type: "success", text: success });
    } else if (error) {
      addNotification({ type: "error", text: error });
    }
    return () => clearTimeout(timer);
  }, [success, error, addNotification]);

  // افزودن گروه جدید
  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDepartmentName) {
      setError("نام گروه الزامی است");
      return;
    }
    try {
      await axios.post(
        `${serverAddress}/departments`,
        {
          departmentName: newDepartmentName,
          facultyId: selectedFaculty,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSuccess("گروه با موفقیت اضافه شد");
      setNewDepartmentName("");
      const response = await axios.get(
        `${serverAddress}/departments/faculty/${selectedFaculty}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setDepartments(response.data);
      setError("");
    } catch (err) {
      setError("خطا در افزودن گروه");
    }
  };

  // شروع ویرایش
  const handleEditDepartment = (department) => {
    setEditingDepartment(department.DepartmentID);
    setEditDepartmentName(department.DepartmentName);
  };

  // ذخیره ویرایش
  const handleSaveEdit = async (departmentId) => {
    if (!editDepartmentName) {
      setError("نام گروه الزامی است");
      return;
    }
    try {
      await axios.put(
        `${serverAddress}/departments/${departmentId}`,
        {
          departmentName: editDepartmentName,
          facultyId: selectedFaculty,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSuccess("گروه با موفقیت ویرایش شد");
      setEditingDepartment(null);
      const response = await axios.get(
        `${serverAddress}/departments/faculty/${selectedFaculty}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setDepartments(response.data);
      setError("");
    } catch (err) {
      setError("خطا در ویرایش گروه");
    }
  };

  // حذف گروه
  const handleDeleteDepartment = async (departmentId) => {
    if (window.confirm("آیا مطمئن هستید که می‌خواهید این گروه را حذف کنید؟")) {
      try {
        await axios.delete(
          `${serverAddress}/departments/${departmentId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setSuccess("گروه با موفقیت حذف شد");
        const response = await axios.get(
          `${serverAddress}/departments/faculty/${selectedFaculty}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setDepartments(response.data);
        setError("");
      } catch (err) {
        setError("خطا در حذف گروه");
      }
    }
  };

  return (
    <div className={Styles.container}>
      <h2 className={Styles.title}>مدیریت گروه‌های آموزشی</h2>
      <section className={Styles.section}>
        <div className={Styles.rowLayout}>
          <select
            className={Styles.select}
            value={selectedFaculty}
            onChange={(e) => setSelectedFaculty(e.target.value)}
          >
            <option value="">انتخاب دانشکده</option>
            {faculties.map((faculty) => (
              <option key={faculty.FacultyID} value={faculty.FacultyID}>
                {faculty.FacultyName}
              </option>
            ))}
          </select>

          {selectedFaculty && (
            <form onSubmit={handleAddDepartment} className={Styles.form}>
              <input
                type="text"
                placeholder="نام گروه جدید"
                value={newDepartmentName}
                onChange={(e) => setNewDepartmentName(e.target.value)}
                className={Styles.input}
              />
              <button type="submit" className="bigButton success">
                <FaPlus />
                افزودن گروه
              </button>
            </form>
          )}
        </div>
      </section>

      {selectedFaculty && (
        <div>
          <h3 className={Styles.subtitle}>لیست گروه‌ها</h3>
          {departments.length === 0 ? (
            <p>هیچ گروهی برای این دانشکده ثبت نشده است</p>
          ) : (
            <ul className={Styles.list}>
              {departments.map((department) => (
                <li key={department.DepartmentID}>
                  {editingDepartment === department.DepartmentID ? (
                    <div>
                      <input
                        type="text"
                        value={editDepartmentName}
                        onChange={(e) => setEditDepartmentName(e.target.value)}
                        className={Styles.input}
                      />
                      <button
                        onClick={() => handleSaveEdit(department.DepartmentID)}
                        className="success miniButton"
                        title="ذخیره"
                      >
                        <MdSave />
                        {/* ذخیره */}
                      </button>
                      <button
                        onClick={() => setEditingDepartment(null)}
                        className="error miniButton"
                        title="لغو"
                      >
                        <AiOutlineCloseCircle />
                        {/* لغو */}
                      </button>
                    </div>
                  ) : (
                    <>
                      <span>{department.DepartmentName}</span>
                      <div className={Styles.buttons}>
                        <button
                          onClick={() => handleEditDepartment(department)}
                          className="warning miniButton"
                          title="ویرایش"
                        >
                          <MdEdit />
                          {/* ویرایش */}
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteDepartment(department.DepartmentID)
                          }
                          className="error miniButton"
                          title="حذف"
                          disabled
                        >
                          <FaTrashAlt />
                          {/* حذف */}
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default Departments;
