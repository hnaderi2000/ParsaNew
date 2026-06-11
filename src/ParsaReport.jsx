

// import { useState, useEffect } from "react";
// import Styles from "./ParsaReport.module.css";
// import axios from "axios";
// import serverAddress from "./constants/contants";
// import { useAuth } from "./AuthContext";
// import { useNotification } from "./contexts/NotificationContext";
// import DatePicker from "react-multi-date-picker";
// import persian from "react-date-object/calendars/persian";
// import persian_fa from "react-date-object/locales/persian_fa";
// import Loader from "../src/components/Loader";
// import { toPersianNum } from "./helpers/toPersianNum";
// import { FaSearch, FaDownload, FaFileExcel, FaQuestionCircle, FaTimes } from "react-icons/fa";

// function ParsaReport() {
//   const { user, selectedRole } = useAuth();
//   const { addNotification } = useNotification();
  
//   // حالت‌های تاریخ
//   const [startDate, setStartDate] = useState(null);
//   const [endDate, setEndDate] = useState(null);
  
//   // داده‌های گزارش
//   const [reportData, setReportData] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [filteredData, setFilteredData] = useState([]);
  
//   // فیلترها
//   const [searchTerm, setSearchTerm] = useState("");
//   const [currentPage, setCurrentPage] = useState(1);
//   const [itemsPerPage] = useState(10);
  
//   // حالت برای نمایش/پنهان کردن راهنما
//   const [showExportGuide, setShowExportGuide] = useState(false);

// const ExcelExportGuide = () => (
//   <div className={Styles.exportGuide}>
//     <div className={Styles.exportGuideHeader}>
//       <h4>راهنمای باز کردن فایل در Excel:</h4>
//       <button 
//         className={Styles.closeGuideButton}
//         onClick={() => setShowExportGuide(false)}
//         aria-label="بستن راهنما"
//       >
//         <FaTimes />
//       </button>
//     </div>
//     <ol>
//       <li>فایل CSV را در Excel باز کنید</li>
//       <li>به تب <strong>Data</strong> بروید</li>
//       <li>روی <strong>From Text/CSV</strong> کلیک کنید</li>
//       <li>فایل را انتخاب و دکمه <strong>Import</strong> را بزنید</li>
//       <li>در پنجره Import، Encoding را روی <strong>65001: Unicode (UTF-8)</strong> تنظیم کنید</li>
//       <li>Delimiter را <strong>Comma</strong> انتخاب کنید</li>
//       <li>دکمه <strong>Load</strong> را بزنید</li>
//     </ol>
//   </div>
// );


//   // بررسی دسترسی نقش
//   useEffect(() => {
//     if (selectedRole !== "کارشناس پژوهشی معاونت پژوهشی") {
//       addNotification({
//         type: "error",
//         text: "شما دسترسی به این بخش را ندارید"
//       });
//     }
//   }, [selectedRole, addNotification]);

//   // تابع برای دریافت گزارش
//   const fetchReport = async () => {
//     if (!startDate || !endDate) {
//       addNotification({
//         type: "error",
//         text: "لطفاً بازه تاریخ را انتخاب کنید"
//       });
//       return;
//     }

//     try {
//       setLoading(true);
//       const token = localStorage.getItem("token");
      
//       // فرمت کردن تاریخ‌ها
//       const formattedStartDate = startDate
//         .setDigits(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"])
//         .format("YYYY/MM/DD");
      
//       const formattedEndDate = endDate
//         .setDigits(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"])
//         .format("YYYY/MM/DD");

//       // درخواست به API جدید (باید در بک‌اند ایجاد شود)
//       const response = await axios.get(
//         `${serverAddress}/parsa-report`,
//         {
//           params: {
//             startDate: formattedStartDate,
//             endDate: formattedEndDate
//           },
//           headers: {
//             Authorization: `Bearer ${token}`
//           }
//         }
//       );

//       setReportData(response.data);
//       setFilteredData(response.data);
//       setCurrentPage(1);
      
//       addNotification({
//         type: "success",
//         text: "گزارش با موفقیت دریافت شد"
//       });
//     } catch (error) {
//       console.error("Error fetching report:", error);
//       addNotification({
//         type: "error",
//         text: "خطا در دریافت گزارش: " + (error.response?.data?.message || error.message)
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   // فیلتر کردن داده‌ها
//   useEffect(() => {
//     if (searchTerm.trim() === "") {
//       setFilteredData(reportData);
//     } else {
//       const filtered = reportData.filter(item =>
//         item.professorName?.includes(searchTerm) ||
//         item.nationalCode?.includes(searchTerm) ||
//         item.studentName?.includes(searchTerm) ||
//         item.title?.includes(searchTerm)
//       );
//       setFilteredData(filtered);
//     }
//   }, [searchTerm, reportData]);

//   // محاسبه صفحات
//   const indexOfLastItem = currentPage * itemsPerPage;
//   const indexOfFirstItem = indexOfLastItem - itemsPerPage;
//   const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
//   const totalPages = Math.ceil(filteredData.length / itemsPerPage);



