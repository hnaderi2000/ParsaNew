import { useEffect, useState } from "react";
import Styles from "./ProfileDetails.module.css";
import ChangePassword from "./ChangePassword";
import img from "./assets/sampleProfile.jpg"
// importing icons
import {
  FaUserGear,
  FaRegIdCard,
  FaMobileScreenButton,
  FaBuilding,
} from "react-icons/fa6";
import { IoMdArrowRoundBack } from "react-icons/io";
import { TbLockPassword } from "react-icons/tb";

function ProfileDetails({ setIsProfileShown, user }) {
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsProfileShown(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const { id, userName, firstName, lastName, nationalCode, roles,PhoneNumber } = user;
  console.log(user);

  return (
    <div className={Styles.container}>
      {showChangePassword ? (
        <ChangePassword onClose={() => setShowChangePassword(false)} />
      ) : (
        <div className={Styles.window}>
          <div className={Styles.card}>
            {/* right section */}
            <div className={Styles.right}>
              <img src={img} alt="ProfileImage" />
              <sub>
                {userName}
                {id}
              </sub>
            </div>
            {/* left section */}
            <div className={Styles.left}>
              <h2>{`${firstName} ${lastName}`}</h2>
              <table className={Styles.table}>
                <tbody>
                  <tr>
                    <td>
                      <FaUserGear />
                      نقش ها
                    </td>
                    <td> {user?.roles?.join("، ")}</td>
                  </tr>
                  <tr>
                    <td>
                      <FaRegIdCard />
                      کد ملی
                    </td>
                    <td>{nationalCode} </td>
                  </tr>
                  <tr>
                    <td>
                      <FaMobileScreenButton />
                      شماره همراه
                    </td>
                    <td>{PhoneNumber}</td>
                  </tr>
                  {/* <tr>
                    <td>
                      <FaBuilding />
                      دانشکده
                    </td>
                    <td>فنی مهندسی</td>
                  </tr> */}
                </tbody>
              </table>
            </div>
          </div>
          <sub>برای تغییر اطلاعات پایه به مدیر سیستم پیام دهید</sub>
          <div className={Styles.buttons}>
            <button
              className={`${Styles.button} ${Styles.changePassword}`}
              onClick={() => setShowChangePassword(true)}
            >
              <TbLockPassword />
              تغییر رمز عبور
            </button>
            <button
              className={`${Styles.button} ${Styles.close}`}
              onClick={() => {
                setIsProfileShown((p) => !p);
              }}
            >
              بازگشت
              <IoMdArrowRoundBack />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileDetails;
