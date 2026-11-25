const fs = require('fs');
const path = require('path');

const baseArtifacts = 'C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\fa4cc859-e99d-440e-a4b9-ef64c859d17c\\artifacts\\mockeefy-final-independent-audit';
const serverVulns = JSON.parse(fs.readFileSync(path.join(baseArtifacts, 'dependencies/server_vulns.json'), 'utf8'));
const clientVulns = JSON.parse(fs.readFileSync(path.join(baseArtifacts, 'dependencies/client_vulns.json'), 'utf8'));

console.log('Server keys:', Object.keys(serverVulns));
console.log('Client keys:', Object.keys(clientVulns));

const serverList = [];
if (serverVulns.vulnerabilities) {
  for (const [pkg, info] of Object.entries(serverVulns.vulnerabilities)) {
    serverList.push({
      pkg,
      severity: info.severity,
      isDirect: info.isDirect,
      via: info.via,
      effects: info.effects,
      range: info.range,
      fixAvailable: info.fixAvailable
    });
  }
}

const clientList = [];
if (clientVulns.vulnerabilities) {
  for (const [pkg, info] of Object.entries(clientVulns.vulnerabilities)) {
    clientList.push({
      pkg,
      severity: info.severity,
      isDirect: info.isDirect,
      via: info.via,
      effects: info.effects,
      range: info.range,
      fixAvailable: info.fixAvailable
    });
  }
}

console.log('Server vulnerabilities count:', serverList.length);
console.log('Client vulnerabilities count:', clientList.length);

fs.writeFileSync('scratch/individual_55_advisories.json', JSON.stringify({
  serverCount: serverList.length,
  clientCount: clientList.length,
  serverList,
  clientList
}, null, 2));
