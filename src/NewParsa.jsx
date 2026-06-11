

// import { useState, useEffect } from "react";
// import Styles from "./NewParsa.module.css";
// import serverAddress from "./constants/contants";
// import axios from "axios";
// import { useAuth } from "./AuthContext";
// import { useNotification } from "./contexts/NotificationContext";
// import DatePicker from "react-multi-date-picker";
// import persian from "react-date-object/calendars/persian";
// import persian_fa from "react-date-object/locales/persian_fa";
// import DateObject from "react-date-object";

// //importing icons
// import { AiOutlineCloseCircle } from "react-icons/ai";
// import { FaTrashAlt } from "react-icons/fa";
// import { FaCheck } from "react-icons/fa6";
// import { IoSearch } from "react-icons/io5";
// import { AiOutlinePlus } from "react-icons/ai";

// function NewParsa({ onClose, onSuccess }) {
//   const { user } = useAuth();
//   const [formData, setFormData] = useState({
//     studentId: "",
//     title: "",
//     thesisType: "میدانی",
//     levelId: "",
//     professors: [],
//   });
//   const [educationLevels, setEducationLevels] = useState([]);
//   const [students, setStudents] = useState([]);
//   const [professors, setProfessors] = useState([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [showProfessorModal, setShowProfessorModal] = useState(false);
//   const [selectedProfessor, setSelectedProfessor] = useState(null);
//   const [participation, setParticipation] = useState(0);
//   const [studentInfo, setStudentInfo] = useState(null);
//   const [errors, setErrors] = useState({});
//   const [success, setSuccess] = useState("");
//   const [approvedAmount, setApprovedAmount] = useState(0);
//   const [baseSalary, setBaseSalary] = useState(null);
//   const [percentage, setPercentage] = useState(0);
//   const [parsaType, setParsaType] = useState("p"); // مقدار پیش‌فرض 'p' برای پایان‌نامه
//   const [selectedApprovalDate, setSelectedApprovalDate] = useState(null); // تاریخ تصویب
//   const [selectedSystemRegistrationDate, setSelectedSystemRegistrationDate] = useState(
//     new DateObject({ calendar: persian, locale: persian_fa, digits: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] })
//   ); // تاریخ فعلی سیستم با اعداد لاتین

//   const { addNotification } = useNotification();

//   // نمایش نوتیف موفقیت یا خطا
//   useEffect(() => {
//     const timer = setTimeout(() => {
//       if (errors.participation) setErrors({ ...errors, participation: "" });
//       else if (errors.professors) setErrors({ ...errors, professors: "" });
//       else if (errors.studentId) setErrors({ ...errors, studentId: "" });
//       else if (errors.title) setErrors({ ...errors, title: "" });
//       else if (errors.approvalDate) setErrors({ ...errors, approvalDate: "" });
//       else if (errors.systemRegistrationDate) setErrors({ ...errors, systemRegistrationDate: "" });
//       else if (errors.text) setErrors({ ...errors, text: "" });
//       else if (success) setSuccess("");
//     }, 3000); // تغییر به 3 ثانیه برای نمایش طولانی‌تر

//     if (errors.participation)
//       addNotification({ type: "error", text: errors.participation });
//     else if (errors.professors)
//       addNotification({ type: "error", text: errors.professors });
//     else if (errors.studentId)
//       addNotification({ type: "error", text: errors.studentId });
//     else if (errors.title)
//       addNotification({ type: "error", text: errors.title });
//     else if (errors.approvalDate)
//       addNotification({ type: "error", text: errors.approvalDate });
//     else if (errors.systemRegistrationDate)
//       addNotification({ type: "error", text: errors.systemRegistrationDate });
//     else if (errors.text) addNotification({ type: "error", text: errors.text });
//     else if (success)
//       addNotification({ type: "success", text: success });

//     return () => clearTimeout(timer);
//   }, [errors, success, addNotification]);

//   // تابع برای محاسبه مبلغ مصوب
//   const calculateApprovedAmount = (thesisType, baseSalary, parsaType) => {
//     if (!baseSalary) return 0;

//     let percentage = 0;

//     if (parsaType === "r") {
//       // رساله
//       switch (thesisType) {
//         case "نظری":
//           percentage = baseSalary.TheoreticalDissertationPercentage;
//           break;
//         case "میدانی":
//           percentage = baseSalary.FieldDissertationPercentage;
//           break;
//         case "تجربی":
//           percentage = baseSalary.ExperimentalDissertationPercentage;
//           break;
//         default:
//           percentage = 0;
//       }
//     } else {
//       // پایان‌نامه
//       switch (thesisType) {
//         case "نظری":
//           percentage = baseSalary.TheoreticalThesisPercentage;
//           break;
//         case "میدانی":
//           percentage = baseSalary.FieldThesisPercentage;
//           break;
//         case "تجربی":
//           percentage = baseSalary.ExperimentalThesisPercentage;
//           break;
//         default:
//           percentage = 0;
//       }
//     }

//     setPercentage(percentage);
//     const amount = (baseSalary.AssistantProfessorBaseSalary * percentage) / 100;
//     return Math.round(amount); // گرد کردن به عدد صحیح
//   };

//   // دریافت متغیرهای فعال هنگام تغییر نوع پایان‌نامه
//   useEffect(() => {
//     const fetchActiveVariables = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         const response = await axios.get(
//           `${serverAddress}/systemvariables/active`,
//           {
//             headers: {
//               Authorization: `Bearer ${token}`,
//             },
//           }
//         );
//         setBaseSalary(response.data);
//         const calculatedAmount = calculateApprovedAmount(
//           formData.thesisType,
//           response.data,
//           parsaType
//         );
//         setApprovedAmount(calculatedAmount);
//       } catch (error) {
//         console.error("Error fetching active variables:", error);
//         setApprovedAmount(0);
//       }
//     };

