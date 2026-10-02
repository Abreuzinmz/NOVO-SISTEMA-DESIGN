// Script de teste da lógica do Pagamento Agrupado

const mockOrders = [
  { id: 101, clientId: 'client-1', totalValue: 1000, discount: 100, netValue: 900, paymentStatus: 'Não Pago' },
  { id: 102, clientId: 'client-1', totalValue: 500, discount: 0, netValue: 500, paymentStatus: 'Não Pago' },
  { id: 103, clientId: 'client-1', totalValue: 400, discount: 50, netValue: 350, paymentStatus: 'Não Pago' }
];

console.log('--- Testando regra de valor_total (soma dos Totais Finais / netValue pós-desconto) ---');
const osIds = [101, 102, 103];
const includedOrders = mockOrders.filter(o => osIds.includes(o.id));

const valorTotalGrupo = includedOrders.reduce((sum, o) => {
  const net = o.netValue !== undefined ? o.netValue : (o.totalValue - o.discount);
  return sum + net;
}, 0);

console.log('Valores das O.S. com desconto:');
includedOrders.forEach(o => {
  console.log(`  O.S. #${o.id}: Bruto R$ ${o.totalValue} | Desconto R$ ${o.discount} | Total Final R$ ${o.netValue}`);
});
console.log(`Valor Total Agrupado Calculado: R$ ${valorTotalGrupo} (Esperado: 900 + 500 + 350 = R$ 1750)`);

if (valorTotalGrupo === 1750) {
  console.log('✅ PASSOU: Cálculo de valor_total do grupo está correto!');
} else {
  console.error('❌ FALHOU: Cálculo de valor_total incorreto.');
}

console.log('\n--- Testando fluxo de entradas múltiplas no mesmo dia ---');
let entradas = [];
let valorPago = 0;

function addEntrada(valor, forma, data) {
  entradas.push({ valor, forma, data });
  valorPago = entradas.reduce((acc, curr) => acc + curr.valor, 0);
  let status = 'aguardando_pagamento';
  if (valorPago >= valorTotalGrupo) {
    status = 'pago';
  } else if (valorPago > 0) {
    status = 'pagamento_parcial';
  }
  return status;
}

// 1. Lançar R$ 350 em dinheiro
let status1 = addEntrada(350, 'Dinheiro', '2026-08-12');
console.log(`Após 1ª entrada (R$ 350 Dinheiro): Pago R$ ${valorPago} / R$ ${valorTotalGrupo} | Status: ${status1}`);
console.assert(status1 === 'pagamento_parcial', 'Status deve ser pagamento_parcial');

// 2. Lançar R$ 1400 em débito para quitar
let status2 = addEntrada(1400, 'Débito', '2026-08-12');
console.log(`Após 2ª entrada (R$ 1400 Débito): Pago R$ ${valorPago} / R$ ${valorTotalGrupo} | Status: ${status2}`);
console.assert(status2 === 'pago', 'Status deve ser pago');

if (status1 === 'pagamento_parcial' && status2 === 'pago') {
  console.log('✅ PASSOU: Lógica de entradas múltiplas e transição de status validada com sucesso!');
} else {
  console.error('❌ FALHOU: Transição de status das entradas.');
}
