// Limpeza do catálogo de motores (tabela `modelos`):
// 1. corrige nomes digitados errado (e renomeia também nas O.S. e na tabela de preços);
// 2. apaga duplicados;
// 3. separa motores que têm versões diferentes (MPI Fiasa × MPI VW, E.torQ 1.6 × 1.8);
// 4. preenche a marca de cada motor.
// Os passos 1–3 rodam uma única vez (marcados em `settings`); o passo 4 roda a cada
// início e só mexe em motores ainda sem marca.

import { detectBrandFromName } from '@/lib/motor-brands';

type LocalDb = {
  dbQuery: (sql: string, params?: any[]) => Promise<any[]>;
  dbRun: (sql: string, params?: any[]) => Promise<{ changes: number; lastInsertRowid: number }>;
};

const CLEANUP_KEY = 'motor_catalog_cleanup_v1';

/** Nome antigo → nome corrigido (também aplicado nas O.S.). */
const RENAMES: Record<string, string> = {
  'AMAROCK': 'AMAROK',
  'CATERPILHAR': 'CATERPILLAR',
  'CATERPILHAR C 6.6': 'CATERPILLAR C6.6',
  'CHEROK': 'CHEROKEE',
  'CHERRY': 'CHERY',
  'CHEVETT': 'CHEVETTE',
  'CORSEL': 'CORCEL',
  'CRUZES': 'CRUZE',
  'DUST': 'DUSTER',
  'HYNDAI': 'HYUNDAI',
  'JONH DERE': 'JOHN DEERE',
  'KADET': 'KADETT',
  'LEVINA': 'LIVINA',
  'MONTANHA': 'MONTANA',
  'PEGEOUT': 'PEUGEOT',
  'POWERSTROQUE': 'POWER STROKE',
  'RENEGEDE': 'RENEGADE',
  'TOYATA': 'TOYOTA',
  'TRANSETI': 'TRANSIT',
  'TRITRON': 'TRITON',
  'TUCKSON': 'TUCSON',
  'VOLKS': 'VOLKSWAGEN',
  'VOLVO - L90F': 'VOLVO L90F',
  'YAMMA': 'YANMAR',
  'YAMMA B8': 'YANMAR B8',
};

/** Renomeados só no catálogo: nas O.S. antigas não dá para saber qual versão era. */
const CATALOG_ONLY_RENAMES: Record<string, string> = {
  'MPI': 'MPI VW',
  'ETORQ': 'E.TORQ 1.6',
};

/** Duplicados apagados (o motor equivalente continua no catálogo). */
const DUPLICATES = ['B8', 'ETOK'];

/** Motores novos para separar versões diferentes. */
const NEW_MOTORS: Array<{ name: string; brand: string }> = [
  { name: 'MPI FIASA', brand: 'Fiat' },
  { name: 'E.TORQ 1.8', brand: 'Fiat' },
];

/** Marca definida à mão (nomes que a detecção automática não reconhece ou erra). */
const EXPLICIT_BRANDS: Record<string, string> = {
  'MPI VW': 'Volkswagen',
  'MPI FIASA': 'Fiat',
  'E.TORQ 1.6': 'Fiat',
  'E.TORQ 1.8': 'Fiat',
  'FIAT FLAY': 'Fiat',
  'SEVEL': 'Fiat',
  'MWM SPRINTER': 'MWM',
  'POWER STROKE': 'Ford',
  'DS11': 'Scania',
  'D22': 'Nissan',
  'B9': 'Yanmar',
  'B13': 'Yanmar',
  'NS11': 'Yanmar',
  'NS18': 'Yanmar',
  'NS50': 'Yanmar',
  'NS75': 'Yanmar',
  'NS90': 'Yanmar',
  'AGRALE': 'Agrale',
  'M90': 'Agrale',
  'BRANCO': 'Branco',
  'TOBATA': 'Tobata',
  'JCB': 'JCB',
  'KIA': 'Kia',
  'LIFAN': 'Lifan',
  'MAN': 'MAN',
  'NEW HOLLAND': 'New Holland',
};

