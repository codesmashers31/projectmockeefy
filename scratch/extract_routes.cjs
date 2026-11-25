const fs = require('fs');
const content = fs.readFileSync('client/src/App.tsx', 'utf8');
const regex = /<Route\s+[^>]*path=["']([^"']+)["'][^>]*>/g;
let match;
const routes = [];
while ((match = regex.exec(content)) !== null) {
  routes.push(match[1]);
}
console.log('Total Route paths found in App.tsx:', routes.length);
console.log(JSON.stringify(routes, null, 2));
