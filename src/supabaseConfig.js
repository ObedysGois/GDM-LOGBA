import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://tvihvvokdjihgjnfyaik.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2aWh2dm9rZGppaGdqbmZ5YWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzkwMjksImV4cCI6MjA2ODAxNTAyOX0.JbO_UfZa0pDJbwqk5AT7BwWkmZHTnk2IOJar_XxyToI';

// Criar cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Configurações de buckets
export const STORAGE_BUCKETS = {
  ROUTE_IMAGES: 'route-images',
  DELIVERY_ATTACHMENTS: 'delivery-attachments',
  GENERAL_FILES: 'general-files'
};

// Função para inicializar buckets (executar uma vez)
export const initializeStorageBuckets = async () => {
  try {
    // Criar buckets se não existirem
    const buckets = Object.values(STORAGE_BUCKETS);
    
    for (const bucketName of buckets) {
      try {
        const { data, error } = await supabase.storage.getBucket(bucketName);
        if (error && error.message.includes('not found')) {
          // Bucket não existe, criar
          const { error: createError } = await supabase.storage.createBucket(bucketName, {
            public: true, // Buckets públicos para fácil acesso
            allowedMimeTypes: ['image/*', 'application/pdf', 'text/plain'],
            fileSizeLimit: 52428800 // 50MB
          });
          
          if (createError) {
            console.warn(`Erro ao criar bucket ${bucketName}:`, createError);
          } else {
            console.log(`Bucket ${bucketName} criado com sucesso`);
          }
        }
      } catch (error) {
        console.warn(`Erro ao verificar bucket ${bucketName}:`, error);
      }
    }
  } catch (error) {
    console.error('Erro ao inicializar buckets:', error);
  }
};

// Função para gerar nome único de arquivo
export const generateUniqueFileName = (originalName, prefix = '') => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  const nameWithoutExt = originalName.replace(`.${extension}`, '');
  
  return `${prefix}${timestamp}_${randomString}_${nameWithoutExt}.${extension}`;
};

// Função para obter URL pública do arquivo
export const getPublicUrl = (bucketName, filePath) => {
  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
  return data.publicUrl;
};

// Função para testar conexão com Supabase
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
      console.warn('Erro ao conectar com Supabase Storage:', error);
      return false;
    }
    console.log('✅ Conexão com Supabase estabelecida com sucesso!');
    return true;
  } catch (error) {
    console.warn('❌ Erro ao testar conexão com Supabase:', error);
    return false;
  }
};

// Inicializar buckets automaticamente
export const initializeSupabase = async () => {
  try {
    console.log('🔄 Inicializando Supabase...');
    await initializeStorageBuckets();
    await testSupabaseConnection();
    console.log('✅ Supabase inicializado com sucesso!');
  } catch (error) {
    console.warn('⚠️ Erro ao inicializar Supabase, usando fallback:', error);
  }
}; 