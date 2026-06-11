import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";

function Docx({ data }) {
  const generateDoc = async () => {
    try {
      const templateContent = await fetch("/template.docx").then((res) =>
        res.arrayBuffer()
      );

      const zip = new PizZip(templateContent);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      doc.setData(data);
      doc.render();

      const out = doc.getZip().generate({
        type: "blob",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      saveAs(out, "پژوهانه.docx");
    } catch (error) {
      console.error("خطا در تولید فایل:", error);
      if (error.properties && error.properties.errors) {
        console.log(
          "جزئیات خطاها:",
          JSON.stringify(error.properties.errors, null, 2)
        );
      }
    }
  };

  return (
    <div>
      <button onClick={generateDoc}>دانلود فایل Word</button>
    </div>
  );
}

export default Docx;
