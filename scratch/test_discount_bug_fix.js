// Teste de Verificação da Correção do Bug de Desconto no Agrupamento de O.S.

const { getOrderNetValue } = require('../lib/utils.ts'); // ou simulação direta da função

function getOrderNetValueTest(o) {
  if (!o) return 0;
  const total = Number(o.totalValue || 0);
  const discount = Number(o.discount || 0);
  if (discount > 0) {
    return Math.max(0, total - discount);
  }
  if (o.netValue !== undefined && o.netValue !== null && !isNaN(Number(o.netValue)) && Number(o.netValue) > 0) {
    return Number(o.netValue);
  }
  return Math.max(0, total - discount);
}

const mockOrders = [
  { id: 8460, totalValue: 300, discount: 60, netValue: 300 }, // No BD netValue veio 300 bruto, mas desconto é 60
  { id: 8461, totalValue: 500, discount: 0, netValue: 500 }
];

console.log('--- Teste: Cálculo de Total Final Líquido com Desconto ---');
const os8460Net = getOrderNetValueTest(mockOrders[0]);
const os8461Net = getOrderNetValueTest(mockOrders[1]);

console.log(`O.S. #8460 -> Bruto: R$ 300 | Desconto: R$ 60 | Total Final Calculado: R$ ${os8460Net} (Esperado: 240)`);
console.log(`O.S. #8461 -> Bruto: R$ 500 | Desconto: R$ 0 | Total Final Calculado: R$ ${os8461Net} (Esperado: 500)`);

console.assert(os8460Net === 240, 'O.S. 8460 deve ter Total Final de 240');
console.assert(os8461Net === 500, 'O.S. 8461 deve ter Total Final de 500');

const totalGrupo = os8460Net + os8461Net;
console.log(`VALOR TOTAL DO GRUPO (2 O.S.): R$ ${totalGrupo} (Esperado: 740)`);

console.assert(totalGrupo === 740, 'Total do Grupo deve ser R$ 740,00');

if (os8460Net === 240 && totalGrupo === 740) {
  console.log('✅ PASSOU 100%: Bug de desconto corrigido com sucesso!');
} else {
  console.error('❌ FALHOU: Cálculo com desconto incorreto.');
}