// // تابع بهبود یافته برای خروجی CSV
// // const exportToExcelImproved = () => {
// //   if (filteredData.length === 0) {
// //     addNotification({
// //       type: "warning",
// //       text: "داده‌ای برای خروجی وجود ندارد"
// //     });
// //     return;
// //   }

// //   // اضافه کردن BOM برای UTF-8
// //   const BOM = "\uFEFF";
  
// //   const headers = [
// //     "نام استاد",
// //     "کد ملی استاد",
// //     "نام دانشجو",
// //     "مقطع",
// //      "دانشکده",
// //     "عنوان پایان‌نامه",
// //      "نوع پارسا ",
// //       "نوع پایان نامه یا رساله ",
// //     "تاریخ ثبت در سیستم",
// //     "مبلغ مصوب (ریال)",
// //     "درصد مشارکت",
// //     "مبلغ سهم استاد (ریال)"
// //   ];

// //   // ایجاد داده‌های CSV با فرمت صحیح
// //   const rows = filteredData.map(item => [
// //     `"${item.professorName || ''}"`,
// //     `"${item.nationalCode || ''}"`,
// //     `"${item.studentName || ''}"`,
// //     `"${item.levelName || ''}"`,
// //      `"${item.facultyName || ''}"`,
// //     `"${item.title || ''}"`,
// //       `"${item.parsaType || ''}"`,
// //       `"${item.ThesisType || ''}"`,
// //     `"${item.systemRegistrationDate || ''}"`,
// //     item.approvedAmount || 0,
// //     `${item.percentage || 0}%`,
// //     item.professorAmount || 0
// //   ]);

// //   // تبدیل به رشته CSV
// //   const csvContent = BOM + 
// //     headers.join(',') + '\n' + 
// //     rows.map(row => row.join(',')).join('\n');

// //   // ایجاد blob با encoding صحیح
// //   const blob = new Blob([csvContent], { 
// //     type: 'text/csv;charset=utf-8;' 
// //   });

// //   // ایجاد لینک دانلود
// //   const link = document.createElement('a');
// //   const url = URL.createObjectURL(blob);
  
// //   const persianDate = new Date().toLocaleDateString('fa-IR', {
// //     year: 'numeric',
// //     month: '2-digit',
// //     day: '2-digit'
// //   }).replace(/\//g, '-');
  
// //   link.href = url;
// //   link.setAttribute('download', `گزارش_پارسا_${persianDate}.csv`);
// //   document.body.appendChild(link);
// //   link.click();
// //   document.body.removeChild(link);
  
// //   addNotification({
// //     type: "success",
// //     text: "فایل CSV با موفقیت دانلود شد"
// //   });
// // };


// // تابع بهبود یافته برای خروجی CSV
// const exportToExcelImproved = () => {
//   if (filteredData.length === 0) {
//     addNotification({
//       type: "warning",
//       text: "داده‌ای برای خروجی وجود ندارد"
//     });
//     return;
//   }

//   // اضافه کردن BOM برای UTF-8
//   const BOM = "\uFEFF";
  
//   const headers = [
//     "نام استاد",
//     "کد ملی استاد",
//     "نام دانشجو",
//     "مقطع",
//     "دانشکده",
//     "عنوان پایان‌نامه",
//     "نوع پارسا",
//     "نوع پایان نامه یا رساله",
//     "تاریخ تصویب  پارسا",
//     "تاریخ ثبت در سیستم",
//     "مبلغ مصوب (ریال)",
//     "درصد مشارکت",
//     "مبلغ سهم استاد (ریال)"
//   ];

//   // ایجاد داده‌های CSV با فرمت صحیح
//   const rows = filteredData.map(item => {
//     // تبدیل مقدار parsaType به متن فارسی
//     let parsaTypeText = "";
//     if (item.parsaType === 'p') {
//       parsaTypeText = "پایان نامه";
//     } else if (item.parsaType === 'r') {
//       parsaTypeText = "رساله";
//     } else {
//       parsaTypeText = item.parsaType || "";
//     }

//     return [
//       `"${item.professorName || ''}"`,
//       `"${item.nationalCode || ''}"`,
//       `"${item.studentName || ''}"`,
//       `"${item.levelName || ''}"`,
//       `"${item.facultyName || ''}"`,
//       `"${item.title || ''}"`,
//       `"${parsaTypeText}"`,
//       `"${item.ThesisType || ''}"`,
//        `"${item.approvalDate || ''}"`,
//       `"${item.systemRegistrationDate || ''}"`,
//       item.approvedAmount || 0,
//       `${item.percentage || 0}%`,
//       item.professorAmount || 0
//     ];
//   });

//   // تبدیل به رشته CSV
//   const csvContent = BOM + 
//     headers.join(',') + '\n' + 
//     rows.map(row => row.join(',')).join('\n');

//   // ایجاد blob با encoding صحیح
//   const blob = new Blob([csvContent], { 
//     type: 'text/csv;charset=utf-8;' 
//   });

//   // ایجاد لینک دانلود
//   const link = document.createElement('a');
//   const url = URL.createObjectURL(blob);
  
