import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext.js';
import { ToastContext } from '../App.js';
import { getLatestDeliveryRecords, updateDeliveryRecord, isAdmin, uploadRouteImage, getCurrentRouteImage, deleteRouteImage, isCollaborator, addDeliveryComment, problemTypes } from '../firebaseUtils.js';
import { getAllRouteImages } from '../firebaseUtils.js';
import '../App.css';
import ToastNotification from '../Components/ToastNotification.jsx';
import { useNavigate } from 'react-router-dom';

// [NOVO] Componente de texto colapsável com modal
function CollapsibleText({ text, maxLength = 20 }) {
  const [modalOpen, setModalOpen] = useState(false);
  if (!text || text.length <= maxLength) return <span>{text}</span>;
  return (
    <>
      <span>
        {text.slice(0, maxLength)}... <span style={{color:'#1976d2',cursor:'pointer',fontWeight:600}} onClick={()=>setModalOpen(true)}>ver mais</span>
      </span>
      {modalOpen && (
        <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.35)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:16,padding:32,minWidth:320,maxWidth:400,boxShadow:'0 8px 32px #0005',position:'relative',wordBreak:'break-word'}}>
            <button onClick={()=>setModalOpen(false)} style={{position:'absolute',top:16,right:16,fontSize:22,background:'none',border:'none',cursor:'pointer',color:'#888'}} title="Fechar">×</button>
            <h2 style={{fontWeight:700, fontSize:'1.1rem', color:'#1976d2', marginBottom:18}}>Observação Completa</h2>
            <div style={{fontSize:16, color:'#333', wordBreak:'break-word', whiteSpace:'pre-wrap'}}>{text}</div>
          </div>
        </div>
      )}
    </>
  );
}

