export interface CatalogService {
  id: string;
  name: string;
  defaultPrice: number;
  estimatedTime?: string;
  description?: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  services: CatalogService[];
}

export interface SearchMatch {
  category: ServiceCategory;
  service: CatalogService;
  ranges: { start: number; end: number }[];
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: 'cabecote',
    name: 'CABEÇOTE',
    services: [
      { id: 'cab-plainar', name: 'PLAINAR CABEÇOTE', defaultPrice: 0 },
      { id: 'cab-esmerilhar', name: 'ESMERILHAR E MONTAR', defaultPrice: 0 },
      { id: 'cab-trocar-guias', name: 'TROCAR GUIAS', defaultPrice: 0 },
      { id: 'cab-trocar-sedes', name: 'TROCAR SEDES', defaultPrice: 0 },
      { id: 'cab-retificar-sedes', name: 'RETIFICAR SEDES', defaultPrice: 0 },
      { id: 'cab-adaptar-sedes', name: 'ADAPTAR SEDES', defaultPrice: 0 },
      { id: 'cab-retificar-valvulas', name: 'RETIFICAR VÁLVULAS', defaultPrice: 0 },
      { id: 'cab-adaptar-buchas', name: 'ADAPTAR BUCHAS', defaultPrice: 0 },
      { id: 'cab-adaptar-guias', name: 'ADAPTAR GUIAS', defaultPrice: 0 },
      { id: 'cab-soldar', name: 'SOLDAR CABEÇOTE', defaultPrice: 0 },
      { id: 'cab-alinhar-comando', name: 'ALINHAR COMANDO DE VÁLVULA', defaultPrice: 0 },
      { id: 'cab-calibrar-valvulas', name: 'CALIBRAGEM DE VÁLVULAS', defaultPrice: 0 },
      { id: 'cab-extrair-parafusos', name: 'EXTRAIR PARAFUSOS', defaultPrice: 0 },
    ],
  },
  {
    id: 'bloco',
    name: 'BLOCO',
    services: [
      { id: 'blo-encamizar', name: 'ENCAMIZAR BLOCO', defaultPrice: 0 },
      { id: 'blo-retificar', name: 'RETIFICAR BLOCO', defaultPrice: 0 },
      { id: 'blo-brunir', name: 'BRUNIR BLOCO', defaultPrice: 0 },
      { id: 'blo-reabrir', name: 'REABRIR BLOCO', defaultPrice: 0 },
      { id: 'blo-alinhar', name: 'ALINHAR BLOCO', defaultPrice: 0 },
      { id: 'blo-plainar-face', name: 'PLAINAR FACE BLOCO', defaultPrice: 0 },
      { id: 'blo-soldar', name: 'SOLDAR BLOCO', defaultPrice: 0 },
      { id: 'blo-projetar-camisa', name: 'PROJEÇÃO DE CAMISA', defaultPrice: 0 },
      { id: 'blo-embuchar-comando', name: 'EMBUCHAR COMANDO', defaultPrice: 0 },
    ],
  },
  {
    id: 'eixo',
    name: 'EIXO',
    services: [
      { id: 'eix-retificar', name: 'RETIFICAR EIXO', defaultPrice: 0 },
      { id: 'eix-polir', name: 'POLIR EIXO', defaultPrice: 0 },
      { id: 'eix-encher-lateral', name: 'ENCHER LATERAL DO EIXO', defaultPrice: 0 },
      { id: 'eix-encher-base-rolamento', name: 'ENCHER BASE DE ROLAMENTO', defaultPrice: 0 },
      { id: 'eix-retificar-biela', name: 'RETIFICAR BIELA', defaultPrice: 0 },
      { id: 'eix-desempenhar', name: 'DESEMPENAR EIXO', defaultPrice: 0 },
    ],
  },
  {
    id: 'outros',
    name: 'OUTROS',
    services: [
      { id: 'out-embuchar-bielas', name: 'EMBUCHAR BIELAS', defaultPrice: 0 },
      { id: 'out-trocar-pistoes', name: 'TROCAR PISTÕES', defaultPrice: 0 },
      { id: 'out-montagem-parcial', name: 'MONTAGEM PARCIAL', defaultPrice: 0 },
      { id: 'out-montagem-completa', name: 'MONTAGEM COMPLETA', defaultPrice: 0 },
      { id: 'out-lavagem-quimica', name: 'LAVAGEM QUÍMICA', defaultPrice: 0 },
      { id: 'out-jogo-retentor', name: 'JOGO DE RETENTOR DE VÁLVULAS', defaultPrice: 0 },
      { id: 'out-desmontagem-parcial', name: 'DESMONTAGEM PARCIAL', defaultPrice: 0 },
    ],
  },
];

export function getServiceById(id: string): CatalogService | undefined {
  for (const cat of SERVICE_CATEGORIES) {
    const found = cat.services.find((s) => s.id === id);
    if (found) return found;
  }
  return undefined;
}

function normalizeForSearch(str: string): string {
  return String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function searchServices(query: string, categoryId?: string): SearchMatch[] {
  const q = normalizeForSearch(query);
  if (!q) return [];

  const results: SearchMatch[] = [];

  for (const cat of SERVICE_CATEGORIES) {
    if (categoryId && cat.id !== categoryId) continue;

    for (const svc of cat.services) {
      const n = normalizeForSearch(svc.name);

      const firstIdx = n.indexOf(q);
      if (firstIdx !== -1) {
        results.push({
          category: cat,
          service: svc,
          ranges: [{ start: firstIdx, end: firstIdx + q.length }],
        });
        continue;
      }

      let searchPos = 0;
      const indices: number[] = [];
      for (const ch of q) {
        const pos = n.indexOf(ch, searchPos);
        if (pos === -1) break;
        indices.push(pos);
        searchPos = pos + 1;
      }

      if (indices.length === q.length) {
        const ranges: { start: number; end: number }[] = [];
        let rs = indices[0];
        let re = indices[0] + 1;
        for (let i = 1; i < indices.length; i++) {
          if (indices[i] === re) {
            re = indices[i] + 1;
          } else {
            ranges.push({ start: rs, end: re });
            rs = indices[i];
            re = indices[i] + 1;
          }
        }
        ranges.push({ start: rs, end: re });
        results.push({ category: cat, service: svc, ranges });
      }
    }
  }

  results.sort((a, b) => {
    const aExact = a.ranges.length === 1 && (a.ranges[0].end - a.ranges[0].start) === q.length;
    const bExact = b.ranges.length === 1 && (b.ranges[0].end - b.ranges[0].start) === q.length;
    if (aExact !== bExact) return aExact ? -1 : 1;
    return a.service.name.localeCompare(b.service.name);
  });

  return results;
}
