const path = require('path');
const Database = require('better-sqlite3');
const { app } = require('electron');

// Versão LOCAL de testes: o SQLite é a única fonte de dados (sem sincronização).
// O arquivo fica sempre na pasta userData própria desta cópia (definida em main.js),
// tanto em desenvolvimento quanto no app instalado.
const DB_FILE_NAME = 'retifica-local.db';

let db;
let dbFilePath = '';

function initDatabase() {
  dbFilePath = path.join(app.getPath('userData'), DB_FILE_NAME);

  console.time('⏱️ [DB INIT] Open SQLite connection');
  db = new Database(dbFilePath, { verbose: console.log });
  console.timeEnd('⏱️ [DB INIT] Open SQLite connection');

  console.time('⏱️ [DB INIT] Execute CREATE TABLE & INDEXES');
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS custom_services (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE,
      default_price REAL,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id TEXT PRIMARY KEY,
      name TEXT,
      phone TEXT,
      phone2 TEXT,
      document TEXT,
      whatsapp TEXT,
      city TEXT,
      client_type TEXT,
      nickname TEXT,
      default_mechanic_id TEXT,
      updated_at TEXT
    );

    -- Motores e modelos usam o próprio nome como id
    CREATE TABLE IF NOT EXISTS motores (
      id TEXT PRIMARY KEY,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS modelos (
      id TEXT PRIMARY KEY,
      is_favorite INTEGER DEFAULT 0,
      updated_at TEXT
    );

    -- motor_id guarda o NOME do motor (ex.: 'AP'), não um UUID
    CREATE TABLE IF NOT EXISTS motor_services_prices (
      id TEXT PRIMARY KEY,
      motor_id TEXT,
      service_id TEXT,
      sub_name TEXT,
      price REAL,
      observation TEXT,
      updated_at TEXT
    );

    -- Uma O.S. pode ter vários motores:
    --   motor_model  = modelos separados por ', '   (ex.: 'AP (4 CIL), FIRE')
    --   displacement = cilindradas na mesma ordem   (ex.: '1.6, 1.0')
    --   services     = JSON; cada item tem "motorId" com o índice do motor
    --                  na lista acima ('0', '1', ...) ou 'all' (todos os motores)
    CREATE TABLE IF NOT EXISTS ordens_servico (
      id INTEGER PRIMARY KEY,
      client_id TEXT,
      mechanic_id TEXT,
      motor_model TEXT,
      displacement TEXT,
      service_status TEXT,
      payment_status TEXT,
      payment_method TEXT,
      payment_date TEXT,
      pix_paid_by TEXT,
      second_payment_method TEXT,
      second_payment_date TEXT,
      second_pix_paid_by TEXT,
      entry_value REAL,
      balance_value REAL,
      parts_left TEXT,
      additional_parts TEXT,
      services TEXT,
      discount REAL,
      total_value REAL,
      net_value REAL,
      finished INTEGER,
      finished_at TEXT,
      delivery_date TEXT,
      arrival_date TEXT,
      observations TEXT,
      payment_entries TEXT,
      created_at TEXT,
      updated_at TEXT,
      os_number INTEGER,
      concluded_index INTEGER,
      status_observation TEXT,
      deleted_at TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS pagamentos_agrupados (
      id TEXT PRIMARY KEY,
      cliente_id TEXT,
      valor_total REAL DEFAULT 0,
      valor_pago REAL DEFAULT 0,
      status TEXT DEFAULT 'aguardando_pagamento',
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS pagamento_agrupado_os (
      pagamento_agrupado_id TEXT,
      os_id INTEGER,
      created_at TEXT,
      PRIMARY KEY (pagamento_agrupado_id, os_id)
    );

    CREATE TABLE IF NOT EXISTS entradas_pagamento_agrupado (
      id TEXT PRIMARY KEY,
      pagamento_agrupado_id TEXT,
      valor REAL DEFAULT 0,
      data TEXT,
      forma_pagamento TEXT,
      nome_pagador TEXT,
      observacao TEXT,
      created_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_ordens_servico_os_number ON ordens_servico(os_number);
    CREATE INDEX IF NOT EXISTS idx_ordens_servico_client_id ON ordens_servico(client_id);
    CREATE INDEX IF NOT EXISTS idx_ordens_servico_motor_model ON ordens_servico(motor_model);
    CREATE INDEX IF NOT EXISTS idx_ordens_servico_service_status ON ordens_servico(service_status);
    CREATE INDEX IF NOT EXISTS idx_ordens_servico_finished ON ordens_servico(finished);
    CREATE INDEX IF NOT EXISTS idx_ordens_servico_finished_at ON ordens_servico(finished_at);
    CREATE INDEX IF NOT EXISTS idx_ordens_servico_concluded_index ON ordens_servico(concluded_index);

    CREATE INDEX IF NOT EXISTS idx_clientes_name ON clientes(name);
    CREATE INDEX IF NOT EXISTS idx_clientes_phone ON clientes(phone);
    CREATE INDEX IF NOT EXISTS idx_clientes_document ON clientes(document);

    CREATE INDEX IF NOT EXISTS idx_pagamentos_agrupados_cliente ON pagamentos_agrupados(cliente_id);
    CREATE INDEX IF NOT EXISTS idx_pagamento_agrupado_os_os ON pagamento_agrupado_os(os_id);
    CREATE INDEX IF NOT EXISTS idx_entradas_pag_agrupado_pag ON entradas_pagamento_agrupado(pagamento_agrupado_id);
  `);
  console.timeEnd('⏱️ [DB INIT] Execute CREATE TABLE & INDEXES');
  console.log('Local SQLite database initialized at:', dbFilePath);
  return db;
}

function getDatabase() {
  if (!db) {
    initDatabase();
  }
  return db;
}

module.exports = {
  initDatabase,
  getDatabase,
  getDatabasePath: () => dbFilePath
};
