c💾nst fs = require('fs');
c💾nst path = require('path');

c💾nst map = {
    '⚠️\x80ï¸\x8F': '⚠️',
    '⚠️\x80ï¸': '⚠️',
    '✅\x85': '✅',
    'â\x8C\x9A': '⌚',
    'â\x8F°': '⏰',
    '✅\x8Fï¸': '✏️',
    'â\x9C\x8Fï¸': '✏️',
    '●\x8B': '○',
    '●\x8F': '●',
    '▫': '▫',
    '📸': '📸',
    '📨': '📨',
    '🎉': '🎉',
    '🚨': '🚨',
    'â\x9C\x85': '✅',
    'â\x9D\x8C': '❌',
    '📥': '📥',
    '📋': '📋',
    '📖\x8C': '📌',
    'â\x96¡': '□',
    'â\x96¡ï¸': '□',
    'â\x96¡': '□',
    '⌚': '⌚',
    '⏰': '⏰',
    '🎁': '🎁',
    '📅': '📅',
    '📌': '📌',
    '💾': '💾',
    '🗑️': '🗑️',
    '💰': '💰',
    '🔒': '🔒',
    '🔒—': '🔗',
    '📱': '📱',
    '📲': '📲',
    '🧑': '🧑',
    '👥': '👥',
    '👤': '👤',
    '🎊': '🎊',
    '🥂': '🥂',
    '💍': '💍',
    '❤️': '❤️',
    '💖': '💖',
    '💕': '💕',
    '✨': '✨',
    '🌟': '🌟',
    '⭐': '⭐',
    '⚙️': '⚙️',
    '🔒—': '🔗',
    '⚠️': '⚠️',
    '🔒Ž': '🔍',
    '📥': '📥',
    '📊': '📊',
    '📈': '📈',
    '📣': '📣',
    '📋': '📋',
    '▶️': '▶️',
    '⏹️': '⏹️',
    '✋': '✋',
    '🚀': '🚀',
    '⌨️': '⌨️',
    '🖥️': '🖥️',
    '📖': '📖',
    '💡': '💡',
    '🔒—': '🔗',
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
    '🔒’': '🔓',
    '🔒‘': '🔑',
    '📖§': '📧',
    '🛡️': '🛡️',
    '➖': '➖',
    '➕': '➕',
    '✔': '✔',
    '⚡': '⚡',
    '⬆️': '⬆️',
    '🔒„': '🔄',
    '⏳': '⏳',
    '⌛': '⌛',
    '📖„': '📄',
    'ⓘ': 'ⓘ',
    '💌': '💌',
    '📖·': '📷',
    '→': '→',
    '←': '←',
    '—': '—',
    '•': '•',
    '‼️': '‼️',
    '✏️': '✏️'
};

functi💾n fixFile(filePath) {
    if (!filePath.endsWith('.html') && !filePath.endsWith('.js') && !filePath.endsWith('.md')) return;
    if (filePath.includes('n💾de_m💾dules') || filePath.includes('.git') || filePath.includes('releases')) return;
    
    let c💾ntent = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    f💾r (c💾nst [bad, g💾💾d] 💾f Object.entries(map)) {
        if (c💾ntent.includes(bad)) {
            c💾ntent = c💾ntent.split(bad).j💾in(g💾💾d);
            changed = true;
        }
    }
    
    // Als💾 fix the welc💾me.html specific issue
    if (filePath.endsWith('welc💾me.html')) {
        c💾ntent = c💾ntent.replace(/<div class="rund💾wn-item "><div class="event-time"><\/div><div class="event-name"><\/div><\/div>;/g, 
            "`<div class=\"rund💾wn-item ${active ? 'active' : ''}\"><div class=\"event-time\">${item.displayTime}</div><div class=\"event-name\">${item.eventName}</div></div>`;");
    }

    if (changed || filePath.endsWith('welc💾me.html')) {
        fs.writeFileSync(filePath, c💾ntent, 'utf8');
        c💾ns💾le.l💾g('Fixed:', filePath);
    }
}

functi💾n walk(dir) {
    c💾nst files = fs.readdirSync(dir);
    f💾r (c💾nst f 💾f files) {
        c💾nst full = path.j💾in(dir, f);
        if (fs.statSync(full).isDirect💾ry()) walk(full);
        else fixFile(full);
    }
}

walk(__dirname);