//   const persianDate = new Date().toLocaleDateString('fa-IR', {
//     year: 'numeric',
//     month: '2-digit',
//     day: '2-digit'
//   }).replace(/\//g, '-');
  
//   link.href = url;
//   link.setAttribute('download', `گزارش_پارسا_${persianDate}.csv`);
//   document.body.appendChild(link);
//   link.click();
//   document.body.removeChild(link);
  
//   addNotification({
//     type: "success",
//     text: "فایل CSV با موفقیت دانلود شد"
//   });
// };
//   if (selectedRole !== "کارشناس پژوهشی معاونت پژوهشی") {
//     return (
//       <div className={Styles.container}>
//         <div className={Styles.accessDenied}>
//           <h2>دسترسی غیرمجاز</h2>
//           <p>شما مجوز دسترسی به این بخش را ندارید.</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className={Styles.container}>
//       <h2 className={Styles.title}>گزارش پارساها</h2>
     
//       {/* فیلتر تاریخ */}
//       <div className={Styles.dateFilter}>
//          <h4>تاریخ ثبت در سیستم:</h4>
//          <label>از تاریخ:</label>
//         <div className={Styles.datePickerGroup}>
         
//           <DatePicker
//             value={startDate}
//             onChange={setStartDate}
//             calendar={persian}
//             locale={persian_fa}
//             format="YYYY/MM/DD"
//             placeholder="انتخاب تاریخ شروع"
//             className={Styles.datePicker}
//           />
//         </div>
//         <label>تا تاریخ:</label>
//         <div className={Styles.datePickerGroup}>
          
//           <DatePicker
//             value={endDate}
//             onChange={setEndDate}
//             calendar={persian}
//             locale={persian_fa}
//             format="YYYY/MM/DD"
//             placeholder="انتخاب تاریخ پایان"
//             className={Styles.datePicker}
//           />
//         </div>
        
//         <button
//           onClick={fetchReport}
//           className={`${Styles.searchButton} ${(!startDate || !endDate) ? Styles.disabled : ""}`}
//           disabled={!startDate || !endDate || loading}
//         >
//           {loading ? <Loader size="small" /> : <><FaSearch /> مشاهده لیست</>}
//         </button>
//       </div>

//       {/* جستجو و عملیات */}
//       {reportData.length > 0 && (
//         <div className={Styles.actions}>
//           <div className={Styles.searchBox}>
//             <input
//               type="text"
//               placeholder="جستجو بر اساس نام استاد، کد ملی یا نام دانشجو..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className={Styles.searchInput}
//             />
//           </div>
          
//           <div className={Styles.actionButtons}>
//             <button
//               onClick={exportToExcelImproved}
//               className={Styles.exportButton}
//               disabled={filteredData.length === 0}
//             >
//               <FaFileExcel /> خروجی اکسل
//             </button>
            
//             <button
//               onClick={() => setShowExportGuide(!showExportGuide)}
//               className={Styles.guideButton}
//               title="راهنمای باز کردن فایل اکسل"
//             >
//               <FaQuestionCircle /> راهنمای باز کردن فایل
//             </button>
//           </div>
//         </div>
//       )}

//       {/* نمایش راهنمای باز کردن فایل */}
//       {showExportGuide && <ExcelExportGuide />}

//       {/* جدول گزارش */}
//       {loading ? (
//         <div className={Styles.loadingContainer}>
//           <Loader />
//           <p>در حال دریافت گزارش...</p>
//         </div>
//       ) : (
//         reportData.length > 0 && (
//           <>
//             <div className={Styles.tableContainer}>
//               <table className={Styles.reportTable}>
//                 <thead>
//                   <tr>
//                     <th>ردیف</th>
//                     <th>کد ملی استاد</th>
//                     <th>نام و نام خانوادگی استاد</th>
                    
//                     <th>نام دانشجو</th>
//                     <th>مقطع تحصیلی</th>
//                     <th>دانشکده</th>
//                     <th>عنوان پایان‌نامه</th>
//                       <th>نوع پارسا</th>
//                        <th>نوع پایان نامه یا رساله</th>
//                         <th>تاریخ تصویب پارسا</th>
//                     <th>تاریخ ثبت در سیستم</th>
//                     <th>مبلغ مصوب (ریال)</th>
//                     <th>درصد مشارکت</th>
//                     <th>مبلغ سهم استاد (ریال)</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {currentItems.length > 0 ? (
//                     currentItems.map((item, index) => (
//                       <tr key={index}>
//                         <td>{toPersianNum(indexOfFirstItem + index + 1)}</td>
//                         <td>{item.nationalCode}</td>
//                         <td>{item.professorName}</td>
//                         <td>{item.studentName}</td>
//                         <td>{item.levelName}</td>
//                            <td>{item.facultyName}</td>
//                         <td>{item.title}</td>
//                          <td>{item.parsaType=='p'?'پایان نامه':'رساله'}</td>
//                          <td>{item.ThesisType}</td>
//                              <td>{toPersianNum(item.approvalDate)}</td>
//                         <td>{toPersianNum(item.systemRegistrationDate)}</td>
//                         <td>{toPersianNum(item.approvedAmount?.toLocaleString())}</td>
//                         <td>{toPersianNum(item.percentage)}%</td>
//                         <td>{toPersianNum(item.professorAmount?.toLocaleString())}</td>
//                       </tr>
//                     ))
//                   ) : (
//                     <tr>
//                       <td colSpan="9" className={Styles.noResults}>
//                         موردی یافت نشد
//                       </td>
//                     </tr>
//                   )}
//                 </tbody>
//               </table>
//             </div>

