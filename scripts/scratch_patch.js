const fs = require('fs');
const path = require('path');
const dir = 'd:/Google Antigrafity/mastersapatamuku';

const toFix = [
  { file: 'welcome.html' },
  { file: 'owner.html' },
  { file: 'profile.html' },
];

const sdkTag = '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>';
const guardTag = '<script src="auth_guard.js"></script>';

toFix.forEach(({ file }) => {
  const fp = path.join(dir, file);
  if (!fs.existsSync(fp)) { console.log(file, 'NOT FOUND'); return; }
  let c = fs.readFileSync(fp, 'utf8');
  
  if (c.includes('auth_guard')) { console.log(file, '-> already has auth_guard'); return; }

  // If supabase CDN already on page, just add auth_guard after it
  if (c.includes('supabase-js')) {
    c = c.replace(/(<script src="[^"]*supabase-js[^"]*"><\/script>)/, '$1\n    ' + guardTag);
  } else {
    // Insert both before </head>
    c = c.replace('</head>', '    ' + sdkTag + '\n    ' + guardTag + '\n</head>');
  }

  fs.writeFileSync(fp, c, 'utf8');
  console.log(file, '-> PATCHED');
});
