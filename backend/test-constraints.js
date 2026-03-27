const db = require('./src/db');
db.query("SELECT constraint_name, constraint_type FROM information_schema.table_constraints WHERE table_name = 'cart_item'").then(res => { console.log(res.rows); process.exit(0); }).catch(console.error);