//             {/* صفحه‌بندی */}
//             {totalPages > 1 && (
//               <div className={Styles.pagination}>
//                 <button
//                   onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
//                   disabled={currentPage === 1}
//                   className={Styles.pageButton}
//                 >
//                   قبلی
//                 </button>
                
//                 <span className={Styles.pageInfo}>
//                   صفحه {toPersianNum(currentPage)} از {toPersianNum(totalPages)}
//                 </span>
                
//                 <button
//                   onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
//                   disabled={currentPage === totalPages}
//                   className={Styles.pageButton}
//                 >
//                   بعدی
//                 </button>
//               </div>
//             )}

//             {/* خلاصه گزارش */}
//             <div className={Styles.summary}>
//               <div className={Styles.summaryItem}>
//                 <span>تعداد رکوردها:</span>
//                 <strong>{toPersianNum(filteredData.length)}</strong>
//               </div>
//               <div className={Styles.summaryItem}>
//                 <span>مجموع مبلغ مصوب:</span>
//                 <strong>
//                   {toPersianNum(
//                     filteredData.reduce((sum, item) => sum + (item.approvedAmount || 0), 0).toLocaleString()
//                   )} ریال
//                 </strong>
//               </div>
//               <div className={Styles.summaryItem}>
//                 <span>مجموع مبلغ اساتید:</span>
//                 <strong>
//                   {toPersianNum(
//                     filteredData.reduce((sum, item) => sum + (item.professorAmount || 0), 0).toLocaleString()
//                   )} ریال
//                 </strong>
//               </div>
//             </div>
//           </>
//         )
//       )}

//       {/* پیام خالی */}
//       {reportData.length === 0 && !loading && (
//         <div className={Styles.emptyState}>
//           <p>برای مشاهده گزارش، بازه تاریخ را انتخاب و دکمه "مشاهده لیست" را کلیک کنید.</p>
//         </div>
//       )}
//     </div>
//   );
// }

// export default ParsaReport;



import { useState, useEffect } from "react";
import Styles from "./ParsaReport.module.css";
import axios from "axios";
import serverAddress from "./constants/contants";
import { useAuth } from "./AuthContext";
import { useNotification } from "./contexts/NotificationContext";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import Loader from "../src/components/Loader";
import { toPersianNum } from "./helpers/toPersianNum";
import { FaSearch, FaFileExcel, FaQuestionCircle, FaTimes, FaCheckSquare, FaSquare, FaCalendarPlus } from "react-icons/fa";

