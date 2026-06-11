import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";

import Styles from "./ViewExpense.module.css";
import { useNotification } from "./contexts/NotificationContext";
import Loader from "../src/components/Loader";
import { toPersianNum } from "./helpers/toPersianNum";

import { FaTimes } from "react-icons/fa";
import { FaTrash } from "react-icons/fa";
import { AiOutlineCloseCircle } from "react-icons/ai";
import serverAddress from "./constants/contants";

function ViewExpense({ thesisId, onClose }) {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [factors, setFactors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [thesisInfo, setThesisInfo] = useState(null);

  const [fileModal, setFileModal] = useState({
    isOpen: false,
    fileUrl: null,
    fileType: null,
  });
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    factorId: null,
    factorInfo: null,
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (fileModal.isOpen) {
          closeFileModal();
        } else if (deleteModal.isOpen) {
          closeDeleteModal();
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [fileModal.isOpen, deleteModal.isOpen, onClose]);

  const openFileModal = (filePath) => {
    const fileUrl = `${serverAddress}${filePath}`;
    const fileType = filePath.toLowerCase().endsWith(".pdf") ? "pdf" : "image";

    setFileModal({
      isOpen: true,
      fileUrl,
      fileType,
    });
  };

  const closeFileModal = () => {
    setFileModal({
      isOpen: false,
      fileUrl: null,
      fileType: null,
    });
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

      setFactors(
        factors.filter((factor) => factor.FactorID != deleteModal.factorId)
      );
      closeDeleteModal();

      addNotification({
        type: "success",
        text: "فاکتور با موفقیت حذف شد",
      });
    } catch (err) {
      addNotification({
        type: "error",
        text: err.response?.data?.message || "خطا در حذف فاکتور",
      });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
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
        setError("خطا در دریافت اطلاعات");
        addNotification({
          type: "error",
          text: "خطا در دریافت اطلاعات",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [thesisId, addNotification]);

  const handleToggleExpert = async (factorId, currentStatus) => {
    try {
      const token = localStorage.getItem("token");
      const newStatus = currentStatus ? 0 : 1;

      await axios.put(
        `${serverAddress}/factors/${factorId}/confirm-expert`,
        { status: newStatus },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setFactors(
        factors.map((factor) =>
          factor.FactorID === factorId
            ? { ...factor, IsConfirmedByExpert: newStatus }
            : factor
        )
      );

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
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setFactors(
        factors.map((factor) =>
          factor.FactorID === factorId
            ? { ...factor, IsConfirmedByDeputy: newStatus }
            : factor
        )
      );

      addNotification({
        type: "success",
        text: `فاکتور ${newStatus ? "تایید" : "رد"} شد توسط معاونت پژوهشی`,
      });
    } catch (err) {
      addNotification({
        type: "error",
        text:
          err.response?.data?.message ||
          "خطا در تغییر وضعیت فاکتور توسط معاونت پژوهشی",
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
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setFactors(
        factors.map((factor) =>
          factor.FactorID === factorId
            ? { ...factor, IsConfirmedByResearchDirector: newStatus }
            : factor
        )
      );

      addNotification({
        type: "success",
        text: `فاکتور ${newStatus ? "تایید" : "رد"} شد توسط مدیر امور پژوهشی`,
      });
    } catch (err) {
      addNotification({
        type: "error",
        text:
          err.response?.data?.message ||
          "خطا در تغییر وضعیت فاکتور توسط مدیر امور پژوهشی",
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
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setFactors(
        factors.map((factor) =>
          factor.FactorID === factorId
            ? { ...factor, IsConfirmedByUniversityDeputy: newStatus }
            : factor
        )
      );

      addNotification({
        type: "success",
        text: `فاکتور ${newStatus ? "تایید" : "رد"} شد توسط معاون پژوهشی دانشگاه`,
      });
    } catch (err) {
      addNotification({
        type: "error",
        text:
          err.response?.data?.message ||
          "خطا در تغییر وضعیت فاکتور توسط معاون پژوهشی دانشگاه",
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

  const handleDeleteFactor = async (factorId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${serverAddress}/factors/${factorId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setFactors(factors.filter((factor) => factor.FactorID !== factorId));

      addNotification({
        type: "success",
        text: "فاکتور با موفقیت حذف شد",
      });
    } catch (err) {
      addNotification({
        type: "error",
        text: err.response?.data?.message || "خطا در حذف فاکتور",
      });
    }
  };

  const isDeputy = user.roles.includes("معاون پژوهشی دانشکده");
  const isExpert = user.roles.includes("کارشناس مالی دانشکده");
  const isResearchDirector = user.roles.includes("مدیر امور پژوهشی");
  const isUniversityDeputy = user.roles.includes("معاون پژوهشی دانشگاه");
  const isResearchExpert = user.roles.includes("کارشناس پژوهشی دانشکده");
  const isSystemManager = user.roles.includes("مدیر سیستم");

  return (
    <div className={Styles.container}>
      <div className={Styles.header}>
        <h2 className={Styles.title}>مشاهده هزینه‌کردهای پایان‌نامه</h2>

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
              عنوان {thesisInfo.ParsaType === "p" ? "پایان نامه" : "رساله"}:
            </span>
            <span>{toPersianNum(thesisInfo.Title)}</span>
          </div>
          <div className={Styles.infoRow}>
            <span className={Styles.infoLabel}> مبلغ مصوب:</span>
            <span>{toPersianNum(thesisInfo.ApprovedAmount)}</span>
          </div>
          <div className={Styles.infoRow}>
            <span className={Styles.infoLabel}> مبلغ باقیمانده:</span>
            <span></span>
          </div>
        </div>
      </div>

      <div className={Styles.factorsList}>
        <h3>فاکتورهای ثبت شده</h3>
        <table className={Styles.factorsTable}>
          <thead>
            <tr>
              <th>نام استاد</th>
              <th>درصد مشارکت</th>
              <th>شماره فاکتور</th>
              <th>تاریخ فاکتور</th>
              <th>مبلغ (ریال)</th>
              <th>توضیحات</th>
              {thesisInfo.LevelName === "PHD" && (
                <>
                  <th>۵۰٪ اول</th>
                  <th>۵۰٪ دوم</th>
                </>
              )}
              <th>وضعیت تایید کارشناس مالی</th>
              {!isSystemManager && !isDeputy && !isResearchDirector && !isUniversityDeputy && !isResearchExpert && (
                <th>تایید کارشناس مالی</th>
              )}
              <th>وضعیت تایید معاون پژوهشی دانشکده</th>
              {!isSystemManager && !isExpert && !isResearchDirector && !isUniversityDeputy && !isResearchExpert && (
                <th>تایید معاون پژوهشی دانشکده</th>
              )}
              <th>وضعیت تایید مدیر امور پژوهشی</th>
              {!isSystemManager && !isDeputy && !isUniversityDeputy && !isExpert && !isResearchExpert && (
                <th>تایید مدیر امور پژوهشی</th>
              )}
              <th>وضعیت تایید معاون پژوهشی دانشگاه</th>
              {!isSystemManager && !isDeputy && !isResearchDirector && !isExpert && !isResearchExpert && (
                <th>تایید معاون پژوهشی دانشگاه</th>
              )}
              {!isResearchDirector && !isUniversityDeputy && <th>حذف</th>}
            </tr>
          </thead>
          <tbody>
            {factors.map((factor) => (
              <tr key={factor.FactorID}>
                <td>{factor.ProfessorName || "-"}</td>
                <td>
                  {factor.ProfessorParticipation
                    ? toPersianNum(factor.ProfessorParticipation) + "%"
                    : "-"}
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
                <td>{toPersianNum(factor.Description || "-")}</td>
                {thesisInfo.LevelName === "PHD" && (
                  <>
                    <td>
                      {factor.ForFirstFiftyPercent ? (
                        <span className={Styles.confirmed}>بله</span>
                      ) : (
                        <span className={Styles.unknownStatus}>---</span>
                      )}
                    </td>
                    <td>
                      {factor.ForSecondFiftyPercent ? (
                        <span className={Styles.confirmed}>بله</span>
                      ) : (
                        <span className={Styles.unknownStatus}>---</span>
                      )}
                    </td>
                  </>
                )}
                <td>
                  {factor.IsConfirmedByExpert === null ? (
                    <span className={Styles.unknownStatus}>نامشخص</span>
                  ) : factor.IsConfirmedByExpert == 1 ? (
                    <span className={Styles.confirmed}>تایید شده</span>
                  ) : (
                    <span className={Styles.rejectedStatus}>رد شده</span>
                  )}
                </td>
                {!isSystemManager && !isDeputy && !isResearchDirector && !isUniversityDeputy && !isResearchExpert && (
                  <td>
                    <label className={Styles.toggleSwitch}>
                      <input
                        type="checkbox"
                        className={Styles.toggleInput}
                        checked={factor.IsConfirmedByExpert == 1}
                        onChange={() =>
                          handleToggleExpert(
                            factor.FactorID,
                            factor.IsConfirmedByExpert == 1
                          )
                        }
                        disabled={
                          !user.roles.includes("معاون پژوهشی دانشکده") &&
                          !user.roles.includes("کارشناس مالی دانشکده")
                        }
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
                {!isSystemManager && !isExpert && !isResearchDirector && !isUniversityDeputy && !isResearchExpert && (
                  <td>
                    <label className={Styles.toggleSwitch}>
                      <input
                        type="checkbox"
                        className={Styles.toggleInput}
                        checked={factor.IsConfirmedByDeputy == 1}
                        onChange={() =>
                          handleToggleDeputy(
                            factor.FactorID,
                            factor.IsConfirmedByDeputy == 1
                          )
                        }
                        disabled={
                          !user.roles.includes("معاون پژوهشی دانشکده") &&
                          !user.roles.includes("کارشناسی مالی دانشکده") &&
                          factor.IsConfirmedByExpert != 1
                        }
                      />
                      <span className={Styles.toggleSlider}></span>
                    </label>
                  </td>
                )}
                <td>
                  {factor.IsConfirmedByResearchDirector === null ? (
                    <span className={Styles.unknownStatus}>نامشخص</span>
                  ) : factor.IsConfirmedByResearchDirector == 1 ? (
                    <span className={Styles.confirmed}>تایید شده</span>
                  ) : (
                    <span className={Styles.rejectedStatus}>رد شده</span>
                  )}
                </td>
                {!isSystemManager && !isDeputy && !isUniversityDeputy && !isExpert && !isResearchExpert && (
                  <td>
                    <label className={Styles.toggleSwitch}>
                      <input
                        type="checkbox"
                        className={Styles.toggleInput}
                        checked={factor.IsConfirmedByResearchDirector == 1}
                        onChange={() =>
                          handleToggleResearchDirector(
                            factor.FactorID,
                            factor.IsConfirmedByResearchDirector == 1
                          )
                        }
                        disabled={
                          !user.roles.includes("مدیر امور پژوهشی") ||
                          factor.IsConfirmedByExpert != 1 ||
                          factor.IsConfirmedByDeputy != 1
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
                {!isSystemManager && !isDeputy && !isResearchDirector && !isExpert && !isResearchExpert && (
                  <td>
                    <label className={Styles.toggleSwitch}>
                      <input
                        type="checkbox"
                        className={Styles.toggleInput}
                        checked={factor.IsConfirmedByUniversityDeputy == 1}
                        onChange={() =>
                          handleToggleUniversityDeputy(
                            factor.FactorID,
                            factor.IsConfirmedByUniversityDeputy == 1
                          )
                        }
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
                {!isResearchDirector && !isUniversityDeputy && (
                  <td>
                    <button
                      onClick={() => openDeleteModal(factor.FactorID, factor)}
                      className="miniButton error"
                      disabled={
                        !user.roles.includes("کارشناس پژوهشی دانشکده") &&
                        !user.roles.includes("کارشناس مالی دانشکده") &&
                        !user.roles.includes("مدیر سیستم") &&
                        !user.roles.includes("معاون پژوهشی دانشکده")
                      }
                      title="حذف"
                    >
                      <FaTrash />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={Styles.actions}>
        <button onClick={onClose} className={Styles.closeButton}>
          بستن
        </button>
      </div>

      {fileModal.isOpen && (
        <div className={Styles.modalOverlay} onClick={closeFileModal}>
          <div
            className={Styles.fileModal}
            onClick={(e) => e.stopPropagation()}
          >
            <button className={Styles.closeButton} onClick={closeFileModal}>
              <FaTimes />
            </button>
            <div className={Styles.modalToolbar}>
              {fileModal.fileType == "pdf" && (
                <button
                  onClick={() => window.open(fileModal.fileUrl, "_blank")}
                  className={Styles.openInBrowserButton}
                >
                  بازکردن در مرورگر
                </button>
              )}
            </div>
            {fileModal.fileType == "pdf" ? (
              <div className={Styles.pdfContainer}>
                <embed
                  src={`${fileModal.fileUrl}#view=FitH`}
                  type="application/pdf"
                  className={Styles.pdfEmbed}
                />
              </div>
            ) : (
              <img
                src={fileModal.fileUrl}
                alt="فاکتور"
                className={Styles.imagePreview}
              />
            )}
          </div>
        </div>
      )}

      {deleteModal.isOpen && (
        <div className={Styles.modalOverlay}>
          <div className={Styles.modal}>
            <h3>حذف فاکتور</h3>
            <p>
              آیا از حذف فاکتور شماره {deleteModal.factorInfo?.FactorNumber} به
              مبلغ {deleteModal.factorInfo?.Amount.toLocaleString()} ریال
              اطمینان دارید؟
            </p>
            <p>این عمل قابل بازگشت نیست。</p>
            <div className={Styles.modalActions}>
              <button
                onClick={closeDeleteModal}
                className={Styles.cancelButton}
              >
                انصراف
              </button>
              <button onClick={confirmDelete} className={Styles.deleteButton}>
                حذف فاکتور
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        className="miniButton error"
        title="بستن پنجره"
        onClick={() => onClose()}
      >
        <AiOutlineCloseCircle />
      </button>
    </div>
  );
}

export default ViewExpense;