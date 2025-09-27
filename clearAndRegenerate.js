// Script para limpar dados antigos e gerar novos dados com estrutura correta
// Execute este script no console do navegador após fazer login

import { getAllDeliveryRecords, deleteDeliveryRecord, generateDummyData } from './src/firebaseUtils.js';

// Função para limpar todos os dados antigos
async function clearAllData() {
  try {
    console.log('🔍 Buscando todos os registros...');
    const allRecords = await getAllDeliveryRecords();
    
    if (allRecords.length === 0) {
      console.log('✅ Nenhum registro encontrado para limpar.');
      return;
    }
    
    console.log(`🗑️ Encontrados ${allRecords.length} registros para deletar...`);
    
    // Deletar todos os registros
    for (const record of allRecords) {
      try {
        await deleteDeliveryRecord(record.id);
        console.log(`✅ Deletado registro: ${record.id}`);
      } catch (error) {
        console.error(`❌ Erro ao deletar registro ${record.id}:`, error);
      }
    }
    
    console.log('✅ Todos os registros antigos foram deletados!');
    
  } catch (error) {
    console.error('❌ Erro ao limpar dados:', error);
  }
}

// Função para regenerar dados com estrutura correta
async function regenerateData() {
  try {
    console.log('🧹 Limpando dados antigos...');
    await clearAllData();
    
    console.log('🔄 Gerando novos dados com estrutura correta...');
    await generateDummyData(20);
    
    console.log('✅ Dados regenerados com sucesso!');
    console.log('🔄 Recarregue a página para ver os novos dados.');
    
  } catch (error) {
    console.error('❌ Erro ao regenerar dados:', error);
  }
}

// Exportar funções para uso no console
window.clearAllData = clearAllData;
window.regenerateData = regenerateData;

console.log('🔄 Script de regeneração de dados carregado!');
console.log('Use clearAllData() para limpar todos os dados');
console.log('Use regenerateData() para limpar e gerar novos dados'); 