function ParsaReport() {
  const { user, selectedRole } = useAuth();
  const { addNotification } = useNotification();
  
  // حالت‌های تاریخ
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  
  // داده‌های گزارش
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filteredData, setFilteredData] = useState([]);
  
  // فیلترها
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // حالت برای نمایش/پنهان کردن راهنما
  const [showExportGuide, setShowExportGuide] = useState(false);
  
  // حالت‌های جدید برای انتخاب چندتایی
  const [selectedItems, setSelectedItems] = useState(new Set()); // ذخیره ThesisIDهای انتخاب شده
  const [selectAll, setSelectAll] = useState(false);
  const [showExpirySection, setShowExpirySection] = useState(false);
  const [expiryDate, setExpiryDate] = useState(null);
  const [updatingExpiry, setUpdatingExpiry] = useState(false);

  // بررسی دسترسی نقش
  useEffect(() => {
    if (selectedRole !== "کارشناس پژوهشی معاونت پژوهشی") {
      addNotification({
        type: "error",
        text: "شما دسترسی به این بخش را ندارید"
      });
    }
  }, [selectedRole, addNotification]);

  // تابع برای دریافت گزارش
  const fetchReport = async () => {
    if (!startDate || !endDate) {
      addNotification({
        type: "error",
        text: "لطفاً بازه تاریخ را انتخاب کنید"
      });
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      const formattedStartDate = startDate
        .setDigits(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"])
        .format("YYYY/MM/DD");
      
      const formattedEndDate = endDate
        .setDigits(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"])
        .format("YYYY/MM/DD");

      const response = await axios.get(
        `${serverAddress}/parsa-report`,
        {
          params: {
            startDate: formattedStartDate,
            endDate: formattedEndDate
          },
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setReportData(response.data);
      setFilteredData(response.data);
      setCurrentPage(1);
      // ریست انتخاب‌ها هنگام دریافت داده جدید
      setSelectedItems(new Set());
      setSelectAll(false);
      
      addNotification({
        type: "success",
        text: "گزارش با موفقیت دریافت شد"
      });
    } catch (error) {
      console.error("Error fetching report:", error);
      addNotification({
        type: "error",
        text: "خطا در دریافت گزارش: " + (error.response?.data?.message || error.message)
      });
    } finally {
      setLoading(false);
    }
  };

  // فیلتر کردن داده‌ها
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredData(reportData);
    } else {
      const filtered = reportData.filter(item =>
        item.professorName?.includes(searchTerm) ||
        item.nationalCode?.includes(searchTerm) ||
        item.studentName?.includes(searchTerm) ||
        item.title?.includes(searchTerm)
      );
      setFilteredData(filtered);
    }
    // ریست انتخاب‌ها هنگام تغییر فیلتر
    setSelectedItems(new Set());
    setSelectAll(false);
  }, [searchTerm, reportData]);

  // محاسبه صفحات
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // تابع برای تغییر وضعیت انتخاب یک آیتم
  const toggleSelectItem = (thesisId) => {
  const newSelected = new Set(selectedItems);
  if (newSelected.has(thesisId)) {
    newSelected.delete(thesisId);
  } else {
    newSelected.add(thesisId);
  }
  setSelectedItems(newSelected);
  // بررسی می‌کنیم که آیا همه آیتم‌های فیلتر شده انتخاب شده‌اند
  const allCurrentIds = filteredData.map(item => item.ThesisID);
  const allSelected = allCurrentIds.length > 0 && allCurrentIds.every(id => newSelected.has(id));
  setSelectAll(allSelected);
};

  // تابع برای انتخاب/عدم انتخاب همه آیتم‌های فیلتر شده
  const toggleSelectAll = () => {
  if (selectAll) {
    // اگر همه انتخاب شده بودند، همه را لغو انتخاب کن
    setSelectedItems(new Set());
    setSelectAll(false);
  } else {
    // اگر همه انتخاب نشده بودند، همه را انتخاب کن
    const allIds = filteredData.map(item => item.ThesisID);
    setSelectedItems(new Set(allIds));
    setSelectAll(true);
  }
};

  // تابع برای اعمال تاریخ انقضا به آیتم‌های انتخاب شده
//   const applyExpiryDate = async () => {
//     if (selectedItems.size === 0) {
//       addNotification({
//         type: "warning",
//         text: "هیچ پایان‌نامه‌ای انتخاب نشده است"
//       });
//       return;
//     }

//     if (!expiryDate) {
//       addNotification({
//         type: "error",
//         text: "لطفاً تاریخ انقضا را انتخاب کنید"
//       });
//       return;
//     }

//     try {
//       setUpdatingExpiry(true);
//       const token = localStorage.getItem("token");
//       const formattedExpiryDate = expiryDate
//         .setDigits(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"])
//         .format("YYYY/MM/DD");

//       const thesisIds = Array.from(selectedItems);
      
//       const response = await axios.put(
//         `${serverAddress}/parsa-report/update-expiry`,
//         {
//           thesisIds: thesisIds,
//           expiryDate: formattedExpiryDate
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//             'Content-Type': 'application/json'
//           }
//         }
//       );

//       addNotification({
//         type: "success",
//         text: response.data.message || `تاریخ انقضا برای ${selectedItems.size} پایان‌نامه با موفقیت ثبت شد`
//       });

//       // ریست انتخاب‌ها
//       setSelectedItems(new Set());
//       setSelectAll(false);
//       setExpiryDate(null);
//       setShowExpirySection(false);
      
//       // به‌روزرسانی گزارش
//       await fetchReport();
      
//     } catch (error) {
//       console.error("Error updating expiry dates:", error);
//       addNotification({
//         type: "error",
//         text: "خطا در ثبت تاریخ انقضا: " + (error.response?.data?.message || error.message)
//       });
//     } finally {
//       setUpdatingExpiry(false);
//     }
//   };
// تابع applyExpiryDate اصلاح شده
// const applyExpiryDate = async () => {
//   if (selectedItems.size === 0) {
//     addNotification({
//       type: "warning",
//       text: "هیچ پایان‌نامه‌ای انتخاب نشده است"
//     });
//     return;
//   }

//   if (!expiryDate) {
//     addNotification({
//       type: "error",
//       text: "لطفاً تاریخ پایان اعتبار را انتخاب کنید"
//     });
//     return;
//   }

//   try {
//     setUpdatingExpiry(true);
//     const token = localStorage.getItem("token");
//     const formattedExpiryDate = expiryDate
//       .setDigits(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"])
//       .format("YYYY/MM/DD");

//     // تبدیل Set به Array و فیلتر کردن مقادیر معتبر
//     const thesisIds = Array.from(selectedItems).filter(id => id != null);
    
//     console.log('Selected Thesis IDs:', thesisIds); // برای دیباگ
    
//     if (thesisIds.length === 0) {
//       addNotification({
//         type: "error",
//         text: "هیچ شناسه معتبری برای پایان‌نامه‌ها وجود ندارد"
//       });
//       return;
//     }
    
//     const response = await axios.put(
//       `${serverAddress}/parsa-report/update-expiry`,
//       {
//         thesisIds: thesisIds,
//         expiryDate: formattedExpiryDate
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         }
//       }
//     );

//     addNotification({
//       type: "success",
//       text: response.data.message
//     });

