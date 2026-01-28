const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'docs', 'HORARIOS SANZ.xlsx');
console.log(`Leyendo archivo: ${filePath}`);

try {
  const workbook = XLSX.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  
  const result = {};
  
  sheetNames.forEach(name => {
    const sheet = workbook.Sheets[name];
    // Convertir a JSON crudo (array de arrays) para ver estructura
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    // Tomar solo las primeras 20 filas para no saturar
    result[name] = data.slice(0, 20);
  });

  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error("Error leyendo el archivo:", error);
}
