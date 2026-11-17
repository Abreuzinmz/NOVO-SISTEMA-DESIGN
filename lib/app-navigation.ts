// Navegação entre telas a partir de qualquer componente (modais, painéis),
// sem precisar passar callbacks por toda a árvore. A página principal (app/page.tsx) escuta.

export const OPEN_CLIENT_EVENT = 'app:open-client';

export interface OpenClientDetail {
  clientId: string;
}

/** Abre a tela Clientes com este cliente já selecionado */
export function openClientInClientsView(clientId: string) {
  if (typeof window === 'undefined' || !clientId) return;
  window.dispatchEvent(new CustomEvent<OpenClientDetail>(OPEN_CLIENT_EVENT, { detail: { clientId } }));
}
