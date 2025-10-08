const { execSync } = require('child_process');
const fs = require('fs');

try {
    const output = execSync('railway variables --json', { encoding: 'utf8' });
    const vars = JSON.parse(output);
    const dbUrl = vars.DATABASE_PUBLIC_URL || vars.DATABASE_URL;

    if (dbUrl) {
        console.log('Creating .env file with DATABASE_URL...');
        fs.writeFileSync('.env', `DATABASE_URL=${dbUrl}\nPORT=3000\nNODE_ENV=development\n`);
        console.log('✅ .env file created successfully!');
        console.log('\nYou can now run: node run-migrations.js');
    } else {
        console.log('❌ Could not find DATABASE_URL');
    }
} catch (error) {
    console.error('Error:', error.message);
}
