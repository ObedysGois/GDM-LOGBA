// Arquivo de teste para verificar conexão com Supabase
import { supabase, testSupabaseConnection, initializeStorageBuckets } from './supabaseConfig.js';

// Função para testar upload de arquivo
export const testSupabaseUpload = async () => {
  try {
    console.log('🧪 Testando conexão com Supabase...');
    
    // Testar conexão
    const isConnected = await testSupabaseConnection();
    if (!isConnected) {
      console.log('❌ Falha na conexão com Supabase');
      return false;
    }
    
    // Testar criação de buckets
    console.log('🔄 Criando buckets...');
    await initializeStorageBuckets();
    
    // Testar listagem de buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) {
      console.log('❌ Erro ao listar buckets:', bucketsError);
      return false;
    }
    
    console.log('✅ Buckets disponíveis:', buckets.map(b => b.name));
    
    // Testar upload de arquivo de teste
    const testFile = new File(['Teste de conexão Supabase'], 'test.txt', { type: 'text/plain' });
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('general-files')
      .upload('test/connection-test.txt', testFile);
    
    if (uploadError) {
      console.log('❌ Erro no upload de teste:', uploadError);
      return false;
    }
    
    console.log('✅ Upload de teste bem-sucedido:', uploadData);
    
    // Limpar arquivo de teste
    const { error: deleteError } = await supabase.storage
      .from('general-files')
      .remove(['test/connection-test.txt']);
    
    if (deleteError) {
      console.log('⚠️ Erro ao limpar arquivo de teste:', deleteError);
    } else {
      console.log('✅ Arquivo de teste removido');
    }
    
    console.log('🎉 Todos os testes passaram! Supabase está funcionando perfeitamente.');
    return true;
    
  } catch (error) {
    console.error('❌ Erro durante teste:', error);
    return false;
  }
};

// Executar teste se chamado diretamente
if (typeof window !== 'undefined') {
  // No navegador, adicionar ao console global
  window.testSupabase = testSupabaseUpload;
  console.log('🧪 Para testar Supabase, execute: testSupabase() no console');
} 