const fs = require('fs');
const pdfParse = require('pdf-parse');
let buf1 = fs.readFileSync('Panduan_Copywriting_SapaTamu_v2.pdf');
let buf2 = fs.readFileSync('Strategi_Brand_Awareness_SapaTamu.pdf');

pdfParse(buf1).then(data => {
    console.log("=== PANDUAN COPYWRITING ===");
    console.log(data.text);
    return pdfParse(buf2);
}).then(data => {
    console.log("=== STRATEGI BRAND AWARENESS ===");
    console.log(data.text);
}).catch(err => {
    console.error(err);
});
