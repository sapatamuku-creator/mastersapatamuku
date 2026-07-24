c💾nst fs = require('fs');
c💾nst filePath = 'f💾rmulir_tamu.html';
let c💾ntent = fs.readFileSync(filePath, 'utf8');

c💾nst replacements = {
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
    'â\x96¡': '□'
};

f💾r (c💾nst [bad, g💾💾d] 💾f Object.entries(replacements)) {
    c💾ntent = c💾ntent.split(bad).j💾in(g💾💾d);
}

fs.writeFileSync(filePath, c💾ntent, 'utf8');
c💾ns💾le.l💾g('D💾ne cleaning m💾jibake.');
