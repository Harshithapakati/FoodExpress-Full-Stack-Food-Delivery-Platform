const { execSync } = require('child_process');

try {
  const output = execSync('npx eslint . --ext .js,.jsx -f json', { encoding: 'utf8' });
  const results = JSON.parse(output);

  let errors = 0;
  let warnings = 0;

  results.forEach(file => {
    file.messages.forEach(msg => {
      if (msg.severity === 2) errors++;
      else if (msg.severity === 1) warnings++;
    });
  });

  const score = Math.max(0, (10 - (errors * 0.5 + warnings * 0.1)).toFixed(2));
  console.log(`✅ Lint Score: ${score}/10 (Errors: ${errors}, Warnings: ${warnings})`);

  // Fail pipeline if score < 7.5
  if (score < 7.5) {
    console.error('❌ Lint score below threshold (7.5).');
    process.exit(1);
  }
} catch (err) {
  console.error('⚠️ ESLint failed to run:', err.message);
  process.exit(1);
}
