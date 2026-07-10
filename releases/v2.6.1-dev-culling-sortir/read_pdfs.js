const fs = require('fs');
const pdf = require('pdf-parse');

async function readPDF(filename) {
    let dataBuffer = fs.readFileSync(filename);
    try {
        let data = await pdf(dataBuffer);
        console.log(`\n\n--- CONTENTS OF ${filename} ---\n`);
        console.log(data.text);
    } catch (e) {
        console.error("Error reading " + filename, e);
    }
}

async function run() {
    await readPDF('Panduan_Copywriting_SapaTamu_v2.pdf');
    await readPDF('Strategi_Brand_Awareness_SapaTamu.pdf');
}

run();
