// Script para inicializar buckets do Supabase manualmente
// Execute este script no console do navegador após fazer login

import { supabase, STORAGE_BUCKETS } from './supabaseConfig.js';

async function createSupabaseBuckets() {
  console.log('🔄 Criando buckets do Supabase...');
  
  try {
    // Listar buckets existentes
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Erro ao listar buckets:', listError);
      return;
    }
    
    console.log('📦 Buckets existentes:', existingBuckets?.map(b => b.name) || []);
    
    // Criar buckets necessários
    const bucketsToCreate = Object.values(STORAGE_BUCKETS);
    
    for (const bucketName of bucketsToCreate) {
      const bucketExists = existingBuckets?.some(b => b.name === bucketName);
      
      if (!bucketExists) {
        console.log(`📦 Criando bucket: ${bucketName}`);
        
        const { error: createError } = await supabase.storage.createBucket(bucketName, {
          public: true,
          allowedMimeTypes: ['image/*', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
          fileSizeLimit: 52428800 // 50MB
        });
        
        if (createError) {
          console.error(`❌ Erro ao criar bucket ${bucketName}:`, createError);
        } else {
          console.log(`✅ Bucket ${bucketName} criado com sucesso!`);
        }
      } else {
        console.log(`✅ Bucket ${bucketName} já existe`);
      }
    }
    
    // Verificar buckets finais
    const { data: finalBuckets, error: finalError } = await supabase.storage.listBuckets();
    
    if (finalError) {
      console.error('❌ Erro ao verificar buckets finais:', finalError);
    } else {
      console.log('🎉 Buckets disponíveis:', finalBuckets?.map(b => b.name) || []);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Função para testar upload
async function testUpload() {
  console.log('🧪 Testando upload...');
  
  try {
    // Criar um arquivo de teste
    const testContent = 'Teste de upload do Supabase';
    const testFile = new File([testContent], 'teste.txt', { type: 'text/plain' });
    
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.DELIVERY_ATTACHMENTS)
      .upload('teste/teste.txt', testFile, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) {
      console.error('❌ Erro no teste de upload:', error);
    } else {
      console.log('✅ Upload de teste realizado com sucesso!');
      console.log('📁 Arquivo salvo em:', data.path);
      
      // Tentar baixar o arquivo
      const { data: downloadData } = supabase.storage
        .from(STORAGE_BUCKETS.DELIVERY_ATTACHMENTS)
        .getPublicUrl(data.path);
      
      console.log('🔗 URL pública:', downloadData.publicUrl);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

// Exportar funções para uso no console
window.createSupabaseBuckets = createSupabaseBuckets;
window.testSupabaseUpload = testUpload;

console.log('🚀 Script de inicialização do Supabase carregado!');
console.log('📝 Use createSupabaseBuckets() para criar os buckets');
console.log('🧪 Use testSupabaseUpload() para testar upload'); 