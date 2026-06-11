// ParsaExpenseRequest.jsx


// ثبت فونت فارسی (اختیاری - می‌توانید از فونت پیش‌فرض استفاده کنید)
// Font.register({
//   family: 'IRANSans',
//   src: '/fonts/IRANSans.ttf'
// });
// تابع تولید گزارش درخواست هزینه پارسا با استفاده از print


  // باز کردن پنجره جدید و چاپ
  const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
  printWindow.document.write(printContent);
  printWindow.document.close();
  
  // اختیاری: باز شدن خودکار دیالوگ پرینت
  printWindow.onload = function() {
    // printWindow.print();
  };

  addNotification({
    type: "success",
    text: "فرم درخواست هزینه پارسا با موفقیت ایجاد شد",
  });

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontFamily: 'Helvetica',
    direction: 'rtl',
  },
  titleContainer: {
    marginBottom: 30,
    textAlign: 'center',
  },
  bismillah: {
    fontSize: 20,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  formTitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: '#000000',
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
  },
  tableCell: {
    flex: 1,
    padding: 8,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: '#000000',
  },
  lastCell: {
    borderRightWidth: 0,
  },
  infoRow: {
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontWeight: 'bold',
  },
  totalRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#000000',
    paddingTop: 10,
  },
  signatureRow: {
    marginTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

const ParsaExpenseRequest = ({ factors, thesisInfo, studentName, professorName }) => {
  const totalAmount = factors.reduce((sum, f) => sum + f.Amount, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* بسمه تعالی */}
        <View style={styles.titleContainer}>
          <Text style={styles.bismillah}>بسمه تعالی</Text>
          <Text style={styles.formTitle}>فرم درخواست هزینه پارسا</Text>
        </View>

        {/* جدول اصلی */}
        <View style={styles.tableContainer}>
          {/* هدر جدول */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableCell}>ردیف</Text>
            <Text style={styles.tableCell}>شرح کالا</Text>
            <Text style={[styles.tableCell, styles.lastCell]}>مبلغ (ریال)</Text>
          </View>

          {/* ردیف‌های جدول */}
          {factors.map((factor, index) => (
            <View key={factor.FactorID} style={styles.tableRow}>
              <Text style={styles.tableCell}>{index + 1}</Text>
              <Text style={styles.tableCell}>{factor.Description || '-'}</Text>
              <Text style={[styles.tableCell, styles.lastCell]}>
                {factor.Amount.toLocaleString()}
              </Text>
            </View>
          ))}

          {/* جمع کل */}
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>جمع کل</Text>
            <Text style={styles.tableCell}></Text>
            <Text style={[styles.tableCell, styles.lastCell]}>
              {totalAmount.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* اطلاعات دانشجو و استاد */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>نام و نام خانوادگی دانشجو:</Text>
          <Text>{studentName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>نام و نام خانوادگی عضو هیات علمی:</Text>
          <Text>{professorName}</Text>
        </View>

        {/* امضاها */}
        <View style={styles.signatureRow}>
          <Text>امضاء دانشجو:</Text>
          <Text>امضاء استاد راهنما:</Text>
          <Text>مهر و امضاء معاونت پژوهشی:</Text>
        </View>
      </Page>
    </Document>
  );
};

export default ParsaExpenseRequest;