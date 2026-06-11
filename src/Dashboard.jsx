import { useEffect, useState } from "react";
import Styles from "./Dashboard.module.css";
import SystemVariables from "./SystemVariables";
import Thesis from "./Thesis";

import Sidebar from "./Sidebar";
// import { faUsers, faList } from "@fortawesome/free-solid-svg-icons";
import UserManagement from "./UserManagement";
import Expenses from "./Expenses";
import { useAuth } from "./AuthContext";
import ThesisList from "./ThesisList";
import Departments from "./Departments";

//importing icons
import { LuFileStack, LuReceiptText } from "react-icons/lu";
import { FaSliders, FaRegBuilding } from "react-icons/fa6";
import { FaRegFileAlt } from "react-icons/fa";
import { HiOutlineUsers } from "react-icons/hi2";
import ViewExpenseAll from "./ViewExpenseAll";
import StudentsManagement from "./StudentsManagement";
import { useNotification } from "./contexts/NotificationContext";
import ParsaReport from "./ParsaReport";

const getTabs = (user, selectedRole) => {
  const baseTabs = [
    {
      label: "پارساها",
      icon: LuFileStack,
      component: <ThesisList />,
    },

    {
      label: "هزینه کردها",
      icon: LuReceiptText,
      component: <ViewExpenseAll />,
    },
    // {
    //   label: "گزارش هزینه کردها",
    //   icon: FaRegFileAlt,
    //   component: <Expenses />,
    // },
  ];

  if (selectedRole === "مدیر سیستم") {
    baseTabs.push({
      label: "مدیریت دانشکده و گروه",
      icon: FaRegBuilding,
      component: <Departments />,
    });
  }

  if (
    ["مدیر سیستم", "کارشناس پژوهشی دانشکده"].includes(
      selectedRole
    )
  ) {
    baseTabs.push({
      label: "مدیریت دانشجویان",
      icon: HiOutlineUsers,
      component: <StudentsManagement />,
    });
  }

  if (
    ["مدیر سیستم", "مدیر امور پژوهشی", "معاون پژوهشی دانشگاه"].includes(
      selectedRole
    )
  ) {
    baseTabs.push({
      label: "مدیریت کاربران",
      icon: HiOutlineUsers,
      component: <UserManagement />,
    });
  }

  if (
    ["مدیر سیستم", "مدیر امور پژوهشی", "معاون پژوهشی دانشگاه"].includes(
      selectedRole
    )
  ) {
    baseTabs.push({
      label: "تعریف ضرایب پارساها",
      icon: FaSliders,
      component: <SystemVariables />,
    });
  }


   if (
    ["کارشناس پژوهشی معاونت پژوهشی"].includes(
      selectedRole
    )
  ) {
    baseTabs.push({
      label: "گزارش پارساها...",
      icon: FaSliders,
      component: <ParsaReport  />,
    });
  }

  return baseTabs;
};

function Dashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const { user, selectedRole } = useAuth();
  const [tabs, setTabs] = useState(() => getTabs(user, selectedRole));
 
  const { addNotification } = useNotification();

  useEffect(() => {
    addNotification({ type: "success", text: "شما با موفقیت وارد شدید" });
  }, [])

  // ✅ هر بار که selectedRole تغییر کرد، tabs را دوباره بساز
  useEffect(() => {
    const newTabs = getTabs(user, selectedRole);
    setTabs(newTabs);
    
    // اگر تب فعلی دیگر معتبر نیست، تب اول را فعال کن
    if (activeTab >= newTabs.length) {
      setActiveTab(0);
    }
  }, [selectedRole, user]);

  return (
    <div className={Styles.container}>
      <Sidebar tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className={Styles.workspace}>{tabs[activeTab].component}</div>
    </div>
  );
}

export default Dashboard;
