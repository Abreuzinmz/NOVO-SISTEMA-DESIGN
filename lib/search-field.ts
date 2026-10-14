// Campo de busca padrão (mesmo estilo do filtro da Lista de Motores):
// alto, bem arredondado, fundo cinza bem claro, lupa grande e borda fina no foco.

/** Classes do <Input> de busca */
export const searchFieldClass =
  'h-12 pl-14 pr-4 rounded-2xl text-[15px] bg-muted/30 border-border/70 shadow-2xs placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:border-foreground/30';

/** Classes da lupa à esquerda (o contêiner precisa ser `relative`) */
export const searchFieldIconClass =
  'absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-10';
