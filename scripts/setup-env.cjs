const { execSync } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

const config = {
  npm: {
    prefix: path.join(os.homedir(), '.npm-global'),
    cache: path.join(os.homedir(), '.npm-cache'),
    registry: 'https://registry.npmmirror.com/'
  },
  pnpm: {
    globalDir: path.join(os.homedir(), '.pnpm-global'),
    globalBinDir: path.join(os.homedir(), '.pnpm-bin'),
    storeDir: path.join(os.homedir(), '.pnpm-store'),
    registry: 'https://registry.npmmirror.com/'
  },
  git: {
    user: {
      name: 'idcu',
      email: 'idcu@qq.com'
    }
  }
};

console.log('⚙️  设置开发环境配置...\n');

// 创建必要的目录
console.log('📁 检查并创建配置目录...');
[config.npm.prefix, config.npm.cache, config.pnpm.globalDir, config.pnpm.globalBinDir, config.pnpm.storeDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ 创建目录: ${dir}`);
  }
});

// npm 配置
console.log('\n📦 配置 npm...');
try {
  execSync(`npm config set prefix "${config.npm.prefix}"`, { stdio: 'pipe' });
  execSync(`npm config set cache "${config.npm.cache}"`, { stdio: 'pipe' });
  execSync(`npm config set registry "${config.npm.registry}"`, { stdio: 'pipe' });
  console.log('✅ npm 配置完成');
  console.log('   prefix:', config.npm.prefix);
  console.log('   cache:', config.npm.cache);
  console.log('   registry:', config.npm.registry);
} catch (e) {
  console.log('❌ npm 配置失败:', e.message);
}

// pnpm 配置
console.log('\n📦 配置 pnpm...');
try {
  execSync(`pnpm config set global-dir "${config.pnpm.globalDir}"`, { stdio: 'pipe' });
  execSync(`pnpm config set global-bin-dir "${config.pnpm.globalBinDir}"`, { stdio: 'pipe' });
  execSync(`pnpm config set store-dir "${config.pnpm.storeDir}"`, { stdio: 'pipe' });
  execSync(`pnpm config set registry "${config.pnpm.registry}"`, { stdio: 'pipe' });
  console.log('✅ pnpm 配置完成');
  console.log('   global-dir:', config.pnpm.globalDir);
  console.log('   global-bin-dir:', config.pnpm.globalBinDir);
  console.log('   store-dir:', config.pnpm.storeDir);
  console.log('   registry:', config.pnpm.registry);
} catch (e) {
  console.log('❌ pnpm 配置失败:', e.message);
  console.log('💡 请先安装 pnpm: npm install -g pnpm');
}

// git 配置
console.log('\n🔧 配置 Git...');
try {
  execSync(`git config --global user.name "${config.git.user.name}"`, { stdio: 'pipe' });
  execSync(`git config --global user.email "${config.git.user.email}"`, { stdio: 'pipe' });
  console.log('✅ Git 配置完成');
  console.log('   user.name:', config.git.user.name);
  console.log('   user.email:', config.git.user.email);
} catch (e) {
  console.log('❌ Git 配置失败:', e.message);
  console.log('💡 请先安装 Git 或检查环境变量');
}

console.log('\n' + '='.repeat(60));
console.log('🎉 开发环境配置完成！');
console.log('\n📋 下一步操作:');
console.log('   1. 请确保 Node.js 和 npm 在 PATH 环境变量中');
console.log('   2. 运行 "node scripts/check-env.js" 验证配置');
console.log('   3. 运行 "pnpm install" 安装项目依赖');
console.log('   4. 运行 "pnpm type-check" 检查类型');

if (os.platform() === 'win32') {
  console.log('\n💡 Windows 用户提示:');
  console.log('   如果 pnpm 命令不可用，请检查环境变量');
  console.log('   请添加以下路径到 PATH:');
  console.log(`   - ${config.pnpm.globalBinDir}`);
  console.log(`   - ${config.npm.prefix}`);
}
