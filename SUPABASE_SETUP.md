# 🚀 Configuração do Supabase para Upload de Arquivos

## 📋 Pré-requisitos

1. Conta gratuita no [Supabase](https://supabase.com)
2. Projeto criado no Supabase
3. Node.js e npm instalados

## 🔧 Passo a Passo

### 1. Criar Conta no Supabase

1. Acesse [https://supabase.com](https://supabase.com)
2. Clique em "Start your project"
3. Faça login com GitHub ou crie uma conta
4. Clique em "New Project"

### 2. Configurar Projeto

1. **Nome do Projeto**: `logistica-ba` (ou outro nome)
2. **Database Password**: Crie uma senha forte
3. **Region**: Escolha a região mais próxima (ex: São Paulo)
4. Clique em "Create new project"

### 3. Obter Credenciais

1. No dashboard do projeto, vá em **Settings** → **API**
2. Copie as seguintes informações:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon public key**: `your-anon-key`

### 4. Configurar o Projeto

1. Abra o arquivo `src/supabaseConfig.js`
2. Substitua as credenciais:

```javascript
const supabaseUrl = 'https://your-project-id.supabase.co'; // Sua URL
const supabaseAnonKey = 'your-anon-key'; // Sua chave anônima
```

### 5. Configurar Storage

1. No dashboard do Supabase, vá em **Storage**
2. Os buckets serão criados automaticamente quando você usar o sistema
3. Ou crie manualmente:
   - `route-images` (para imagens de rota)
   - `delivery-attachments` (para anexos de entrega)
   - `general-files` (para arquivos gerais)

### 6. Configurar Políticas de Segurança

1. Vá em **Storage** → **Policies**
2. Para cada bucket, adicione políticas:

#### Para `route-images`:
```sql
-- Permitir upload para usuários autenticados
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Permitir visualização pública
CREATE POLICY "Allow public viewing" ON storage.objects
FOR SELECT USING (true);
```

#### Para `delivery-attachments`:
```sql
-- Permitir upload para usuários autenticados
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Permitir visualização para usuários autenticados
CREATE POLICY "Allow authenticated viewing" ON storage.objects
FOR SELECT USING (auth.role() = 'authenticated');
```

### 7. Testar Configuração

1. Execute o projeto: `npm start`
2. Tente fazer upload de uma imagem na tela Home
3. Verifique se aparece "Salva no Supabase" no status

## 🔒 Configurações de Segurança

### Políticas Recomendadas

```sql
-- Política para upload de imagens de rota (apenas admins)
CREATE POLICY "Allow admin route uploads" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' 
  AND bucket_id = 'route-images'
  AND auth.jwt() ->> 'email' IN ('admin@email.com', 'outro@email.com')
);

-- Política para visualização pública de rotas
CREATE POLICY "Allow public route viewing" ON storage.objects
FOR SELECT USING (
  bucket_id = 'route-images'
);
```

### Configurações de Bucket

```javascript
// Configurações recomendadas para cada bucket
{
  public: true, // Para rotas (acesso público)
  allowedMimeTypes: ['image/*', 'application/pdf'],
  fileSizeLimit: 52428800, // 50MB
  allowedFileExtensions: ['jpg', 'jpeg', 'png', 'gif', 'pdf']
}
```

## 📊 Limites Gratuitos

- **Storage**: 1GB
- **Bandwidth**: 2GB/mês
- **Requests**: 50,000/mês
- **File uploads**: 50MB por arquivo

## 🛠️ Solução de Problemas

### Erro de CORS
- Verifique se as políticas estão configuradas corretamente
- Certifique-se de que o bucket está público (se necessário)

### Erro de Upload
- Verifique o tamanho do arquivo (máx. 50MB)
- Confirme se o tipo de arquivo é permitido
- Verifique as credenciais no `supabaseConfig.js`

### Fallback para localStorage
- Se o Supabase falhar, o sistema automaticamente usa localStorage
- Verifique os logs no console para identificar problemas

## 🔄 Migração de Dados

### Do Firebase para Supabase
1. Exporte dados do Firebase
2. Use as funções de upload do Supabase
3. Atualize as referências nos registros

### Backup Automático
- O sistema mantém backup no localStorage
- Dados são sincronizados quando possível

## 📱 Uso no Código

### Upload de Imagem de Rota
```javascript
import { uploadRouteImage } from './firebaseUtils';

const result = await uploadRouteImage(file, userEmail);
console.log('URL da imagem:', result.image_url);
```

### Upload de Anexos
```javascript
import { uploadDeliveryAttachments } from './firebaseUtils';

const attachments = await uploadDeliveryAttachments(files, deliveryId, userEmail);
```

### Componente de Upload
```javascript
import FileUpload from './Components/FileUpload';

<FileUpload 
  onFilesSelected={handleFiles}
  multiple={true}
  acceptedTypes={['image/*', 'application/pdf']}
  maxSizeMB={50}
/>
```

## 🎯 Benefícios do Supabase

- ✅ **Gratuito** para projetos pequenos
- ✅ **Sem problemas de CORS**
- ✅ **CDN global** para downloads rápidos
- ✅ **APIs RESTful** simples
- ✅ **Dashboard** intuitivo
- ✅ **Políticas de segurança** granulares
- ✅ **Backup automático**
- ✅ **Escalabilidade** conforme necessário

## 📞 Suporte

- [Documentação Supabase](https://supabase.com/docs)
- [Comunidade Supabase](https://github.com/supabase/supabase/discussions)
- [Status do Serviço](https://status.supabase.com) 