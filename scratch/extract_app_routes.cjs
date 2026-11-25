const fs = require('fs');

const appContent = fs.readFileSync('client/src/App.tsx', 'utf8');
const routes = [];
const regex = /<Route\s+path=["']([^"']+)["'](?:\s+element=\{([^}]+)\})?/g;
let match;
while ((match = regex.exec(appContent)) !== null) {
  routes.push({
    path: match[1],
    elementSnippet: match[2]?.trim() || ''
  });
}

console.log(`Discovered ${routes.length} routes in App.tsx:`);
routes.forEach((r, idx) => console.log(`${idx + 1}. ${r.path} -> ${r.elementSnippet.slice(0, 40)}`));

fs.writeFileSync('scratch/app_routes_parsed.json', JSON.stringify(routes, null, 2));
