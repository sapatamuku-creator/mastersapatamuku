const fs = require('fs');
const PDFExtract = require('pdf.js-extract').PDFExtract;
const pdfExtract = new PDFExtract();
const options = {};

function readPDF(filename) {
    return new Promise((resolve, reject) => {
        pdfExtract.extract(filename, options, (err, data) => {
            if (err) return reject(err);
            let text = "";
            for (let page of data.pages) {
                for (let content of page.content) {
                    text += content.str + " ";
                }
                text += "\n";
            }
            console.log(`\n\n--- CONTENTS OF ${filename} ---\n`);
            console.log(text);
            resolve();
        });
    });
}

async function run() {
    try {
        await readPDF('Panduan_Copywriting_SapaTamu_v2.pdf');
        await readPDF('Strategi_Brand_Awareness_SapaTamu.pdf');
    } catch(e) {
        console.error(e);
    }
}

run();