//     fetchActiveVariables();
//   }, []);

//   // محاسبه مجدد مبلغ مصوب هنگام تغییر نوع پارسا یا نوع پایان‌نامه
//   useEffect(() => {
//     if (baseSalary) {
//       const calculatedAmount = calculateApprovedAmount(
//         formData.thesisType,
//         baseSalary,
//         parsaType
//       );
//       setApprovedAmount(calculatedAmount);
//     }
//   }, [formData.thesisType, baseSalary, parsaType]);

//   useEffect(() => {
//     const handleKeyDown = (event) => {
//       if (event.key == "Escape") {
//         onClose();
//       }
//     };

//     window.addEventListener("keydown", handleKeyDown);

//     return () => {
//       window.removeEventListener("keydown", handleKeyDown);
//     };
//   }, [onClose]);

//   const handleKeyPress = (e) => {
//     if (e.key === "Enter") {
//       handleStudentSearch();
//     }
//   };

//   // دریافت مقاطع تحصیلی
//   useEffect(() => {
//     const fetchEducationLevels = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         const response = await axios.get(`${serverAddress}/educationlevels`, {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         });
//         setEducationLevels(response.data);
//         if (response.data.length > 0) {
//           setFormData((prev) => ({ ...prev, levelId: response.data[0].id }));
//         }
//       } catch (error) {
//         console.error("Error fetching education levels:", error);
//       }
//     };

//     fetchEducationLevels();
//   }, []);

//   useEffect(() => {
//     const fetchData = async () => {
//       const token = localStorage.getItem("token");
//       if (!token) return;

//       try {
//         const response = await axios.get(`${serverAddress}/professors`, {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         });
//         setProfessors(response.data);
//       } catch (error) {
//         console.error("Error fetching professors:", error);
//       }
//     };

//     fetchData();
//   }, []);

// // اضافه کنید: تنظیم خودکار مقطع بر اساس نوع پارسا
// useEffect(() => {
//   if (educationLevels.length === 0) return;

//   if (parsaType === "r") {
//     // رساله: فقط مقطع PHD قابل انتخاب
//     const phdLevel = educationLevels.find(
//       level => level.name === "PHD" || level.name === "دکترا" || level.name === "دکتری"
//     );
//     if (phdLevel) {
//       setFormData(prev => ({ ...prev, levelId: phdLevel.id }));
//     }
//   } else {
//     // پایان نامه: ارشد یا دکتری عمومی (غیر PHD)
//     const allowedLevels = educationLevels.filter(
//       level => level.name !== "PHD" && level.name !== "دکترا" && level.name !== "دکتری"
//     );
//     if (allowedLevels.length > 0 && !allowedLevels.some(l => l.id === formData.levelId)) {
//       // اگر مقطع فعلی مجاز نیست، اولین مقطع مجاز را انتخاب کن
//       setFormData(prev => ({ ...prev, levelId: allowedLevels[0].id }));
//     }
//   }
// }, [parsaType, educationLevels]);

//   const fetchProfessors = async () => {
//     try {
//       const token = localStorage.getItem("token");
//       const response = await axios.get(`${serverAddress}/professors`, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });
//       setProfessors(response.data);
//     } catch (error) {
//       console.error("Error fetching professors:", error);
//     }
//   };

//   const handleStudentSearch = async () => {
//     try {
//       const token = localStorage.getItem("token");
//       if (!token) {
//         throw new Error("لطفاً ابتدا وارد سیستم شوید");
//       }

//       const response = await axios.get(
//         `${serverAddress}/students/${formData.studentId}`,
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         }
//       );

//       setStudentInfo(response.data);

//       // به‌روزرسانی levelId بر اساس مقطع تحصیلی دانشجو
//       if (response.data.LevelID) {
//         setFormData((prev) => ({
//           ...prev,
//           levelId: response.data.LevelID,
//         }));
//       }

//       setErrors((prev) => ({ ...prev, studentId: "" }));
//     } catch (error) {
//       if (error.response?.status == 403) {
//         setErrors((prev) => ({
//           ...prev,
//           studentId:
//             "شما مجوز مشاهده این دانشجو را ندارید یا دانشجو وجود ندارد",
//         }));
//       } else {
//         setErrors((prev) => ({
//           ...prev,
//           studentId: "خطا در دریافت اطلاعات دانشجو",
//         }));
//       }
//       setStudentInfo(null);
//     }
//   };

//   const handleAddProfessor = () => {
//     if (!selectedProfessor) {
//       setErrors((prev) => ({ ...prev, professor: "استاد را انتخاب کنید" }));
//       return;
//     }

//     if (participation <= 0 || participation > 100) {
//       setErrors((prev) => ({
//         ...prev,
//         participation: "درصد مشارکت باید بین 1 تا 100 باشد",
//       }));
//       return;
//     }

//     if (formData.professors.some((p) => p.id == selectedProfessor.id)) {
//       setErrors((prev) => ({
//         ...prev,
//         professor: "این استاد قبلاً اضافه شده است",
//       }));
//       return;
//     }

//     setFormData((prev) => ({
//       ...prev,
//       professors: [
//         ...prev.professors,
//         {
//           id: selectedProfessor.id,
//           name: `${selectedProfessor.firstName} ${selectedProfessor.lastName}`,
//           participation: parseInt(participation),
//           nationalCode: selectedProfessor.nationalCode,
//         },
//       ],
//     }));

//     setSelectedProfessor(null);
//     setParticipation(0);
//     setShowProfessorModal(false);
//     setErrors((prev) => ({ ...prev, professor: "", participation: "" }));
//   };

