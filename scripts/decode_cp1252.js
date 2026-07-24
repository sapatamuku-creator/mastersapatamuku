const fs = require('fs');
const path = require('path');

const cp1252 = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87,
  0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E,
  0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F
};

function decodeCP1252ToUTF8(str) {
  const buf = Buffer.alloc(str.length);
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (cp1252[code]) {
      buf[i] = cp1252[code];
    } else if (code <= 0xFF) {
      buf[i] = code;
    } else {
      // If there are valid utf-8 chars already, it means it's mixed. We shouldn't touch it.
      return null;
    }
  }
  return buf.toString('utf8');
}

function processFile(filePath) {
    // Read original corrupted from releases
    const filename = path.basename(filePath);
    let originalPath = path.join(__dirname, 'releases', 'v1.4_HighFidelity_Landing', filename);
    if (!fs.existsSync(originalPath)) {
        // Some files might be in backend folder inside releases
        originalPath = path.join(__dirname, 'releases', 'v1.4_HighFidelity_Landing', 'backend', filename);
    }
    
    let content;
    let isFromBackup = false;
    
    // We don't want to revert welcome.html, onsite.html, CentralBackend.gs, Main.gs because we patched them heavily
    const skipBackup = ['welcome.html', 'onsite.html', 'CentralBackend.gs', 'Main.gs', 'migrate_to_supabase.ps1'];
    
    if (fs.existsSync(originalPath) && !skipBackup.includes(filename)) {
        content = fs.readFileSync(originalPath, 'utf8');
        isFromBackup = true;
    } else {
        content = fs.readFileSync(filePath, 'utf8');
    }

    // Try to find if there's any mojibake sequence like "â" or similar
    if (content.includes('�') || content.includes('�') || content.includes('�')) {
        let fixed = decodeCP1252ToUTF8(content);
        if (fixed) {
            fs.writeFileSync(filePath, fixed, 'utf8');
            console.log('Fixed using CP1252 decoder:', filePath);
            return;
        }
    }
    
    // If it was from backup but decode failed or wasn't needed, just restore the backup to remove my bad manual script artifacts
    if (isFromBackup) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Restored from backup:', filePath);
    }
}

function walkSync(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (filePath.includes('node_modules') || filePath.includes('.git') || filePath.includes('releases')) continue;
        
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walkSync(filePath);
        } else if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.bat')) {
            processFile(filePath);
        }
    }
}
walkSync(__dirname);
console.log("Done decoding");
