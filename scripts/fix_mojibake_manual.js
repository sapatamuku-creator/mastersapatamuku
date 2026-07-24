const fs = require('fs');
const path = require('path');

const replacements = {
    '🛡️': '🛡️',
    '—': '—',
    '✔': '✔',
    '⚡': '⚡',
    '⬆️': '⬆️',
    '➕': '➕',
    '🔄': '🔄',
    '💾': '💾',
    '🗑️': '🗑️',
    '⏳': '⏳',
    '✅': '✅',
    '❌': '❌',
    '⚠️': '⚠️',
    '🔍': '🔍',
    '📥': '📥',
    '📌': '📊',
    '📈': '📈',
    '💰': '💰',
    '📣': '📣',
    '🔒': '🔒',
    '📋': '📋',
    '📋‹': '📋',
    '🔗': '🔗',
    '📋§': '📧',
    '📋±': '📱',
    '📋²': '📲',
    '📋·': '📷',
    '🧑': '🧑',
    '👥': '👥',
    '👤': '👤',
    '🎉': '🎉',
    '🎊': '🎊',
    '🥂': '🥂',
    '💍': '💍',
    '❤️': '❤️',
    '💖': '💖',
    '💕': '💕',
    '📌': '📌',
    '📋Œ': '📌',
    '✨': '✨',
    '🌟': '🌟',
    '⭐': '⭐',
    '◯': '◯',
    '◎': '◎',
    ' ': ' ',
    '\—': '—', // Failed output from previous fix
    '🛡️': '🛡️' // Failed output from previous fix
};

// Also read from v1.4_HighFidelity_Landing to get original corrupted text if we destroyed it
function recoverFile(filePath) {
    const filename = path.basename(filePath);
    const backupPath = path.join(__dirname, 'releases', 'v1.4_HighFidelity_Landing', filename);
    if (fs.existsSync(backupPath)) {
        // If it's welcome.html or onsite.html, DO NOT overwrite it because we patched it!
        // Wait, for welcome.html we can just do string replace on the current content.
        if (filename === 'welcome.html' || filename === 'onsite.html') {
            return fs.readFileSync(filePath, 'utf8');
        } else {
            return fs.readFileSync(backupPath, 'utf8');
        }
    }
    return fs.readFileSync(filePath, 'utf8');
}

function fixMojibakeInFile(filePath) {
    try {
        let content = recoverFile(filePath);
        
        let changed = false;
        for (const [bad, good] of Object.entries(replacements)) {
            if (content.includes(bad)) {
                content = content.split(bad).join(good);
                changed = true;
            }
        }
        
        // Fix some edge cases from the failed run
        if (content.includes('\—')) {
            content = content.replace(/\—/g, '—');
            changed = true;
        }
        if (content.includes('')) {
             content = content.replace(/🛡️/g, '🛡️');
             content = content.replace(/—/g, '—');
             changed = true;
        }

        if (changed) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Fixed manually: ${filePath}`);
        }
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
console.log("Done fixing mojibake with manual mapping.");
