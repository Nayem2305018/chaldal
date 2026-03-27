const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, 'src/controllers/orderController.js'),
  path.join(__dirname, 'src/controllers/adminController.js')
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace escaped "order" strings like \"order\"
  content = content.replace(/\\"order\\"/g, 'orders');
  
  // Replace non-escaped "order" strings like "order" o
  content = content.replace(/"order"\s+o/g, 'orders o');

  fs.writeFileSync(file, content, 'utf8');
  console.log(`Updated ${file}`);
});
