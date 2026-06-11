import { useEffect, useState } from "react";
import Styles from "./SystemVariables.module.css";

import {
  saveSystemVariables,
  getSystemVariablesByYear,
  getAllSystemVariables,
  deleteSystemVariables,
} from "./services/systemVariablesService";
import { useNotification } from "./contexts/NotificationContext";

//importing icons
import { MdEdit, MdSave } from "react-icons/md";
import { AiOutlineCloseCircle } from "react-icons/ai";
import { FaTrashAlt } from "react-icons/fa";
import serverAddress from "./constants/contants";
import { FaPlus } from "react-icons/fa6";

function SystemVariables() {
  const [allVariables, setAllVariables] = useState([]);
  const [newVariable, setNewVariable] = useState({
    Year: "",
    AssistantProfessorBaseSalary: "",
    TheoreticalThesisPercentage: "",
    FieldThesisPercentage: "",
    ExperimentalThesisPercentage: "",
    TheoreticalDissertationPercentage: "",
    FieldDissertationPercentage: "",
    ExperimentalDissertationPercentage: "",
  });
  const [editingYear, setEditingYear] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [errors, setErrors] = useState({ Year: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [warning, setWarning] = useState("");

  const years = Array.from({ length: 48 }, (_, i) => 1403 + i);

  const { addNotification } = useNotification();

  //نمایش نوتیف موفقیت یا خطا
  useEffect(() => {
    const timer = setTimeout(() => {
      if (error) setError("");
      else if (success) setSuccess("");
      else if (warning) setWarning("");
    }, 0);

    if (error) addNotification({ type: "error", text: error });
    else if (success) addNotification({ type: "success", text: success });
    else if (warning) addNotification({ type: "warning", text: warning });

    return () => clearTimeout(timer);
  }, [errors, error, success, warning, addNotification]);

  useEffect(() => {
    fetchAllVariables();
  }, []);

  const fetchAllVariables = async () => {
    try {
      const response = await fetch(`${serverAddress}/systemvariables`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      setAllVariables(data);
    } catch (error) {
      setError(error.message);
      // console.error("Error fetching variables:", error);
      // alert("خطا در دریافت لیست ضریبها: " + error.message);
    }
  };

  const formatSalary = (value) => {
    if (!value) return "";
    const num = value.toString().replace(/\D/g, "");
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const parseSalary = (formattedValue) => {
    if (!formattedValue) return "0";
    const value =
      typeof formattedValue === "number"
        ? formattedValue.toString()
        : formattedValue;
    return value.replace(/,/g, "");
  };

  const handleChange = (e, Year) => {
    const { name, value } = e.target;

    setAllVariables((prev) =>
      prev.map((item) =>
        item.Year === Year
          ? {
              ...item,
              [name]:
                name === "AssistantProfessorBaseSalary"
                  ? formatSalary(value)
                  : value,
            }
          : item
      )
    );
  };

  const handleNewItemChange = (e) => {
    const { name, value } = e.target;

    setNewVariable((prev) => ({
      ...prev,
      [name]:
        name === "AssistantProfessorBaseSalary" ? formatSalary(value) : value,
    }));
  };

  const handleSave = async (Year) => {
    try {
      const itemToSave = allVariables.find((item) => item.Year === Year);

      if (!itemToSave) {
        setError("آیتمی برای ذخیره یافت نشد");
        // alert("آیتمی برای ذخیره یافت نشد");
        return;
      }

      // اطمینان از اینکه همه مقادیر به درستی پارس شده‌اند
      const variablesToSend = {
        Year: itemToSave.Year,
        AssistantProfessorBaseSalary:
          parseSalary(itemToSave.AssistantProfessorBaseSalary) || 0,
        TheoreticalThesisPercentage:
          itemToSave.TheoreticalThesisPercentage || 0,
        FieldThesisPercentage: itemToSave.FieldThesisPercentage || 0,
        ExperimentalThesisPercentage:
          itemToSave.ExperimentalThesisPercentage || 0,
        TheoreticalDissertationPercentage:
          itemToSave.TheoreticalDissertationPercentage || 0,
        FieldDissertationPercentage:
          itemToSave.FieldDissertationPercentage || 0,
        ExperimentalDissertationPercentage:
          itemToSave.ExperimentalDissertationPercentage || 0,
      };

      await saveSystemVariables(variablesToSend);
      setSuccess("ضریبهای سیستم با موفقیت ذخیره شدند");
     
      setEditingYear(null);
      fetchAllVariables();
    } catch (error) {
      setError(error.message);
      // console.error("Error:", error);
      // alert("خطا در ذخیره ضریبها: " + error.message);
    }
  };

  const handleSaveNewItem = async () => {
    try {
      if (!newVariable.Year) {
        setErrors({ Year: "لطفاً سال را انتخاب کنید" });
        return;
      }

      // بررسی وجود سال در سرور
      const existing = await getSystemVariablesByYear(newVariable.Year);
      if (existing) {
        setWarning("برای این سال قبلاً اطلاعات ثبت شده است");
        // alert("برای این سال قبلاً اطلاعات ثبت شده است");
        return;
      }

      if (allVariables.some((item) => item.Year === newVariable.Year)) {
        setWarning("برای این سال قبلاً اطلاعات ثبت شده است");
        // alert("برای این سال قبلاً اطلاعات ثبت شده است");
        return;
      }

      const variablesToSend = {
        ...newVariable,
        AssistantProfessorBaseSalary: parseSalary(
          newVariable.AssistantProfessorBaseSalary
        ),
      };

      await saveSystemVariables(variablesToSend);
      setSuccess("ضرایب سیستم با موفقیت ذخیره شدند");
      setIsAddingNew(false);
      setNewVariable({
        Year: "",
        AssistantProfessorBaseSalary: "",
        TheoreticalThesisPercentage: "",
        FieldThesisPercentage: "",
        ExperimentalThesisPercentage: "",
        TheoreticalDissertationPercentage: "",
        FieldDissertationPercentage: "",
        ExperimentalDissertationPercentage: "",
      });
      fetchAllVariables();
    } catch (error) {
      setError(error.message);
      // console.error("Error:", error);
      // alert("خطا در ذخیره ضریبها: " + error.message);
    }
  };

  const handleDelete = async (Year) => {
    if (window.confirm(`آیا از حذف ضرایب سال ${Year} مطمئن هستید؟`)) {
      try {
        await deleteSystemVariables(Year);
        setSuccess("ضرایب سیستم با موفقیت حذف شدند");
        // alert("ضریبهای سیستم با موفقیت حذف شدند");
        fetchAllVariables();
      } catch (error) {
        setError(error.message);
        // console.error("Error:", error);
        // alert("خطا در حذف ضریبها: " + error.message);
      }
    }
  };

  const handleActivate = async (Year) => {
    if (!window.confirm(`آیا از فعال‌سازی ضرایب سال ${Year} مطمئن هستید؟`)) {
      return;
    }

    try {
      const response = await fetch(
        `${serverAddress}/systemvariables/activate/${Year}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("خطا در فعال‌سازی");
      }

      setSuccess(`ضرایب سال ${Year} با موفقیت فعال شدند`);
      // alert(`ضریبهای سال ${Year} با موفقیت فعال شدند`);
      fetchAllVariables(); // برای بروزرسانی لیست
    } catch (error) {
      setError(error.message);
      // console.error("Error activating variable:", error);
      // alert("خطا در فعال‌سازی: " + error.message);
    }
  };
  const activateSystemVariable = async (year) => {
    const response = await fetch(
      `${serverAddress}/SystemVariables/activate/${year}`,
      {
        method: "POST",
      }
    );
    if (!response.ok) {
      throw new Error("خطا در فعال‌سازی");
    }
    return await response.json();
  };
  return (
    <div className={Styles.container}>
      <div className={Styles.header}>
        <h2>مدیریت ضرایب سیستم</h2>
        <button
          onClick={() => setIsAddingNew(true)}
          className="bigButton success"
          disabled={isAddingNew || editingYear}
        >
          <FaPlus />
          افزودن ضریب جدید
        </button>
      </div>

      {isAddingNew && (
        <div className={Styles.newItemForm}>
          <h3>افزودن ضریب جدید</h3>
          <div className={Styles.formRow}>
            <div className={Styles.formGroup}>
              <label>سال:</label>
              <select
                name="Year"
                value={newVariable.Year}
                onChange={handleNewItemChange}
                required
                className={Styles.inputField}
              >
                <option value="">انتخاب سال</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              {errors.Year && (
                <span className={Styles.error}>{errors.Year}</span>
              )}
            </div>

            <div className={Styles.formGroup}>
              <label>حقوق پایه استادیار:</label>
              <input
                type="text"
                name="AssistantProfessorBaseSalary"
                value={newVariable.AssistantProfessorBaseSalary}
                onChange={handleNewItemChange}
                required
                className={Styles.inputField}
              />
            </div>
          </div>

          <div className={Styles.formRow}>
            <div className={Styles.formGroup}>
              <label>پایان‌نامه نظری (%):</label>
              <input
                type="number"
                name="TheoreticalThesisPercentage"
                value={newVariable.TheoreticalThesisPercentage}
                onChange={handleNewItemChange}
                required
                min="0"
                max="100"
                className={Styles.inputField}
              />
            </div>

            <div className={Styles.formGroup}>
              <label>پایان‌نامه میدانی (%):</label>
              <input
                type="number"
                name="FieldThesisPercentage"
                value={newVariable.FieldThesisPercentage}
                onChange={handleNewItemChange}
                required
                min="0"
                max="100"
                className={Styles.inputField}
              />
            </div>
            <div className={Styles.formGroup}>
              <label>پایان‌نامه تجربی (%):</label>
              <input
                type="number"
                name="ExperimentalThesisPercentage"
                value={newVariable.ExperimentalThesisPercentage}
                onChange={handleNewItemChange}
                required
                min="0"
                max="100"
                className={Styles.inputField}
              />
            </div>
          </div>

          <div className={Styles.formRow}>
            <div className={Styles.formGroup}>
              <label>رساله نظری (%):</label>
              <input
                type="number"
                name="TheoreticalDissertationPercentage"
                value={newVariable.TheoreticalDissertationPercentage}
                onChange={handleNewItemChange}
                required
                min="0"
                max="100"
                className={Styles.inputField}
              />
            </div>
            <div className={Styles.formGroup}>
              <label>رساله میدانی (%):</label>
              <input
                type="number"
                name="FieldDissertationPercentage"
                value={newVariable.FieldDissertationPercentage}
                onChange={handleNewItemChange}
                required
                min="0"
                max="100"
                className={Styles.inputField}
              />
            </div>

            <div className={Styles.formGroup}>
              <label>رساله تجربی (%):</label>
              <input
                type="number"
                name="ExperimentalDissertationPercentage"
                value={newVariable.ExperimentalDissertationPercentage}
                onChange={handleNewItemChange}
                required
                min="0"
                max="100"
                className={Styles.inputField}
              />
            </div>
          </div>
          <div className={Styles.formActions}>
            <button
              type="button"
              className="miniButton error"
              onClick={() => setIsAddingNew(false)}
              title="انصراف"
            >
              <AiOutlineCloseCircle />
              {/* انصراف */}
            </button>
            <button
              type="button"
              className="miniButton success"
              onClick={handleSaveNewItem}
              disabled={!newVariable.Year}
              title="ذخیره"
            >
              <MdSave />
              {/* ذخیره */}
            </button>
          </div>
        </div>
      )}

      {!isAddingNew && (
        <div className={Styles.tableContainer}>
          <table className={Styles.variablesTable}>
            <thead>
              <tr>
                <th>سال</th>
                <th>حقوق پایه استادیار</th>
                <th>پایان‌نامه نظری (%)</th>
                <th>پایان‌نامه میدانی (%)</th>
                <th>پایان‌نامه تجربی (%)</th>
                <th>رساله نظری (%)</th>
                <th>رساله میدانی (%)</th>
                <th>رساله تجربی (%)</th>
                {/* <th>وضعیت</th> */}
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {allVariables.length > 0 ? (
                allVariables.map((item) => (
                  <tr
                    key={item.Year}
                    className={item.IsActive ? Styles.activeRow : ""}
                  >
                    <td>
                      {editingYear === item.Year ? (
                        <select
                          name="Year"
                          value={item.Year}
                          onChange={(e) => handleChange(e, item.Year)}
                          className={Styles.editableInput}
                          disabled
                        >
                          <option value={item.Year}>{item.Year}</option>
                        </select>
                      ) : (
                        item.Year
                      )}
                    </td>
                    <td>
                      {editingYear === item.Year ? (
                        <input
                          type="text"
                          name="AssistantProfessorBaseSalary"
                          value={item.AssistantProfessorBaseSalary}
                          onChange={(e) => handleChange(e, item.Year)}
                          className={Styles.editableInput}
                        />
                      ) : (
                        formatSalary(item.AssistantProfessorBaseSalary)
                      )}
                    </td>
                    <td>
                      {editingYear === item.Year ? (
                        <input
                          type="number"
                          name="TheoreticalThesisPercentage"
                          value={item.TheoreticalThesisPercentage}
                          onChange={(e) => handleChange(e, item.Year)}
                          min="0"
                          max="100"
                          className={Styles.editableInput}
                        />
                      ) : (
                        item.TheoreticalThesisPercentage
                      )}
                    </td>
                    <td>
                      {editingYear === item.Year ? (
                        <input
                          type="number"
                          name="FieldThesisPercentage"
                          value={item.FieldThesisPercentage}
                          onChange={(e) => handleChange(e, item.Year)}
                          min="0"
                          max="100"
                          className={Styles.editableInput}
                        />
                      ) : (
                        item.FieldThesisPercentage
                      )}
                    </td>
                    <td>
                      {editingYear === item.Year ? (
                        <input
                          type="number"
                          name="ExperimentalThesisPercentage"
                          value={item.ExperimentalThesisPercentage}
                          onChange={(e) => handleChange(e, item.Year)}
                          min="0"
                          max="100"
                          className={Styles.editableInput}
                        />
                      ) : (
                        item.ExperimentalThesisPercentage
                      )}
                    </td>
                    <td>
                      {editingYear === item.Year ? (
                        <input
                          type="number"
                          name="TheoreticalDissertationPercentage"
                          value={item.TheoreticalDissertationPercentage}
                          onChange={(e) => handleChange(e, item.Year)}
                          min="0"
                          max="100"
                          className={Styles.editableInput}
                        />
                      ) : (
                        item.TheoreticalDissertationPercentage
                      )}
                    </td>
                    <td>
                      {editingYear === item.Year ? (
                        <input
                          type="number"
                          name="FieldDissertationPercentage"
                          value={item.FieldDissertationPercentage}
                          onChange={(e) => handleChange(e, item.Year)}
                          min="0"
                          max="100"
                          className={Styles.editableInput}
                        />
                      ) : (
                        item.FieldDissertationPercentage
                      )}
                    </td>
                    <td>
                      {editingYear === item.Year ? (
                        <input
                          type="number"
                          name="ExperimentalDissertationPercentage"
                          value={item.ExperimentalDissertationPercentage}
                          onChange={(e) => handleChange(e, item.Year)}
                          min="0"
                          max="100"
                          className={Styles.editableInput}
                        />
                      ) : (
                        item.ExperimentalDissertationPercentage
                      )}
                    </td>
                    {/* <td>{item.IsActive ? "فعال" : "غیرفعال"}</td> */}
                    <td>
                      {editingYear === item.Year ? (
                        <div className={Styles.actionButtons}>
                          <button
                            onClick={() => handleSave(item.Year)}
                            className="miniButton success"
                            title="ذخیره"
                          >
                            <MdSave />
                            {/* ذخیره */}
                          </button>
                          <button
                            onClick={() => setEditingYear(null)}
                            className="miniButton error"
                            title="انصراف"
                          >
                            <AiOutlineCloseCircle />
                            {/* انصراف */}
                          </button>
                        </div>
                      ) : (
                        <div className={Styles.actionButtons}>
                          {/* <button
                            onClick={() => handleActivate(item.Year)}
                            className={Styles.activateButton}
                            disabled={
                              item.IsActive || isAddingNew || editingYear
                            }
                            title="فعال‌سازی"
                          >
                            فعال‌سازی
                          </button> */}
                          {/* -------------------------------- */}
                          {/* activation slider */}
                          <label
                            className={`${Styles.activateButton}`}
                          >
                            {/* <input
                              type="checkbox"
                              checked={item.IsActive}
                              onChange={() => handleActivate(item.Year)}
                              disabled={
                                item.IsActive || isAddingNew || editingYear
                              }
                              className={Styles.toggleInput}
                            />
                            <span
                              className={Styles.toggleSlider}
                              title="فعال‌سازی"
                            ></span> */}
                          </label>
                          <button
                            onClick={() => setEditingYear(item.Year)}
                            className="miniButton warning"
                            title="ویرایش"
                            disabled={isAddingNew}
                          >
                            <MdEdit />
                          </button>
                          {/* -------------------------- */}
                          <button
                            onClick={() => handleDelete(item.Year)}
                            className="miniButton error"
                            title="حذف"
                            disabled={isAddingNew || editingYear}
                          >
                            <FaTrashAlt />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className={Styles.noData}>
                    هیچ داده‌ای یافت نشد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default SystemVariables;