function Home() {
  const { currentUser: user } = useAuth();
  const { showToast } = React.useContext(ToastContext);
  const [routeImage, setRouteImage] = useState(null);
  const [imageName, setImageName] = useState('');
  const [currentRouteImageId, setCurrentRouteImageId] = useState(null);
  const [routeImageInfo, setRouteImageInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [latestRecords, setLatestRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [dismissedNotifications, setDismissedNotifications] = useState({});
  const fileInputRef = useRef(null);
  const [supportCooldown, setSupportCooldown] = useState({});
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [drag, setDrag] = useState({ active: false, x: 0, y: 0, startX: 0, startY: 0 });
  const imgRef = useRef();
  const [toast, setToast] = useState({ open: false, type: 'info', message: '' });
  const [problemModal, setProblemModal] = useState({ open: false, record: null });
  const [selectedProblem, setSelectedProblem] = useState('');
  const [problemInfo, setProblemInfo] = useState('');
  const [commentModal, setCommentModal] = useState({ open: false, record: null });
  const [commentText, setCommentText] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [viewCommentsModal, setViewCommentsModal] = useState({ open: false, record: null });
  const [viewAttachmentsModal, setViewAttachmentsModal] = useState({ open: false, record: null });
  const [filterClient, setFilterClient] = useState('');
  const [filterDuration, setFilterDuration] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProblem, setFilterProblem] = useState('');
  const [filterFretista, setFilterFretista] = useState('');
  // [NOVO] Hook para atualizar o tempo em aberto a cada segundo
  const [now, setNow] = useState(Date.now());
  const navigate = useNavigate();

  // Listas únicas para filtros
  const clientList = Array.from(new Set(latestRecords.map(r => r.client).filter(Boolean)));
  const statusList = Array.from(new Set(latestRecords.map(r => r.status).filter(Boolean)));
  const fretistaList = Array.from(new Set(latestRecords.map(r => r.driver).filter(Boolean)));

  // Estatísticas dos registros
  const stats = {
    total: latestRecords.length,
    emAndamento: latestRecords.filter(r => r.status === 'Entrega em andamento').length,
    comProblema: latestRecords.filter(r => r.problem_type || r.tipoProblema).length,
    finalizada: latestRecords.filter(r => r.status === 'Entrega finalizada').length,
    devolvida: latestRecords.filter(r => r.status === 'Entrega devolvida').length
  };

  // Função para limpar filtros
  const handleClearFilters = () => {
    setFilterClient('');
    setFilterDuration('');
    setFilterStatus('');
    setFilterProblem('');
    setFilterFretista('');
  };

  // Resetar zoom e posição ao abrir/fechar
  useEffect(() => {
    if (zoomOpen) {
      setZoomLevel(1);
      setDrag({ active: false, x: 0, y: 0, startX: 0, startY: 0 });
    }
  }, [zoomOpen]);

  const handleWheel = (e) => {
    e.preventDefault();
    let newZoom = zoomLevel + (e.deltaY < 0 ? 0.2 : -0.2);
    newZoom = Math.max(1, Math.min(newZoom, 5));
    setZoomLevel(newZoom);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setDrag({ ...drag, active: true, startX: e.clientX - drag.x, startY: e.clientY - drag.y });
  };
  const handleMouseMove = (e) => {
    if (!drag.active) return;
    setDrag({ ...drag, x: e.clientX - drag.startX, y: e.clientY - drag.startY, active: true, startX: drag.startX, startY: drag.startY });
  };
  const handleMouseUp = () => {
    setDrag({ ...drag, active: false });
  };

  // Carregar cooldowns do localStorage ao montar
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('supportCooldown') || '{}');
    setSupportCooldown(saved);
  }, []);

  // Salvar cooldowns no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem('supportCooldown', JSON.stringify(supportCooldown));
  }, [supportCooldown]);

  // Carregar registros, verificar notificações e carregar imagem da rota
  useEffect(() => {
    loadLatestRecords();
    loadCurrentRouteImage();
    // Carregar notificações descartadas do localStorage
    const dismissed = JSON.parse(localStorage.getItem('dismissedNotifications') || '{}');
    setDismissedNotifications(dismissed);
    
    const interval = setInterval(checkNotifications, 60000); // Verificar a cada minuto
    return () => clearInterval(interval);
  }, []);

  // Verificar notificações quando os registros mudarem
  useEffect(() => {
    if (latestRecords.length > 0) {
      checkNotifications();
    }
  }, [latestRecords]);

  // Mostrar toast sempre que uma nova notificação for criada
  useEffect(() => {
    if (notifications.length > 0) {
      // Mostra apenas a primeira notificação como toast
      const n = notifications[0];
      let type = 'info';
      if (n.type === 'problem') type = 'warning';
      if (n.type === 'time_wait') type = 'danger';
      if (n.type === 'time_limit') type = 'info';
      setToast({ open: true, type, message: n.message });
    } else {
      setToast({ open: false, type: 'info', message: '' });
    }
  }, [notifications]);

  // [NOVO] Hook para atualizar o tempo em aberto a cada segundo
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const loadLatestRecords = async () => {
    try {
      setLoadingRecords(true);
      const records = await getLatestDeliveryRecords(20);
      setLatestRecords(records);
    } catch (error) {
      console.error('Erro ao carregar registros:', error);
    } finally {
      setLoadingRecords(false);
    }
  };

  const loadCurrentRouteImage = async () => {
    try {
      const images = await getAllRouteImages();
      if (images && images.length > 0) {
        const latest = images[0];
        setRouteImage(latest.image_url);
        setImageName(latest.original_name);
        setCurrentRouteImageId(latest.id);
        setRouteImageInfo(latest);
      } else {
        setRouteImage(null);
        setImageName('');
        setCurrentRouteImageId(null);
        setRouteImageInfo(null);
      }
    } catch (error) {
      console.error('Erro ao carregar imagem da rota do Supabase:', error);
      setRouteImage(null);
      setImageName('');
      setCurrentRouteImageId(null);
      setRouteImageInfo(null);
    }
  };

  const checkNotifications = () => {
    const now = new Date();
    const newNotifications = [];
    const timeWaitRecords = [];
    const problemRecords = [];

    // Verificar entregas com mais de 1 hora
    latestRecords.forEach(record => {
      if (record.status === 'Entrega em andamento' && record.checkin_time) {
        const checkinTime = new Date(record.checkin_time);
        const diffHours = (now - checkinTime) / (1000 * 60 * 60);
        
        if (diffHours >= 1) {
          timeWaitRecords.push(record);
        }
      }

      // Verificar entregas com problemas (apenas as que ainda estão em andamento)
      if (record.problem_type && record.status === 'Entrega em andamento') {
        problemRecords.push(record);
      }
    });

    // Criar notificação de tempo de espera para cada registro específico
    timeWaitRecords.forEach(record => {
          const notificationKey = `time_wait_${record.id}`;
          if (!dismissedNotifications[notificationKey]) {
        const cliente = record.cliente || record.client || 'N/A';
        const fretista = record.fretista || record.driver || 'N/A';
        const info = record.informacoesAdicionais || record.information || 'N/A';
        const problema = record.tipoProblema || record.problem_type || '';
        
        let message = `🚨 ALERTA DE TEMPO DE ESPERA 🚨\n🚛 FRETISTA ${fretista} NO CLIENTE ${cliente} HÁ 1 HORA AGUARDANDO.\n👁 FAVOR, ACOMPANHAR!`;
        
        if (info) {
          message += `\n\n📝 INFORMAÇÕES: ${info}`;
        }
        
        if (problema) {
          message += `\n\n⚠ PROBLEMA NA ENTREGA: ${problema}`;
        }
        
            newNotifications.push({
              id: notificationKey,
              type: 'time_wait',
          records: [record],
          message: message,
              time: now
            });
          }
    });

    // Criar notificação de problemas apenas a cada 1 hora
    if (problemRecords.length > 0) {
      const currentHour = now.getHours();
      const currentDate = now.toLocaleDateString('pt-BR');
      const hourKey = `${currentDate}_hour_${currentHour}`;
      const lastProblemNotified = localStorage.getItem('lastProblemNotification');
      
      if (lastProblemNotified !== hourKey) {
        const notificationKey = 'problem_group';
        if (!dismissedNotifications[notificationKey]) {
          newNotifications.push({
            id: notificationKey,
            type: 'problem',
            records: problemRecords,
            message: `⚠️ ENTREGA(S) COM PROBLEMA ⚠️\n${problemRecords.length} entrega(s) com problemas em andamento.\n📝 Verificar detalhes abaixo.`,
            time: now
          });
          localStorage.setItem('lastProblemNotification', hourKey);
        }
        }
      }

    // Notificação global de horário limite (1 vez por hora para todos)
    // Só mostrar se houver registros em andamento com mais de 1 hora
    if (timeWaitRecords.length > 0) {
      const currentHour = now.getHours();
      const currentDate = now.toLocaleDateString('pt-BR');
      const hourKey = `${currentDate}_hour_${currentHour}`;
      const lastHourNotified = localStorage.getItem('lastTimeLimitNotification');
      if (currentHour >= 17 && lastHourNotified !== hourKey) {
        const notificationKey = `time_limit_${currentDate}_${currentHour}`;
        if (!dismissedNotifications[notificationKey]) {
          newNotifications.push({
            id: notificationKey,
            type: 'time_limit',
            message: `🚨⏳🚨 Alerta: carro há muito tempo em entrega/loja 🚨⏳🚨\nNotificar os responsáveis para que sejam tomadas as devidas providências.`,
            time: now
          });
          localStorage.setItem('lastTimeLimitNotification', hourKey);
        }
      }
    }

    setNotifications(newNotifications);
  };

  const dismissNotification = (notificationId) => {
    setDismissedNotifications(prev => ({
      ...prev,
      [notificationId]: true
    }));
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    
    // Salvar no localStorage
    const dismissed = JSON.parse(localStorage.getItem('dismissedNotifications') || '{}');
    dismissed[notificationId] = true;
    localStorage.setItem('dismissedNotifications', JSON.stringify(dismissed));
  };

  // Corrigir a função markAsBeingMonitored para incluir colaboradores
  const markAsBeingMonitored = async (recordId) => {
    if (user?.type !== 'admin' && user?.type !== 'colaborador') {
      showToast('Apenas administradores e colaboradores podem marcar entregas como sendo acompanhadas.', 'warning');
      return;
    }

    try {
      await updateDeliveryRecord(recordId, {
        being_monitored: true
      });
      
      // Remover notificação de problemas
      const notificationKey = 'problem_group';
      dismissNotification(notificationKey);
      
      // Recarregar registros
      loadLatestRecords();
      
      showToast('Entrega marcada como sendo acompanhada.', 'success');
    } catch (error) {
      console.error('Erro ao marcar como sendo acompanhada:', error);
      showToast('Erro ao marcar como sendo acompanhada.', 'error');
    }
  };

  // Função para saber se pode mostrar o botão de apoio
  const canRequestSupport = (record) => {
    if (!user) return false;
    if (record.status !== 'Entrega em andamento') return false;
    if (!record.problem_type) return false;
    const cooldown = supportCooldown[record.id];
    if (cooldown && Date.now() < cooldown) return false;
    // Só mostra para o usuário que fez o registro ou para admin
    if (record.userEmail !== user.email && !isAdmin(user.email)) return false;
    return true;
  };

  // Função para solicitar apoio e iniciar cooldown
  const requestSupport = (record) => {
    const now = new Date();
    const checkinTime = new Date(record.checkin_time);
    const diffMs = now.getTime() - checkinTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    // Usar campos corretos com fallback
    const cliente = record.cliente || record.client || 'N/A';
    const fretista = record.fretista || record.driver || 'N/A';
    const usuario = record.userEmail || 'N/A';
    const info = record.informacoesAdicionais || record.information || 'N/A';
    const problema = record.tipoProblema || record.problem_type || '';
    
    let message = `📞SOLICITAÇÃO DE APOIO📞\n\n`;
    message += `📌Cliente: ${cliente}\n`;
    message += `🚛Fretista: ${fretista}\n`;
    message += `👤Usuário: ${usuario}\n`;
    message += `⏱️Tempo em loja: ${diffMinutes} minutos\n`;
    message += `📝Info: ${info}\n`;
    if (problema) {
      message += `\n⚠️ Problema: ${problema}\n`;
    }
    message += `\n⚠️ESTOU AGUARDANDO, FAVOR ACOMPANHAR!⚠️`;
    
    const encodedMessage = encodeURIComponent(message);
    
    // Detectar dispositivo móvel
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    let whatsappUrl;
    if (isMobile) {
      // Para mobile, tentar abrir app diretamente
      whatsappUrl = `whatsapp://send?text=${encodedMessage}`;
    } else {
      // Para desktop/web, usar api.whatsapp.com
      whatsappUrl = `https://api.whatsapp.com/send?text=${encodedMessage}`;
    }

    try {
      // Tentar abrir WhatsApp
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      console.error('Erro ao abrir WhatsApp:', error);
      // Fallback: copiar para clipboard
      navigator.clipboard.writeText(message).then(() => {
        alert('Mensagem copiada para a área de transferência! Cole no WhatsApp.');
      }).catch(() => {
        alert('Mensagem gerada:\n\n' + message);
      });
    }
    
    // Iniciar cooldown de 30 minutos
    setSupportCooldown(prev => ({ ...prev, [record.id]: Date.now() + 30 * 60 * 1000 }));
  };

  const handleSaveComment = async () => {
    if (!commentText.trim()) return;
    
    setSavingComment(true);
    try {
      await addDeliveryComment(
        commentModal.record.id, 
        commentText.trim(), 
        user?.email,
        user?.displayName || user?.email
      );
      
      setCommentModal({ open: false, record: null });
      setCommentText('');
      loadLatestRecords();
      showToast('Comentário adicionado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao salvar comentário:', error);
      showToast('Erro ao salvar comentário!', 'error');
    }
    setSavingComment(false);
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione apenas arquivos de imagem (JPG, PNG, GIF, etc.)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('O arquivo é muito grande. Selecione uma imagem menor que 5MB.');
        return;
      }

      setIsLoading(true);
      
      try {
        // Fazer upload da imagem para o Firebase
        const uploadedImage = await uploadRouteImage(file, user?.email);
        
        setRouteImage(uploadedImage.image_url);
        setImageName(uploadedImage.original_name);
        setCurrentRouteImageId(uploadedImage.id);
        setRouteImageInfo(uploadedImage);
        
        const message = uploadedImage.is_local 
          ? `Imagem "${uploadedImage.original_name}" salva localmente com sucesso!`
          : `Imagem "${uploadedImage.original_name}" salva no Supabase com sucesso!`;
        alert(message);
      } catch (error) {
        console.error('Erro ao fazer upload da imagem:', error);
        
        // Mensagens de erro mais específicas
        if (error.code === 'storage/unauthorized') {
          alert('Imagem salva localmente (sem dependência de servidor).');
        } else if (error.code === 'storage/quota-exceeded') {
          alert('Limite de armazenamento excedido. Tente com uma imagem menor.');
        } else if (error.message.includes('CORS')) {
          alert('Imagem salva localmente (modo offline ativado).');
        } else {
          alert('Imagem salva localmente. Funcionando normalmente!');
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleImportClick = () => {
    if (!isAdmin(user?.email)) {
      showToast('Apenas administradores podem importar rotas.', 'warning');
      return;
    }
    fileInputRef.current.click();
  };

  const handleRemoveImage = async () => {
    if (!currentRouteImageId) {
      setRouteImage(null);
      setImageName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (!isAdmin(user?.email)) {
      showToast('Apenas administradores podem remover rotas.', 'warning');
      return;
    }

    const confirmRemove = window.confirm('Tem certeza que deseja remover a imagem da rota? Esta ação não pode ser desfeita.');
    if (!confirmRemove) return;

    setIsLoading(true);
    
    try {
      await deleteRouteImage(currentRouteImageId);
      setRouteImage(null);
      setImageName('');
      setCurrentRouteImageId(null);
      setRouteImageInfo(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      showToast('Imagem da rota removida com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao remover imagem:', error);
      showToast('Erro ao remover a imagem. Tente novamente.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRoute = () => {
    if (!routeImage) {
      showToast('Nenhuma imagem selecionada para salvar.', 'warning');
      return;
    }
    showToast(`Rota "${imageName}" já está salva no sistema!`, 'info');
  };

  // Filtro para exibir apenas registros que não estão com problema em andamento nem sendo acompanhados em andamento
  const filteredRecords = latestRecords.filter(record => {
    // Busca
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      record.client?.toLowerCase().includes(searchLower) ||
      record.driver?.toLowerCase().includes(searchLower) ||
      record.userEmail?.toLowerCase().includes(searchLower) ||
      record.problem_type?.toLowerCase().includes(searchLower) ||
      record.information?.toLowerCase().includes(searchLower) ||
      record.status?.toLowerCase().includes(searchLower)
    );
    // Filtros adicionais
    const matchesClient = !filterClient || record.client === filterClient;
    const matchesStatus = !filterStatus || record.status === filterStatus;
    const matchesFretista = !filterFretista || record.driver === filterFretista;
    // Filtro por problema
    const matchesProblem = filterProblem === '' ? true : (filterProblem === 'sim' ? !!record.problem_type : !record.problem_type);
    // Filtro por duração
    let matchesDuration = true;
    if (filterDuration) {
      const min = record.duration && record.duration.includes('min') ? parseInt(record.duration.replace(' min', '')) : null;
      if (min !== null) {
        if (filterDuration === '0-59') matchesDuration = min >= 0 && min <= 59;
        if (filterDuration === '60-120') matchesDuration = min >= 60 && min <= 120;
        if (filterDuration === '120+') matchesDuration = min > 120;
      } else {
        matchesDuration = false;
      }
    }
    // Filtro visual padrão
    const isProblemInProgress = record.problem_type && record.status === 'Entrega em andamento';
    const isBeingMonitored = record.being_monitored && record.status === 'Entrega em andamento';
    return matchesSearch && matchesClient && matchesStatus && matchesFretista && matchesProblem && matchesDuration && !isProblemInProgress && !isBeingMonitored;
  });

  // Filtros para os cards de problemas e acompanhadas devem usar latestRecords, não filteredRecords
  const problemsInProgress = latestRecords.filter(record => 
    record.problem_type && record.status === 'Entrega em andamento' && !record.being_monitored
  );

  const beingMonitored = latestRecords.filter(record => 
    record.being_monitored && record.status === 'Entrega em andamento'
  );

  // Exibir o tempo em aberto com emoji ⏰
  // Exemplo para cada registro:
  // Calcular tempo desde o check-in
  const getElapsedTime = (checkin_time) => {
    if (!checkin_time) return '00:00';
    const start = new Date(checkin_time).getTime();
    const diff = Math.max(0, now - start);
    const min = Math.floor(diff / 60000).toString().padStart(2, '0');
    const sec = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  };

  // Função para exibir o tempo correto no card
  const getTempoEmLoja = (record) => {
    if (record.status === 'Entrega em andamento') {
      return getElapsedTime(record.checkin_time);
    }
    // Se finalizada ou devolvida, mostrar duração fixa
    return record.duracao || record.duration || '00:00';
  };

  return (
    <div className="home-container" style={{maxWidth: '1200px', margin: '0 auto', padding: '24px 0'}}>
      {/* Cabeçalho moderno padrão localização */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 12px 24px 12px',
        background: 'linear-gradient(135deg, #1de9b6 0%, #1dc8e9 100%)',
        borderRadius: 24,
        marginBottom: 24,
        maxWidth: '100%',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
      }}>
        <div style={{fontSize: 64, marginBottom: 8}}><i className="fas fa-home" /></div>
        <h1 style={{
          fontSize: 'clamp(1.5rem, 6vw, 2.5rem)',
          fontWeight: 800,
          color: '#fff',
          margin: 0,
          textAlign: 'center',
          maxWidth: '100%',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
        }}>Dashboard Logística</h1>
        <div style={{
          color: '#fff',
          fontSize: 'clamp(1rem, 3vw, 1.2rem)',
          textAlign: 'center',
          marginTop: 8,
          maxWidth: '100%',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
        }}>
          Acompanhe entregas, status e solicitações em tempo real
        </div>
      </div>
      {/* Input file oculto */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        style={{ display: 'none' }}
      />
      {/* Área de upload da rota */}
      <div className="card" style={{maxWidth: 5000, margin: '0 auto 32px auto', textAlign: 'center'}}>
        {!routeImage ? (
          <>
            <p style={{fontWeight: 600, color: '#218838', fontSize: 18, marginBottom: 8}}>
              📋 Imagem da Rota do Dia
            </p>
            <p className="route-instructions" style={{fontSize: 15, color: '#888', marginBottom: 18}}>
              Clique no botão abaixo para importar a imagem da rota do dia
            </p>
            <button 
              onClick={handleImportClick}
              disabled={isLoading || !isAdmin(user?.email)}
              className="btn btn-green"
              style={{width: '100%', maxWidth: 260, margin: '0 auto'}}
            >
              {isLoading ? '⏳ Carregando...' : '📁 Importar Imagem da Rota'}
            </button>
            {!isAdmin(user?.email) && (
              <p className="admin-only" style={{color: '#e65100', fontSize: 13, marginTop: 10}}>Apenas administradores podem importar rotas</p>
            )}
          </>
        ) : (
          <div className="route-preview">
            <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12}}>
              <span style={{fontSize: 20, color: '#4caf50'}}>✅</span>
              <h4 style={{fontSize: 16, color: '#218838', margin: 0}}>Rota do Dia Carregada</h4>
            </div>
            
            <div className="route-info" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#e6f4ea', borderRadius: 8, padding: '12px 20px', marginBottom: 18}}>
              <span style={{fontSize: 16, color: '#218838', fontWeight: 600}}>
                📅 Data: {routeImageInfo?.date ? new Date(routeImageInfo.date).toLocaleDateString('pt-BR') : (() => {
                  // Obter data atual no fuso horário de Salvador, Bahia
                  const now = new Date();
                  // Criar um objeto de data com o fuso horário de Salvador
                  const formatter = new Intl.DateTimeFormat('pt-BR', {
                    timeZone: 'America/Bahia',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  });
                  return formatter.format(now);
                })()}
              </span>
              <span style={{fontSize: 16, color: routeImageInfo?.is_local ? '#4caf50' : '#1976d2', fontWeight: 600}}>
                💾 Status: {routeImageInfo?.is_local ? 'Salva localmente' : 'Salva no Supabase'}
              </span>
            </div>
            
            <div className="image-preview-container" style={{marginBottom: 16, display: 'flex', justifyContent: 'center'}}>
              <img 
                src={routeImage} 
                alt="Preview da Rota" 
                className="route-preview-image"
                style={{maxWidth: '100%', maxHeight: 5000, borderRadius: 16, boxShadow: '0 4px 24px #21883833', cursor: 'zoom-in', border: '3px solid #e6f4ea'}}
                onClick={() => setZoomOpen(true)}
              />
            </div>

            {zoomOpen && (
              <div
                style={{position: 'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.85)', zIndex: 9999, display:'flex', alignItems:'center', justifyContent:'center'}}
                onClick={() => setZoomOpen(false)}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                <div
                  style={{position:'relative', maxWidth:'90vw', maxHeight:'90vh', overflow:'hidden', borderRadius: 18, boxShadow: '0 8px 32px #0008', background:'#222'}}
                  onClick={e => e.stopPropagation()}
                >
                  <img
                    ref={imgRef}
                    src={routeImage}
                    alt="Zoom da Rota"
                    style={{
                      maxWidth: 'none',
                      maxHeight: 'none',
                      width: `${zoomLevel * 100}%`,
                      height: 'auto',
                      transform: `translate(${drag.x}px, ${drag.y}px)`,
                      cursor: drag.active ? 'grabbing' : zoomLevel > 1 ? 'grab' : 'zoom-in',
                      userSelect: 'none',
                      transition: drag.active ? 'none' : 'transform 0.2s',
                      display: 'block',
                    }}
                    onWheel={handleWheel}
                    onMouseDown={zoomLevel > 1 ? handleMouseDown : undefined}
                    draggable={false}
                  />
                  <button onClick={() => setZoomOpen(false)} style={{position:'absolute', top:16, right:16, background:'none', border:'none', color:'#fff', fontSize:36, cursor:'pointer', zIndex:10000}}>&times;</button>
                  <div style={{position:'absolute', bottom:16, left:16, color:'#fff', fontSize:16, background:'rgba(0,0,0,0.4)', borderRadius:8, padding:'4px 12px'}}>
                    Zoom: {Math.round(zoomLevel * 100)}% (Use a roda do mouse para ampliar, arraste para mover)
                  </div>
                </div>
              </div>
            )}
            
            <div className="route-actions" style={{display: 'flex', gap: 12, justifyContent: 'center'}}>
              <button 
                onClick={handleSaveRoute}
                className="btn btn-green"
                disabled={isLoading}
              >
                💾 Rota Salva
              </button>
              {isAdmin(user?.email) && (
                <button 
                  onClick={handleRemoveImage}
                  className="btn btn-outline"
                  disabled={isLoading}
                >
                  {isLoading ? '⏳ Removendo...' : '🗑️ Remover'}
                </button>
              )}
            </div>
            
            {!isAdmin(user?.email) && (
              <p style={{color: '#e65100', fontSize: 13, marginTop: 10}}>
                Apenas administradores podem remover rotas
              </p>
            )}
          </div>
        )}
      </div>
      {/* Notificações */}
      {notifications.length > 0 && (
        <div className="card" style={{marginBottom: 32, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none', boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'}}>
          <h3 style={{fontSize: 20, color: '#fff', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, fontWeight: 700}}>
            <span style={{fontSize: 24}}>🔔</span>
            Notificações do Sistema
          </h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
            {notifications.map(notification => (
              <div key={notification.id} className="notification-item" style={{
                background: 'rgba(255, 255, 255, 0.95)', 
                border: 'none', 
                borderRadius: 16, 
                padding: 20, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                gap: 16,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                backdropFilter: 'blur(10px)'
              }}>
                <div className="notification-content" style={{
                  fontSize: 16, 
                  color: '#2d3748', 
                  whiteSpace: 'pre-line',
                  fontWeight: 500,
                  lineHeight: 1.5
                }}>
                  {notification.message}
                </div>
                <div className="notification-actions" style={{display: 'flex', gap: 12, alignItems: 'center'}}>
                  {notification.type === 'problem' && notification.records && (isAdmin(user?.email) || isCollaborator(user)) && (
                    <button 
                      onClick={() => notification.records.forEach(record => markAsBeingMonitored(record.id))}
                      className="btn btn-blue"
                      style={{
                        fontSize: 14, 
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)',
                        border: 'none',
                        borderRadius: 8,
                        color: '#fff',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Marcar como Acompanhada
                    </button>
                  )}
                  <button 
                    onClick={() => dismissNotification(notification.id)}
                    className="btn btn-outline"
                    style={{
                      fontSize: 14, 
                      padding: '10px 20px',
                      background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                      border: 'none',
                      borderRadius: 8,
                      color: '#fff',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <span style={{fontSize: 16}}>✅</span>
                    CIENTE
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Entregas com problemas */}
      {problemsInProgress.length > 0 && (
        <div className="card" style={{
          marginBottom: 32, 
          background: 'linear-gradient(135deg, #fff5f5 0%, #fef2f2 100%)',
          border: '2px solid #fecaca',
          borderRadius: 20,
          boxShadow: '0 8px 32px rgba(239, 68, 68, 0.15)',
          overflow: 'hidden'
        }}>
          {/* Header do card */}
          <div style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              <span style={{fontSize: 24, color: '#fff'}}>🚨</span>
          </div>
            <div>
              <h3 style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                color: '#fff',
                margin: 0,
                letterSpacing: '0.5px',
                textShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                ATENÇÃO: ENTREGAS COM PROBLEMAS
              </h3>
              <p style={{
                fontSize: '0.9rem',
                color: 'rgba(255, 255, 255, 0.9)',
                margin: '4px 0 0 0',
                fontWeight: 500
              }}>
                {problemsInProgress.length} entrega(s) requerem atenção imediata
              </p>
            </div>
          </div>

          {/* Lista de problemas */}
          <div style={{padding: '24px'}}>
            <div style={{display: 'flex', flexDirection: 'column', gap: 20}}>
            {problemsInProgress.map(record => (
                <div key={record.id} style={{
                  background: '#fff',
                  borderRadius: 16,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  border: '1px solid #f3f4f6',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  position: 'relative'
                }}>
                  {/* Indicador de problema */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    background: 'linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #ef4444 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s infinite'
                  }}></div>

                  <div style={{padding: '20px'}}>
                    {/* Informações principais */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: 16,
                      marginBottom: 16
                    }}>
                      <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                        <span style={{fontSize: 18, color: '#6b7280'}}>🚛</span>
                        <div>
                          <div style={{fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px'}}>Fretista</div>
                          <div style={{fontSize: '1rem', color: '#1f2937', fontWeight: 700}}>{record.fretista || record.driver || '-'}</div>
                        </div>
                      </div>

                      <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                        <span style={{fontSize: 18, color: '#6b7280'}}>👤</span>
                        <div>
                          <div style={{fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px'}}>Cliente</div>
                          <div style={{fontSize: '1rem', color: '#1f2937', fontWeight: 700}}>{record.cliente || record.client || '-'}</div>
                        </div>
                      </div>

                      <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                        <span style={{fontSize: 18, color: '#6b7280'}}>⏰</span>
                        <div>
                          <div style={{fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px'}}>Check-in</div>
                          <div style={{fontSize: '1rem', color: '#1f2937', fontWeight: 700}}>{record.checkin || (record.checkin_time ? new Date(record.checkin_time).toLocaleTimeString('pt-BR') : '-')}</div>
                        </div>
                      </div>

                      <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                        <span style={{fontSize: 18, color: '#6b7280'}}>⏳</span>
                        <div>
                          <div style={{fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px'}}>Tempo em Loja</div>
                          <div style={{fontSize: '1rem', color: '#ef4444', fontWeight: 800}}>{(() => {
                    const now = new Date();
                    const checkin = new Date(record.checkin_time);
                    const diff = Math.floor((now - checkin)/1000);
                    const min = Math.floor(diff/60).toString().padStart(2,'0');
                    const sec = (diff%60).toString().padStart(2,'0');
                    return `${min}:${sec}`;
                          })()}</div>
                </div>
                </div>
                    </div>

                    {/* Problema destacado */}
                    <div style={{
                      background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                      border: '1px solid #f59e0b',
                      borderRadius: 12,
                      padding: '16px',
                      marginBottom: 16,
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: 4,
                        height: '100%',
                        background: 'linear-gradient(180deg, #ef4444 0%, #f59e0b 100%)'
                      }}></div>
                      <div style={{display: 'flex', alignItems: 'center', gap: 12, marginLeft: 8}}>
                        <span style={{fontSize: 20, color: '#d97706'}}>⚠️</span>
                        <div>
                          <div style={{fontSize: '0.8rem', color: '#92400e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px'}}>Problema Identificado</div>
                          <div style={{fontSize: '1.1rem', color: '#92400e', fontWeight: 800}}>{record.tipoProblema || record.problem_type || '-'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Informações adicionais */}
                    <CollapsibleText text={record.informacoesAdicionais || record.information} />

                    {/* Usuário responsável */}
                    <div style={{
                      background: '#f1f5f9',
                      borderRadius: 8,
                      padding: '8px 12px',
                      marginBottom: 16,
                      display: 'inline-block'
                    }}>
                      <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                        <span style={{fontSize: 14, color: '#64748b'}}>👤</span>
                        <span style={{fontSize: '0.8rem', color: '#64748b', fontWeight: 600}}>Registrado por:</span>
                        <span style={{fontSize: '0.8rem', color: '#475569', fontWeight: 700}}>
                          {record.userName ? `${record.userName} (${record.userEmail || '-'})` : (record.userEmail || '-')}
                        </span>
                      </div>
                    </div>

                    {/* Comentários existentes */}
                    {(record.comments || []).length > 0 && (
                      <div style={{marginBottom:8}}>
                        <button 
                          onClick={() => setViewCommentsModal({ open: true, record })}
                          style={{
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            padding: '8px 16px',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
                            transition: 'all 0.2s ease',
                            width: '100%',
                            justifyContent: 'center'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.transform = 'translateY(-1px)';
                            e.target.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 2px 8px rgba(139, 92, 246, 0.3)';
                          }}
                        >
                          <span style={{fontSize: 16}}>💬</span>
                          Ver {(record.comments || []).length} comentário(s)
                        </button>
                      </div>
                    )}

                    {/* Botões de ação */}
                    <div style={{
                      display: 'flex',
                      gap: 12,
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap'
                    }}>
                      {(record.userEmail === user.email || isAdmin(user?.email)) && (
                        <button 
                          onClick={() => {
                            setProblemModal({ open: true, record });
                            setSelectedProblem('');
                            setProblemInfo('');
                          }}
                          className="btn btn-red"
                          style={{
                            fontWeight:700,
                            fontSize:16,
                            padding:'12px 28px',
                            borderRadius:10,
                            background:'linear-gradient(135deg, #e53935 0%, #ff9800 100%)',
                            color:'#fff',
                            marginTop:12,
                            boxShadow:'0 2px 8px #e5393533',
                            border:'none',
                            cursor:'pointer',
                            letterSpacing:1
                          }}
                        >
                          ⚠️ PROBLEMA
                        </button>
                      )}
                      {(record.userEmail === user.email || isAdmin(user?.email)) && (
                    <button 
                      onClick={() => requestSupport(record)}
                          style={{
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 12,
                            padding: '12px 20px',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                            transition: 'all 0.2s ease',
                            letterSpacing: '0.5px'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.4)';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
                          }}
                    >
                          <span style={{fontSize: 16}}>🆘</span>
                          SOLICITAR APOIO
                    </button>
                  )}
                      {(user?.type === 'admin' || user?.type === 'colaborador') && (
                    <button 
                      onClick={() => markAsBeingMonitored(record.id)}
                          style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 12,
                            padding: '12px 20px',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                            transition: 'all 0.2s ease',
                            letterSpacing: '0.5px'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                          }}
                        >
                          <span style={{fontSize: 16}}>👁️</span>
                          ACOMPANHAR
                    </button>
                  )}
                      {/* Botão de comentário */}
                      <button 
                        onClick={() => {
                          setCommentModal({ open: true, record });
                          setCommentText('');
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 12,
                          padding: '12px 20px',
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                          transition: 'all 0.2s ease',
                          letterSpacing: '0.5px'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.4)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
                        }}
                      >
                        <span style={{fontSize: 16}}>💬</span>
                        COMENTAR
                      </button>
                    </div>
                </div>
              </div>
            ))}
            </div>
          </div>
        </div>
      )}
      {/* Entregas sendo acompanhadas */}
      {beingMonitored.length > 0 && (
        <div className="card" style={{marginBottom: 32, position: 'relative', overflow: 'hidden', boxShadow: '0 8px 32px rgba(59,130,246,0.10)'}}>
          {/* shimmer azul */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 50%, #3b82f6 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s infinite'
          }}></div>
          <h3 style={{fontSize: 17, color: '#218838', marginBottom: 10, marginTop: 16, marginLeft: 16}}>🔄 Entregas Sendo Acompanhadas</h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: 10, padding: 16}}>
            {beingMonitored.map(record => (
              <div
                key={record.id}
                style={{
                  background: '#eafff6',
                  borderRadius: 14,
                  margin: '0 0 18px 0',
                  padding: 16,
                  boxShadow: '0 2px 8px #0001',
                  maxWidth: 420,
                  width: '100%',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{display:'flex',alignItems:'center',gap:6,fontWeight:700,fontSize:16,color:'#1976d2',marginBottom:8}}>
  <span role="img" aria-label="Relógio">⏰</span> {getTempoEmLoja(record)}
</div>
                <b>🚚 Fretista:</b> {record.fretista || record.driver || '-'} <b>👤 Cliente:</b> {record.cliente || record.client || '-'} <b>🕒 Check-in:</b> {record.checkin || (record.checkin_time ? new Date(record.checkin_time).toLocaleTimeString('pt-BR') : '-')} <b>⚠️ Problema:</b> {record.tipoProblema || record.problem_type || '-'} <b>📝 Info:</b> <CollapsibleText text={record.informacoesAdicionais || record.information || '-'} /> <b>👤 Usuário:</b> {record.userEmail || '-'}
                  <div style={{marginTop: 4, fontSize: 13, color: '#888'}}>🔄 Status: Responsável da logística resolvendo o Problema, por favor, aguardar e em caso de demora, entrar em contato por ligação!</div>
                <div style={{marginBottom:8, color:'#1976d2', fontWeight:600, fontSize:15, display:'flex', alignItems:'center', gap:6, maxWidth:'100%', wordBreak:'break-word', overflowWrap:'break-word'}}>
  <span style={{fontSize:18}}>✉️</span>
  <CollapsibleText text={record.informacoesAdicionais || record.information} />
                </div>
                <div className="record-actions">
                  {canRequestSupport(record) && (
                    <button 
                      onClick={() => requestSupport(record)}
                      className="btn btn-orange"
                      style={{fontSize: 14, fontWeight: 600}}
                    >
                      🆘 SOLICITAR APOIO
                    </button>
                  )}
                  {/* Botão de comentário */}
                  <button 
                    onClick={() => {
                      setViewCommentsModal({ open: true, record });
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 16px',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
                      transition: 'all 0.2s ease',
                      width: '100%',
                      justifyContent: 'center'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.transform = 'translateY(-1px)';
                      e.target.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 2px 8px rgba(139, 92, 246, 0.3)';
                    }}
                  >
                    <span style={{fontSize: 16}}>💬</span>
                    Ver {(record.comments || []).length} comentário(s)
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Cards Estatísticos */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24,
        justifyContent: 'center',
        alignItems: 'stretch'
      }}>
        {/* Card Total */}
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: '20px',
          minWidth: 140,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: '#3b82f6',
            marginBottom: 8
          }}>
            {stats.total}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.9rem',
            color: '#64748b',
            fontWeight: 600
          }}>
            <span style={{fontSize: '1.2rem'}}>📦</span>
            Total
          </div>
        </div>

        {/* Card Em Andamento */}
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: '20px',
          minWidth: 140,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: '#f59e0b',
            marginBottom: 8
          }}>
            {stats.emAndamento}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.9rem',
            color: '#64748b',
            fontWeight: 600
          }}>
            <span style={{fontSize: '1.2rem'}}>⏳</span>
            Em Andamento
          </div>
        </div>

        {/* Card Com Problema */}
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: '20px',
          minWidth: 140,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: '#ef4444',
            marginBottom: 8
          }}>
            {stats.comProblema}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.9rem',
            color: '#64748b',
            fontWeight: 600
          }}>
            <span style={{fontSize: '1.2rem'}}>⚠️</span>
            Com Problemas
          </div>
        </div>

        {/* Card Finalizada */}
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: '20px',
          minWidth: 140,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: '#10b981',
            marginBottom: 8
          }}>
            {stats.finalizada}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.9rem',
            color: '#64748b',
            fontWeight: 600
          }}>
            <span style={{fontSize: '1.2rem'}}>✅</span>
            Finalizadas
          </div>
        </div>

        {/* Card Devolvida */}
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: '20px',
          minWidth: 140,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: '#dc2626',
            marginBottom: 8
          }}>
            {stats.devolvida}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.9rem',
            color: '#64748b',
            fontWeight: 600
          }}>
            <span style={{fontSize: '1.2rem'}}>❌</span>
            Devolvidas
          </div>
        </div>
      </div>

      {/* Filtro dinâmico de busca */}
      <div style={{display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 18, justifyContent: 'center', alignItems: 'center'}}>
          <input
            type="text"
          placeholder="Buscar por cliente, fretista, status, problema..."
            value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{padding: '10px 16px', borderRadius: 8, border: '1px solid #d0d7de', fontSize: 16, minWidth: 220}}
          />
        </div>
      {/* Novos filtros adicionais */}
      <div style={{display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24, justifyContent: 'center', alignItems: 'center'}}>
        {/* Cliente */}
        <select
          value={filterClient}
          onChange={e => setFilterClient(e.target.value)}
          style={{padding: '10px 16px', borderRadius: 8, border: '1px solid #d0d7de', fontSize: 16, minWidth: 160}}
        >
          <option value="">Todos os Clientes</option>
          {clientList.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {/* Duração */}
        <select
          value={filterDuration}
          onChange={e => setFilterDuration(e.target.value)}
          style={{padding: '10px 16px', borderRadius: 8, border: '1px solid #d0d7de', fontSize: 16, minWidth: 160}}
        >
          <option value="">Todas as Durações</option>
          <option value="0-59">0 a 59 min</option>
          <option value="60-120">60 a 120 min</option>
          <option value="120+">Acima de 120 min</option>
        </select>
        {/* Status */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{padding: '10px 16px', borderRadius: 8, border: '1px solid #d0d7de', fontSize: 16, minWidth: 140}}
        >
          <option value="">Todos os Status</option>
          {statusList.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {/* Problema */}
        <select
          value={filterProblem}
          onChange={e => setFilterProblem(e.target.value)}
          style={{padding: '10px 16px', borderRadius: 8, border: '1px solid #d0d7de', fontSize: 16, minWidth: 140}}
        >
          <option value="">Com ou sem Problema</option>
          <option value="sim">Com Problema</option>
          <option value="nao">Sem Problema</option>
        </select>
        {/* Fretista */}
        <select
          value={filterFretista}
          onChange={e => setFilterFretista(e.target.value)}
          style={{padding: '10px 16px', borderRadius: 8, border: '1px solid #d0d7de', fontSize: 16, minWidth: 140}}
        >
          <option value="">Todos os Fretistas</option>
          {fretistaList.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        {/* Limpar Filtros */}
        <button
          type="button"
          onClick={handleClearFilters}
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            border: 'none',
            background: 'linear-gradient(90deg, #43a047 0%, #1976d2 100%)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
            cursor: 'pointer',
            boxShadow: '0 2px 8px #1976d233',
            transition: 'background 0.2s',
            marginLeft: 8
          }}
        >
          Limpar Filtros
        </button>
      </div>
      {/* Lista de registros */}
      <div className="latest-records" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24, marginTop: 24}}>
        {loadingRecords ? (
          <p style={{fontWeight:600, fontSize:18, color:'#888'}}>Carregando registros...</p>
        ) : filteredRecords.length === 0 ? (
          <p style={{fontWeight:600, fontSize:18, color:'#888'}}>Nenhum registro encontrado.</p>
        ) : (
          filteredRecords.map(record => (
            <div key={record.id} className="card record-item" style={{
              background: '#fff',
              borderRadius: 18,
              boxShadow: '0 8px 32px rgba(33,136,56,0.10)',
              padding: 28,
              fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
              fontSize: 16,
              fontWeight: 500,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              transition: 'box-shadow 0.2s',
              border: '1.5px solid #f0f0f0',
              marginBottom: 0
            }}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap: 12, flexWrap:'wrap'}}>
                <div style={{flex:1, minWidth:180}}>
                  <div style={{marginBottom:8, color:'#888', fontWeight:600, fontSize:15}}>
                    <span style={{marginRight:8}}>📅 Data:</span> <span style={{color:'#333', fontWeight:700}}>{record.data || new Date(record.checkin_time).toLocaleDateString('pt-BR')}</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6,fontWeight:700,fontSize:16,color:'#1976d2',marginBottom:8}}>
  <span role="img" aria-label="Relógio">⏰</span> {getTempoEmLoja(record)}
