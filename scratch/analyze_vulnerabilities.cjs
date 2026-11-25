const { execSync } = require('child_process');
const fs = require('fs');

function runAudit(dir) {
  try {
    const stdout = execSync('npm audit --json', { cwd: dir, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    return JSON.parse(stdout);
  } catch (e) {
    if (e.stdout) {
      try {
        return JSON.parse(e.stdout);
      } catch (err) {}
    }
    return null;
  }
}

const serverAudit = runAudit('server');
const clientAudit = runAudit('client');

fs.writeFileSync('scratch/server_vulns.json', JSON.stringify(serverAudit?.vulnerabilities || {}, null, 2));
fs.writeFileSync('scratch/client_vulns.json', JSON.stringify(clientAudit?.vulnerabilities || {}, null, 2));

console.log('Server vulns count:', Object.keys(serverAudit?.vulnerabilities || {}).length);
console.log('Client vulns count:', Object.keys(clientAudit?.vulnerabilities || {}).length);
