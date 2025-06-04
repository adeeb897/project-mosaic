const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Project Mosaic development environment...\n');

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, '../node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 Installing dependencies...');
  const install = spawn('npm', ['install'], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });

  install.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Dependencies installed successfully\n');
      startDevelopment();
    } else {
      console.error('❌ Failed to install dependencies');
      process.exit(1);
    }
  });
} else {
  startDevelopment();
}

function startDevelopment() {
  console.log('🔧 Starting development environment...\n');

  // Check if .env.development exists, if not copy from .env.example
  const envDevPath = path.join(__dirname, '../.env.development');
  const envExamplePath = path.join(__dirname, '../.env.example');

  if (!fs.existsSync(envDevPath) && fs.existsSync(envExamplePath)) {
    console.log('📝 Creating .env.development from .env.example...');
    fs.copyFileSync(envExamplePath, envDevPath);
    console.log('✅ .env.development created\n');
  }

  // Create public directories if they don't exist
  const publicJsDir = path.join(__dirname, '../public/js');
  const publicCssDir = path.join(__dirname, '../public/css');

  if (!fs.existsSync(publicJsDir)) {
    fs.mkdirSync(publicJsDir, { recursive: true });
    console.log('📁 Created public/js directory');
  }

  if (!fs.existsSync(publicCssDir)) {
    fs.mkdirSync(publicCssDir, { recursive: true });
    console.log('📁 Created public/css directory');
  }

  console.log('\n🎯 Starting both frontend and backend...');
  console.log('   Frontend: Building React app with esbuild');
  console.log('   Backend: Starting Express server with nodemon');
  console.log('   URL: http://localhost:3000\n');

  // Start the development servers
  const dev = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });

  dev.on('close', (code) => {
    console.log(`\n🛑 Development servers stopped with code ${code}`);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down development environment...');
    dev.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down development environment...');
    dev.kill('SIGTERM');
    process.exit(0);
  });
}
