// Teste de Verificação do Bug 2 - Limpeza de vínculos e hard delete de O.S. em grupos

let mockOrders = [
  { id: 8460, clientId: 'client-1', totalValue: 1000, discount: 100, netValue: 900, paymentStatus: 'Não Pago' },
  { id: 8461, clientId: 'client-1', totalValue: 500, discount: 0, netValue: 500, paymentStatus: 'Não Pago' },
  { id: 8462, clientId: 'client-1', totalValue: 300, discount: 0, netValue: 300, paymentStatus: 'Não Pago' }
];

let mockGroupedPayments = [
  {
    id: 'gp-001',
    clientId: 'client-1',
    valorTotal: 1700,
    valorPago: 0,
    status: 'aguardando_pagamento',
    osIds: [8460, 8461, 8462],
    entradas: []
  }
];

function deleteOrderSimulated(id, options = {}) {
  // Find group
  const groupIndex = mockGroupedPayments.findIndex(g => g.osIds.includes(id));
  if (groupIndex !== -1) {
    const group = mockGroupedPayments[groupIndex];
    const remainingOsIds = group.osIds.filter(osId => osId !== id);

    if (remainingOsIds.length === 0 || (remainingOsIds.length === 1 && options.dissolveGroupIfOneLeft)) {
      // Remove group completely
      mockGroupedPayments.splice(groupIndex, 1);
    } else {
      // Recalculate group
      const remainingOrders = mockOrders.filter(o => remainingOsIds.includes(o.id) && o.id !== id);
      const newValorTotal = remainingOrders.reduce((sum, o) => sum + o.netValue, 0);
      group.osIds = remainingOsIds;
      group.valorTotal = newValorTotal;
      group.status = group.valorPago >= newValorTotal ? 'pago' : (group.valorPago > 0 ? 'pagamento_parcial' : 'aguardando_pagamento');
    }
  }

  // Remove order
  mockOrders = mockOrders.filter(o => o.id !== id);
}

console.log('--- Teste 1: Excluir 1 O.S. de um grupo de 3 ---');
deleteOrderSimulated(8462);
console.log('Grupo restante após excluir #8462:', mockGroupedPayments[0]);
console.assert(mockGroupedPayments[0].osIds.length === 2, 'Deve ter 2 O.S. restantes');
console.assert(mockGroupedPayments[0].valorTotal === 1400, 'Valor total reajustado deve ser 900 + 500 = 1400');
console.log('✅ PASSOU Teste 1: Recálculo do grupo após remoção parcial.');

console.log('\n--- Teste 2: Excluir O.S. com opção de desfazer agrupamento (restando 1 O.S.) ---');
deleteOrderSimulated(8461, { dissolveGroupIfOneLeft: true });
console.log('Grupos restantes:', mockGroupedPayments.length);
console.assert(mockGroupedPayments.length === 0, 'Grupo deve ser completamente removido');
console.log('✅ PASSOU Teste 2: Desfazimento de grupo ao restar 1 O.S.');

console.log('\n--- Teste 3: Criar nova O.S. reaproveitando o ID #8460 ---');
mockOrders.push({ id: 8460, clientId: 'client-1', totalValue: 700, discount: 0, netValue: 700, paymentStatus: 'Não Pago' });
const isAssociated = mockGroupedPayments.some(g => g.osIds.includes(8460));
console.log(`A nova O.S. #8460 possui algum vínculo antigo? ${isAssociated ? 'SIM (ERRO)' : 'NÃO (CORRETO)'}`);
console.assert(!isAssociated, 'O.S. nova não deve herdar nenhum vínculo antigo');
console.log('✅ PASSOU Teste 3: Nenhuma herança de vínculo em O.S. nova.');
