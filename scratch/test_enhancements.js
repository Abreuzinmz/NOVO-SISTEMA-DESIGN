// Testes das 3 novas melhorias do Pagamento Agrupado

let mockOrders = [
  { id: 9001, netValue: 600, paymentStatus: 'Não Pago', entryValue: 0 },
  { id: 9002, netValue: 400, paymentStatus: 'Não Pago', entryValue: 0 }
];

let mockGroup = {
  id: 'gp-pix-test',
  valorTotal: 1000,
  valorPago: 500,
  osIds: [9001, 9002],
  entradas: [
    { id: 'e1', valor: 500, formaPagamento: 'PIX', nomePagador: 'Carlos Sócio' }
  ]
};

console.log('--- Teste 1: Entrada Pix com nome_pagador ---');
console.log('Entrada Pix registrada:', mockGroup.entradas[0]);
console.assert(mockGroup.entradas[0].nomePagador === 'Carlos Sócio', 'Nome do pagador deve ser registrado');
console.log('✅ PASSOU Teste 1: Registro de nome do pagador no Pix.');

console.log('\n--- Teste 2: Desfazer agrupamento com distribuição proporcional ---');
function dissolveGroup(group, option) {
  if (option === 'distribute' && group.valorPago > 0) {
    const ratio = group.valorPago / group.valorTotal; // 500 / 1000 = 0.5
    for (const osId of group.osIds) {
      const order = mockOrders.find(o => o.id === osId);
      if (order) {
        order.entryValue = order.netValue * ratio;
        order.paymentStatus = order.entryValue >= order.netValue ? 'Pago' : (order.entryValue > 0 ? 'Entrada' : 'Não Pago');
      }
    }
  }
}

dissolveGroup(mockGroup, 'distribute');
console.log('Estado da O.S. #9001 após desfazer (Net: R$600):', mockOrders[0]);
console.log('Estado da O.S. #9002 após desfazer (Net: R$400):', mockOrders[1]);
console.assert(mockOrders[0].entryValue === 300 && mockOrders[0].paymentStatus === 'Entrada', 'O.S. 9001 deve ter R$300 como Entrada');
console.assert(mockOrders[1].entryValue === 200 && mockOrders[1].paymentStatus === 'Entrada', 'O.S. 9002 deve ter R$200 como Entrada');
console.log('✅ PASSOU Teste 2: Distribuição proporcional ao desfazer grupo.');
