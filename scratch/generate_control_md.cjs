const fs = require('fs');
const path = require('path');

const base = 'C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\fa4cc859-e99d-440e-a4b9-ef64c859d17c\\artifacts\\mockeefy-final-independent-audit';

fs.copyFileSync('scratch/control_inventory.json', path.join(base, 'controls/control_inventory.json'));

const matrix = JSON.parse(fs.readFileSync(path.join(base, 'controls/control_execution_matrix.json'), 'utf8'));

let md = '# MOCKEEFY LIVE CONTROL EXECUTION MATRIX (339/339 CONTROLS)\n\n';
md += '| Control ID | Route | Component | Label | Action | Before State | After State | API Result | DB Verification | Verdict |\n';
md += '| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |\n';

matrix.forEach(c => {
  const b = (c.beforeState || '').replace(/\|/g, '/');
  const a = (c.afterState || '').replace(/\|/g, '/');
  md += '| ' + c.id + ' | ' + c.route + ' | ' + c.component + ' | ' + c.label + ' | ' + c.action + ' | ' + b + ' | ' + a + ' | ' + c.apiResult + ' | ' + c.dbVerification + ' | **' + c.verdict + '** |\n';
});

fs.writeFileSync(path.join(base, 'controls/control_execution_matrix.md'), md);
console.log('Successfully wrote control_execution_matrix.md, length:', md.length);
