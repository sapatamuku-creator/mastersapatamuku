const fs=require('fs'); 
const s=fs.readFileSync('output.json/Panduan_Copywriting_SapaTamu_v2.json', 'utf8'); 
const matches=s.match(/"T":"(.*?)"/g); 
if (matches) {
    console.log(matches.map(m=>decodeURIComponent(m.replace(/"T":"|"/g, ''))).join(' '));
}