//   const handleRemoveProfessor = (professorId) => {
//     setFormData((prev) => ({
//       ...prev,
//       professors: prev.professors.filter((p) => p.id !== professorId),
//     }));
//   };

//   const handleSubmit = async () => {
//     const newErrors = {};

//     if (!formData.studentId) newErrors.studentId = "شماره دانشجویی الزامی است";
//     if (!studentInfo) newErrors.studentId = "لطفاً ابتدا دانشجو را جستجو کنید";
//     if (!formData.title) newErrors.title = "عنوان پایان‌نامه الزامی است";
//     if (!selectedApprovalDate) newErrors.approvalDate = "تاریخ تصویب الزامی است";
//     if (!selectedSystemRegistrationDate) newErrors.systemRegistrationDate = "تاریخ ثبت در سیستم الزامی است";
//     if (formData.professors.length === 0)
//       newErrors.professors = "حداقل یک استاد راهنما انتخاب کنید";

//     const totalParticipation = formData.professors.reduce(
//       (sum, p) => sum + p.participation,
//       0
//     );
//     if (totalParticipation !== 100) {
//       newErrors.participation = "مجموع درصد مشارکت اساتید باید ۱۰۰ باشد";
//     }

//     if (Object.keys(newErrors).length > 0) {
//       setErrors(newErrors);
//       return;
//     }

//     try {
//       // فرمت کردن تاریخ‌ها به string معتبر (YYYY/MM/DD با اعداد لاتین)
//       const formattedApprovalDate = selectedApprovalDate
//         .setDigits(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"])
//         .format("YYYY/MM/DD");
//       const formattedSystemRegistrationDate = selectedSystemRegistrationDate
//         .setDigits(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"])
//         .format("YYYY/MM/DD");

