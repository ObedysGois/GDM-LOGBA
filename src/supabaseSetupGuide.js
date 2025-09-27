// Guia para configurar o Supabase corretamente
// Este arquivo contém instruções para resolver os problemas de RLS (Row Level Security)

import { supabase } from './supabaseConfig.js';

console.log(`
🚀 GUIA DE CONFIGURAÇÃO DO SUPABASE
====================================

❌ PROBLEMA IDENTIFICADO:
- Row Level Security (RLS) policies estão impedindo acesso aos buckets
- Erro: "new row violates row-level security policy"

✅ SOLUÇÃO:

1. ACESSE O PAINEL DO SUPABASE:
   - Vá para: https://supabase.com/dashboard
   - Selecione seu projeto: tvihvvokdjihgjnfyaik

2. CONFIGURE AS STORAGE POLICIES:
   - Vá para: Storage > Policies
   - Clique em "New Policy"
   - Configure para cada bucket:

   BUCKET: delivery-attachments
   - Policy Name: "Allow public access"
   - Allowed operation: SELECT, INSERT, UPDATE, DELETE
   - Target roles: public
   - Using expression: true

   BUCKET: route-images  
   - Policy Name: "Allow public access"
   - Allowed operation: SELECT, INSERT, UPDATE, DELETE
   - Target roles: public
   - Using expression: true

   BUCKET: general-files
   - Policy Name: "Allow public access"
   - Allowed operation: SELECT, INSERT, UPDATE, DELETE
   - Target roles: public
   - Using expression: true

3. ALTERNATIVA RÁPIDA (SQL):
   Execute no SQL Editor do Supabase:

   -- Permitir acesso público aos buckets
   CREATE POLICY "Allow public access" ON storage.objects
   FOR ALL USING (bucket_id IN ('delivery-attachments', 'route-images', 'general-files'));

4. VERIFICAR CONFIGURAÇÃO:
   - Após configurar, teste o upload de um arquivo
   - Verifique se os buckets aparecem na lista

⚠️ NOTA DE SEGURANÇA:
- Esta configuração permite acesso público aos arquivos
- Para produção, considere implementar autenticação adequada
- Os arquivos serão acessíveis via URL pública

🔄 SOLUÇÃO TEMPORÁRIA:
- O sistema já está configurado para usar localStorage como fallback
- Os anexos serão salvos localmente quando o Supabase não estiver disponível
- Funcionalidade completa mantida mesmo sem Supabase

📞 SUPORTE:
- Se precisar de ajuda, consulte a documentação do Supabase
- Ou use o sistema em modo localStorage (já funcionando)
`);

// Função para testar configuração
window.testSupabaseConfig = async () => {
  try {
    console.log('🧪 Testando configuração do Supabase...');
    
    // Testar listagem de buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) {
      console.error('❌ Erro ao listar buckets:', bucketsError);
      return false;
    }
    
    console.log('✅ Buckets encontrados:', buckets?.map(b => b.name) || []);
    
    // Testar upload simples
    const testFile = new File(['teste'], 'teste.txt', { type: 'text/plain' });
    const { data, error } = await supabase.storage
      .from('delivery-attachments')
      .upload('teste/teste.txt', testFile, { upsert: true });
    
    if (error) {
      console.error('❌ Erro no teste de upload:', error);
      return false;
    }
    
    console.log('✅ Upload de teste realizado com sucesso!');
    return true;
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    return false;
  }
};

// Função para mostrar status atual
window.showSupabaseStatus = () => {
  console.log(`
📊 STATUS ATUAL DO SUPABASE:
============================

🔧 CONFIGURAÇÃO:
- URL: https://tvihvvokdjihgjnfyaik.supabase.co
- Status: RLS policies bloqueando acesso

🔄 FALLBACK ATIVO:
- localStorage funcionando como alternativa
- Uploads e downloads funcionando localmente
- Sistema operacional mesmo sem Supabase

📝 PRÓXIMOS PASSOS:
1. Configure as RLS policies no painel do Supabase
2. Execute testSupabaseConfig() para verificar
3. Ou continue usando o sistema em modo localStorage

💡 DICA:
- O sistema já está funcionando com localStorage
- Não é necessário configurar o Supabase imediatamente
- Pode usar normalmente enquanto resolve a configuração
`);
};

// Exportar funções
window.testSupabaseConfig = window.testSupabaseConfig;
window.showSupabaseStatus = window.showSupabaseStatus;

console.log('📚 Guia de configuração carregado!');
console.log('💡 Use showSupabaseStatus() para ver o status atual');
console.log('🧪 Use testSupabaseConfig() para testar após configurar'); 