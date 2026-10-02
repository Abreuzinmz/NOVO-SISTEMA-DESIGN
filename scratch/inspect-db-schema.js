const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new Database(dbPath);

try {
  console.log('--- TABLES ---');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log(tables);

  for (const table of tables) {
    console.log(`\n--- TABLE: ${table.name} ---`);
    const pragma = db.prepare(`PRAGMA table_info(${table.name})`).all();
    console.log(pragma.map(c => `${c.name} (${c.type})` + (c.notnull ? ' NOT NULL' : '') + (c.pk ? ' PK' : '')));
  }
} catch (e) {
  console.error('Error:', e);
} finally {
  db.close();
}
