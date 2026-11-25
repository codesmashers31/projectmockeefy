const fs = require('fs');
const path = require('path');

const baseArtifacts = 'C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\fa4cc859-e99d-440e-a4b9-ef64c859d17c\\artifacts\\mockeefy-final-independent-audit';
const matrix = JSON.parse(fs.readFileSync(path.join(baseArtifacts, 'controls/control_execution_matrix.json'), 'utf8'));

console.log('Total controls loaded:', matrix.length);

const taxonomy = {
  navigation: [],
  formInputs: [],
  filterAndSort: [],
  modalAndPopovers: [],
  businessTransactions: [],
  destructiveAdmin: []
};

matrix.forEach(c => {
  const lbl = (c.label || '').toLowerCase();
  const act = (c.action || '').toLowerCase();
  const comp = (c.component || '').toLowerCase();

  if (lbl.includes('submit') || lbl.includes('login') || lbl.includes('register') || lbl.includes('book') || lbl.includes('withdraw') || lbl.includes('save') || lbl.includes('pay') || lbl.includes('mark absent') || lbl.includes('complete session') || lbl.includes('confirm')) {
    taxonomy.businessTransactions.push(c);
  } else if (c.action?.includes('Input') || c.beforeState?.includes('<input') || lbl.includes('search') || lbl.includes('enter') || lbl.includes('password') || lbl.includes('email')) {
    taxonomy.formInputs.push(c);
  } else if (lbl.includes('filter') || lbl.includes('sort') || lbl.includes('category') || lbl.includes('level') || lbl.includes('all') || lbl.includes('page')) {
    taxonomy.filterAndSort.push(c);
  } else if (lbl.includes('menu') || lbl.includes('open') || lbl.includes('close') || lbl.includes('toggle') || lbl.includes('notification') || lbl.includes('profile')) {
    taxonomy.modalAndPopovers.push(c);
  } else if (lbl.includes('delete') || lbl.includes('remove') || lbl.includes('purge') || lbl.includes('reject')) {
    taxonomy.destructiveAdmin.push(c);
  } else {
    taxonomy.navigation.push(c);
  }
});

console.log('=== FUNCTIONAL TAXONOMY BREAKDOWN ===');
console.log('1. Navigation Controls:', taxonomy.navigation.length);
console.log('2. Form Input & Validation Controls:', taxonomy.formInputs.length);
console.log('3. Filter & Sort Controls:', taxonomy.filterAndSort.length);
console.log('4. Modal & Popover Controls:', taxonomy.modalAndPopovers.length);
console.log('5. Functional Business Transaction Controls:', taxonomy.businessTransactions.length);
console.log('6. Destructive / Admin Operations:', taxonomy.destructiveAdmin.length);

fs.writeFileSync('scratch/controls_taxonomy_breakdown.json', JSON.stringify({
  summary: {
    total: matrix.length,
    navigation: taxonomy.navigation.length,
    formInputs: taxonomy.formInputs.length,
    filterAndSort: taxonomy.filterAndSort.length,
    modalAndPopovers: taxonomy.modalAndPopovers.length,
    businessTransactions: taxonomy.businessTransactions.length,
    destructiveAdmin: taxonomy.destructiveAdmin.length
  },
  taxonomy
}, null, 2));
