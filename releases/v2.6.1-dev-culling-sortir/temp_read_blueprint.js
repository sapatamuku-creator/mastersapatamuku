const fs = require('fs');

async function run() {
    try {
        const { PDFExtract } = await import('pdf.js-extract');
        const pdfExtract = new PDFExtract();
        const options = {};
        pdfExtract.extract('Blueprint_SapaTamu_v2.3_RSVP_Fixed.pdf', options, (err, data) => {
            if (err) {
                console.error(err);
                return;
            }
            let text = "";
            for (let page of data.pages) {
                for (let content of page.content) {
                    text += content.str + " ";
                }
                text += "\n";
            }
            fs.writeFileSync('blueprint_text.txt', text);
            console.log("Success! Written to blueprint_text.txt");
        });
    } catch(e) {
        console.error(e);
    }
}
run();
