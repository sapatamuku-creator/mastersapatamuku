const fs = require('fs');
const path = require('path');

const badHexToGood = {
    'e282ace59292': '💌', // 💌 -> 💌
};

function fixAll(file) {
    if (!file.endsWith('.html') && !file.endsWith('.js')) return;
    if (file.includes('node_modules') || file.includes('.git')) return;
    
    let c = fs.readFileSync(file, 'utf8');
    let changed = false;
    
    // First, standard hex replacement
    for (const [hex, good] of Object.entries(badHexToGood)) {
        const badChar = Buffer.from(hex, 'hex').toString('utf8');
        if (c.includes(badChar)) {
            c = c.split(badChar).join(good);
            changed = true;
        }
    }
    
    // Also, 💌 could be literal text if it was replaced as a literal!
    if (c.includes('💌')) {
        c = c.split('💌').join('💌');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, c);
        console.log('Fixed', file);
    }
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) walk(full);
        else fixAll(full);
    }
}

// Extract the exact bad character for alamat from checkin.html
let checkinC = fs.readFileSync('checkin.html', 'utf8');

const matchAlamat = checkinC.match(/<div class="detail-item">(.*?) <span>\$\{row\.alamat/);
if (matchAlamat) {
    const bad = matchAlamat[1];
    const hex = Buffer.from(bad).toString('hex');
    console.log('Alamat hex:', hex);
    badHexToGood[hex] = '📍';
    
    // add it to map so walk can use it
}

console.log('Applying replacements...');
walk(__dirname);
