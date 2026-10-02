const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
console.log('Inspeccionando banco de dados SQLite local:', dbPath);

try {
  const db = new Database(dbPath);

  // Total ordens_servico
  const totalCount = db.prepare("SELECT COUNT(*) as count FROM ordens_servico").get().count;
  console.log(`Total de registros na tabela ordens_servico (SQLite): ${totalCount}`);

  // Total onde deleted_at IS NULL
  const nonDeletedCount = db.prepare("SELECT COUNT(*) as count FROM ordens_servico WHERE deleted_at IS NULL").get().count;
  console.log(`Total onde deleted_at IS NULL: ${nonDeletedCount}`);

  // Breakdown por finished
  const finished0 = db.prepare("SELECT COUNT(*) as count FROM ordens_servico WHERE deleted_at IS NULL AND (finished = 0 OR finished IS NULL)").get().count;
  const finished1 = db.prepare("SELECT COUNT(*) as count FROM ordens_servico WHERE deleted_at IS NULL AND finished = 1").get().count;

  console.log(`- finished = 0 (ou NULL): ${finished0}`);
  console.log(`- finished = 1: ${finished1}`);

  // Breakdown de O.S. ativas (!finished) por service_status no SQLite
  const activeStatuses = db.prepare(`
    SELECT service_status, finished, COUNT(*) as count 
    FROM ordens_servico 
    WHERE deleted_at IS NULL AND (finished = 0 OR finished IS NULL)
    GROUP BY service_status, finished
  `).all();

  console.log('\n--- Status de O.S. com finished = 0 no SQLite ---');
  console.table(activeStatuses);

  // Breakdown de O.S. com finished = 1 no SQLite
  const finishedStatuses = db.prepare(`
    SELECT service_status, finished, COUNT(*) as count 
    FROM ordens_servico 
    WHERE deleted_at IS NULL AND finished = 1
    GROUP BY service_status
  `).all();

  console.log('\n--- Status de O.S. com finished = 1 no SQLite ---');
  console.table(finishedStatuses);

} catch (err) {
  console.error('Erro ao ler SQLite:', err.message);
}
