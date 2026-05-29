const fs = require('fs');
const path = require('path');

const map = {
    '🧧': '🧧',
    '‹': '‹',
    '›': '›',
    '❌': '❌',
    '⚠️': '⚠️',
    '✅': '✅',
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
    '✅ï¸': '✏️',
    '❌': '❌',
    '✅': '✅',
    '●': '●',
    '⚠️\'': '❌',
    '⚠️': '⚠️',
    '❌: '⚠️',
    '⚠️"?': '□'
};

function fixFile(filePath) {
    if (!filePath.endsWith('.html') && !filePath.endsWith('.js')) return;
    if (filePath.includes('node_modules') || filePath.includes('.git') || filePath.includes('releases')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    for (const [bad, good] of Object.entries(map)) {
        if (content.includes(bad)) {
            content = content.split(bad).join(good);
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed:', filePath);
    }
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) walk(full);
        else fixFile(full);
    }
}

walk(__dirname);