//       await axios.post(
//         `${serverAddress}/theses`,
//         {
//           studentId: formData.studentId,
//           title: formData.title,
//           thesisType: formData.thesisType,
//           levelId: formData.levelId,
//           professors: formData.professors,
//           ApprovedAmount: approvedAmount,
//           parsaType: parsaType,
//           approvalDate: formattedApprovalDate,
//           systemRegistrationDate: formattedSystemRegistrationDate,
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${localStorage.getItem("token")}`,
//           },
//         }
//       );

//       setSuccess("پایان‌نامه با موفقیت ثبت شد");
//       onClose();
//       if (onSuccess) onSuccess();
//     } catch (error) {
//       setErrors({
//         ...errors,
//         text:
//           "خطا در ثبت پایان‌نامه: " + (error.response?.data || error.message),
//       });
//     }
//   };

//   return (
//     <div className={Styles.container}>
//       <div className={Styles.form}>
//         <h2 className={Styles.formHeader}>فرم ثبت پارسای جدید</h2>
//         <div className={Styles.formTop}>
//           <div className={Styles.formInput}>
//             <label htmlFor="parsaType">نوع پارسا</label>
//             <select
//               id="parsaType"
//               value={parsaType}
//               onChange={(e) => setParsaType(e.target.value)}
//             >
//               <option value="p">پایان نامه</option>
//               <option value="r">رساله</option>
//             </select>
//           </div>
//           <div className={Styles.formInput}>
//             <label htmlFor="title">
//               {parsaType === "p" ? "عنوان پایان نامه" : "عنوان رساله"}
//             </label>
//             <input
//               type="text"
//               id="title"
//               value={formData.title}
//               onChange={(e) =>
//                 setFormData({ ...formData, title: e.target.value })
//               }
//               className={errors.title ? "errorInput" : ""}
//             />
//             {errors.title && <span className={Styles.error}>{errors.title}</span>}
//           </div>
//           <div className={Styles.formInput}>
//             <label htmlFor="studentId">شماره دانشجویی</label>
//             <input
//               type="text"
//               id="studentId"
//               value={formData.studentId}
//               onChange={(e) =>
//                 setFormData({ ...formData, studentId: e.target.value })
//               }
//               onKeyDown={handleKeyPress}
//               className={errors.studentId ? "errorInput" : ""}
//             />
//             <button
//               onClick={handleStudentSearch}
//               className="miniButton search"
//               title="جستجو"
//             >
//               <IoSearch />
//             </button>
//             {studentInfo && (
//               <div style={{ marginTop: "5px" }}>
//                 {studentInfo.FirstName} {studentInfo.LastName} -{" "}
//                 {studentInfo.DepartmentName}
//               </div>
//             )}
//             {errors.studentId && <span className={Styles.error}>{errors.studentId}</span>}
//           </div>
//           <div className={Styles.formInput}>
//             <label htmlFor="thesisType">
//               {parsaType === "p" ? "نوع پایان نامه" : "نوع رساله"}
//             </label>
//             <select
//               id="thesisType"
//               value={formData.thesisType}
//               onChange={(e) =>
//                 setFormData({ ...formData, thesisType: e.target.value })
//               }
//             >
//               <option value="میدانی">میدانی</option>
//               <option value="نظری">نظری</option>
//               <option value="تجربی">تجربی</option>
//             </select>
//           </div>
//           <div className={Styles.formInput}>
//             <label htmlFor="levelId">مقطع</label>
//             <select
//               id="levelId"
//               value={formData.levelId}
//               onChange={(e) =>
//                 setFormData({ ...formData, levelId: e.target.value })
//               }
//             >
//           {educationLevels
//       .filter(level => {
//         if (parsaType === "r") {
//           // رساله: فقط PHD
//           return level.name === "PHD" || level.name === "دکترا" || level.name === "دکتری";
//         } else {
//           // پایان نامه: همه مقاطع به جز PHD
//           return level.name !== "PHD" && level.name !== "دکترا" && level.name !== "دکتری";
//         }
//       })
//       .map((level) => (
//         <option key={level.id} value={level.id}>
//           {level.name}
//         </option>
//       ))}
//             </select>
//           </div>
//           <div className={`${Styles.formInput} ${Styles.datePickerGroup }`}>
//             <label>تاریخ تصویب پارسا</label>
//             <DatePicker
//               value={selectedApprovalDate}
//               onChange={setSelectedApprovalDate}
//               calendar={persian}
//               locale={persian_fa}
//               format="YYYY/MM/DD"
//               className={errors.approvalDate ? "errorInput" : ""}
//             />
//             {errors.approvalDate && <span className={Styles.error}>{errors.approvalDate}</span>}
//           </div>
//           <div className={`${Styles.formInput} ${Styles.datePickerGroup }`}>
//             <label>تاریخ ثبت در سیستم</label>
//             <DatePicker
//               value={selectedSystemRegistrationDate}
//               onChange={setSelectedSystemRegistrationDate}
//               calendar={persian}
//               locale={persian_fa}
//               format="YYYY/MM/DD"
//               disabled={true}
//               className={errors.systemRegistrationDate ? "errorInput" : ""}
//             />
//             {errors.systemRegistrationDate && <span className={Styles.error}>{errors.systemRegistrationDate}</span>}
//           </div>
//           <div className={Styles.formInput}>
//             <label>مبلغ مصوب (ریال)</label>
//             <div style={{ display: "flex", alignItems: "center" }}>
//               <input
//                 type="number"
//                 value={approvedAmount}
//                 readOnly
//                 style={{ width: "150px" }}
//               />
//               {baseSalary && (
//                 <div
//                   style={{
//                     fontSize: "0.8em",
//                     color: "#666",
//                     marginLeft: "10px",
//                   }}
//                 >
//                   محاسبه: (
//                   {baseSalary.AssistantProfessorBaseSalary.toLocaleString()} ×{" "}
//                   {percentage}%) ÷ 100
//                 </div>
//               )}
//             </div>
//           </div>
//           <div className={Styles.formInput}>
//             <label>اساتید راهنما</label>
//             <div style={{ width: "80%" }}>
//               <button
//                 type="button"
//                 onClick={async () => {
//                   await fetchProfessors();
//                   setShowProfessorModal(true);
//                 }}
//                 className="miniButton info"
//               >
//                 <AiOutlinePlus />
//               </button>
//               <div>
//                 {formData.professors.map((professor) => (
//                   <div
//                     key={professor.id}
//                     style={{
//                       display: "flex",
//                       justifyContent: "space-between",
//                       alignItems: "center",
//                       marginBottom: "5px",
//                     }}
//                   >
//                     <span>
//                       {professor.name} - {professor.participation}%
//                     </span>
//                     <button
//                       onClick={() => handleRemoveProfessor(professor.id)}
//                       className="miniButton error"
//                       title="حذف"
//                     >
//                       <FaTrashAlt />
//                     </button>
//                   </div>
//                 ))}
//               </div>
//               {errors.professors && <span className={Styles.error}>{errors.professors}</span>}
//               {errors.participation && <span className={Styles.error}>{errors.participation}</span>}
//             </div>
//           </div>
//         </div>
//         <div className={Styles.formDown}>
//           <button
//             onClick={handleSubmit}
//             className="miniButton success"
//             disabled={!studentInfo}
//             title="تأیید"
//           >
//             <FaCheck />
//           </button>
//           <button
//             onClick={onClose}
//             className="miniButton error"
//             title="انصراف"
//           >
//             <AiOutlineCloseCircle />
//           </button>
//         </div>
//       </div>

//       {showProfessorModal && (
//         <div className={Styles.modal}>
//           <div
//             className={Styles.modalContent}
//             style={{
//               width: "100%",
//               maxWidth: "900px",
//               padding: "20px",
//             }}
//           >
//             <h3>انتخاب استاد راهنما</h3>
//             <div className={Styles.formInput}>
//               <input
//                 type="text"
//                 placeholder="جستجوی استاد بر اساس نام، نام خانوادگی یا کد ملی..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//               />
//             </div>
//             <div
//               style={{
//                 maxHeight: "500px",
//                 overflowY: "auto",
//                 margin: "10px 0",
//               }}
//             >
//               <table
//                 style={{
//                   width: "100%",
//                   borderCollapse: "collapse",
//                   fontSize: "15px",
//                 }}
//               >
//                 <thead>
//                   <tr
//                     style={{
//                       backgroundColor: "#f2f2f2",
//                       position: "sticky",
//                       top: 0,
//                     }}
//                   >
//                     <th
//                       style={{
//                         padding: "12px",
//                         border: "1px solid #ddd",
//                         minWidth: "120px",
//                       }}
//                     >
//                       کد ملی
//                     </th>
//                     <th
//                       style={{
//                         padding: "12px",
//                         border: "1px solid #ddd",
//                         minWidth: "150px",
//                       }}
//                     >
//                       نام
//                     </th>
//                     <th
//                       style={{
//                         padding: "12px",
//                         border: "1px solid #ddd",
//                         minWidth: "150px",
//                       }}
//                     >
//                       نام خانوادگی
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {professors
//                     .filter((professor) =>
//                       `${professor.firstName} ${professor.lastName} ${
//                         professor.nationalCode || ""
//                       }`
//                         .toLowerCase()
//                         .includes(searchTerm.toLowerCase())
//                     )
//                     .map((professor) => (
//                       <tr
//                         key={professor.id}
//                         onClick={() => setSelectedProfessor(professor)}
//                         style={{
//                           cursor: "pointer",
//                           backgroundColor:
//                             selectedProfessor?.id === professor.id
//                               ? "#e6f7ff"
//                               : "transparent",
//                           border: "1px solid #ddd",
//                           transition: "background-color 0.2s",
//                         }}
//                       >
//                         <td
//                           style={{
//                             padding: "12px",
//                             border: "1px solid #ddd",
//                             fontFamily: "monospace",
//                           }}
//                         >
//                           {professor.nationalCode || "-"}
//                         </td>
//                         <td
//                           style={{
//                             padding: "12px",
//                             border: "1px solid #ddd",
//                           }}
//                         >
//                           {professor.firstName}
//                         </td>
//                         <td
//                           style={{
//                             padding: "12px",
//                             border: "1px solid #ddd",
//                           }}
//                         >
//                           {professor.lastName}
//                         </td>
//                       </tr>
//                     ))}
//                 </tbody>
//               </table>
//             </div>
//             <div style={{ margin: "10px 0" }}>
//               <label>درصد مشارکت: </label>
//               <input
//                 type="number"
//                 min="1"
//                 max="100"
//                 value={participation}
//                 onChange={(e) => setParticipation(e.target.value)}
//                 style={{ width: "60px", padding: "5px" }}
//               />
//               %
//             </div>
//             <div style={{ display: "flex", justifyContent: "space-between" }}>
//               <button
//                 onClick={handleAddProfessor}
//                 className="miniButton success"
//                 title="افزودن"
//               >
//                 <AiOutlinePlus />
//               </button>
//               <button
//                 onClick={() => setShowProfessorModal(false)}
//                 className="miniButton error"
//                 title="انصراف"
//               >
//                 <AiOutlineCloseCircle />
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// export default NewParsa;



import { useState, useEffect } from "react";
import Styles from "./NewParsa.module.css";
import serverAddress from "./constants/contants";
import axios from "axios";
import { useAuth } from "./AuthContext";
import { useNotification } from "./contexts/NotificationContext";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import DateObject from "react-date-object";

//importing icons
import { AiOutlineCloseCircle } from "react-icons/ai";
import { FaTrashAlt } from "react-icons/fa";
import { FaCheck } from "react-icons/fa6";
import { IoSearch } from "react-icons/io5";
import { AiOutlinePlus } from "react-icons/ai";

function NewParsa({ onClose, onSuccess }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    studentId: "",
    title: "",
    thesisType: "میدانی",
    levelId: "",
    professors: [],
  });
  const [educationLevels, setEducationLevels] = useState([]);
  const [students, setStudents] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showProfessorModal, setShowProfessorModal] = useState(false);
  const [selectedProfessor, setSelectedProfessor] = useState(null);
  const [participation, setParticipation] = useState(0);
  const [studentInfo, setStudentInfo] = useState(null);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [approvedAmount, setApprovedAmount] = useState(0);
  const [baseSalary, setBaseSalary] = useState(null);
  const [percentage, setPercentage] = useState(0);
  const [parsaType, setParsaType] = useState("p");
  const [selectedApprovalDate, setSelectedApprovalDate] = useState(null);
  const [selectedSystemRegistrationDate, setSelectedSystemRegistrationDate] = useState(
    new DateObject({ calendar: persian, locale: persian_fa, digits: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] })
  );
  const [isLoadingVariables, setIsLoadingVariables] = useState(false);
  const [selectedYear, setSelectedYear] = useState(null);

  const { addNotification } = useNotification();

  // استخراج سال از تاریخ شمسی
  const extractYearFromPersianDate = (dateObject) => {
    if (!dateObject) return null;
    if (dateObject.year) {
      return dateObject.year;
    }
    if (typeof dateObject === 'string') {
      const match = dateObject.match(/^(\d{4})/);
      return match ? parseInt(match[1]) : null;
    }
    return null;
  };

  // دریافت متغیرهای سیستم بر اساس سال
  const fetchVariablesByYear = async (year) => {
    if (!year) return null;
    
    setIsLoadingVariables(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${serverAddress}/systemvariables/by-year/${year}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        addNotification({
          type: "warning",
          text: `هیچ ضریب ثبت‌شده‌ای برای سال ${year} وجود ندارد. لطفاً ابتدا ضرایب این سال را ثبت کنید.`
        });
      } else {
        console.error("Error fetching variables by year:", error);
        addNotification({
          type: "error",
          text: "خطا در دریافت ضرایب سیستم"
        });
      }
      return null;
    } finally {
      setIsLoadingVariables(false);
    }
  };

  // محاسبه مبلغ مصوب با استفاده از متغیرهای سال انتخاب شده
  const calculateApprovedAmountWithVariables = (thesisType, variables, parsaType) => {
    if (!variables) return 0;

    let percentageValue = 0;

    if (parsaType === "r") {
      // رساله
      switch (thesisType) {
        case "نظری":
          percentageValue = variables.TheoreticalDissertationPercentage;
          break;
        case "میدانی":
          percentageValue = variables.FieldDissertationPercentage;
          break;
        case "تجربی":
          percentageValue = variables.ExperimentalDissertationPercentage;
          break;
        default:
          percentageValue = 0;
      }
    } else {
      // پایان‌نامه
      switch (thesisType) {
        case "نظری":
          percentageValue = variables.TheoreticalThesisPercentage;
          break;
        case "میدانی":
          percentageValue = variables.FieldThesisPercentage;
          break;
        case "تجربی":
          percentageValue = variables.ExperimentalThesisPercentage;
          break;
        default:
          percentageValue = 0;
      }
    }

    setPercentage(percentageValue);
    const amount = (variables.AssistantProfessorBaseSalary * percentageValue) / 100;
    return Math.round(amount);
  };

  // مدیریت تغییر تاریخ تصویب
  const handleApprovalDateChange = async (date) => {
    setSelectedApprovalDate(date);
    
    // استخراج سال از تاریخ انتخاب شده
    const year = extractYearFromPersianDate(date);
    setSelectedYear(year);
    
    if (year) {
      // دریافت متغیرهای سیستم برای سال انتخاب شده
      const variables = await fetchVariablesByYear(year);
      
      if (variables) {
        setBaseSalary(variables);
        const calculatedAmount = calculateApprovedAmountWithVariables(
          formData.thesisType,
          variables,
          parsaType
        );
        setApprovedAmount(calculatedAmount);
        
        // پاک کردن خطای مربوط به تاریخ تصویب در صورت موفقیت
        if (errors.approvalDate) {
          setErrors((prev) => ({ ...prev, approvalDate: "" }));
        }
      } else {
        setBaseSalary(null);
        setApprovedAmount(0);
        setErrors((prev) => ({
          ...prev,
          approvalDate: `هیچ ضریب ثبت‌شده‌ای برای سال ${year} وجود ندارد`
        }));
      }
    } else {
      setBaseSalary(null);
      setApprovedAmount(0);
    }
  };

  // محاسبه مجدد مبلغ مصوب هنگام تغییر نوع پارسا یا نوع پایان‌نامه
  useEffect(() => {
    if (baseSalary && selectedApprovalDate) {
      const calculatedAmount = calculateApprovedAmountWithVariables(
        formData.thesisType,
        baseSalary,
        parsaType
      );
      setApprovedAmount(calculatedAmount);
    }
  }, [formData.thesisType, baseSalary, parsaType, selectedApprovalDate]);

  // نمایش نوتیف موفقیت یا خطا
  useEffect(() => {
    const timer = setTimeout(() => {
      if (errors.participation) setErrors({ ...errors, participation: "" });
      else if (errors.professors) setErrors({ ...errors, professors: "" });
      else if (errors.studentId) setErrors({ ...errors, studentId: "" });
      else if (errors.title) setErrors({ ...errors, title: "" });
      else if (errors.approvalDate) setErrors({ ...errors, approvalDate: "" });
      else if (errors.systemRegistrationDate) setErrors({ ...errors, systemRegistrationDate: "" });
      else if (errors.text) setErrors({ ...errors, text: "" });
      else if (success) setSuccess("");
    }, 3000);

    if (errors.participation)
      addNotification({ type: "error", text: errors.participation });
    else if (errors.professors)
      addNotification({ type: "error", text: errors.professors });
    else if (errors.studentId && errors.studentId !== "لطفاً ابتدا دانشجو را جستجو کنید")
      addNotification({ type: "error", text: errors.studentId });
    else if (errors.title)
      addNotification({ type: "error", text: errors.title });
    else if (errors.approvalDate)
      addNotification({ type: "error", text: errors.approvalDate });
    else if (errors.systemRegistrationDate)
      addNotification({ type: "error", text: errors.systemRegistrationDate });
    else if (errors.text) addNotification({ type: "error", text: errors.text });
    else if (success)
      addNotification({ type: "success", text: success });

    return () => clearTimeout(timer);
  }, [errors, success, addNotification]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key == "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleStudentSearch();
    }
  };

  // دریافت مقاطع تحصیلی
  useEffect(() => {
    const fetchEducationLevels = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${serverAddress}/educationlevels`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setEducationLevels(response.data);
        if (response.data.length > 0) {
          setFormData((prev) => ({ ...prev, levelId: response.data[0].id }));
        }
      } catch (error) {
        console.error("Error fetching education levels:", error);
      }
    };

    fetchEducationLevels();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
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

    fetchData();
  }, []);

  // تنظیم خودکار مقطع بر اساس نوع پارسا
  useEffect(() => {
    if (educationLevels.length === 0) return;

    if (parsaType === "r") {
      // رساله: فقط مقطع PHD قابل انتخاب
      const phdLevel = educationLevels.find(
        level => level.name === "PHD" || level.name === "دکترا" || level.name === "دکتری"
      );
      if (phdLevel) {
        setFormData(prev => ({ ...prev, levelId: phdLevel.id }));
      }
    } else {
      // پایان نامه: ارشد یا دکتری عمومی (غیر PHD)
      const allowedLevels = educationLevels.filter(
        level => level.name !== "PHD" && level.name !== "دکترا" && level.name !== "دکتری"
      );
      if (allowedLevels.length > 0 && !allowedLevels.some(l => l.id === formData.levelId)) {
        setFormData(prev => ({ ...prev, levelId: allowedLevels[0].id }));
      }
    }
  }, [parsaType, educationLevels]);

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

  const handleStudentSearch = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("لطفاً ابتدا وارد سیستم شوید");
      }

      const response = await axios.get(
        `${serverAddress}/students/${formData.studentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setStudentInfo(response.data);

      if (response.data.LevelID) {
        setFormData((prev) => ({
          ...prev,
          levelId: response.data.LevelID,
        }));
      }

      setErrors((prev) => ({ ...prev, studentId: "" }));
    } catch (error) {
      if (error.response?.status == 403) {
        setErrors((prev) => ({
          ...prev,
          studentId:
            "شما مجوز مشاهده این دانشجو را ندارید یا دانشجو وجود ندارد",
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          studentId: "خطا در دریافت اطلاعات دانشجو",
        }));
      }
      setStudentInfo(null);
    }
  };

  const handleAddProfessor = () => {
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

    if (formData.professors.some((p) => p.id == selectedProfessor.id)) {
      setErrors((prev) => ({
        ...prev,
        professor: "این استاد قبلاً اضافه شده است",
      }));
      return;
    }

    setFormData((prev) => ({
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
    setShowProfessorModal(false);
    setErrors((prev) => ({ ...prev, professor: "", participation: "" }));
  };

  const handleRemoveProfessor = (professorId) => {
    setFormData((prev) => ({
      ...prev,
      professors: prev.professors.filter((p) => p.id !== professorId),
    }));
  };

  const handleSubmit = async () => {
    const newErrors = {};

    if (!formData.studentId) newErrors.studentId = "شماره دانشجویی الزامی است";
    if (!studentInfo) newErrors.studentId = "لطفاً ابتدا دانشجو را جستجو کنید";
    if (!formData.title) newErrors.title = "عنوان پایان‌نامه الزامی است";
    if (!selectedApprovalDate) newErrors.approvalDate = "تاریخ تصویب الزامی است";
    if (!selectedSystemRegistrationDate) newErrors.systemRegistrationDate = "تاریخ ثبت در سیستم الزامی است";
    if (formData.professors.length === 0)
      newErrors.professors = "حداقل یک استاد راهنما انتخاب کنید";
    
    // بررسی وجود ضرایب برای سال انتخاب شده
    if (selectedApprovalDate && !baseSalary) {
      const year = extractYearFromPersianDate(selectedApprovalDate);
      newErrors.approvalDate = `هیچ ضریب ثبت‌شده‌ای برای سال ${year} وجود ندارد`;
    }

    const totalParticipation = formData.professors.reduce(
      (sum, p) => sum + p.participation,
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
      const formattedApprovalDate = selectedApprovalDate
        .setDigits(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"])
        .format("YYYY/MM/DD");
      const formattedSystemRegistrationDate = selectedSystemRegistrationDate
        .setDigits(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"])
        .format("YYYY/MM/DD");

      await axios.post(
        `${serverAddress}/theses`,
        {
          studentId: formData.studentId,
          title: formData.title,
          thesisType: formData.thesisType,
          levelId: formData.levelId,
          professors: formData.professors,
          ApprovedAmount: approvedAmount,
          parsaType: parsaType,
          approvalDate: formattedApprovalDate,
          systemRegistrationDate: formattedSystemRegistrationDate,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setSuccess("پایان‌نامه با موفقیت ثبت شد");
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      setErrors({
        ...errors,
        text:
          "خطا در ثبت پایان‌نامه: " + (error.response?.data || error.message),
      });
    }
  };

  return (
    <div className={Styles.container}>
      <div className={Styles.form}>
        <h2 className={Styles.formHeader}>فرم ثبت پارسای جدید</h2>
        <div className={Styles.formTop}>
          <div className={Styles.formInput}>
            <label htmlFor="parsaType">نوع پارسا</label>
            <select
              id="parsaType"
              value={parsaType}
              onChange={(e) => setParsaType(e.target.value)}
            >
              <option value="p">پایان نامه</option>
              <option value="r">رساله</option>
            </select>
          </div>
          <div className={Styles.formInput}>
            <label htmlFor="title">
              {parsaType === "p" ? "عنوان پایان نامه" : "عنوان رساله"}
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className={errors.title ? "errorInput" : ""}
            />
            {errors.title && <span className={Styles.error}>{errors.title}</span>}
          </div>
          <div className={Styles.formInput}>
            <label htmlFor="studentId">شماره دانشجویی</label>
            <input
              type="text"
              id="studentId"
              value={formData.studentId}
              onChange={(e) =>
                setFormData({ ...formData, studentId: e.target.value })
              }
              onKeyDown={handleKeyPress}
              className={errors.studentId ? "errorInput" : ""}
            />
            <button
              onClick={handleStudentSearch}
              className="miniButton search"
              title="جستجو"
            >
              <IoSearch />
            </button>
            {studentInfo && (
              <div style={{ marginTop: "5px" }}>
                {studentInfo.FirstName} {studentInfo.LastName} -{" "}
                {studentInfo.DepartmentName}
              </div>
            )}
            {errors.studentId && <span className={Styles.error}>{errors.studentId}</span>}
          </div>
          <div className={Styles.formInput}>
            <label htmlFor="thesisType">
              {parsaType === "p" ? "نوع پایان نامه" : "نوع رساله"}
            </label>
            <select
              id="thesisType"
              value={formData.thesisType}
              onChange={(e) =>
                setFormData({ ...formData, thesisType: e.target.value })
              }
            >
              <option value="میدانی">میدانی</option>
              <option value="نظری">نظری</option>
              <option value="تجربی">تجربی</option>
            </select>
          </div>
          <div className={Styles.formInput}>
            <label htmlFor="levelId">مقطع</label>
            <select
              id="levelId"
              value={formData.levelId}
              onChange={(e) =>
                setFormData({ ...formData, levelId: e.target.value })
              }
            >
              {educationLevels
                .filter(level => {
                  if (parsaType === "r") {
                    return level.name === "PHD" || level.name === "دکترا" || level.name === "دکتری";
                  } else {
                    return level.name !== "PHD" && level.name !== "دکترا" && level.name !== "دکتری";
                  }
                })
                .map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
            </select>
          </div>
          <div className={`${Styles.formInput} ${Styles.datePickerGroup}`}>
            <label>تاریخ تصویب پارسا</label>
            <DatePicker
              value={selectedApprovalDate}
              onChange={handleApprovalDateChange}
              calendar={persian}
              locale={persian_fa}
              format="YYYY/MM/DD"
              className={errors.approvalDate ? "errorInput" : ""}
            />
            {isLoadingVariables && (
              <div style={{ fontSize: "12px", color: "#666", marginRight: "10px" }}>
                در حال بارگیری ضرایب سال...
              </div>
            )}
            {selectedYear && baseSalary && (
              <div style={{ fontSize: "12px", color: "green", marginRight: "10px" }}>
                ✓ ضریب سال {selectedYear} بارگیری شد
              </div>
            )}
            {errors.approvalDate && <span className={Styles.error}>{errors.approvalDate}</span>}
          </div>
          <div className={`${Styles.formInput} ${Styles.datePickerGroup}`}>
            <label>تاریخ ثبت در سیستم</label>
            <DatePicker
              value={selectedSystemRegistrationDate}
              onChange={setSelectedSystemRegistrationDate}
              calendar={persian}
              locale={persian_fa}
              format="YYYY/MM/DD"
              disabled={true}
              className={errors.systemRegistrationDate ? "errorInput" : ""}
            />
            {errors.systemRegistrationDate && <span className={Styles.error}>{errors.systemRegistrationDate}</span>}
          </div>
          <div className={Styles.formInput}>
            <label>مبلغ مصوب (ریال)</label>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <input
                type="number"
                value={approvedAmount}
                readOnly
                style={{ width: "200px" }}
              />
              {baseSalary && selectedYear && (
                <div
                  style={{
                    fontSize: "0.8em",
                    color: "#666",
                  }}
                >
                  محاسبه بر اساس ضریب سال {selectedYear}: <br />
                  ({baseSalary.AssistantProfessorBaseSalary.toLocaleString()} × {percentage}%) ÷ 100 = {approvedAmount.toLocaleString()} ریال
                </div>
              )}
            </div>
          </div>
          <div className={Styles.formInput}>
            <label>اساتید راهنما</label>
            <div style={{ width: "80%" }}>
              <button
                type="button"
                onClick={async () => {
                  await fetchProfessors();
                  setShowProfessorModal(true);
                }}
                className="miniButton info"
              >
                <AiOutlinePlus />
              </button>
              <div>
                {formData.professors.map((professor) => (
                  <div
                    key={professor.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "5px",
                    }}
                  >
                    <span>
                      {professor.name} - {professor.participation}%
                    </span>
                    <button
                      onClick={() => handleRemoveProfessor(professor.id)}
                      className="miniButton error"
                      title="حذف"
                    >
                      <FaTrashAlt />
                    </button>
                  </div>
                ))}
              </div>
              {errors.professors && <span className={Styles.error}>{errors.professors}</span>}
              {errors.participation && <span className={Styles.error}>{errors.participation}</span>}
            </div>
          </div>
        </div>
        <div className={Styles.formDown}>
          <button
            onClick={handleSubmit}
            className="miniButton success"
            disabled={!studentInfo || !baseSalary}
            title={!baseSalary && selectedApprovalDate ? "ابتدا ضرایب سال تصویب را ثبت کنید" : "تأیید"}
          >
            <FaCheck />
          </button>
          <button
            onClick={onClose}
            className="miniButton error"
            title="انصراف"
          >
            <AiOutlineCloseCircle />
          </button>
        </div>
      </div>

      {showProfessorModal && (
        <div className={Styles.modal}>
          <div
            className={Styles.modalContent}
            style={{
              width: "100%",
              maxWidth: "900px",
              padding: "20px",
            }}
          >
            <h3>انتخاب استاد راهنما</h3>
            <div className={Styles.formInput}>
              <input
                type="text"
                placeholder="جستجوی استاد بر اساس نام، نام خانوادگی یا کد ملی..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div
              style={{
                maxHeight: "500px",
                overflowY: "auto",
                margin: "10px 0",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "15px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor: "#f2f2f2",
                      position: "sticky",
                      top: 0,
                    }}
                  >
                    <th
                      style={{
                        padding: "12px",
                        border: "1px solid #ddd",
                        minWidth: "120px",
                      }}
                    >
                      کد ملی
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        border: "1px solid #ddd",
                        minWidth: "150px",
                      }}
                    >
                      نام
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        border: "1px solid #ddd",
                        minWidth: "150px",
                      }}
                    >
                      نام خانوادگی
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {professors
                    .filter((professor) =>
                      `${professor.firstName} ${professor.lastName} ${
                        professor.nationalCode || ""
                      }`
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase())
                    )
                    .map((professor) => (
                      <tr
                        key={professor.id}
                        onClick={() => setSelectedProfessor(professor)}
                        style={{
                          cursor: "pointer",
                          backgroundColor:
                            selectedProfessor?.id === professor.id
                              ? "#e6f7ff"
                              : "transparent",
                          border: "1px solid #ddd",
                          transition: "background-color 0.2s",
                        }}
                      >
                        <td
                          style={{
                            padding: "12px",
                            border: "1px solid #ddd",
                            fontFamily: "monospace",
                          }}
                        >
                          {professor.nationalCode || "-"}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            border: "1px solid #ddd",
                          }}
                        >
                          {professor.firstName}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            border: "1px solid #ddd",
                          }}
                        >
                          {professor.lastName}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div style={{ margin: "10px 0" }}>
              <label>درصد مشارکت: </label>
              <input
                type="number"
                min="1"
                max="100"
                value={participation}
                onChange={(e) => setParticipation(e.target.value)}
                style={{ width: "60px", padding: "5px" }}
              />
              %
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button
                onClick={handleAddProfessor}
                className="miniButton success"
                title="افزودن"
              >
                <AiOutlinePlus />
              </button>
              <button
                onClick={() => setShowProfessorModal(false)}
                className="miniButton error"
                title="انصراف"
              >
                <AiOutlineCloseCircle />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NewParsa;

