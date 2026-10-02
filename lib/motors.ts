interface ElectronAPI {
  dbQuery: (sql: string, params?: any[]) => Promise<any[]>;
  dbRun: (sql: string, params?: any[]) => Promise<{ changes: number; lastInsertRowid: number }>;
  getAppVersion: () => Promise<string>;
  getDatabasePath?: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

const SEED_MOTORS_FALLBACK = ['POWER', 'FIRE', 'AP', 'CHT', 'SEVEL'];

const SEED_MODELS_FALLBACK = [
  'AGRALE', 'AMAROCK', 'AP', 'ARGO', 'ASTRA', 'AT', 'AUDI', 'B13', 'B8', 'B9', 'BMW', 'BRANCO', 'C4',
  'CAPTIVA', 'CATERPILHAR', 'CATERPILHAR C 6.6', 'CELTA', 'CHEROK', 'CHERRY', 'CHEVETT', 'CHT',
  'CITROEN', 'CIVIC', 'CLASS', 'CLASSIC', 'COROLLA', 'CORSA', 'CORSEL', 'CORTEX', 'CRUZES', 'CUMMINS',
  'CUMMINS ISB', 'CUMMINS ISC', 'CUMMINS SERIE B', 'CUMMINS SERIE C', 'D22', 'DS11', 'DUCATO', 'DUST',
  'ECOSPORT', 'ETIOS', 'ETOK', 'ETORQ', 'FIAT', 'FIAT FLAY', 'FIRE', 'FIRE EVO', 'FOCUS', 'FORD',
  'FORD KA', 'FUSCA', 'FUSION', 'GENESIS', 'GM', 'GOL', 'GOLF', 'HB20', 'HILUX', 'HONDA', 'HR',
  'HS', 'HYNDAI', 'I30', 'ISUZU', 'IVECO', 'JCB', 'JEEP', 'JETTA', 'JONH DERE', 'KADET', 'KD12',
  'KIA', 'KOMBI', 'KWID', 'L200', 'LEVINA', 'LIFAN', 'LOGAN', 'M90', 'MAH', 'MAN', 'MAXXFORCE',
  'MERCEDES', 'MERCEDES 314', 'MERCEDES 352', 'MERCEDES 364', 'MERCEDES 366', 'MERCEDES 611',
  'MERCEDES 904', 'MERIVA', 'MITSUBISHI', 'MONTANHA', 'MPI', 'MSI', 'MWM', 'MWM SERIE 10',
  'MWM D299', 'MWM D299 TD', 'MWM SERIE 12', 'MWM SPRINTER', 'NB10', 'NB22', 'NEW FIESTA',
  'NEW HOLLAND', 'NISSAN', 'NS11', 'NS18', 'NS50', 'NS75', 'NS90', 'OM', 'OMEGA', 'ONIX', 'OROCH',
  'PAJERO', 'PEGEOUT', 'PERKINS', 'PERKINS 4236', 'POWER', 'POWERSTROQUE', 'PRISMA', 'RANGER',
  'RENAULT', 'RENAULT MASTER', 'RENEGEDE', 'S10', 'SANDERO', 'SAVEIRO', 'SCANIA', 'SENTRA',
  'SIGMA', 'SONIC', 'SPRINTER', 'SW4', 'SYMBOL', 'TEMPRA', 'TIGGO', 'TOBATA', 'TORO', 'TOYAMA',
  'TOYATA', 'TR4', 'TRACKER', 'TRANSETI', 'TRATOR', 'TRITRON', 'TUCKSON', 'UP', 'V6', 'VECTRA',
  'VERA CRUZ', 'VERSA', 'VOLKS', 'VOLVO', 'VOLVO - L90F', 'YAMMA', 'YAMMA B8', 'ZETEC'
];

const LOCAL_DB_UNAVAILABLE = 'Banco de dados local indisponível. Abra o sistema pelo aplicativo desktop.';

function getLocalDb(): ElectronAPI | null {
  return typeof window !== 'undefined' && window.electronAPI ? window.electronAPI : null;
}

function requireLocalDb(): ElectronAPI {
  const db = getLocalDb();
  if (!db) throw new Error(LOCAL_DB_UNAVAILABLE);
  return db;
}

function normalizeName(text: any): string {
  return String(text ?? '')
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export function normalizeForComparison(text: any): string {
  return String(text ?? '')
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchOriginalMotors(): Promise<string[]> {
  const db = getLocalDb();
  if (!db) return [...SEED_MOTORS_FALLBACK];

  try {
    const localRows = await db.dbQuery(
      "SELECT id FROM motores WHERE id IS NOT NULL AND TRIM(id) != ''"
    );
    let list = localRows
      .map((r: any) => r?.id)
      .filter((id): id is string => Boolean(id && String(id).trim()));

    if (list.length === 0) {
      console.log('Local motores table is empty. Seeding fallback list...');
      for (const name of SEED_MOTORS_FALLBACK) {
        await db.dbRun(
          "INSERT OR IGNORE INTO motores (id, updated_at) VALUES (?, ?)",
          [name, new Date().toISOString()]
        );
      }
      list = [...SEED_MOTORS_FALLBACK];
    }

    return list.sort((a, b) => normalizeName(a).localeCompare(normalizeName(b)));
  } catch (err) {
    console.error('Failed to fetch motors from local SQLite:', err);
    return [...SEED_MOTORS_FALLBACK];
  }
}

export async function runMotorsMigration(): Promise<void> {
  console.log('[Migration] Starting motors to models migration...');
  try {
    const models = await fetchModels();
    const motors = await fetchOriginalMotors();

    const normalizedModels = new Set(models.map(m => normalizeForComparison(m)));

    for (const motor of motors) {
      const normalizedMotor = normalizeForComparison(motor);
      if (!normalizedModels.has(normalizedMotor) && motor.trim() !== '') {
        console.log(`[Migration] Migrating motor "${motor}" to models table...`);
        await addModel(motor);
        normalizedModels.add(normalizedMotor);
      }
    }
    console.log('[Migration] Motors migration completed successfully.');
  } catch (error) {
    console.error('[Migration] Failed to run motors migration:', error);
  }
}

export interface MotorModel {
  id: string;
  is_favorite: boolean;
}

export async function fetchMotorsWithFavorites(): Promise<MotorModel[]> {
  const seedList = () => SEED_MODELS_FALLBACK
    .map(name => ({ id: name, is_favorite: false }))
    .sort((a, b) => normalizeName(a.id).localeCompare(normalizeName(b.id)));

  const db = getLocalDb();
  if (!db) return seedList();

  try {
    const localRows = await db.dbQuery(
      "SELECT id, is_favorite FROM modelos WHERE id IS NOT NULL AND TRIM(id) != ''"
    );
    let list = localRows
      .filter((r: any) => r?.id != null && String(r.id).trim() !== '')
      .map((r: any) => ({
        id: String(r.id),
        is_favorite: r.is_favorite === 1
      }));

    if (list.length === 0) {
      console.log('Local modelos table is empty. Seeding fallback list...');
      for (const name of SEED_MODELS_FALLBACK) {
        await db.dbRun(
          "INSERT OR IGNORE INTO modelos (id, is_favorite, updated_at) VALUES (?, 0, ?)",
          [name, new Date().toISOString()]
        );
      }
      list = SEED_MODELS_FALLBACK.map(name => ({ id: name, is_favorite: false }));
    }

    return list.sort((a, b) => normalizeName(a.id).localeCompare(normalizeName(b.id)));
  } catch (err) {
    console.error('Failed to fetch models with favorites from local SQLite:', err);
    return seedList();
  }
}

export async function toggleModelFavorite(name: string, isFavorite: boolean): Promise<void> {
  const trimmedName = name.trim().toUpperCase();
  const db = requireLocalDb();

  await db.dbRun(
    "UPDATE modelos SET is_favorite = ?, updated_at = ? WHERE id = ?",
    [isFavorite ? 1 : 0, new Date().toISOString(), trimmedName]
  );
}

export async function fetchMotors(): Promise<string[]> {
  return fetchModels();
}

export async function fetchModels(): Promise<string[]> {
  const seedList = () => [...SEED_MODELS_FALLBACK]
    .sort((a, b) => normalizeName(a).localeCompare(normalizeName(b)));

  const db = getLocalDb();
  if (!db) return seedList();

  try {
    const localRows = await db.dbQuery(
      "SELECT id FROM modelos WHERE id IS NOT NULL AND TRIM(id) != ''"
    );
    let list = localRows
      .map((r: any) => r?.id)
      .filter((id): id is string => Boolean(id && String(id).trim()));

    if (list.length === 0) {
      console.log('Local modelos table is empty. Seeding fallback list...');
      for (const name of SEED_MODELS_FALLBACK) {
        await db.dbRun(
          "INSERT OR IGNORE INTO modelos (id, updated_at) VALUES (?, ?)",
          [name, new Date().toISOString()]
        );
      }
      list = [...SEED_MODELS_FALLBACK];
    }

    return list.sort((a, b) => normalizeName(a).localeCompare(normalizeName(b)));
  } catch (err) {
    console.error('Failed to fetch models from local SQLite:', err);
    return seedList();
  }
}

export async function addMotor(name: string): Promise<void> {
  return addModel(name);
}

export async function addModel(name: string): Promise<void> {
  const trimmedName = name.trim().toUpperCase();
  if (!trimmedName) return;

  const db = requireLocalDb();
  await db.dbRun(
    "INSERT OR IGNORE INTO modelos (id, updated_at) VALUES (?, ?)",
    [trimmedName, new Date().toISOString()]
  );
}

export async function deleteMotor(name: string): Promise<void> {
  return deleteModel(name);
}

export async function deleteModel(name: string): Promise<void> {
  const trimmedName = name.trim().toUpperCase();
  const db = requireLocalDb();

  await db.dbRun("DELETE FROM modelos WHERE id = ?", [trimmedName]);
  await db.dbRun("DELETE FROM motores WHERE id = ?", [trimmedName]);
}

export async function updateMotor(oldName: string, newName: string): Promise<void> {
  return updateModel(oldName, newName);
}

export async function updateModel(oldName: string, newName: string): Promise<void> {
  const trimmedOldName = oldName.trim().toUpperCase();
  const trimmedNewName = newName.trim().toUpperCase();
  if (!trimmedOldName || !trimmedNewName || trimmedOldName === trimmedNewName) return;

  const db = requireLocalDb();

  // id is the primary key in both tables, so renaming onto a name that already exists
  // elsewhere would violate the unique constraint and silently abort the rename. Refuse
  // clearly up front instead of letting that failure get swallowed.
  const [collisionModel, collisionMotor] = await Promise.all([
    db.dbQuery("SELECT id FROM modelos WHERE id = ?", [trimmedNewName]),
    db.dbQuery("SELECT id FROM motores WHERE id = ?", [trimmedNewName])
  ]);
  if (collisionModel.length > 0 || collisionMotor.length > 0) {
    throw new Error(`Já existe um motor/modelo chamado "${trimmedNewName}".`);
  }

  const now = new Date().toISOString();
  await db.dbRun("UPDATE modelos SET id = ?, updated_at = ? WHERE id = ?", [trimmedNewName, now, trimmedOldName]);
  await db.dbRun("UPDATE motores SET id = ?, updated_at = ? WHERE id = ?", [trimmedNewName, now, trimmedOldName]);
}

export function deleteDisplacement(dispName: string): boolean {
  if (typeof window === 'undefined') return false;

  const defaultDisplacements = ['1.0', '1.3', '1.4', '1.6', '1.8', '2.0', '2.2', '2.3', '2.4', '2.8', '3.0'];
  const trimmed = dispName.trim();
  if (defaultDisplacements.includes(trimmed)) {
    alert(`A cilindrada "${trimmed}" é padrão do sistema e não pode ser excluída.`);
    return false;
  }



  const saved = localStorage.getItem('retifica_custom_displacements');
  if (saved) {
    try {
      const parsed: string[] = JSON.parse(saved);
      const updated = parsed.filter(d => d !== trimmed);
      localStorage.setItem('retifica_custom_displacements', JSON.stringify(updated));
    } catch (e) {
      console.error('Erro ao atualizar cilindradas no localStorage:', e);
    }
  }
  return true;
}
