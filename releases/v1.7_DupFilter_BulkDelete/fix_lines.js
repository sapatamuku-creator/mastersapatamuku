const fs = require('fs');

const map = {
    '─': '─',
    '–': '–',
    '—': '—',
    '“': '“',
    '”': '”',
    '‘': '‘',
    '’': '’'
};

function fixFile(filePath) {
    if (!filePath.endsWith('.html') && !filePath.endsWith('.js')) return;
    
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

fs.readdirSync('.').forEach(fixFile);
