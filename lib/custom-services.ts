export interface CustomService {
  id: string;
  name: string;
  defaultPrice: number;
}

const LOCAL_DB_UNAVAILABLE = 'Banco de dados local indisponível. Abra o sistema pelo aplicativo desktop.';

function requireLocalDb() {
  if (typeof window === 'undefined' || !window.electronAPI) {
    throw new Error(LOCAL_DB_UNAVAILABLE);
  }
  return window.electronAPI;
}

function fromDb(row: any): CustomService {
  return {
    id: row.id,
    name: row.name,
    defaultPrice: Number(row.default_price) || 0,
  };
}

export async function fetchCustomServices(): Promise<CustomService[]> {
  if (typeof window === 'undefined' || !window.electronAPI) return [];

  try {
    const localRows = await window.electronAPI.dbQuery(
      "SELECT * FROM custom_services ORDER BY name"
    );
    return localRows.map(fromDb);
  } catch (err) {
    console.error('Failed to fetch custom services from local SQLite:', err);
    return [];
  }
}

export async function addCustomService(name: string, defaultPrice = 0): Promise<CustomService | null> {
  const trimmedName = name.trim().toUpperCase();
  if (!trimmedName) return null;

  const db = requireLocalDb();
  const now = new Date().toISOString();

  const existing = await db.dbQuery(
    "SELECT id FROM custom_services WHERE name = ?",
    [trimmedName]
  );
  if (existing.length > 0) {
    const id = existing[0].id;
    await db.dbRun(
      "UPDATE custom_services SET default_price = ?, updated_at = ? WHERE id = ?",
      [defaultPrice, now, id]
    );
    return { id, name: trimmedName, defaultPrice };
  }

  const id = crypto.randomUUID();
  await db.dbRun(
    "INSERT INTO custom_services (id, name, default_price, updated_at) VALUES (?, ?, ?, ?)",
    [id, trimmedName, defaultPrice, now]
  );
  return { id, name: trimmedName, defaultPrice };
}

export async function updateCustomService(id: string, name: string, defaultPrice: number): Promise<void> {
  const trimmedName = name.trim().toUpperCase();
  const db = requireLocalDb();

  await db.dbRun(
    "UPDATE custom_services SET name = ?, default_price = ?, updated_at = ? WHERE id = ?",
    [trimmedName, defaultPrice, new Date().toISOString(), id]
  );
}

export async function deleteCustomService(id: string): Promise<void> {
  const db = requireLocalDb();
  await db.dbRun("DELETE FROM custom_services WHERE id = ?", [id]);
}
