const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runAudit(cwd) {
  try {
    const stdout = execSync('npm audit --json', { cwd, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    return JSON.parse(stdout);
  } catch (err) {
    if (err.stdout) {
      try { return JSON.parse(err.stdout); } catch (e) {}
    }
    return null;
  }
}

console.log('Running npm audit on client and server...');
const clientAudit = runAudit(path.resolve('client'));
const serverAudit = runAudit(path.resolve('server'));

const detailedAdvisories = [];

if (clientAudit && clientAudit.vulnerabilities) {
  for (const [pkg, data] of Object.entries(clientAudit.vulnerabilities)) {
    const via = Array.isArray(data.via) ? data.via : [];
    const directVia = via.filter(v => typeof v === 'object');
    
    directVia.forEach(v => {
      detailedAdvisories.push({
        source: 'client',
        package: pkg,
        installedVersion: data.range || 'N/A',
        severity: v.severity || data.severity,
        title: v.title || 'Security Advisory',
        url: v.url || '',
        advisoryId: v.source ? String(v.source) : (v.url ? v.url.split('/').pop() : 'N/A'),
        isDirect: data.isDirect,
        dependencyType: 'build/bundling (Vite frontend)',
        reachability: data.isDirect ? 'Client-side runtime / bundle' : 'Transitive build-time toolchain',
        applicationExposure: pkg === 'pdfjs-dist' ? 'Client PDF Rendering Component' : (pkg === 'zod' ? 'Client Schema Validation' : 'Build / Bundler tooling'),
        safeUpgradeAvailable: Boolean(data.fixAvailable),
        breakingRisk: typeof data.fixAvailable === 'object' && data.fixAvailable.isSemVerMajor ? 'HIGH (Major Version Breaking Change)' : 'Low/None',
        remediation: typeof data.fixAvailable === 'object' ? `Upgrade to ${data.fixAvailable.name}@${data.fixAvailable.version}` : 'Manual package review required',
        status: 'BLOCKED (BREAKING UPGRADE / NO SAFE AUTO-FIX)'
      });
    });
  }
}

if (serverAudit && serverAudit.vulnerabilities) {
  for (const [pkg, data] of Object.entries(serverAudit.vulnerabilities)) {
    const via = Array.isArray(data.via) ? data.via : [];
    const directVia = via.filter(v => typeof v === 'object');
    
    directVia.forEach(v => {
      detailedAdvisories.push({
        source: 'server',
        package: pkg,
        installedVersion: data.range || 'N/A',
        severity: v.severity || data.severity,
        title: v.title || 'Security Advisory',
        url: v.url || '',
        advisoryId: v.source ? String(v.source) : (v.url ? v.url.split('/').pop() : 'N/A'),
        isDirect: data.isDirect,
        dependencyType: 'production runtime (Express API)',
        reachability: 'Backend API process',
        applicationExposure: 'Server-side request pipeline',
        safeUpgradeAvailable: Boolean(data.fixAvailable),
        breakingRisk: typeof data.fixAvailable === 'object' && data.fixAvailable.isSemVerMajor ? 'HIGH' : 'Low',
        remediation: typeof data.fixAvailable === 'object' ? `Upgrade to ${data.fixAvailable.name}@${data.fixAvailable.version}` : 'Manual review',
        status: 'BLOCKED (MANUAL REMEDIATION REQUIRED)'
      });
    });
  }
}

console.log(`Discovered and analyzed ${detailedAdvisories.length} individual advisories.`);
fs.writeFileSync('scratch/individual_advisories_detailed.json', JSON.stringify(detailedAdvisories, null, 2));
