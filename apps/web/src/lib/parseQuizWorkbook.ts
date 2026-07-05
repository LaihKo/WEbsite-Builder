import ExcelJS from "exceljs";
import type { QuestionRow } from "@quiz/core";

const HEADER_MAP: Record<string, keyof QuestionRow> = {
  question: "prompt",
  "option a": "optionA",
  "option b": "optionB",
  "option c": "optionC",
  "option d": "optionD",
  "correct answer": "correctAnswer",
  points: "points",
};

export const QUIZ_TEMPLATE_HEADERS = [
  "Question",
  "Option A",
  "Option B",
  "Option C",
  "Option D",
  "Correct Answer",
  "Points",
];

export async function parseQuizWorkbook(buffer: Buffer): Promise<QuestionRow[]> {
  const workbook = new ExcelJS.Workbook();
  // exceljs's bundled types shadow the global `Buffer` with a module-local
  // `interface Buffer extends ArrayBuffer {}`, so a real Node Buffer (what
  // `.load()` actually expects at runtime) doesn't structurally satisfy it.
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const columnByIndex = new Map<number, keyof QuestionRow>();
  sheet.getRow(1).eachCell((cell, colNumber) => {
    const key = String(cell.value ?? "")
      .trim()
      .toLowerCase();
    const field = HEADER_MAP[key];
    if (field) columnByIndex.set(colNumber, field);
  });

  const rows: QuestionRow[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const partial: Partial<QuestionRow> = {};
    columnByIndex.forEach((field, colNumber) => {
      const cellValue = row.getCell(colNumber).value;
      if (field === "points") {
        const num = typeof cellValue === "number" ? cellValue : Number(cellValue);
        if (Number.isFinite(num)) partial.points = num;
      } else {
        partial[field] = cellValue == null ? "" : String(cellValue).trim();
      }
    });

    const isBlankRow =
      !partial.prompt && !partial.optionA && !partial.optionB && !partial.optionC && !partial.optionD;
    if (isBlankRow) return;

    rows.push({
      prompt: partial.prompt ?? "",
      optionA: partial.optionA ?? "",
      optionB: partial.optionB ?? "",
      optionC: partial.optionC ?? "",
      optionD: partial.optionD ?? "",
      correctAnswer: partial.correctAnswer ?? "",
      points: partial.points,
    });
  });

  return rows;
}
