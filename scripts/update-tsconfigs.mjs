import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packagesDir = path.join(__dirname, 'packages');

const packages = ['reactivity', 'vdom', 'compiler', 'renderer', 'component', 'core', 'router', 'store', 'lytx'];

packages.forEach(pkg => {
  const tsconfigPath = path.join(packagesDir, pkg, 'tsconfig.json');
  
  if (fs.existsSync(tsconfigPath)) {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
    
    if (tsconfig.compilerOptions && tsconfig.compilerOptions.paths) {
      fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
      console.log(`Updated ${pkg}/tsconfig.json');
    }
  }
});

console.log('All tsconfig.json files updated!');
