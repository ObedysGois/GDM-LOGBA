// Arquivo para lidar com falhas de conexão WebSocket

/**
 * Configura um fallback para conexões WebSocket que falham
 * Isso é útil principalmente durante o desenvolvimento com hot reload
 */
export const setupWebSocketFallback = () => {
  console.log('Configurando WebSocket fallback...');
  
  // Armazenar a implementação original do WebSocket globalmente
  const OriginalWebSocket = window.WebSocket;
  console.log('WebSocket original capturado');
  
  try {
    
    // Sobrescrever o construtor do WebSocket
    window.WebSocket = function(url, protocols) {
      console.log('Tentativa de conexão WebSocket para:', url);
      
      // Verificar se é uma conexão para o servidor de desenvolvimento
      const isDevelopmentServer = url.includes('localhost:3001/ws') || 
                                url.includes('127.0.0.1:3001/ws') ||
                                url.includes('localhost:3001/?') ||
                                url.includes('127.0.0.1:3001/?');
      
      if (isDevelopmentServer) {
        console.log('Conexão WebSocket para servidor de desenvolvimento detectada:', url);
        
        // Criar um objeto que simula um WebSocket completamente funcional
        const mockSocket = {
          url,
          readyState: 1, // OPEN (simular conexão aberta para evitar erros)
          protocol: '',
          extensions: '',
          bufferedAmount: 0,
          binaryType: 'blob',
          
          // Métodos
          send: function(data) {
            console.log('WebSocket (fallback): tentativa de envio ignorada', data);
            return true;
          },
          close: function(code, reason) {
            console.log('WebSocket (fallback): close chamado', code, reason);
            this.readyState = 3; // CLOSED
            if (typeof this.onclose === 'function') {
              this.onclose({ code: code || 1000, reason: reason || 'Normal closure', wasClean: true });
            }
          },
          
          // Gerenciamento de eventos
          addEventListener: function(type, listener) {
            console.log('WebSocket (fallback): addEventListener', type);
            if (!this._listeners) this._listeners = {};
            if (!this._listeners[type]) this._listeners[type] = [];
            this._listeners[type].push(listener);
            
            // Simular evento de conexão aberta imediatamente
            if (type === 'open') {
              setTimeout(() => {
                listener({ type: 'open', target: this });
              }, 0);
            }
          },
          removeEventListener: function(type, listener) {
            if (!this._listeners || !this._listeners[type]) return;
            const index = this._listeners[type].indexOf(listener);
            if (index !== -1) this._listeners[type].splice(index, 1);
          },
          dispatchEvent: function(event) {
            if (!this._listeners || !this._listeners[event.type]) return true;
            const listeners = this._listeners[event.type].slice();
            for (let i = 0; i < listeners.length; i++) {
              listeners[i].call(this, event);
            }
            return !event.defaultPrevented;
          }
        };
        
        // Disparar evento de conexão aberta para simular sucesso
        setTimeout(() => {
          console.log('WebSocket (fallback): simulando evento open');
          if (typeof mockSocket.onopen === 'function') {
            mockSocket.onopen({ type: 'open', target: mockSocket });
          }
        }, 0);
        
        return mockSocket;
      }
      
      // Para outras conexões WebSocket, usar a implementação original
      console.log('Usando WebSocket original para:', url);
      try {
        return new OriginalWebSocket(url, protocols);
      } catch (error) {
        console.error('Erro ao criar WebSocket original:', error);
        throw error;
      }
    };
    
    // Copiar propriedades estáticas
    window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
    window.WebSocket.OPEN = OriginalWebSocket.OPEN;
    window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
    window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;
    
    console.log('WebSocket fallback configurado com sucesso');
  } catch (error) {
    console.error('Erro ao configurar WebSocket fallback:', error);
  }
  
  // Copiar propriedades estáticas
  for (const prop in OriginalWebSocket) {
    if (OriginalWebSocket.hasOwnProperty(prop)) {
      window.WebSocket[prop] = OriginalWebSocket[prop];
    }
  }
  
  console.log('WebSocket fallback configurado');
};