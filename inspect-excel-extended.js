const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(process.cwd(), 'docs', 'HORARIOS SANZ.xlsx');
console.log(`Leyendo archivo: ${filePath}`);

try {
    const workbook = XLSX.readFile(filePath);
    console.log("Hojas encontradas:", workbook.SheetNames);

    const result = {};

    workbook.SheetNames.forEach(name => {
        const sheet = workbook.Sheets[name];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        // Leer filas 20 a 100
        result[name] = data.slice(20, 100);
    });

    console.log(JSON.stringify(result, null, 2));
} catch (error) {
    console.error("Error leyendo el archivo:", error);
}
