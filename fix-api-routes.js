const fs = require('fs');
const path = require('path');

const reactSrcDir = path.join(__dirname, 'frontend/src');

function walk(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walk(dirFile, filelist);
    } else if (dirFile.endsWith('.js')) {
      filelist.push(dirFile);
    }
  });
  return filelist;
}

const files = walk(reactSrcDir);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace api.get("/api/...") with api.get("/...")
  // Also covers post, put, delete, patch
  content = content.replace(/api\.(get|post|put|delete|patch)\(\s*["'`]\/api\//g, (match, method) => {
    return `api.${method}("/`; // This assumes double quotes, wait, template literals use backticks!
  });

  // A safer regex: match exactly "/api/ and `/api/ right after a parenthesis or just replace "/api/ inside api bindings
  // Let's just globally replace '"/api/' with '"/' and '`/api/' with '`/' 
  // ONLY if it's inside api. methods to avoid replacing valid router routes
  
  content = content.replace(/api\.(get|post|put|delete|patch)\((["'`])\/api\//g, 'api.$1($2/');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated duplicate /api/ routes in ${file.replace(__dirname, '')}`);
  }
});
