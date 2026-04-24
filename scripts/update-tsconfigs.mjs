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
      // 确保 @lytjs/shared 的路径映射
      tsconfig.compilerOptions.paths['@lytjs/shared'] = ['../shared/src'];
      tsconfig.compilerOptions.paths['@lytjs/shared/*'] = ['../shared/src/*'];
      
      fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
      console.log(`Updated ${pkg}/tsconfig.json');
    }
  }
});

console.log('All tsconfig.json files updated!');
