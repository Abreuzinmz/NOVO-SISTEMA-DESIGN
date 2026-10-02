const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new Database(dbPath);

try {
  console.log('Querying unique motor_id values from motor_precos...');
  const rows = db.prepare('SELECT DISTINCT motor_id FROM motor_precos').all();
  console.log('Unique motor_ids:', rows);

  console.log('\nQuerying total count of prices per motor_id...');
  const counts = db.prepare('SELECT motor_id, count(*) as count FROM motor_precos GROUP BY motor_id').all();
  console.log('Counts:', counts);
} catch (e) {
  console.error('Error querying database:', e);
} finally {
  db.close();
}
