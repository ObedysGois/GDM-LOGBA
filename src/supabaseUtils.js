import { supabase, STORAGE_BUCKETS, generateUniqueFileName, getPublicUrl } from './supabaseConfig.js';

// === FUNÇÕES DE UPLOAD DE ARQUIVOS ===

// Função para obter a data no fuso horário de Salvador, Bahia (UTC-3)
const getSalvadorDate = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bahia',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(now);
};

// Upload de imagem da rota
export const uploadRouteImage = async (file, userEmail) => {
  try {
    const date = getSalvadorDate();
    const fileName = generateUniqueFileName(file.name, `route_${date}_`);
    const filePath = `${date}/${fileName}`;
    
    // Upload para Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.ROUTE_IMAGES)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      throw error;
    }
    
    // Obter URL pública
    const publicUrl = getPublicUrl(STORAGE_BUCKETS.ROUTE_IMAGES, filePath);
    
    // Retornar dados da imagem
    return {
      id: `supabase_${Date.now()}`,
      image_url: publicUrl,
      date: date,
      user_email: userEmail,
      file_name: fileName,
      original_name: file.name,
      file_path: filePath,
      file_size: file.size,
      storage_provider: 'supabase',
      upload_time: new Date().toISOString(),
      is_local: false
    };
    
  } catch (error) {
    console.error('Erro no upload para Supabase:', error);
    throw error;
  }
};

// Função utilitária para sanitizar strings para nome de arquivo
function sanitize(str) {
  return (str || '')
    .normalize('NFD').replace(/[^\w\s-]/g, '') // remove acentos e caracteres especiais
    .replace(/\s+/g, '_') // troca espaço por _
    .substring(0, 20); // limita tamanho
}

// Upload de anexos para registros de entrega
export const uploadDeliveryAttachment = async (file, deliveryId, userEmail, fretista, cliente) => {
  try {
    const now = new Date();
    const dateStr = now.toISOString().slice(0,10).replace(/-/g, ''); // YYYYMMDD
    const extension = file.name.split('.').pop();
    const nameNoExt = file.name.replace(`.${extension}`, '');
    // Remover randomId do nome do arquivo
    const fileName = `${dateStr}_${sanitize(fretista)}_${sanitize(cliente)}_${sanitize(userEmail)}.${extension}`;
    const filePath = `${dateStr}/${deliveryId}/${fileName}`;

    // Tentar upload para Supabase Storage
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKETS.DELIVERY_ATTACHMENTS)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        throw error;
      }

      // Obter URL pública
      const publicUrl = getPublicUrl(STORAGE_BUCKETS.DELIVERY_ATTACHMENTS, filePath);

      // Retornar dados do anexo
      return {
        id: `attachment_${Date.now()}`,
        file_url: publicUrl,
        file_name: fileName,
        original_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        delivery_id: deliveryId,
        user_email: userEmail,
        upload_time: now.toISOString(),
        storage_provider: 'supabase'
      };

    } catch (supabaseError) {
      console.warn('Supabase não disponível, usando localStorage:', supabaseError.message);
      
      // Fallback para localStorage
      const base64Data = await fileToBase64(file);
      
      return {
        id: `attachment_${Date.now()}`,
        file_url: base64Data,
        file_name: fileName,
        original_name: file.name,
        file_path: `local/${fileName}`,
        file_size: file.size,
        file_type: file.type,
        delivery_id: deliveryId,
        user_email: userEmail,
        upload_time: now.toISOString(),
        storage_provider: 'localStorage',
        is_local: true
      };
    }

  } catch (error) {
    console.error('Erro ao fazer upload de anexo:', error);
    throw error;
  }
};

// Upload de arquivo geral
export const uploadGeneralFile = async (file, category = 'general', userEmail) => {
  try {
    const date = new Date().toISOString().split('T')[0];
    const fileName = generateUniqueFileName(file.name, `${category}_`);
    const filePath = `${date}/${category}/${fileName}`;
    
    // Upload para Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.GENERAL_FILES)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      throw error;
    }
    
    // Obter URL pública
    const publicUrl = getPublicUrl(STORAGE_BUCKETS.GENERAL_FILES, filePath);
    
    // Retornar dados do arquivo
    return {
      id: `file_${Date.now()}`,
      file_url: publicUrl,
      file_name: fileName,
      original_name: file.name,
      file_path: filePath,
      file_size: file.size,
      file_type: file.type,
      category: category,
      user_email: userEmail,
      upload_time: new Date().toISOString(),
      storage_provider: 'supabase'
    };
    
  } catch (error) {
    console.error('Erro no upload de arquivo geral:', error);
    throw error;
  }
};

// === FUNÇÕES DE DOWNLOAD E EXCLUSÃO ===

// Excluir arquivo
export const deleteFile = async (bucketName, filePath) => {
  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao excluir arquivo:', error);
    throw error;
  }
};

// Listar arquivos de um bucket
export const listFiles = async (bucketName, folder = '') => {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(folder);
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao listar arquivos:', error);
    throw error;
  }
};

// === FUNÇÕES DE VALIDAÇÃO ===

// Validar tipo de arquivo
export const validateFileType = (file, allowedTypes = ['image/*', 'application/pdf']) => {
  const fileType = file.type;
  
  for (const allowedType of allowedTypes) {
    if (allowedType.endsWith('/*')) {
      const baseType = allowedType.replace('/*', '');
      if (fileType.startsWith(baseType)) {
        return true;
      }
    } else if (fileType === allowedType) {
      return true;
    }
  }
  
  return false;
};

// Validar tamanho do arquivo
export const validateFileSize = (file, maxSizeMB = 50) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

// === FUNÇÕES DE CONVERSÃO ===

// Converter arquivo para base64 (fallback)
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

// Função híbrida que tenta Supabase primeiro, depois localStorage
export const uploadFileWithFallback = async (file, uploadFunction, userEmail) => {
  try {
    // Tentar Supabase primeiro
    return await uploadFunction(file, userEmail);
  } catch (error) {
    console.warn('Supabase não disponível, usando localStorage:', error.message);
    
    // Fallback para localStorage
    const base64Data = await fileToBase64(file);
    const date = new Date().toISOString().split('T')[0];
    
    return {
      id: `local_${Date.now()}`,
      file_url: base64Data,
      file_name: `local_${file.name}`,
      original_name: file.name,
      file_size: file.size,
      file_type: file.type,
      user_email: userEmail,
      upload_time: new Date().toISOString(),
      storage_provider: 'localStorage',
      is_local: true
    };
  }
};