/** Troca um modelo dentro de "AP (4 CIL), FIRE" mantendo o sufixo de cilindros. */
function renameInMotorList(list: string, renames: Record<string, string>): string {
  return list
    .split(',')
    .map((raw) => {
      const token = raw.trim();
      const m = token.match(/^(.*?)(\s*\(.*\))?$/);
      const base = (m?.[1] || token).trim().toUpperCase();
      const suffix = m?.[2] || '';
      return renames[base] ? renames[base] + suffix : token;
    })
    .join(', ');
}

async function exists(db: LocalDb, name: string): Promise<boolean> {
  const rows = await db.dbQuery('SELECT id FROM modelos WHERE id = ?', [name]);
  return rows.length > 0;
}

async function renameModel(db: LocalDb, from: string, to: string, now: string): Promise<void> {
  if (!(await exists(db, from))) return;
  if (await exists(db, to)) {
    // o nome correto já existe: o antigo é duplicado
    await db.dbRun('DELETE FROM modelos WHERE id = ?', [from]);
  } else {
    await db.dbRun('UPDATE modelos SET id = ?, updated_at = ? WHERE id = ?', [to, now, from]);
  }
  const motor = await db.dbQuery('SELECT id FROM motores WHERE id = ?', [from]);
  if (motor.length > 0) {
    const target = await db.dbQuery('SELECT id FROM motores WHERE id = ?', [to]);
    if (target.length > 0) await db.dbRun('DELETE FROM motores WHERE id = ?', [from]);
    else await db.dbRun('UPDATE motores SET id = ?, updated_at = ? WHERE id = ?', [to, now, from]);
  }
}

async function runOneTimeCleanup(db: LocalDb): Promise<void> {
  const done = await db.dbQuery('SELECT value FROM settings WHERE key = ?', [CLEANUP_KEY]);
  if (done.length > 0) return;

  const now = new Date().toISOString();

  for (const [from, to] of Object.entries({ ...RENAMES, ...CATALOG_ONLY_RENAMES })) {
    await renameModel(db, from, to, now);
  }

  for (const name of DUPLICATES) {
    await db.dbRun('DELETE FROM modelos WHERE id = ?', [name]);
    await db.dbRun('DELETE FROM motores WHERE id = ?', [name]);
  }

  for (const { name, brand } of NEW_MOTORS) {
    await db.dbRun('INSERT OR IGNORE INTO modelos (id, is_favorite, updated_at, brand) VALUES (?, 0, ?, ?)', [name, now, brand]);
  }

  // Nomes corrigidos também nas O.S. e na tabela de preços
  const orders = await db.dbQuery("SELECT id, motor_model FROM ordens_servico WHERE motor_model IS NOT NULL AND motor_model != ''");
  for (const o of orders) {
    const next = renameInMotorList(String(o.motor_model), RENAMES);
    if (next !== o.motor_model) {
      await db.dbRun('UPDATE ordens_servico SET motor_model = ? WHERE id = ?', [next, o.id]);
    }
  }
  for (const [from, to] of Object.entries(RENAMES)) {
    await db.dbRun('UPDATE motor_services_prices SET motor_id = ? WHERE motor_id = ?', [to, from]);
  }

  await db.dbRun('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [CLEANUP_KEY, now]);
  console.log('[Motores] Catálogo corrigido: nomes, duplicados e versões separadas.');
}

async function fillMissingBrands(db: LocalDb): Promise<void> {
  const rows = await db.dbQuery("SELECT id FROM modelos WHERE brand IS NULL OR TRIM(brand) = ''");
  const now = new Date().toISOString();
  for (const r of rows) {
    const name = String(r.id || '').toUpperCase();
    const brand = EXPLICIT_BRANDS[name] || detectBrandFromName(name);
    if (brand) {
      await db.dbRun('UPDATE modelos SET brand = ?, updated_at = ? WHERE id = ?', [brand, now, r.id]);
    }
  }
}

export async function runMotorCatalogCleanup(db: LocalDb): Promise<void> {
  try {
    await runOneTimeCleanup(db);
  } catch (err) {
    console.error('[Motores] Falha ao corrigir o catálogo:', err);
  }
  try {
    await fillMissingBrands(db);
  } catch (err) {
    console.error('[Motores] Falha ao preencher as marcas:', err);
  }
}
