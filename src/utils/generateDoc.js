import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";
import { toast } from "react-toastify";

const generateDoc = async (data) => {
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
    toast.error("خطا در تولید فایل:", error);
    if (error.properties && error.properties.errors) {
      toast.error(
        "جزئیات خطاها:",
        JSON.stringify(error.properties.errors, null, 2)
      );
    }
  }
};

export { generateDoc };
