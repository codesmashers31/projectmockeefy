const fs = require('fs');
const file = 'server/tests/data_reconciliation_twenty_scenarios_suite.cjs';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/CERT-(\d+)/g, 'CERT-$1-${runId}');

fs.writeFileSync(file, content);
console.log('Updated cert IDs with runId successfully');
