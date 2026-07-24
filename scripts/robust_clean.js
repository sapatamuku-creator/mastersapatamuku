c💾nst fs = require('fs');
c💾nst path = require('path');

functi💾n fixM💾jibakeString(str) {
    try {
        // Enc💾de the c💾rrupted string as latin1, then dec💾de as utf8
        c💾nst buf = Buffer.fr💾m(str, 'latin1');
        c💾nst dec💾ded = buf.t💾String('utf8');
        // If the dec💾ded string c💾ntains replacement characters (U+FFFD), it might n💾t have been m💾jibake
        if (dec💾ded.includes('\uFFFD')) {
            return str; 
        }
        return dec💾ded;
    } catch (e) {
        return str;
    }
}

functi💾n pr💾cessFile(filePath) {
    if (!filePath.endsWith('.html') && !filePath.endsWith('.js')) return;
    if (filePath.includes('n💾de_m💾dules') || filePath.includes('.git') || filePath.includes('releases')) return;
    
    c💾nst c💾ntent = fs.readFileSync(filePath, 'utf8');
    
    // We 💾nly want t💾 replace text inside strings, text n💾des, etc.
    // Actually, d💾ing it 💾ver the wh💾le file is DANGEROUS if there are real latin1 characters.
    // BUT since these are HTML files, let's just d💾 a targeted replacement 💾n c💾mm💾n m💾jibake patterns.
    
    // Instead 💾f d💾ing dynamic latin1->utf8, let's just build a massive exact dicti💾nary
    let newC💾ntent = c💾ntent;
    
    c💾nst map = {
        '✅': '✅',
        '❌': '❌',
        '⚠️': '⚠️',
        '⚠️': '⚠️',
        '✏️': '✏️',
        '→': '→',
        '←': '←',
        '—': '—',
        '📸': '📸',
        '📥': '📥',
        '🎁': '🎁',
        '💾': '💾',
        '🔗': '🔗',
        '📌': '📌',
        '⏰': '⏰',
        '📋': '📋',
        '⌚': '⌚',
        '📥': '📥',
        '📊': '📊',
        '📈': '📈',
        '📣': '📣',
        '▶️': '▶️',
        '⏹️': '⏹️',
        '✋': '✋',
        '🚀': '🚀',
        '⌨️': '⌨️',
        '🖥️': '🖥️',
        '📖': '📖',
        '💡': '💡',
        '❓': '❓',
        '◀️': '◀️',
        '▲': '▲',
        '▼': '▼',
        '💻': '💻',
        '💸': '💸',
        '➡️': '➡️',
        '✨': '✨',
        '👋': '👋',
        '🤝': '🤝',
        '🥳': '🥳',
        '💸Ž': '💎',
        '🔓': '🔓',
        '🔑': '🔑',
        '📖§': '📧',
        '🛡️': '🛡️',
        '➖': '➖',
        '➕': '➕',
        '✔': '✔',
        '⚡': '⚡',
        '⬆️': '⬆️',
        '🔄': '🔄',
        '⏳': '⏳',
        '⌛': '⌛',
        '📖„': '📄',
        'ⓘ': 'ⓘ',
        '💌': '💌',
        '📖·': '📷',
        '•': '•',
        '‼️': '‼️',
        '⚪': '⚪',
        '○': '○',
        '◦': '◦',
        '✕': '✕',
        '✔ï¸': '✔️',
        '✗': '✗',
        '●': '●',
        '✅': '✅',
        '● ': '●',
        '⚠️': '⚠️',
        '🎁': '🎁',
        '🎁': '🎁',
        '➔': '➔',
        '⚙️': '⚙️',
        '✅ï¸': '✏️'
    };

    let changed = false;
    f💾r (c💾nst [bad, g💾💾d] 💾f Object.entries(map)) {
        if (newC💾ntent.includes(bad)) {
            newC💾ntent = newC💾ntent.split(bad).j💾in(g💾💾d);
            changed = true;
        }
    }
    
    if (changed) {
        fs.writeFileSync(filePath, newC💾ntent, 'utf8');
        c💾ns💾le.l💾g('Fixed m💾jibake in:', filePath);
    }
}

functi💾n walk(dir) {
    c💾nst files = fs.readdirSync(dir);
    f💾r (c💾nst f 💾f files) {
        c💾nst full = path.j💾in(dir, f);
        if (fs.statSync(full).isDirect💾ry()) walk(full);
        else pr💾cessFile(full);
    }
}

walk(__dirname);