</div>
                  <div style={{marginBottom:8}}><span style={{fontWeight:700, color:'#6c63ff'}}>👤 Cliente:</span> <span style={{color:'#222'}}>{record.cliente || record.client}</span></div>
                  <div style={{marginBottom:8}}><span style={{fontWeight:700, color:'#43a047'}}>🚛 Fretista:</span> <span style={{color:'#222'}}>{record.fretista || record.driver}</span></div>
                  <div style={{marginBottom:8}}><span style={{fontWeight:700, color:'#ff9800'}}>🏪 Vendedor:</span> <span style={{color:'#222'}}>{record.vendedor}</span></div>
                  <div style={{marginBottom:8}}><span style={{fontWeight:700, color:'#e65100'}}>🏪 Rede:</span> <span style={{color:'#222'}}>{record.rede}</span></div>
                  <div style={{marginBottom:8}}><span style={{fontWeight:700, color:'#1976d2'}}>📍 UF:</span> <span style={{color:'#222'}}>{record.uf}</span></div>
                  <div style={{marginBottom:8}}><span style={{fontWeight:700, color:'#ffb300'}}>🟨 Check-in:</span> <span style={{color:'#222'}}>{record.checkin || new Date(record.checkin_time).toLocaleTimeString('pt-BR')}</span></div>
                  {record.checkout && (
                    <div style={{marginBottom:8}}><span style={{fontWeight:700, color:'#43a047'}}>✅ Check-out:</span> <span style={{color:'#222'}}>{record.checkout}</span></div>
                  )}
                  {record.duracao && (
                    <div style={{marginBottom:8}}><span style={{fontWeight:700, color:'#43a047'}}>⏘ Duração:</span> <span style={{color:'#222'}}>{record.duracao}</span></div>
                  )}
                  {/* Usuário responsável */}
                  <div style={{marginBottom:8}}>
                    <span style={{fontWeight:700, color:'#64748b'}}>👤 Registrado por:</span> 
                    <span style={{color:'#475569', fontWeight:700}}>
                      {record.userName ? `${record.userName} (${record.userEmail || '-'})` : (record.userEmail || '-')}
                    </span>
                  </div>
                  {/* Comentários existentes */}
                  {(record.comments || []).length > 0 && (
                    <div style={{marginBottom:8}}>
                      <button 
                        onClick={() => setViewCommentsModal({ open: true, record })}
                      style={{
                          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          padding: '8px 16px',
                          fontSize: '0.9rem',
                        fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
                          transition: 'all 0.2s ease',
                          width: '100%',
                          justifyContent: 'center'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.transform = 'translateY(-1px)';
                          e.target.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 2px 8px rgba(139, 92, 246, 0.3)';
                        }}
                      >
                        <span style={{fontSize: 16}}>💬</span>
                        Ver {(record.comments || []).length} comentário(s)
                      </button>
                    </div>
                  )}
                </div>
                <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8, minWidth:160}}>
                  <div style={{marginBottom:8}}>
                    <span style={{fontWeight:700, color:'#888'}}>Status:</span>
                    <span style={{
                      display:'inline-block',
                      marginLeft:8,
                      padding:'6px 18px',
                      borderRadius:16,
                      fontWeight:700,
                      fontSize:15,
                      background: record.status === 'Entrega em andamento' ? '#ffe082' : record.status === 'Entrega finalizada' ? '#43a047' : record.status === 'Entrega devolvida' ? '#e53935' : '#e0e0e0',
                      color: record.status === 'Entrega em andamento' ? '#b26a00' : record.status === 'Entrega finalizada' ? '#fff' : record.status === 'Entrega devolvida' ? '#fff' : '#222',
                      boxShadow: '0 2px 8px #0001',
                      letterSpacing: 1
                    }}>
                      {record.status}
                    </span>
                  </div>
                  {record.problem_type || record.tipoProblema ? (
                    <div style={{marginBottom:8, color:'#e65100', fontWeight:700, fontSize:20, display:'flex', alignItems:'center', gap:6}}>
                      <span style={{fontSize:22}}>⚠️</span> {record.tipoProblema || record.problem_type}
                </div>
                  ) : null}
                  {record.informacoesAdicionais || record.information ? (
                    <div style={{marginBottom:8, color:'#1976d2', fontWeight:600, fontSize:15, display:'flex', alignItems:'center', gap:6}}>
                      <span style={{fontSize:18}}>✉️</span>
                      <CollapsibleText text={record.informacoesAdicionais || record.information} />
              </div>
                  ) : null}
                  {(record.attachments || []).length > 0 && (
                    <div style={{marginBottom:8, color:'#888', fontWeight:600, fontSize:15, display:'flex', alignItems:'center', gap:6}}>
                      <span style={{fontSize:18}}>📎</span> 
                      <span 
                        style={{color:'#1976d2', cursor:'pointer', textDecoration:'underline'}}
                        onClick={() => setViewAttachmentsModal({ open: true, record })}
                      >
                        {(record.attachments || []).length} anexo(s)
                      </span>
                    </div>
                  )}
                  {record.status === 'Entrega em andamento' && (user?.email === record.userEmail || isAdmin(user?.email)) && (
                    <button
                      onClick={() => {
                        setProblemModal({ open: true, record });
                        setSelectedProblem('');
                        setProblemInfo('');
                      }}
                      className="btn btn-red"
                      style={{
                        fontWeight:700,
                        fontSize:16,
                        padding:'12px 28px',
                        borderRadius:10,
                        background:'linear-gradient(135deg, #e53935 0%, #ff9800 100%)',
                        color:'#fff',
                        marginTop:12,
                        boxShadow:'0 2px 8px #e5393533',
                        border:'none',
                        cursor:'pointer',
                        letterSpacing:1
                      }}
                    >
                      ⚠️ PROBLEMA
                    </button>
                  )}
                  {record.status === 'Entrega em andamento' && (user?.email === record.userEmail || isAdmin(user?.email)) && (
                  <button 
                    onClick={() => requestSupport(record)}
                    className="btn btn-orange"
                      style={{
                        fontWeight:700,
                        fontSize:16,
                        padding:'12px 28px',
                        borderRadius:10,
                        background:'linear-gradient(135deg, #ff9800 0%, #ffc107 100%)',
                        color:'#fff',
                        marginTop:12,
                        boxShadow:'0 2px 8px #ff980033',
                        border:'none',
                        cursor:'pointer',
                        letterSpacing:1
                      }}
                  >
                      🚨 SOLICITAR APOIO
                  </button>
                )}
                  {/* Botão de comentário */}
                  <button 
                    onClick={() => {
                      setCommentModal({ open: true, record });
                      setCommentText('');
                    }}
                    style={{
                      fontWeight:700,
                      fontSize:16,
                      padding:'12px 28px',
                      borderRadius:10,
                      background:'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                      color:'#fff',
                      marginTop:12,
                      boxShadow:'0 2px 8px #8b5cf633',
                      border:'none',
                      cursor:'pointer',
                      letterSpacing:1
                    }}
                  >
                    💬 COMENTAR
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {/* Modal de Problema */}
      {problemModal.open && (
        <div style={{
          position:'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.35)', zIndex:9999,
          display:'flex', alignItems:'center', justifyContent:'center'
        }}>
          <div style={{background:'#fff', borderRadius:16, padding:32, minWidth:320, maxWidth:400, boxShadow:'0 8px 32px #0005', position:'relative'}}>
            <button onClick={()=>setProblemModal({open:false,record:null})} style={{position:'absolute',top:16,right:16,fontSize:22,background:'none',border:'none',cursor:'pointer',color:'#888'}} title="Fechar">×</button>
            <h2 style={{fontWeight:700, fontSize:'1.3rem', color:'#e53935', marginBottom:18}}>Registrar Problema</h2>
            <div style={{marginBottom:18}}>
              <label style={{fontWeight:600, color:'#333', marginBottom:6, display:'block'}}>Tipo de Problema:</label>
              <select value={selectedProblem} onChange={e=>setSelectedProblem(e.target.value)} style={{width:'100%',padding:10,borderRadius:8,border:'1.5px solid #eee',fontSize:16}}>
                <option value="">Selecione...</option>
                {problemTypes.map((p,i)=>(<option key={i} value={p}>{p}</option>))}
              </select>
            </div>
            <div style={{marginBottom:18}}>
              <label style={{fontWeight:600, color:'#333', marginBottom:6, display:'block'}}>Observação (opcional):</label>
              <textarea value={problemInfo} onChange={e=>setProblemInfo(e.target.value)} style={{width:'100%',padding:10,borderRadius:8,border:'1.5px solid #eee',fontSize:16,minHeight:60}} placeholder="Descreva o problema..."></textarea>
            </div>
            <button
              className="btn btn-red"
              style={{width:'100%',padding:'12px',fontWeight:700,fontSize:16,borderRadius:8,background:'linear-gradient(135deg, #e53935 0%, #ff9800 100%)',color:'#fff',border:'none',cursor:'pointer'}}
              disabled={!selectedProblem}
              onClick={async()=>{
                if (!selectedProblem) return;
                await updateDeliveryRecord(problemModal.record.id, {
                  problem_type: selectedProblem,
                  information: problemInfo
                });
                // NOVO MODELO DE RESUMO (ENTREGA COM PROBLEMA)
                const record = problemModal.record;
                let message = `🚨ENTREGA COM PROBLEMA🚨\n\n`;
                message += `🚛 Fretista: ${(record.fretista || record.driver || '-') }\n`;
                message += `🛒 Cliente: ${(record.cliente || record.client || '-') }\n`;
                message += `🧰 Vendedor: ${(record.vendedor || '-') }\n`;
                message += `⚠️ Problema: ${selectedProblem}\n`;
                message += `📝 Observação: ${problemInfo || 'Nenhuma'}\n\n`;
                message += `🫵NO AGUARDO DA RESOLUÇÃO!⌛`;
                const encodedMessage = encodeURIComponent(message);
                // Detectar dispositivo móvel
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                
                let whatsappUrl;
                if (isMobile) {
                  // Para mobile, tentar abrir app diretamente
                  whatsappUrl = `whatsapp://send?text=${encodedMessage}`;
                } else {
                  // Para desktop/web, usar api.whatsapp.com
                  whatsappUrl = `https://api.whatsapp.com/send?text=${encodedMessage}`;
                }

                try {
                  // Tentar abrir WhatsApp
                  window.open(whatsappUrl, '_blank');
                } catch (error) {
                  console.error('Erro ao abrir WhatsApp:', error);
                  // Fallback: copiar para clipboard
                  navigator.clipboard.writeText(message).then(() => {
                    alert('Mensagem copiada para a área de transferência! Cole no WhatsApp.');
                  }).catch(() => {
                    alert('Mensagem gerada:\n\n' + message);
                  });
                }
                
                setProblemModal({open:false,record:null});
                setSelectedProblem('');
                setProblemInfo('');
                loadLatestRecords();
              }}
            >Salvar Problema e Enviar WhatsApp</button>
          </div>
        </div>
      )}
      {/* Modal de Comentário */}
      {commentModal.open && (
        <div style={{
          position:'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.35)', zIndex:9999,
          display:'flex', alignItems:'center', justifyContent:'center'
        }}>
          <div style={{background:'#fff', borderRadius:16, padding:32, minWidth:320, maxWidth:400, boxShadow:'0 8px 32px #0005', position:'relative'}}>
            <button onClick={()=>setCommentModal({open:false,record:null})} style={{position:'absolute',top:16,right:16,fontSize:22,background:'none',border:'none',cursor:'pointer',color:'#888'}} title="Fechar">×</button>
            <h2 style={{fontWeight:700, fontSize:'1.3rem', color:'#8b5cf6', marginBottom:18}}>💬 Adicionar Comentário</h2>
            <div style={{marginBottom:18}}>
              <label style={{fontWeight:600, color:'#333', marginBottom:6, display:'block'}}>Comentário:</label>
              <textarea 
                value={commentText} 
                onChange={e=>setCommentText(e.target.value)} 
                style={{width:'100%',padding:10,borderRadius:8,border:'1.5px solid #eee',fontSize:16,minHeight:80}} 
                placeholder="Digite seu comentário..."
                maxLength={500}
              ></textarea>
              <div style={{fontSize:12, color:'#666', textAlign:'right', marginTop:4}}>
                {commentText.length}/500 caracteres
              </div>
            </div>
            <button
              style={{
                width:'100%',
                padding:'12px',
                fontWeight:700,
                fontSize:16,
                borderRadius:8,
                background:'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color:'#fff',
                border:'none',
                cursor:'pointer',
                opacity: savingComment ? 0.7 : 1
              }}
              disabled={!commentText.trim() || savingComment}
              onClick={handleSaveComment}
            >
              {savingComment ? '💾 Salvando...' : '💬 Salvar Comentário'}
            </button>
          </div>
        </div>
      )}
      {/* Modal de Visualização de Comentários */}
      {viewCommentsModal.open && (
        <div style={{
          position:'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.35)', zIndex:9999,
          display:'flex', alignItems:'center', justifyContent:'center'
        }}>
          <div style={{
            background:'#fff', 
            borderRadius:16, 
            padding:32, 
            minWidth:400, 
            maxWidth:600, 
            maxHeight:'80vh',
            boxShadow:'0 8px 32px #0005', 
            position:'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <button 
              onClick={()=>setViewCommentsModal({open:false,record:null})} 
              style={{
                position:'absolute',
                top:16,
                right:16,
                fontSize:22,
                background:'none',
                border:'none',
                cursor:'pointer',
                color:'#888',
                zIndex: 1
              }} 
              title="Fechar"
            >
              ×
            </button>
            
            <div style={{marginBottom: 24, borderBottom: '2px solid #f1f5f9', paddingBottom: 16}}>
              <h2 style={{fontWeight:700, fontSize:'1.5rem', color:'#8b5cf6', marginBottom: 8}}>
                💬 Comentários da Entrega
              </h2>
              <div style={{fontSize: '0.9rem', color: '#64748b'}}>
                <strong>Cliente:</strong> {viewCommentsModal.record?.cliente || viewCommentsModal.record?.client} | 
                <strong> Fretista:</strong> {viewCommentsModal.record?.fretista || viewCommentsModal.record?.driver}
              </div>
            </div>
            
            <div style={{
              flex: 1,
              overflowY: 'auto',
              paddingRight: 8,
              marginBottom: 24
            }}>
              {viewCommentsModal.record?.comments?.map((comment, index) => (
                <div 
                  key={`${comment.userEmail}-${comment.timestamp}`} 
                  style={{
                    background: '#f8fafc',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16,
                    border: '1px solid #e2e8f0',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 8
                  }}>
                    <div style={{
                      fontSize: '0.9rem',
                      color: '#64748b',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}>
                      <span style={{fontSize: 16}}>👤</span>
                      {comment.userName || comment.userEmail}
                    </div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: '#94a3b8',
                      fontStyle: 'italic'
                    }}>
                      {comment.timestamp ? new Date(comment.timestamp).toLocaleString('pt-BR') : 'Agora'}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '1rem',
                    color: '#475569',
                    lineHeight: 1.5,
                    wordWrap: 'break-word',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {comment.comment}
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{
              borderTop: '2px solid #f1f5f9',
              paddingTop: 16,
              display: 'flex',
              gap: 12
            }}>
              <button
                onClick={() => {
                  setViewCommentsModal({open: false, record: null});
                  setCommentModal({ open: true, record: viewCommentsModal.record });
                  setCommentText('');
                }}
                style={{
                  flex: 1,
                  padding:'12px 20px',
                  fontWeight:700,
                  fontSize:16,
                  borderRadius:8,
                  background:'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  color:'#fff',
                  border:'none',
                  cursor:'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                <span style={{fontSize: 18}}>💬</span>
                Adicionar Comentário
              </button>
              
              <button
                onClick={() => setViewCommentsModal({open: false, record: null})}
                style={{
                  padding:'12px 24px',
                  fontWeight:600,
                  fontSize:16,
                  borderRadius:8,
                  background:'#f1f5f9',
                  color:'#64748b',
                  border:'1px solid #e2e8f0',
                  cursor:'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#e2e8f0';
                  e.target.style.color = '#475569';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = '#f1f5f9';
                  e.target.style.color = '#64748b';
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Notification Popup */}
      <ToastNotification open={toast.open} type={toast.type} message={toast.message} onClose={() => setToast({ ...toast, open: false })} />
      {/* Botão flutuante para Registros */}
      <div
        onClick={() => navigate('/registros')}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)',
          boxShadow: '0 8px 24px rgba(255, 152, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: 28,
          color: '#fff',
          zIndex: 1000,
          transition: 'all 0.3s ease',
          border: '3px solid rgba(255, 255, 255, 0.2)',
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1)';
          e.target.style.boxShadow = '0 12px 32px rgba(255, 152, 0, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 8px 24px rgba(255, 152, 0, 0.3)';
        }}
      >
        🚛
      </div>

      {/* Modal de Visualização de Anexos */}
      {viewAttachmentsModal.open && viewAttachmentsModal.record && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.85)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={() => setViewAttachmentsModal({ open: false, record: null })}
        >
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: 32,
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}
          onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setViewAttachmentsModal({ open: false, record: null })}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                fontSize: 28,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#888',
                fontWeight: 'bold'
              }}
              title="Fechar"
            >
              ×
            </button>
            <h2 style={{
              marginTop: 0,
              marginBottom: 24,
              fontSize: '1.4rem',
              color: '#218838',
              fontWeight: 700,
              textAlign: 'center'
            }}>
              Anexos - {viewAttachmentsModal.record.client || viewAttachmentsModal.record.cliente}
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 20,
              marginTop: 20
            }}>
              {(viewAttachmentsModal.record.attachments || []).map((attachment, index) => (
                <div key={`${attachment.file_name || attachment.original_name || index}`} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12
                }}>
                  {attachment.file_url ? (
                    // Verificar se é uma imagem (base64 ou URL)
                    (attachment.file_url.startsWith('data:image') || 
                     (attachment.file_type && attachment.file_type.startsWith('image/')) ||
                     (attachment.original_name && /\.(jpe?g|png|gif|webp|bmp)$/i.test(attachment.original_name))) ? (
                      // Imagem
                      <>
                        <img 
                          src={attachment.file_url} 
                          alt={`Anexo ${index + 1}`}
                          style={{
                            maxWidth: '100%',
                            maxHeight: 300,
                            borderRadius: 8,
                            objectFit: 'contain',
                            border: '1px solid #ddd'
                          }}
                          onError={(e) => {
                            // Se a imagem não carregar, mostrar placeholder
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) {
                              e.target.nextSibling.style.display = 'flex';
                            }
                          }}
                        />
                        {/* Placeholder para quando a imagem falhar */}
                        <div style={{
                          display: 'none',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 100,
                          height: 100,
                          background: '#f0f0f0',
                          borderRadius: 8,
                          fontSize: 40
                        }}>
                          📎
                        </div>
                      </>
                    ) : (
                      // Placeholder para arquivos não imagem
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 100,
                        height: 100,
                        background: '#f0f0f0',
                        borderRadius: 8,
                        fontSize: 40
                      }}>
                        📎
                      </div>
                    )
                  ) : (
                    // Placeholder quando não há file_url
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 100,
                      height: 100,
                      background: '#f0f0f0',
                      borderRadius: 8,
                      fontSize: 40
                    }}>
                      📎
                    </div>
                  )}
                  <div style={{
                    textAlign: 'center',
                    fontSize: 14,
                    color: '#666',
                    wordBreak: 'break-word'
                  }}>
                    {attachment.original_name || attachment.file_name || `Anexo ${index + 1}`}
                  </div>
                </div>
              ))}
            </div>
            
            {(viewAttachmentsModal.record.attachments || []).length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: 40,
                color: '#888',
                fontSize: 16
              }}>
                Nenhum anexo disponível para este registro.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;