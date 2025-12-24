# Guia de Implementação PWA - Logística GDM

Este guia explica como gerar os recursos necessários para o PWA completo.

## 📋 Pré-requisitos

```bash
npm install sharp --save-dev
```

## 🎨 1. Gerar Ícones PWA

Execute o script para gerar todos os ícones necessários:

```bash
node scripts/generate-pwa-icons.js
```

Isso criará os seguintes ícones em `public/icons/`:
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png (obrigatório)
- icon-384x384.png
- icon-512x512.png (obrigatório)
- apple-touch-icon.png (180x180)
- apple-touch-icon-167x167.png
- favicon-32x32.png

**Nota:** O script usa `public/assets/logodocemel.png` como imagem de origem.

## 🖼️ 2. Gerar Splash Screens

Execute o script para gerar splash screens para diferentes dispositivos:

```bash
node scripts/generate-splash-screens.js
```

Isso criará splash screens em `public/splash/` para:
- iPhone SE, 8, X, XR, XS, XS Max, 8 Plus
- iPad, iPad Pro 10.5", iPad Pro 12.9"
- Android (MDPI, HDPI, XHDPI, XXHDPI)

**Nota:** O script usa `public/assets/logosplash.png` como imagem de origem.

## 🔔 3. Configurar Notificações Push

As notificações push já estão parcialmente implementadas. Para ativar completamente:

1. **Obter chave VAPID do Firebase:**
   - Acesse o [Console do Firebase](https://console.firebase.google.com/)
   - Vá em Project Settings > Cloud Messaging
   - Copie a chave VAPID

2. **Atualizar `src/hooks/useNotifications.js`:**
   ```javascript
   const VAPID_KEY = 'SUA_CHAVE_VAPID_AQUI';
   ```

3. **Descomentar o código de token:**
   - Remova os comentários do bloco `getFCMToken` em `useNotifications.js`

## 🔄 4. Atualização Automática

O sistema de atualização automática já está implementado:

- **UpdatePrompt**: Componente que detecta novas versões
- **Service Worker**: Verifica atualizações a cada hora
- **version.json**: Arquivo que contém a versão atual

Para atualizar a versão, edite `public/version.json`:
```json
{
  "version": "1.0.1",
  "build": "20241225",
  "releaseDate": "2024-12-25"
}
```

## 📱 5. Testar PWA

### Localmente:
```bash
npm run build
npx serve -s build
```

### Verificar:
1. Abra o DevTools > Application > Manifest
2. Verifique se todos os ícones estão carregando
3. Teste a instalação (botão de instalação no navegador)
4. Teste offline (DevTools > Network > Offline)

## ✅ Checklist de Implementação

- [x] Manifest.json configurado
- [x] Service Worker implementado
- [x] Ícones PWA (scripts criados)
- [x] Splash screens (scripts criados)
- [x] Notificações push (parcialmente implementado)
- [x] Atualização automática
- [x] Componente de instalação
- [x] Suporte offline

## 🚀 Deploy

Após gerar os ícones e splash screens:

1. Execute `npm run build`
2. Verifique se `build/icons/` e `build/splash/` existem
3. Faça deploy do diretório `build/`
4. Certifique-se de que o servidor serve arquivos estáticos corretamente

## 📝 Notas Importantes

- **HTTPS obrigatório**: PWAs requerem HTTPS em produção (exceto localhost)
- **Service Worker**: Deve estar na raiz do domínio
- **Ícones**: 192x192 e 512x512 são obrigatórios
- **Manifest**: Deve ser servido com `Content-Type: application/manifest+json`

## 🐛 Troubleshooting

**Ícones não aparecem:**
- Verifique se os arquivos foram gerados em `public/icons/`
- Verifique os caminhos no `manifest.json`
- Limpe o cache do navegador

**Service Worker não atualiza:**
- Feche todas as abas do app
- Abra o DevTools > Application > Service Workers > Unregister
- Recarregue a página

**Notificações não funcionam:**
- Verifique se a chave VAPID está configurada
- Verifique as permissões do navegador
- Teste em HTTPS (não funciona em HTTP)

