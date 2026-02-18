import { execSync } from 'child_process';

try {
  console.log('Removing stale package-lock.json if it exists...');
  try {
    execSync('rm -f package-lock.json', { stdio: 'inherit' });
  } catch (e) {
    // File may not exist, that's fine
  }

  console.log('Running npm install to generate fresh package-lock.json...');
  execSync('npm install --package-lock-only', { 
    stdio: 'inherit',
    timeout: 120000 
  });

  console.log('Successfully regenerated package-lock.json!');
} catch (error) {
  console.error('Error regenerating lock file:', error.message);
  process.exit(1);
}
