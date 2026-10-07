// import Styles from "./Sidebar.module.css";
// import ProfileDetails from "./ProfileDetails";
// import { TbLogout } from "react-icons/tb";
// import { useAuth } from "./AuthContext";
// import { useState } from "react";
// import axios from "axios";
// import serverAddress from "./constants/contants";
// import img from "./assets/sampleProfile.jpg"  
// function Sidebar({ tabs, activeTab, setActiveTab }) {
//   const { user, logout, selectedRole, changeRole, roles } = useAuth();
//   const [isProfileShown, setIsProfileShown] = useState(false);

//   const handleChangeRole = async (role) => {
//     try {
//       const token = localStorage.getItem("token");
//       const response = await axios.post(
//         `${serverAddress}/change-role`,
//         { role },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       // ذخیره توکن جدید
//       localStorage.setItem("token", response.data.token);
//       changeRole(role); // به‌روزرسانی selectedRole در AuthContext
//     } catch (err) {
//       console.error("Error changing role:", err);
//       // می‌توانید نوتیفیکیشن خطا نمایش دهید
//     }
//   };

//   const tabHandler = (event) => {
//     const li = event.target.closest("li");
//     if (!li) return;
//     const index = li.dataset.index;
//     if (index !== undefined) {
//       setActiveTab(Number(index));
//     }
//   };

//   return (
//     <div className={Styles.sidebar}>
//       <div className={Styles.profile}>
//         <img
//           src={img}
//           alt=""
//           onClick={() => {
//             setIsProfileShown((p) => !p);
//           }}
//         />
//         <p>
//           {user?.firstName} {user?.lastName} 
//         </p>

//         <div className={Styles.buttons}>
//           {/* کامبوباکس تغییر نقش */}
//           {roles?.length > 1 ? (
//             <select
//               value={selectedRole || ""}
//               onChange={(e) => handleChangeRole(e.target.value)}
//               className={Styles.roleDropdown}
//             >
//               <option value="" disabled hidden>
//                 انتخاب نقش
//               </option>
//               {roles.map((role) => (
//                 <option key={role} value={role}>
//                   {role}
//                 </option>
//               ))}
//             </select>
//           ) : (
//             <p style={{ textAlign: "center" }}>{selectedRole}</p>
//           )}

//           <button onClick={logout} className={Styles.logoutButton}>
//             <TbLogout />
//             خروج از سیستم
//           </button>

//                   <button >
           
//           راهنمای فعالسازی  ثبت هزينه كرد           </button>
//         </div>
//       </div>

//       <ul className={Styles.tabs} onClick={tabHandler}>
//         {tabs.map((tab, index) => {
//           const Icon = tab.icon;
//           return (
//             <li
//               key={index}
//               data-index={index}
//               className={activeTab == index ? Styles.activeTab : ""}
//               onClick={() => setActiveTab(index)}
//             >
//               <Icon className={Styles.icon} />
//               {tab.label}
//             </li>
//           );
//         })}
//       </ul>

//       {isProfileShown && (
//         <ProfileDetails user={user} setIsProfileShown={setIsProfileShown} />
//       )}
//     </div>
//   );
// }

// export default Sidebar;

import Styles from "./Sidebar.module.css";
import ProfileDetails from "./ProfileDetails";
import { TbLogout, TbHelp } from "react-icons/tb"; // اضافه کردن آیکون راهنما
import { useAuth } from "./AuthContext";
import { useState } from "react";
import axios from "axios";
import serverAddress from "./constants/contants";
import img from "./assets/sampleProfile.jpg";
import Help from "./Help"; // ایمپورت کامپوننت راهنما

function Sidebar({ tabs, activeTab, setActiveTab }) {
  const { user, logout, selectedRole, changeRole, roles } = useAuth();
  const [isProfileShown, setIsProfileShown] = useState(false);
  const [isHelpShown, setIsHelpShown] = useState(false); // استیت برای نمایش راهنما

  const handleChangeRole = async (role) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${serverAddress}/change-role`,
        { role },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      localStorage.setItem("token", response.data.token);
      changeRole(role);
    } catch (err) {
      console.error("Error changing role:", err);
    }
  };

  const tabHandler = (event) => {
    const li = event.target.closest("li");
    if (!li) return;
    const index = li.dataset.index;
    if (index !== undefined) {
      setActiveTab(Number(index));
    }
  };

  return (
    <div className={Styles.sidebar}>
      <div className={Styles.profile}>
        <img
          src={img}
          alt=""
          onClick={() => {
            setIsProfileShown((p) => !p);
          }}
        />
        <p>
          {user?.firstName} {user?.lastName}
        </p>

        <div className={Styles.buttons}>
          {roles?.length > 1 ? (
            <select
              value={selectedRole || ""}
              onChange={(e) => handleChangeRole(e.target.value)}
              className={Styles.roleDropdown}
            >
              <option value="" disabled hidden>
                انتخاب نقش
              </option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          ) : (
            <p style={{ textAlign: "center" }}>{selectedRole}</p>
          )}

          <button onClick={logout} className={Styles.logoutButton}>
            <TbLogout />
            خروج از سیستم
          </button>

          {/* دکمه راهنما با آیکون مناسب */}
          <button 
            onClick={() => setIsHelpShown(true)} 
            className={Styles.helpButton}
          >
            <TbHelp />
            راهنمای فعالسازی ثبت هزینه کرد
          </button>
        </div>
      </div>

      <ul className={Styles.tabs} onClick={tabHandler}>
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          return (
            <li
              key={index}
              data-index={index}
              className={activeTab == index ? Styles.activeTab : ""}
              onClick={() => setActiveTab(index)}
            >
              <Icon className={Styles.icon} />
              {tab.label}
            </li>
          );
        })}
      </ul>

      {isProfileShown && (
        <ProfileDetails user={user} setIsProfileShown={setIsProfileShown} />
      )}

      {/* نمایش کامپوننت راهنما */}
     {isHelpShown && (
  <Help onClose={() => setIsHelpShown(false)} />
)}
    </div>
  );
}

export default Sidebar;
