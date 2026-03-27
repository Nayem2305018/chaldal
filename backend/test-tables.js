const db = require('./src/db');
db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'").then(res => { console.log(res.rows.map(r => r.table_name)); process.exit(); }).catch(e => { console.error(e); process.exit(1);});
