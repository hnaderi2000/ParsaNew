import Styles from "./NewExpense.module.css";

function NewExpense({ setNewExpense }) {
  return (
    <div className={Styles.container}>
      <div className={Styles.form}>
        <h2 className={Styles.formHeader}>فرم ثبت هزینه کرد جدید</h2>
        {/* inputs go here */}
        <div className={Styles.formDown}>
          <button>تأیید</button>
          <button onClick={() => setNewExpense(false)}>انصراف</button>
        </div>
      </div>
    </div>
  );
}

export default NewExpense;
