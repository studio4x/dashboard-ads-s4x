const fs = require('fs');
const path = require('path');

function incrementVersion() {
  const pkgPath = path.join(__dirname, '..', 'package.json');
  if (!fs.existsSync(pkgPath)) {
    console.error('package.json not found');
    return;
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const versionParts = pkg.version.split('.').map(Number);
  
  if (versionParts.length === 3) {
    versionParts[2] += 1; // Incrementa o patch
    const newVersion = versionParts.join('.');
    pkg.version = newVersion;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log(`Version successfully incremented from to ${newVersion}`);
  } else {
    console.error('Invalid version format in package.json');
  }
}

incrementVersion();
