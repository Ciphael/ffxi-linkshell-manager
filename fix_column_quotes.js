const fs = require('fs');

const serverPath = './server.js';
let content = fs.readFileSync(serverPath, 'utf8');

// Replace all unquoted itemId references in JOINs
content = content.replace(/ie\.itemId/g, 'ie."itemId"');
content = content.replace(/iw\.itemId/g, 'iw."itemId"');

fs.writeFileSync(serverPath, content, 'utf8');

console.log('✅ Fixed all column name quotes in server.js');
console.log('Changes made:');
console.log('- ie.itemId → ie."itemId"');
console.log('- iw.itemId → iw."itemId"');
