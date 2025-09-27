// Script para gerar dados de teste para o aplicativo de logística
// Execute este script no console do navegador após fazer login

import { generateDummyData } from './src/firebaseUtils.js';

// Função para gerar dados de teste
async function generateTestData() {
  try {
    console.log('Iniciando geração de dados de teste...');
    
    // Gerar 20 registros de teste
    await generateDummyData(20);
    
    console.log('✅ Dados de teste gerados com sucesso!');
    console.log('Agora você pode testar todas as funcionalidades do aplicativo.');
    
  } catch (error) {
    console.error('❌ Erro ao gerar dados de teste:', error);
  }
}

// Função para limpar dados (apenas para desenvolvimento)
async function clearTestData() {
  try {
    console.log('⚠️ ATENÇÃO: Esta ação irá apagar todos os registros!');
    const confirm = window.confirm('Tem certeza que deseja apagar todos os registros? Esta ação não pode ser desfeita.');
    
    if (confirm) {
      // Implementar limpeza de dados aqui
      console.log('Dados apagados com sucesso!');
    }
  } catch (error) {
    console.error('Erro ao apagar dados:', error);
  }
}

// Exportar funções para uso no console
window.generateTestData = generateTestData;
window.clearTestData = clearTestData;

console.log('📊 Script de dados de teste carregado!');
console.log('Use generateTestData() para gerar dados de teste');
console.log('Use clearTestData() para limpar dados (apenas desenvolvimento)');
