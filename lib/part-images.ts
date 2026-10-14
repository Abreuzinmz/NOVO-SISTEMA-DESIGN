// Fotos das peças (Materiais e Peças) — arquivos em public/parts

const normalizePartName = (name: string) =>
  name.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().trim();

const PART_IMAGES: Record<string, string> = {
  'BLOCO': '/parts/bloco.webp',
  'CABECOTE': '/parts/cabecote.webp',
  'EIXO': '/parts/eixo.webp',
  'PISTOES': '/parts/pistoes.webp',
  'PISTAO': '/parts/pistoes.webp',
  'CARCACA': '/parts/carcaca.webp',
  'BOMBA INJETORA': '/parts/bomba-injetora.webp',
  'VIRABREQUIM': '/parts/eixo.webp',
  'BIELA': '/parts/biela.webp',
  'BIELAS': '/parts/biela.webp',
  'MOTOR COMPLETO': '/parts/motor-completo.webp',
  'MANCAIS DO BLOCO': '/parts/mancais.webp',
  'TAMPA CABECOTE': '/parts/tampa-cabecote.webp',
  'JETCOOLER': '/parts/jetcooler.webp',
  'COMANDO DE VALVULA': '/parts/comando.webp',
  'SENSOR': '/parts/sensor.webp',
  'TUCHOS': '/parts/tuchos.webp',
  'TUCHO': '/parts/tuchos.webp',
  'TAMPA DE OLEO': '/parts/tampa-oleo.webp',
  'CARTER': '/parts/carter.webp',
  'BALANCIM': '/parts/balancim.webp',
  'BALANCINS': '/parts/balancim.webp',
  'PARAFUSOS': '/parts/parafusos.webp',
  'PARAFUSO': '/parts/parafusos.webp',
};

export function getPartImage(name: string): string | undefined {
  return PART_IMAGES[normalizePartName(name)];
}
