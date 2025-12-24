# 🚀 Guia de Deploy na Netlify - GDM Logística BA

Este guia explica como fazer deploy do aplicativo na Netlify com todas as variáveis de ambiente configuradas.

## 📋 Pré-requisitos

1. Conta no [Netlify](https://www.netlify.com/)
2. Repositório no GitHub (já configurado)
3. Todas as variáveis de ambiente listadas no `.env.example`

## 🔧 Passo a Passo

### 1. Preparar o Repositório

Certifique-se de que:
- ✅ O arquivo `.env` está no `.gitignore` (já está)
- ✅ O arquivo `.env.example` está commitado
- ✅ Todas as alterações foram commitadas e enviadas para o GitHub

### 2. Criar Site na Netlify

1. Acesse [https://app.netlify.com](https://app.netlify.com)
2. Clique em **"Add new site"** > **"Import an existing project"**
3. Conecte com GitHub e selecione o repositório `GDM-LOGBA`
4. Configure as opções de build:
   - **Build command:** `npm run build`
   - **Publish directory:** `build`
   - **Node version:** `18` (ou a versão que você está usando)

### 3. Configurar Variáveis de Ambiente

1. No dashboard do site, vá em **Site settings** > **Environment variables**
2. Clique em **Add a variable** e adicione cada uma das seguintes variáveis:

#### Firebase Configuration
```
REACT_APP_FIREBASE_API_KEY=AIzaSyBla-ItwmWjbfqZWX-rPJb_L1kuT178uac
REACT_APP_FIREBASE_AUTH_DOMAIN=gdm-log-ba-2f8c5.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=gdm-log-ba-2f8c5
REACT_APP_FIREBASE_STORAGE_BUCKET=gdm-log-ba-2f8c5.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=345609111488
REACT_APP_FIREBASE_APP_ID=1:345609111488:web:6233ab1ee1de9af737ea25
REACT_APP_FIREBASE_MEASUREMENT_ID=G-FL1VKY0EH9
```

#### Supabase Configuration
```
REACT_APP_SUPABASE_URL=https://tvihvvokdjihgjnfyaik.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2aWh2dm9rZGppaGdqbmZ5YWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzkwMjksImV4cCI6MjA2ODAxNTAyOX0.JbO_UfZa0pDJbwqk5AT7BwWkmZHTnk2IOJar_XxyToI
```

#### Google Maps API
```
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyAYPqweXiFwIA_PP1y1tbmjZiEXgSdqIUE
```

#### Firebase Cloud Messaging
```
REACT_APP_FIREBASE_VAPID_KEY=BPJZEKfa2WZNAcuspeq6k5qw4hhznbV_RxI9sEboy76RAwijEUEe7cLniRmnm2hWIpmq54Zx6wUGQnkUcMByUPg
```

#### Environment
```
REACT_APP_ENV=production
```

### 4. Configurar Build Settings (Opcional)

No arquivo `netlify.toml` (criar se não existir):

```toml
[build]
  command = "npm run build"
  publish = "build"

[build.environment]
  NODE_VERSION = "18"
  NPM_FLAGS = "--legacy-peer-deps"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 5. Configurar Domínio Personalizado (Opcional)

1. Vá em **Site settings** > **Domain management**
2. Clique em **Add custom domain**
3. Siga as instruções para configurar DNS

### 6. Configurar Headers para PWA

Adicione um arquivo `public/_headers` (ou configure em `netlify.toml`):

```
/*
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer

/manifest.json
  Content-Type: application/manifest+json

/serviceWorker.js
  Service-Worker-Allowed: /
  Cache-Control: no-cache
```

### 7. Deploy

1. Após configurar tudo, o Netlify fará deploy automaticamente
2. Ou clique em **"Trigger deploy"** > **"Deploy site"**
3. Aguarde o build completar
4. Acesse o site pelo link fornecido pela Netlify

## ✅ Verificações Pós-Deploy

1. **Testar PWA:**
   - Abra o DevTools > Application > Manifest
   - Verifique se o manifest está carregando
   - Teste a instalação do PWA

2. **Testar Firebase:**
   - Tente fazer login
   - Verifique se os dados estão sendo salvos

3. **Testar Supabase:**
   - Teste upload de arquivos
   - Verifique se os buckets estão funcionando

4. **Testar Google Maps:**
   - Acesse a página de localização
   - Verifique se o mapa está carregando

5. **Testar Notificações:**
   - Solicite permissão de notificações
   - Verifique se o token FCM está sendo gerado

## 🔒 Segurança

- ✅ Nunca commite o arquivo `.env`
- ✅ Use variáveis de ambiente na Netlify
- ✅ Configure domínios autorizados no Firebase
- ✅ Configure CORS no Supabase se necessário

## 🐛 Troubleshooting

### Build falha
- Verifique se todas as variáveis de ambiente estão configuradas
- Verifique os logs de build na Netlify
- Teste o build localmente: `npm run build`

### PWA não funciona
- Verifique se o site está em HTTPS (obrigatório para PWA)
- Verifique se o service worker está sendo servido corretamente
- Verifique o manifest.json no DevTools

### Firebase não conecta
- Verifique se o domínio está autorizado no Firebase Console
- Verifique se as variáveis de ambiente estão corretas
- Verifique as regras de segurança do Firestore

### Supabase não funciona
- Verifique se as políticas de RLS estão configuradas
- Verifique se os buckets existem
- Verifique se a chave anon está correta

## 📝 Notas Importantes

- As variáveis de ambiente são injetadas durante o build
- Após alterar variáveis, é necessário fazer um novo deploy
- Use variáveis diferentes para produção e desenvolvimento se necessário
- O Netlify suporta variáveis por ambiente (Production, Deploy Preview, Branch Deploy)

## 🔗 Links Úteis

- [Netlify Docs](https://docs.netlify.com/)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [Firebase Console](https://console.firebase.google.com/)
- [Supabase Dashboard](https://app.supabase.com/)

