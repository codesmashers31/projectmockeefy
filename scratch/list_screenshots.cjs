const fs = require('fs');
const path = require('path');
const base = 'C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\fa4cc859-e99d-440e-a4b9-ef64c859d17c\\artifacts\\mockeefy-live-audit';

function listFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(listFiles(file));
    } else {
      results.push({ path: path.relative(base, file), size: stat.size });
    }
  });
  return results;
}

const all = listFiles(base);
console.log('Total screenshots captured:', all.length);
all.forEach(f => console.log(' - ' + f.path + ' (' + Math.round(f.size/1024) + ' KB)'));
