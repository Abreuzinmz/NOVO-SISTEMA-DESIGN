// Montadoras, logos (public/brands) e detecção da marca pelo nome do motor.
// Base: projeto SELEÇÃO MT (imgs-vetorias).

export const MOTOR_BRANDS = [
  'Volkswagen',
  'Chevrolet / GM',
  'Fiat',
  'Ford',
  'Toyota',
  'Honda',
  'Hyundai',
  'Renault',
  'Nissan',
  'Mitsubishi',
  'Audi',
  'BMW',
  'Mercedes-Benz',
  'Citroen',
  'Peugeot',
  'Jeep',
  'Chery',
  'Volvo',
  'Scania',
  'Iveco',
  'Isuzu',
  'Cummins',
  'Perkins',
  'MWM',
  'CAT / Caterpillar',
  'John Deere',
  'Yanmar',
];

const BRAND_LOGO_FILES: Record<string, string> = {
  'Volkswagen': 'volkswagen.png',
  'Chevrolet / GM': 'chevrolet.png',
  'Fiat': 'fiat.png',
  'Ford': 'ford.png',
  'Toyota': 'toyota.png',
  'Honda': 'honda.png',
  'Hyundai': 'hyundai.png',
  'Nissan': 'nissan.png',
  'Mitsubishi': 'mitsubishi.png',
  'Audi': 'audi.png',
  'BMW': 'bmw.png',
  'Mercedes-Benz': 'mercedes-benz.png',
  'Citroen': 'citroen.png',
  'Renault': 'renault.png',
  'Peugeot': 'peugeot.png',
  'Jeep': 'jeep.svg',
  'Chery': 'chery.png',
  'Volvo': 'volvo.png',
  'Scania': 'scania.png',
  'Iveco': 'iveco.png',
  'Isuzu': 'isuzu.png',
  'Cummins': 'cummins.png',
  'Perkins': 'perkins.png',
  'CAT / Caterpillar': 'cat.png',
  'John Deere': 'john-deere.png',
  'Yanmar': 'yanmar.png',
};

function findBrandKey(keys: string[], brandName: string): string | undefined {
  const lower = brandName.toLowerCase().trim();
  if (!lower) return undefined;
  return keys.find(k => {
    const kl = k.toLowerCase();
    return kl === lower || kl.split(' / ').some(part => part === lower) || lower.includes(kl) || kl.includes(lower);
  });
}

/** Caminho do logo da montadora (ou null se não houver imagem) */
export function getBrandLogoSrc(brand?: string): string | null {
  if (!brand) return null;
  const key = findBrandKey(Object.keys(BRAND_LOGO_FILES), brand);
  return key ? `/brands/${BRAND_LOGO_FILES[key]}` : null;
}

// Palavras do nome do motor/veículo que indicam a montadora (comparadas como palavra inteira)
const BRAND_KEYWORDS: Array<[string, string[]]> = [
  ['Volkswagen', ['vw', 'volks', 'volkswagen', 'gol', 'amarok', 'amarock', 'power', 'ap', 'fusca', 'kombi', 'ea111', 'ea211', 'ea888', 'jetta', 'golf', 'saveiro', 'polo', 'fox', 'up', 'msi', 'mi', 'voyage', 'virtus', 'tcross', 't-cross']],
  ['Chevrolet / GM', ['gm', 'chev', 'chevrolet', 'onix', 'celta', 'corsa', 'astra', 's10', 'vectra', 'prisma', 'cruze', 'cruzes', 'tracker', 'spin', 'cobalt', 'montana', 'meriva', 'captiva', 'omega', 'chevett', 'chevette', 'kadet', 'kadett', 'sonic', 'classic', 'family', 'ecotec']],
  ['Fiat', ['fiat', 'fire', 'fire evo', 'firefly', 'palio', 'uno', 'toro', 'strada', 'argo', 'mobi', 'siena', 'ducato', 'tempra', 'etorq', 'etork', 'sevel', 'fiat flay']],
  ['Ford', ['ford', 'rocam', 'zetec', 'duratec', 'sigma', 'ranger', 'ka', 'ford ka', 'fiesta', 'new fiesta', 'ecosport', 'focus', 'fusion', 'corsel', 'corcel', 'cht', 'transeti', 'transit', 'powerstroque', 'powerstroke']],
  ['Toyota', ['toyota', 'toyata', 'corolla', 'hilux', 'etios', 'yaris', 'sw4']],
  ['Honda', ['honda', 'civic', 'fit', 'hr-v', 'hrv', 'city']],
  ['Hyundai', ['hyundai', 'hyndai', 'hb20', 'creta', 'tucson', 'tuckson', 'i30', 'hr', 'vera cruz', 'genesis']],
  ['Renault', ['renault', 'sandero', 'logan', 'duster', 'dust', 'kwid', 'master', 'symbol', 'oroch']],
  ['Nissan', ['nissan', 'march', 'versa', 'kicks', 'sentra', 'frontier', 'livina', 'levina']],
  ['Mitsubishi', ['mitsubishi', 'l200', 'pajero', 'asx', 'outlander', 'lancer', 'tr4', 'tritron', 'triton']],
  ['Audi', ['audi', 'quattro']],
  ['BMW', ['bmw']],
  ['Mercedes-Benz', ['mercedes', 'benz', 'sprinter', 'om', 'class']],
  ['Citroen', ['citroen', 'citroën', 'c4', 'jumpy', 'jumper']],
  ['Peugeot', ['peugeot', 'pegeout', 'partner']],
  ['Jeep', ['jeep', 'renegade', 'renegede', 'compass', 'commander', 'cherok', 'cherokee']],
  ['Chery', ['chery', 'cherry', 'tiggo', 'arrizo']],
  ['Volvo', ['volvo']],
  ['Scania', ['scania']],
  ['Iveco', ['iveco', 'daily']],
  ['Isuzu', ['isuzu', 'd-max']],
  ['Cummins', ['cummins', 'isb', 'isc']],
  ['Perkins', ['perkins']],
  ['MWM', ['mwm', 'maxxforce']],
  ['CAT / Caterpillar', ['cat', 'caterpillar', 'caterpilhar']],
  ['John Deere', ['john deere', 'jonh dere', 'deere']],
  ['Yanmar', ['yanmar', 'yamma']],
];

/** Tenta descobrir a montadora pelo nome do motor/veículo. Vazio se não reconhecer. */
export function detectBrandFromName(name = ''): string {
  const text = ` ${name.toLowerCase().replace(/[^a-z0-9áéíóúâêôãõç\-\s]/g, ' ').replace(/\s+/g, ' ').trim()} `;
  if (!text.trim()) return '';
  for (const [brand, words] of BRAND_KEYWORDS) {
    if (words.some(w => text.includes(` ${w} `))) return brand;
  }
  return '';
}