//     // ریست انتخاب‌ها
//     setSelectedItems(new Set());
//     setSelectAll(false);
//     setExpiryDate(null);
//     setShowExpirySection(false);
    
//     // به‌روزرسانی گزارش
//     await fetchReport();
    
//   } catch (error) {
//     console.error("Error updating expiry dates:", error);
//     addNotification({
//       type: "error",
//       text: "خطا در ثبت تاریخ پایان اعتبار: " + (error.response?.data?.message || error.message)
//     });
//   } finally {
//     setUpdatingExpiry(false);
//   }
// };

// تابع applyExpiryDate اصلاح شده با تاییدیه
const applyExpiryDate = async () => {
  if (selectedItems.size === 0) {
    addNotification({
      type: "warning",
      text: "هیچ پایان‌نامه‌ای انتخاب نشده است"
    });
    return;
  }

  if (!expiryDate) {
    addNotification({
      type: "error",
      text: "لطفاً تاریخ پایان اعتبار را انتخاب کنید"
    });
    return;
  }

  // نمایش پیام تایید
  const formattedDate = expiryDate
    .setDigits(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"])
    .format("YYYY/MM/DD");
  
  const isConfirmed = window.confirm(
    `آیا از اعمال تاریخ پایان اعتبار به ${selectedItems.size} پایان‌نامه انتخاب شده اطمینان دارید؟\n\n` +
    `تاریخ انتخاب شده: ${formattedDate}\n\n` +
    `این عملیات غیرقابل بازگشت است.`
  );

  if (!isConfirmed) {
    addNotification({
      type: "info",
      text: "عملیات لغو شد"
    });
    return;
  }

  try {
    setUpdatingExpiry(true);
    const token = localStorage.getItem("token");
    const formattedExpiryDate = expiryDate
      .setDigits(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"])
      .format("YYYY/MM/DD");

    const thesisIds = Array.from(selectedItems).filter(id => id != null);
    
    console.log('Selected Thesis IDs:', thesisIds);
    
    if (thesisIds.length === 0) {
      addNotification({
        type: "error",
        text: "هیچ شناسه معتبری برای پایان‌نامه‌ها وجود ندارد"
      });
      return;
    }
    
    const response = await axios.put(
      `${serverAddress}/parsa-report/update-expiry`,
      {
        thesisIds: thesisIds,
        expiryDate: formattedExpiryDate
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    addNotification({
      type: "success",
      text: response.data.message || `تاریخ پایان اعتبار برای ${selectedItems.size} پایان‌نامه با موفقیت ثبت شد`
    });

    // ریست انتخاب‌ها
    setSelectedItems(new Set());
    setSelectAll(false);
    setExpiryDate(null);
    setShowExpirySection(false);
    
    // به‌روزرسانی گزارش
    await fetchReport();
    
  } catch (error) {
    console.error("Error updating expiry dates:", error);
    addNotification({
      type: "error",
      text: "خطا در ثبت تاریخ پایان اعتبار: " + (error.response?.data?.message || error.message)
    });
  } finally {
    setUpdatingExpiry(false);
  }
};
  // تابع برای پاک کردن انتخاب‌ها
  const clearSelection = () => {
  setSelectedItems(new Set());
  setSelectAll(false);
};

// اضافه کردن useEffect برای همگام‌سازی selectAll وقتی filteredData تغییر می‌کند
useEffect(() => {
  // وقتی داده‌های فیلتر شده تغییر می‌کنند، وضعیت selectAll را بررسی کن
  if (filteredData.length > 0 && selectedItems.size > 0) {
    const allCurrentIds = filteredData.map(item => item.ThesisID);
    const allSelected = allCurrentIds.length > 0 && allCurrentIds.every(id => selectedItems.has(id));
    setSelectAll(allSelected);
  } else if (filteredData.length === 0) {
    setSelectAll(false);
  }
}, [filteredData, selectedItems]);
  const ExcelExportGuide = () => (
    <div className={Styles.exportGuide}>
      <div className={Styles.exportGuideHeader}>
        <h4>راهنمای باز کردن فایل در Excel:</h4>
        <button 
          className={Styles.closeGuideButton}
          onClick={() => setShowExportGuide(false)}
          aria-label="بستن راهنما"
        >
          <FaTimes />
        </button>
      </div>
      <ol>
        <li>فایل CSV را در Excel باز کنید</li>
        <li>به تب <strong>Data</strong> بروید</li>
        <li>روی <strong>From Text/CSV</strong> کلیک کنید</li>
        <li>فایل را انتخاب و دکمه <strong>Import</strong> را بزنید</li>
        <li>در پنجره Import، Encoding را روی <strong>65001: Unicode (UTF-8)</strong> تنظیم کنید</li>
        <li>Delimiter را <strong>Comma</strong> انتخاب کنید</li>
        <li>دکمه <strong>Load</strong> را بزنید</li>
      </ol>
    </div>
  );

  // تابع برای خروجی CSV
  const exportToExcelImproved = () => {
    if (filteredData.length === 0) {
      addNotification({
        type: "warning",
        text: "داده‌ای برای خروجی وجود ندارد"
      });
      return;
    }

    const BOM = "\uFEFF";
    
    const headers = [
    //   "شناسه پایان‌نامه",
      "نام استاد",
      "کد ملی استاد",
      "نام دانشجو",
      "مقطع",
      "دانشکده",
      "عنوان پایان‌نامه",
      "نوع پارسا",
      "نوع پایان نامه یا رساله",
      "تاریخ تصویب پارسا",
      "تاریخ ثبت در سیستم",
      "تاریخ پایان اعتبار",
      "مبلغ مصوب (ریال)",
      "درصد مشارکت",
      "مبلغ سهم استاد (ریال)"
    ];

    const rows = filteredData.map(item => {
      let parsaTypeText = "";
      if (item.parsaType === 'p') {
        parsaTypeText = "پایان نامه";
      } else if (item.parsaType === 'r') {
        parsaTypeText = "رساله";
      } else {
        parsaTypeText = item.parsaType || "";
      }

      return [
        // `"${item.ThesisID || ''}"`,
        `"${item.professorName || ''}"`,
        `"${item.nationalCode || ''}"`,
        `"${item.studentName || ''}"`,
        `"${item.levelName || ''}"`,
        `"${item.facultyName || ''}"`,
        `"${item.title || ''}"`,
        `"${parsaTypeText}"`,
        `"${item.ThesisType || ''}"`,
        `"${item.approvalDate || ''}"`,
        `"${item.systemRegistrationDate || ''}"`,
        `"${item.expiryDate || ''}"`,
        item.approvedAmount || 0,
        `${item.percentage || 0}%`,
        item.professorAmount || 0
      ];
    });

    const csvContent = BOM + 
      headers.join(',') + '\n' + 
      rows.map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const persianDate = new Date().toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-');
    
    link.href = url;
    link.setAttribute('download', `گزارش_پارسا_${persianDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addNotification({
      type: "success",
      text: "فایل CSV با موفقیت دانلود شد"
    });
  };

  if (selectedRole !== "کارشناس پژوهشی معاونت پژوهشی") {
    return (
      <div className={Styles.container}>
        <div className={Styles.accessDenied}>
          <h2>دسترسی غیرمجاز</h2>
          <p>شما مجوز دسترسی به این بخش را ندارید.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={Styles.container}>
      <h2 className={Styles.title}>گزارش پارساها</h2>
     
      {/* فیلتر تاریخ */}
      <div className={Styles.dateFilter}>
        <h4>تاریخ ثبت در سیستم:</h4>
        <label>از تاریخ:</label>
        <div className={Styles.datePickerGroup}>
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
        <label>تا تاریخ:</label>
        <div className={Styles.datePickerGroup}>
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
          onClick={fetchReport}
          className={`${Styles.searchButton} ${(!startDate || !endDate) ? Styles.disabled : ""}`}
          disabled={!startDate || !endDate || loading}
        >
          {loading ? <Loader size="small" /> : <><FaSearch /> مشاهده لیست</>}
        </button>
      </div>

      {/* بخش انتخاب تاریخ انقضا */}
      {reportData.length > 0 && (
        <div className={Styles.expirySection}>
          <div className={Styles.expiryControls}>
            <div className={Styles.expiryDatePicker}>
              <label>تاریخ پایان اعتبار:</label>
              <DatePicker
                value={expiryDate}
                onChange={setExpiryDate}
                calendar={persian}
                locale={persian_fa}
                format="YYYY/MM/DD"
                placeholder="انتخاب تاریخ پایان اعتبار"
                className={Styles.datePicker}
              />
            </div>
            <div className={Styles.expiryActions}>
              <button
                onClick={applyExpiryDate}
                className={Styles.applyExpiryButton}
                disabled={selectedItems.size === 0 || !expiryDate || updatingExpiry}
              >
                {updatingExpiry ? <Loader size="small" /> : <><FaCalendarPlus /> اعمال تاریخ پایان اعتبار به انتخاب‌ها</>}
              </button>
              <button
                onClick={() => {
                  clearSelection();
                  setShowExpirySection(!showExpirySection);
                }}
                className={Styles.clearSelectionButton}
              >
                {showExpirySection ? "بستن" : <><FaCalendarPlus /> تنظیم تاریخ پایان اعتبار</>}
              </button>
            </div>
          </div>
          {showExpirySection && selectedItems.size > 0 && (
            <div className={Styles.selectionInfo}>
              <span className={Styles.selectedCount}>{toPersianNum(selectedItems.size)}</span> پایان‌نامه انتخاب شده است
            </div>
          )}
        </div>
      )}

      {/* جستجو و عملیات */}
      {reportData.length > 0 && (
        <div className={Styles.actions}>
          <div className={Styles.searchBox}>
            <input
              type="text"
              placeholder="جستجو بر اساس نام استاد، کد ملی یا نام دانشجو..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={Styles.searchInput}
            />
          </div>
          
          <div className={Styles.actionButtons}>
            <button
              onClick={exportToExcelImproved}
              className={Styles.exportButton}
              disabled={filteredData.length === 0}
            >
              <FaFileExcel /> خروجی اکسل
            </button>
            
            <button
              onClick={() => setShowExportGuide(!showExportGuide)}
              className={Styles.guideButton}
              title="راهنمای باز کردن فایل اکسل"
            >
              <FaQuestionCircle /> راهنمای باز کردن فایل
            </button>
          </div>
        </div>
      )}

      {/* نمایش راهنمای باز کردن فایل */}
      {showExportGuide && <ExcelExportGuide />}

      {/* جدول گزارش */}
      {loading ? (
        <div className={Styles.loadingContainer}>
          <Loader />
          <p>در حال دریافت گزارش...</p>
        </div>
      ) : (
        reportData.length > 0 && (
          <>
            <div className={Styles.tableContainer}>
              <table className={Styles.reportTable}>
                <thead>
                  <tr>
                    <th>
                      <button
                        onClick={toggleSelectAll}
                        className={Styles.checkboxButton}
                        title={selectAll ? "عدم انتخاب همه" : "انتخاب همه"}
                      >
                        {selectAll ? <FaCheckSquare /> : <FaSquare />}
                      </button>
                    </th>
                    <th>ردیف</th>
                    {/* <th>شناسه پایان‌نامه</th> */}
                    <th>کد ملی استاد</th>
                    <th>نام و نام خانوادگی استاد</th>
                    <th>نام دانشجو</th>
                    <th>مقطع تحصیلی</th>
                    <th>دانشکده</th>
                    <th>عنوان پایان‌نامه</th>
                    <th>نوع پارسا</th>
                    <th>نوع پایان نامه یا رساله</th>
                    <th>تاریخ تصویب پارسا</th>
                    <th>تاریخ ثبت در سیستم</th>
                    <th>تاریخ ‍پایان اعتبار</th>
                    <th>مبلغ مصوب (ریال)</th>
                    <th>درصد مشارکت</th>
                    <th>مبلغ سهم استاد (ریال)</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length > 0 ? (
                    currentItems.map((item, index) => (
                      <tr key={item.ThesisID} className={selectedItems.has(item.ThesisID) ? Styles.selectedRow : ""}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.ThesisID)}
                            onChange={() => toggleSelectItem(item.ThesisID)}
                            className={Styles.checkbox}
                          />
                        </td>
                        <td>{toPersianNum(indexOfFirstItem + index + 1)}</td>
                        {/* <td>{item.ThesisID}</td> */}
                        <td>{item.nationalCode}</td>
                        <td>{item.professorName}</td>
                        <td>{item.studentName}</td>
                        <td>{item.levelName}</td>
                        <td>{item.facultyName}</td>
                        <td>{item.title}</td>
                        <td>{item.parsaType == 'p' ? 'پایان نامه' : 'رساله'}</td>
                        <td>{item.ThesisType}</td>
                        <td>{toPersianNum(item.approvalDate)}</td>
                        <td>{toPersianNum(item.systemRegistrationDate)}</td>
                        <td className={item.expiryDate ? Styles.hasExpiryDate : ""}>
                          {item.expiryDate ? toPersianNum(item.expiryDate) : "—"}
                        </td>
                        <td>{toPersianNum(item.approvedAmount?.toLocaleString())}</td>
                        <td>{toPersianNum(item.percentage)}%</td>
                        <td>{toPersianNum(item.professorAmount?.toLocaleString())}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="17" className={Styles.noResults}>
                        موردی یافت نشد
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* صفحه‌بندی */}
            {totalPages > 1 && (
              <div className={Styles.pagination}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={Styles.pageButton}
                >
                  قبلی
                </button>
                
                <span className={Styles.pageInfo}>
                  صفحه {toPersianNum(currentPage)} از {toPersianNum(totalPages)}
                </span>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={Styles.pageButton}
                >
                  بعدی
                </button>
              </div>
            )}

            {/* خلاصه گزارش */}
            <div className={Styles.summary}>
              <div className={Styles.summaryItem}>
                <span>تعداد رکوردها:</span>
                <strong>{toPersianNum(filteredData.length)}</strong>
              </div>
              <div className={Styles.summaryItem}>
                <span>تعداد انتخاب شده:</span>
                <strong className={Styles.selectedCount}>{toPersianNum(selectedItems.size)}</strong>
              </div>
              <div className={Styles.summaryItem}>
                <span>مجموع مبلغ مصوب:</span>
                <strong>
                  {toPersianNum(
                    filteredData.reduce((sum, item) => sum + (item.approvedAmount || 0), 0).toLocaleString()
                  )} ریال
                </strong>
              </div>
              <div className={Styles.summaryItem}>
                <span>مجموع مبلغ اساتید:</span>
                <strong>
                  {toPersianNum(
                    filteredData.reduce((sum, item) => sum + (item.professorAmount || 0), 0).toLocaleString()
                  )} ریال
                </strong>
              </div>
            </div>
          </>
        )
      )}

      {/* پیام خالی */}
      {reportData.length === 0 && !loading && (
        <div className={Styles.emptyState}>
          <p>برای مشاهده گزارش، بازه تاریخ را انتخاب و دکمه "مشاهده لیست" را کلیک کنید.</p>
        </div>
      )}
    </div>
  );
}

export default ParsaReport;
