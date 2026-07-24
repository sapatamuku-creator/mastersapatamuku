const fs = require('fs');
const path = require('path');

const badHexToGood = {
    'c3a2c29dc592': '❌',
    'c3a2e28093c2a1': '🔍',
    'c3a2e28093c2a1c3afc2b8c28f': '🗑️',
    'c3a2c5be201d': '➔'
};

function fixAll(file) {
    if (!file.endsWith('.html') && !file.endsWith('.js')) return;
    if (file.includes('node_modules') || file.includes('.git')) return;
    
    let c = fs.readFileSync(file, 'utf8');
    let changed = false;
    
    for (const [hex, good] of Object.entries(badHexToGood)) {
        const badChar = Buffer.from(hex, 'hex').toString('utf8');
        if (c.includes(badChar)) {
            c = c.split(badChar).join(good);
            changed = true;
        }
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

// Also let's extract the exact bad characters dynamically from formulir_tamu.html if possible
let formC = fs.readFileSync('formulir_tamu.html', 'utf8');

const matchSearch = formC.match(/placeholder="(.*?) Cari Nama/);
if (matchSearch) {
    const bad = matchSearch[1];
    const hex = Buffer.from(bad).toString('hex');
    console.log('Search hex:', hex);
    badHexToGood[hex] = '🔍';
}

const matchTrash = formC.match(/span style="font-size: 24px;">(.*?)<\/span/);
if (matchTrash) {
    const bad = matchTrash[1];
    const hex = Buffer.from(bad).toString('hex');
    console.log('Trash hex:', hex);
    badHexToGood[hex] = '🗑️';
}

const matchArrow = formC.match(/span style="color: #BBB;">(.*?)<\/span/);
if (matchArrow) {
    const bad = matchArrow[1];
    const hex = Buffer.from(bad).toString('hex');
    console.log('Arrow hex:', hex);
    badHexToGood[hex] = '➔';
}

console.log('Applying replacements...');
walk(__dirname);
