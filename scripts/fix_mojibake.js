const fs = require('fs');
const path = require('path');

function fixMojibakeInFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        // Check if there are signs of mojibake
        if (!data.includes('�x') && !data.includes('�—') && !data.includes('�S—') && !data.includes('�')) {
            return; // Not corrupted
        }
        
        // The file was saved as UTF-8 but the string contains mojibake characters.
        // Convert the string to a Buffer using latin1 (iso-8859-1), then decode it as UTF-8.
        const buffer = Buffer.from(data, 'latin1');
        const fixedContent = buffer.toString('utf8');
        
        // Basic sanity check to ensure we didn't destroy it (if fixedContent is empty or too small, skip)
        if (fixedContent.length < 100) return;
        
        fs.writeFileSync(filePath, fixedContent, 'utf8');
        console.log(`Fixed: ${filePath}`);
    } catch (e) {
        console.log(`Error fixing ${filePath}: ${e.message}`);
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
            fixMojibakeInFile(filePath);
        }
    }
}

walkSync(__dirname);
console.log("Done fixing mojibake.");
