import ExcelJS from "exceljs";
import { isAdminRequest } from "@/lib/adminAuth";
import { QUIZ_TEMPLATE_HEADERS } from "@/lib/parseQuizWorkbook";

export async function GET() {
  if (!(await isAdminRequest())) {
    return Response.json({ error: "Ikke logget ind" }, { status: 401 });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Questions");
  sheet.addRow(QUIZ_TEMPLATE_HEADERS);
  sheet.addRow([
    "Hvad er hovedstaden i Danmark?",
    "København",
    "Aarhus",
    "Odense",
    "Aalborg",
    "A",
    1,
    "geography, capitals",
  ]);
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((column) => {
    column.width = 24;
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="quiz-question-template.xlsx"',
    },
  });
}
