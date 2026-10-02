const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database.db');
console.log('Opening database at:', dbPath);

try {
  const db = new Database(dbPath);
  
  // Try querying table info of modelos
  const columns = db.prepare("PRAGMA table_info(modelos)").all();
  console.log('Columns in modelos:');
  console.log(columns.map(c => `${c.name} (${c.type})`));
  
  // Show some models with favorites
  const models = db.prepare('SELECT id, is_favorite, sync_status FROM modelos LIMIT 15').all();
  console.log('\nSample models:');
  console.log(models);

  db.close();
} catch (e) {
  console.error('Error querying database:', e);
}
