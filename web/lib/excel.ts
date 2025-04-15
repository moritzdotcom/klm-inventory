import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

type downloadTableAsExcelProps = {
  data: any[];
  fileName?: string;
  sheetName?: string;
};

export function downloadTableAsExcel({
  data,
  fileName = 'export.xlsx',
  sheetName = 'Sheet1',
}: downloadTableAsExcelProps) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  saveAs(blob, fileName);
}
