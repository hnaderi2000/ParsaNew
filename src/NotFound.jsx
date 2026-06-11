import { Link } from "react-router-dom";
import Styles from "./NotFound.module.css";
import { IoMdArrowRoundBack } from "react-icons/io";
function NotFound() {
  return (
    <div className={Styles.container}>
      <div>¯\\_(ツ)_/¯</div>
      <p>صفحه درخواستی شما یافت نشد.</p>
      <Link to="/login" replace>
        <IoMdArrowRoundBack />
        بازگشت به صفحه ورود
      </Link>
    </div>
  );
}

export default NotFound;
