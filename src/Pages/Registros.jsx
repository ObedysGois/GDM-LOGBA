import React, { useState, useEffect, useRef, useContext } from 'react';
import { useAuth } from '../AuthContext.js';
import { useTheme } from '../contexts/ThemeContext.js';
import { ToastContext } from '../App.js';
import { addDeliveryRecord, updateDeliveryRecord, getClientData, clientData, fretistas, uploadDeliveryAttachments, getDeliveryRecordsByUser, problemTypes } from '../firebaseUtils.js';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig.js';
import { FileText, Clock, CheckCircle, XCircle, AlertTriangle, Camera, Send, RefreshCw } from 'lucide-react';
import '../App.css';
import PageHeader from '../Components/PageHeader.jsx';

// Função utilitária para buscar um registro pelo ID
async function getDeliveryRecordById(id) {
  const docRef = doc(db, 'deliveries', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
}

function Registros() {
  const { currentUser: user } = useAuth();
  const { isDarkMode } = useTheme();
  const { showToast } = useContext(ToastContext);
  const [selectedClient, setSelectedClient] = useState('');
  const [otherClient, setOtherClient] = useState('');
  const [selectedFretista, setSelectedFretista] = useState('');
  const [otherFretista, setOtherFretista] = useState('');
  const [vendedor, setVendedor] = useState('');
  const [rede, setRede] = useState('');
  const [uf, setUf] = useState('');
  const [checkinTime, setCheckinTime] = useState(null);
  const [checkoutTime, setCheckoutTime] = useState(null);
  const [duration, setDuration] = useState('');
  const [info, setInfo] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState('Pendente');
  const [problemType, setProblemType] = useState('');
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [currentDeliveryId, setCurrentDeliveryId] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [showAttachmentInput, setShowAttachmentInput] = useState(false);
  const [loading, setLoading] = useState(false);
  // Adicionar estado para modal de confirmação
  const [showDevolucaoModal, setShowDevolucaoModal] = useState(false);
  const [onConfirmDevolucao, setOnConfirmDevolucao] = useState(null);
  // Adicionar referência para input de arquivo
  const fileInputRef = useRef();
  // Adicionar estados para chatbox
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const WHATSAPP_NUMBER = "5599999999999"; // Substitua pelo número desejado

  // Substituir sendToAI por integração real com OpenAI
  const sendToAI = async (msg) => {
    if (!openaiKey) return "Por favor, informe sua chave da OpenAI para usar a IA.";
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "Você é um assistente simpático e prestativo da Logística BA. Use linguagem simples, curta e amigável. Sempre que possível, use emojis relacionados a logística, caminhão, entrega, etc." },
            ...chatMessages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
            { role: "user", content: msg }
          ],
          max_tokens: 120
        })
      });
      const data = await response.json();
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      }
      return "Desculpe, não consegui responder agora. Tente novamente mais tarde.";
    } catch (e) {
      return "Erro ao conectar com a IA. Tente novamente mais tarde.";
    }
  };

  // Permitir upload de imagem no chat
  const [chatImage, setChatImage] = useState(null);

  // Lista atualizada de clientes
  const clients = Object.keys(clientData);

  // Adicionar de volta as variáveis necessárias:
  const [openaiKey, setOpenaiKey] = useState("");
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [tempInfo, setTempInfo] = useState('');
  const [showProblemOptions, setShowProblemOptions] = useState(false);

  // Carregar chave do localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('openai_key');
    if (savedKey) setOpenaiKey(savedKey);
  }, []);

  // Salvar chave no localStorage
  const handleSaveKey = () => {
    localStorage.setItem('openai_key', openaiKey);
  };

  // Atualizar campos quando cliente for selecionado
  useEffect(() => {
    if (selectedClient && selectedClient !== 'OUTRO - DIGITAR MANUALMENTE') {
      const clientInfo = getClientData(selectedClient);
      setVendedor(clientInfo.vendedor);
      setRede(clientInfo.rede);
      setUf(clientInfo.uf);
    } else {
      setVendedor('');
      setRede('');
      setUf('');
    }
  }, [selectedClient]);

  // Carregar estado do registro atual ao montar o componente
  useEffect(() => {
    const loadActiveDelivery = async () => {
      if (!user) return;
      
      // Verificar se o usuário é do tipo fretista
      if (user.type !== 'fretista') {
        // Se não for fretista, não carrega entregas ativas
        return;
      }
      
      try {
        // Primeiro, verificar no Firestore se há entrega ativa
        const userRecords = await getDeliveryRecordsByUser(user.email);
        const activeDelivery = userRecords.find(record => 
          record.status === 'Entrega em andamento' && 
          record.userEmail === user.email
        );
        
        if (activeDelivery) {
          // Entrega ativa encontrada no Firestore
          setCurrentDeliveryId(activeDelivery.id);
          setSelectedClient(activeDelivery.cliente || activeDelivery.client || '');
          setSelectedFretista(activeDelivery.fretista || activeDelivery.driver || '');
          setVendedor(activeDelivery.vendedor || '');
          setRede(activeDelivery.rede || '');
          setUf(activeDelivery.uf || '');
          setCheckinTime(new Date(activeDelivery.checkin_time));
          setDeliveryStatus(activeDelivery.status);
          setProblemType(activeDelivery.tipoProblema || activeDelivery.problem_type || '');
          setInfo(activeDelivery.informacoesAdicionais || activeDelivery.information || '');
          setHasCheckedIn(true);
          
          // Atualizar localStorage com dados do Firestore
          localStorage.setItem('currentDelivery', JSON.stringify({
            id: activeDelivery.id,
            client: activeDelivery.cliente || activeDelivery.client,
            fretista: activeDelivery.fretista || activeDelivery.driver,
            checkinTime: activeDelivery.checkin_time,
            status: activeDelivery.status,
            vendedor: activeDelivery.vendedor,
            rede: activeDelivery.rede,
            uf: activeDelivery.uf,
            problemType: activeDelivery.tipoProblema || activeDelivery.problem_type,
            information: activeDelivery.informacoesAdicionais || activeDelivery.information
          }));
          
          console.log('Entrega ativa carregada do Firestore:', activeDelivery);
        } else {
          // Verificar localStorage como fallback
          const savedDelivery = localStorage.getItem('currentDelivery');
          if (savedDelivery) {
            try {
              const delivery = JSON.parse(savedDelivery);
              // Verificar se a entrega no localStorage ainda existe no Firestore
              const savedRecord = userRecords.find(record => record.id === delivery.id);
              if (savedRecord && savedRecord.status === 'Entrega em andamento') {
                setCurrentDeliveryId(delivery.id);
                setSelectedClient(delivery.client);
                setSelectedFretista(delivery.fretista);
                setVendedor(delivery.vendedor);
                setRede(delivery.rede);
                setUf(delivery.uf);
                setCheckinTime(new Date(delivery.checkinTime));
                setDeliveryStatus(delivery.status);
                setProblemType(delivery.problemType || '');
                setInfo(delivery.information || '');
                setHasCheckedIn(true);
              } else {
                // Entrega não existe mais ou foi finalizada, limpar localStorage
                localStorage.removeItem('currentDelivery');
                console.log('Entrega no localStorage foi finalizada ou não existe mais');
              }
            } catch (error) {
              console.error('Erro ao carregar registro salvo:', error);
              localStorage.removeItem('currentDelivery');
            }
          }
        }
      } catch (error) {
        console.error('Erro ao carregar entrega ativa:', error);
        // Em caso de erro, tentar carregar do localStorage
    const savedDelivery = localStorage.getItem('currentDelivery');
    if (savedDelivery) {
      try {
        const delivery = JSON.parse(savedDelivery);
        setCurrentDeliveryId(delivery.id);
        setSelectedClient(delivery.client);
        setSelectedFretista(delivery.fretista);
        setVendedor(delivery.vendedor);
        setRede(delivery.rede);
        setUf(delivery.uf);
        setCheckinTime(new Date(delivery.checkinTime));
        setDeliveryStatus(delivery.status);
        setHasCheckedIn(true);
          } catch (localError) {
            console.error('Erro ao carregar do localStorage:', localError);
        localStorage.removeItem('currentDelivery');
      }
    }
      }
    };
    
    loadActiveDelivery();
  }, [user]);

  const handleCheckin = async () => {
    if (!user) {
      showToast('Você precisa estar logado para fazer registros.', 'error');
      return;
    }
    
    // Verificar se o usuário é do tipo fretista
    if (user.type !== 'fretista') {
      showToast('Apenas fretistas podem fazer check-in de entregas.', 'warning');
      return;
    }

    const finalClient = selectedClient === 'OUTRO - DIGITAR MANUALMENTE' ? otherClient : selectedClient;
    const finalFretista = selectedFretista === 'OUTRO - DIGITAR MANUALMENTE' ? otherFretista : selectedFretista;

    if (!finalClient || !finalFretista) {
      showToast('Por favor, selecione o cliente e o fretista antes de fazer o Check-in.', 'warning');
      return;
    }

    if (hasCheckedIn) {
      showToast('Você já tem um Check-in em aberto. Finalize-o antes de iniciar um novo.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      const recordData = {
        userEmail: user.email,
        client: finalClient,
        driver: finalFretista,
        checkin_time: now.toISOString(),
        status: 'Entrega em andamento',
        information: '', // Será preenchido no modal
        attachments: [],
        being_monitored: false,
        vendedor: vendedor,
        rede: rede,
        uf: uf
      };

      const deliveryId = await addDeliveryRecord(recordData);
      setCurrentDeliveryId(deliveryId);
      setCheckinTime(now);
      setDeliveryStatus('Entrega em andamento');
      setHasCheckedIn(true);
      
      // Salvar no localStorage para persistência
      localStorage.setItem('currentDelivery', JSON.stringify({
        id: deliveryId,
        client: finalClient,
        fretista: finalFretista,
        checkinTime: now.toISOString(),
        status: 'Entrega em andamento',
        vendedor: vendedor,
        rede: rede,
        uf: uf
      }));
      
      showToast(`Check-in realizado para ${finalClient} às ${now.toLocaleTimeString()}`, 'success');
      setShowInfoModal(true); // Abrir modal de informações adicionais
      setTempInfo(''); // Limpar campo de informações adicionais
    } catch (error) {
      console.error('Erro ao fazer check-in:', error);
      showToast('Erro ao fazer check-in. Tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!checkinTime || !currentDeliveryId) {
      showToast('Faça o Check-in primeiro.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      const diffMs = now.getTime() - checkinTime.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const durationText = `${diffMinutes} min`;

      // Upload dos anexos, se houver
      let uploadedAttachments = [];
      if (attachments.length > 0) {
        const files = attachments.map(a => a.file);
        const finalClient = selectedClient === 'OUTRO - DIGITAR MANUALMENTE' ? otherClient : selectedClient;
        const finalFretista = selectedFretista === 'OUTRO - DIGITAR MANUALMENTE' ? otherFretista : selectedFretista;
        uploadedAttachments = await uploadDeliveryAttachments(files, currentDeliveryId, user.email, finalFretista, finalClient);
      }

      const updateData = {
        checkout_time: now.toISOString(),
        duration: durationText,
        status: 'Entrega finalizada',
        attachments: uploadedAttachments,
        client: selectedClient === 'OUTRO - DIGITAR MANUALMENTE' ? otherClient : selectedClient,
        driver: selectedFretista === 'OUTRO - DIGITAR MANUALMENTE' ? otherFretista : selectedFretista
      };

      await updateDeliveryRecord(currentDeliveryId, updateData);
      
      setCheckoutTime(now);
      setDuration(durationText);
      setDeliveryStatus('Entrega finalizada');
      setHasCheckedIn(false);
      setAttachments([]);
      
      // Limpar localStorage quando finalizar
      localStorage.removeItem('currentDelivery');
      
      // Buscar registro atualizado e enviar resumo via WhatsApp
      const updatedRecord = await getDeliveryRecordById(currentDeliveryId);
      sendWhatsAppSummary('Entrega finalizada', updatedRecord?.attachments || []);
      
      showToast(`Check-out realizado às ${now.toLocaleTimeString()}. Duração: ${durationText}`, 'success');
      resetForm();
    } catch (error) {
      console.error('Erro ao fazer check-out:', error);
      showToast('Erro ao fazer check-out. Tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDevolucaoTotal = async () => {
    if (!checkinTime || !currentDeliveryId) {
      showToast('Faça o Check-in primeiro.', 'warning');
      return;
    }
    // Exibir modal de confirmação customizado
    setShowDevolucaoModal(true);
    setOnConfirmDevolucao(() => async () => {
      setShowDevolucaoModal(false);
    setLoading(true);
    try {
      const now = new Date();
      const diffMs = now.getTime() - checkinTime.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const durationText = `${diffMinutes} min`;
      let uploadedAttachments = [];
      if (attachments.length > 0) {
        const files = attachments.map(a => a.file);
        const finalClient = selectedClient === 'OUTRO - DIGITAR MANUALMENTE' ? otherClient : selectedClient;
        const finalFretista = selectedFretista === 'OUTRO - DIGITAR MANUALMENTE' ? otherFretista : selectedFretista;
        uploadedAttachments = await uploadDeliveryAttachments(files, currentDeliveryId, user.email, finalFretista, finalClient);
      }
      const updateData = {
        checkout_time: now.toISOString(),
        duration: durationText,
        status: 'Entrega devolvida',
        attachments: uploadedAttachments,
        client: selectedClient === 'OUTRO - DIGITAR MANUALMENTE' ? otherClient : selectedClient,
        driver: selectedFretista === 'OUTRO - DIGITAR MANUALMENTE' ? otherFretista : selectedFretista
      };
      await updateDeliveryRecord(currentDeliveryId, updateData);
      setCheckoutTime(now);
      setDuration(durationText);
      setDeliveryStatus('Entrega devolvida');
      setHasCheckedIn(false);
      setAttachments([]);
      localStorage.removeItem('currentDelivery');
      // Buscar registro atualizado e enviar resumo via WhatsApp
      const updatedRecord = await getDeliveryRecordById(currentDeliveryId);
      sendWhatsAppSummary('Entrega devolvida', updatedRecord?.attachments || []);
        showToast(`Devolução total registrada às ${now.toLocaleTimeString()}. Duração: ${durationText}`, 'warning');
        resetForm();
    } catch (error) {
      console.error('Erro ao registrar devolução:', error);
        showToast('Erro ao registrar devolução. Tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
    });
  };

  const handleSaveInfoAndSendWhatsApp = async () => {
    if (!currentDeliveryId) return;
    
    setLoading(true);
    try {
      // Atualizar o registro com as informações adicionais
      await updateDeliveryRecord(currentDeliveryId, {
        information: tempInfo
      });
      
      // Atualizar o estado local
      setInfo(tempInfo);
      
      // Fechar o modal
      setShowInfoModal(false);
      
      // Enviar resumo via WhatsApp
      sendWhatsAppSummary('Entrega em andamento');
      
      showToast('Informações salvas e resumo enviado via WhatsApp!', 'success');
    } catch (error) {
      console.error('Erro ao salvar informações:', error);
      showToast('Erro ao salvar informações. Tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendSummary = () => {
    if (!checkinTime) {
      showToast('Nenhum registro para enviar resumo.', 'warning');
      return;
    }
    if (deliveryStatus === 'Entrega em andamento') {
      showToast('Finalize a entrega (Check-out ou Devolução Total) antes de enviar o resumo.', 'warning');
      return;
    }
    sendWhatsAppSummary();
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const newAttachments = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      file: file
    }));
    setAttachments([...attachments, ...newAttachments]);
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // Atualizar sendWhatsAppSummary para aceitar lista de anexos como parâmetro
  const sendWhatsAppSummary = (status = null, anexos = null) => {
    const finalClient = selectedClient === 'OUTRO - DIGITAR MANUALMENTE' ? otherClient : selectedClient;
    const finalFretista = selectedFretista === 'OUTRO - DIGITAR MANUALMENTE' ? otherFretista : selectedFretista;
    const finalStatus = status || deliveryStatus;
    
    // Determinar o tipo de mensagem baseado no status
    let header = '';
    let statusEmoji = '';
    let statusText = '';
    
    if (finalStatus === 'Entrega em andamento') {
      header = '🟡 ENTREGA INICIADA 🟡';
      statusEmoji = '🟡';
      statusText = 'Entrega em andamento 👍';
    } else if (finalStatus === 'Entrega finalizada') {
      header = '🟢 ENTREGA FINALIZADA 🟢';
      statusEmoji = '🟢';
      statusText = 'Entrega finalizada 🎉';
    } else if (finalStatus === 'Entrega devolvida') {
      header = '🔴 ENTREGA DEVOLVIDA 🔴';
      statusEmoji = '🔴';
      statusText = 'Entrega devolvida 😔';
    }
    
    // Para checkout e devolução total, usar o horário atual se checkoutTime não estiver disponível
    let checkoutTimeToUse = checkoutTime;
    if ((finalStatus === 'Entrega finalizada' || finalStatus === 'Entrega devolvida') && !checkoutTime) {
      checkoutTimeToUse = new Date();
    }
    
    // Calcular duração em minutos
    let durationMinutes = 0;
    if (checkinTime && checkoutTimeToUse) {
      const diffMs = checkoutTimeToUse.getTime() - checkinTime.getTime();
      durationMinutes = Math.floor(diffMs / (1000 * 60));
    }
    
    // Data do registro
    const dataRegistro = checkinTime ? checkinTime.toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
    
    // Construir a mensagem
    let message = `${header}
`;
    message += `📆${dataRegistro}📆

`;
    message += `👤 Usuário: "${user?.email || 'N/A'}"
`;
    message += `🚛 Fretista: "${finalFretista}"
`;
    message += `🛒 Cliente: "${finalClient}"
`;
    message += `🏪 Rede: "${rede || 'N/A'}"
`;
    message += `📍 UF: "${uf || 'N/A'}"
`;
    message += `🧰 Vendedor: "${vendedor || 'N/A'}"
`;
    message += `⏱️ Check-in: "${checkinTime ? checkinTime.toLocaleTimeString() : 'N/A'}"
`;
    
    // Adicionar check-out ou devolução total baseado no status
    if (finalStatus === 'Entrega finalizada') {
      message += `⏱️ Check-out: "${checkoutTimeToUse ? checkoutTimeToUse.toLocaleTimeString() : 'N/A'}"
`;
      message += `⏳ Duração: "${durationMinutes} minutos"
`;
    } else if (finalStatus === 'Entrega devolvida') {
      message += `⏱️ Devolução total: "${checkoutTimeToUse ? checkoutTimeToUse.toLocaleTimeString() : 'N/A'}"
`;
      message += `⏳ Duração: "${durationMinutes} minutos"
`;
    }
    
    message += `${statusEmoji} Status: "${statusText}"
`;
    message += `📝 Informações: "${tempInfo || info || 'N/A'}"
`;
    
    // Adicionar problema se houver
    if (problemType) {
      message += `
🚨 Entrega com Problema: "${problemType}"
`;
    }
    
    // Adicionar anexos se houver
    const anexosParaUsar = anexos !== null ? anexos : attachments;
    if (anexosParaUsar.length > 0) {
      message += `
📎 Anexos: ${anexosParaUsar.length} arquivo(s)
`;
      anexosParaUsar.forEach((attachment, index) => {
        if (attachment.file_url) {
          message += `   📎 ${attachment.original_name || attachment.file_name}: ${attachment.file_url}
`;
        }
      });
    }
    
    message += `
🍇🥦🍉🥝🍎🍍🫑🍅🍋🧄🫚🍏`;
    
    if (anexosParaUsar.length > 0) {
      message += `
📎 Anexos: ${anexosParaUsar.length} arquivo(s)
`;
      anexosParaUsar.forEach((attachment, index) => {
        if (attachment.file_url) {
          message += `   📎 ${attachment.original_name || attachment.file_name}: ${attachment.file_url}
`;
        }
      });
    }
    
    message += `

🍇🥦🍉🥝🍎🍍🫑🍅🍋🧄🫚🍏

`;
    
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
    }    try {
      // Tentar abrir WhatsApp
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      console.error('Erro ao abrir WhatsApp:', error);
      // Fallback: copiar para clipboard
      navigator.clipboard.writeText(message).then(() => {
        alert('Mensagem copiada para a área de transferência! Cole no WhatsApp.');
      }).catch(() => {
        alert(`Mensagem gerada:

${message}`);
      });
    }
  };

  const resetForm = () => {
    setSelectedClient('');
    setOtherClient('');
    setSelectedFretista('');
    setOtherFretista('');
    setVendedor('');
    setRede('');
    setUf('');
    setCheckinTime(null);
    setCheckoutTime(null);
    setDuration('');
    setInfo('');
    setDeliveryStatus('Pendente');
    setProblemType('');
    setHasCheckedIn(false);
    setCurrentDeliveryId(null);
    setAttachments([]);
    setShowAttachmentInput(false);
    setShowProblemOptions(false);
    setShowInfoModal(false);
    setTempInfo('');
    
    // Limpar localStorage
    localStorage.removeItem('currentDelivery');
  };

  // Histórico persistente
  useEffect(() => {
    const saved = localStorage.getItem('chatbox_logba');
    if (saved) setChatMessages(JSON.parse(saved));
  }, []);
  useEffect(() => {
    localStorage.setItem('chatbox_logba', JSON.stringify(chatMessages));
  }, [chatMessages]);

  // Botão para limpar histórico
  // Remover o botão de chat flutuante

  // [1] Adicionar estados para modal de problema
  const [problemModal, setProblemModal] = useState({ open: false });
  const [selectedProblem, setSelectedProblem] = useState('');
  const [problemInfo, setProblemInfo] = useState('');

  // [NOVO] Componente de texto colapsável com modal (igual Home)
  function CollapsibleText({ text, maxLength = 20 }) {
    const [modalOpen, setModalOpen] = useState(false);
    if (!text || text.length <= maxLength) return <span className="text-sm">{text}</span>;
    return (
      <>
        <span className="text-sm">
          {text.slice(0, maxLength)}... <span style={{color: isDarkMode ? '#3b82f6' : '#2563eb',cursor:'pointer',fontWeight:500}} onClick={()=>setModalOpen(true)}>ver mais</span>
        </span>
        {modalOpen && (
          <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.4)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{background: isDarkMode ? '#1e293b' : '#fff',borderRadius:12,padding:24,minWidth:300,maxWidth:380,boxShadow:'0 4px 24px rgba(0,0,0,0.15)',position:'relative',wordBreak:'break-word'}}>
              <button onClick={()=>setModalOpen(false)} style={{position:'absolute',top:12,right:12,fontSize:18,background:'none',border:'none',cursor:'pointer',color: isDarkMode ? '#cbd5e1' : '#64748b'}} title="Fechar">×</button>
              <h2 style={{fontWeight:600, fontSize:'0.95rem', color: isDarkMode ? '#3b82f6' : '#2563eb', marginBottom:16}}>Observação Completa</h2>
              <div style={{fontSize:14, color: isDarkMode ? '#f8fafc' : '#1e293b', wordBreak:'break-word', whiteSpace:'pre-wrap'}}>{text}</div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="registros-container" style={{maxWidth: '1200px', margin: '0 auto', padding: '24px 0'}}>
      {/* Cabeçalho moderno padrão localização */}
      <PageHeader
        title="Registros de Entrega"
        subtitle="Gerencie check-ins, check-outs e devoluções de entrega"
        icon={FileText}
      />

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20}}>
        {/* Formulário de Seleção */}
        <div className="card" style={{padding: 20}}>
          <h3 style={{fontSize: '1.1rem', color: isDarkMode ? '#3b82f6' : '#2563eb', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600}}>
            <FileText style={{width: 18, height: 18}} />
            Seleção de Cliente e Fretista
          </h3>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
            <div>
              <label style={{display: 'block', fontWeight: 500, color: isDarkMode ? '#cbd5e1' : '#64748b', marginBottom: 6, fontSize: '0.875rem'}}>Cliente:</label>
              <select
                value={selectedClient}
                onChange={(e) => {
                  setSelectedClient(e.target.value);
                  if (e.target.value !== 'OUTRO - DIGITAR MANUALMENTE') {
                    setOtherClient('');
                  }
                }}
                disabled={hasCheckedIn}
                className={`w-full p-2.5 rounded-lg border text-sm ${isDarkMode 
                  ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-400' 
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                } ${hasCheckedIn ? (isDarkMode ? 'bg-gray-700' : 'bg-gray-50') : ''} focus:outline-none focus:ring-1 focus:ring-blue-500/30`}
              >
                <option value="">Selecione um cliente</option>
                {clients.map((client) => (
                  <option key={client} value={client}>{client}</option>
                ))}
                <option value="OUTRO - DIGITAR MANUALMENTE">OUTRO - DIGITAR MANUALMENTE</option>
              </select>
              {selectedClient === 'OUTRO - DIGITAR MANUALMENTE' && (
                <input
                  type="text"
                  placeholder="Digite o nome do cliente"
                  value={otherClient}
                  onChange={(e) => setOtherClient(e.target.value)}
                  disabled={hasCheckedIn}
                  className={`w-full p-2.5 rounded-lg border text-sm mt-2 ${isDarkMode 
                    ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-400 placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 placeholder-gray-500'
                  } ${hasCheckedIn ? (isDarkMode ? 'bg-gray-700' : 'bg-gray-50') : ''} focus:outline-none focus:ring-1 focus:ring-blue-500/30`}
                />
              )}
            </div>

            <div>
              <label style={{display: 'block', fontWeight: 500, color: isDarkMode ? '#cbd5e1' : '#64748b', marginBottom: 6, fontSize: '0.875rem'}}>Fretista:</label>
              <select
                value={selectedFretista}
                onChange={(e) => {
                  setSelectedFretista(e.target.value);
                  if (e.target.value !== 'OUTRO - DIGITAR MANUALMENTE') {
                    setOtherFretista('');
                  }
                }}
                disabled={hasCheckedIn}
                className={`w-full p-2.5 rounded-lg border text-sm ${isDarkMode 
                  ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-400' 
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                } ${hasCheckedIn ? (isDarkMode ? 'bg-gray-700' : 'bg-gray-50') : ''} focus:outline-none focus:ring-1 focus:ring-blue-500/30`}
              >
                <option value="">Selecione um fretista</option>
                {fretistas.map((fretista) => (
                  <option key={fretista} value={fretista}>{fretista}</option>
                ))}
                <option value="OUTRO - DIGITAR MANUALMENTE">OUTRO - DIGITAR MANUALMENTE</option>
              </select>
              {selectedFretista === 'OUTRO - DIGITAR MANUALMENTE' && (
                <input
                  type="text"
                  placeholder="Digite o nome do fretista"
                  value={otherFretista}
                  onChange={(e) => setOtherFretista(e.target.value)}
                  disabled={hasCheckedIn}
                  className={`w-full p-2.5 rounded-lg border text-sm mt-2 ${isDarkMode 
                    ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-400 placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 placeholder-gray-500'
                  } ${hasCheckedIn ? (isDarkMode ? 'bg-gray-700' : 'bg-gray-50') : ''} focus:outline-none focus:ring-1 focus:ring-blue-500/30`}
                />
              )}
            </div>

            {/* Campos automáticos */}
            {selectedClient && selectedClient !== 'OUTRO - DIGITAR MANUALMENTE' && (
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10}}>
                <div>
                  <label style={{display: 'block', fontWeight: 500, color: isDarkMode ? '#cbd5e1' : '#64748b', marginBottom: 6, fontSize: '0.875rem'}}>Vendedor:</label>
                  <input
                    type="text"
                    value={vendedor}
                    onChange={(e) => setVendedor(e.target.value)}
                    disabled={hasCheckedIn}
                    className={`w-full p-2.5 rounded-lg border text-sm ${isDarkMode 
                      ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-400' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                    } ${hasCheckedIn ? (isDarkMode ? 'bg-gray-700' : 'bg-gray-50') : ''} focus:outline-none focus:ring-1 focus:ring-blue-500/30`}
                  />
                </div>
                <div>
                  <label style={{display: 'block', fontWeight: 500, color: isDarkMode ? '#cbd5e1' : '#64748b', marginBottom: 6, fontSize: '0.875rem'}}>Rede:</label>
                  <input
                    type="text"
                    value={rede}
                    disabled={true}
                    className={`w-full p-2.5 rounded-lg border text-sm ${isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-300' 
                      : 'bg-gray-50 border-gray-300 text-gray-700'
                    }`}
                  />
                </div>
                <div>
                  <label style={{display: 'block', fontWeight: 500, color: isDarkMode ? '#cbd5e1' : '#64748b', marginBottom: 6, fontSize: '0.875rem'}}>UF:</label>
                  <input
                    type="text"
                    value={uf}
                    disabled={true}
                    className={`w-full p-3 rounded-lg border text-sm ${isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-300' 
                      : 'bg-gray-50 border-gray-300 text-gray-700'
                    }`}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Atual */}
        <div className="card" style={{padding: 20}}>
          <h3 className="text-base font-medium text-primary-600 dark:text-primary-400 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Status Atual da Entrega
          </h3>
          
          <div className="flex flex-col gap-3">
            <div className="bg-card-light dark:bg-card-dark p-3 rounded-lg border border-border-light dark:border-border-dark">
              <p className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">👤 Cliente: <span className="text-primary-600 dark:text-primary-400">{selectedClient === 'OUTRO - DIGITAR MANUALMENTE' ? otherClient : selectedClient || 'N/A'}</span></p>
              <p className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">🚛 Fretista: <span className="text-primary-600 dark:text-primary-400">{selectedFretista === 'OUTRO - DIGITAR MANUALMENTE' ? otherFretista : selectedFretista || 'N/A'}</span></p>
              {vendedor && <p className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">👨‍💼 Vendedor: <span className="text-primary-600 dark:text-primary-400">{vendedor}</span></p>}
              {rede && <p className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">🏪 Rede: <span className="text-primary-600 dark:text-primary-400">{rede}</span></p>}
              {uf && <p className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">📍 UF: <span className="text-primary-600 dark:text-primary-400">{uf}</span></p>}
            </div>
            
            <div className="bg-card-light dark:bg-card-dark p-3 rounded-lg border border-border-light dark:border-border-dark">
              <p className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">🟨 Check-in: <span className="text-warning-600 dark:text-warning-400">{checkinTime ? checkinTime.toLocaleTimeString() : 'N/A'}</span></p>
              <p className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">✅ Check-out: <span className="text-success-600 dark:text-success-400">{checkoutTime ? checkoutTime.toLocaleTimeString() : 'N/A'}</span></p>
              <p className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">⏳ Duração: <span className="text-accent-600 dark:text-accent-400">{duration || 'N/A'}</span></p>
              <p className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">📊 Status: <span className="text-primary-600 dark:text-primary-400">{deliveryStatus}</span></p>
              {problemType && <p className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">⚠️ Problema: <span className="text-danger-600 dark:text-danger-400">{problemType}</span></p>}
              <p className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">📝 Informações: <span className="text-text-tertiary-light dark:text-text-tertiary-dark"><CollapsibleText text={info || 'N/A'} /></span></p>
              {attachments.length > 0 && <p className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark">📎 Anexos: <span className="text-accent-600 dark:text-accent-400">{attachments.length} arquivo(s)</span></p>}
            </div>
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="card" style={{padding: 20}}>
        <h3 className="text-base font-medium text-primary-600 dark:text-primary-400 mb-4 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Ações de Entrega
        </h3>
        
        <div className="flex flex-wrap gap-3 justify-center">
          {!hasCheckedIn && (
            <button 
              className="btn btn-green"
              onClick={handleCheckin}
              disabled={loading}
              style={{fontSize: 12, padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: 6}}
            >
              <Clock style={{width: 14, height: 14}} />
              {loading ? 'Processando...' : 'Check-in'}
            </button>
          )}

          {hasCheckedIn && (
            <>
              <button 
                className="btn btn-green"
                onClick={handleCheckout}
                disabled={loading}
                style={{fontSize: 12, padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: 6}}
              >
                <CheckCircle style={{width: 14, height: 14}} />
                {loading ? 'Processando...' : 'Check-out'}
              </button>
              <button 
                className="btn btn-red"
                onClick={handleDevolucaoTotal}
                disabled={loading}
                style={{fontSize: 12, padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: 6}}
              >
                <XCircle style={{width: 14, height: 14}} />
                {loading ? 'Processando...' : 'DEVOLUÇÃO TOTAL'}
              </button>
              <button 
                className="btn btn-orange"
                onClick={() => {
                  setProblemModal({ open: true });
                  setSelectedProblem('');
                  setProblemInfo('');
                }}
                disabled={loading}
                style={{fontSize: 12, padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: 6}}
              >
                <AlertTriangle style={{width: 14, height: 14}} />
                ENTREGA COM PROBLEMA
              </button>
            </>
          )}
        </div>
      </div>

      {/* Opções de Problema */}
      {/* [4] Remover bloco antigo de seleção de problema (showProblemOptions) */}


      {/* Anexos e Comunicação */}
      {hasCheckedIn && (
        <div className="card" style={{padding: 20, marginTop: 16}}>
          <h3 className="text-base font-medium text-primary-600 dark:text-primary-400 mb-4 flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Ações e Comunicação
          </h3>
          
          <div className="flex flex-col gap-4">
            <button 
              className="btn btn-blue"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={{fontSize: 13, padding: '10px 20px', display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', border: '2px solid #1976d2', boxShadow: '0 2px 8px #1976d233'}}
            >
              <Camera style={{width: 16, height: 16}} />
              📷 FOTO DO CANHOTO DA ENTREGA 📷
            </button>
                <input
                  type="file"
                  multiple
              accept="image/*"
              ref={fileInputRef}
                  onChange={handleFileUpload}
              style={{display: 'none'}}
                />
            {/* Área de anexos visualmente moderna */}
            {attachments.length > 0 && (
              <div style={{display:'flex', flexWrap:'wrap', gap:12, marginTop:12, background: isDarkMode ? '#2a2a2a' : '#f8f9fa', borderRadius:8, padding:12, border: `1.5px solid ${isDarkMode ? '#4b5563' : '#e0e0e0'}`}}>
                  {attachments.map((attachment, index) => (
                  <div key={`${attachment.file.name}-${attachment.file.size}`} style={{position:'relative', width:70, height:70, borderRadius:6, overflow:'hidden', background: isDarkMode ? '#1f2937' : '#fff', boxShadow:'0 2px 8px #0001', display:'flex', alignItems:'center', justifyContent:'center'}}>
                    <img
                      src={URL.createObjectURL(attachment.file)}
                      alt={attachment.name}
                      style={{width:'100%', height:'100%', objectFit:'cover', borderRadius:6, border: `1px solid ${isDarkMode ? '#4b5563' : '#e0e0e0'}`}}
                    />
                    <button onClick={() => removeAttachment(index)} style={{position:'absolute',top:2,right:2,background:'#e53935',color:'#fff',border:'none',borderRadius:'50%',width:18,height:18,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,cursor:'pointer',boxShadow:'0 1px 4px #0002',fontSize:10}}>×</button>
                    </div>
                  ))}
              </div>
            )}
            <p className="text-xs text-text-tertiary-light dark:text-text-tertiary-dark mt-2 italic">Selecione ou fotografe imagens nítidas do canhoto da entrega. Máx: 10 imagens.</p>
          </div>
        </div>
      )}

      {/* Botões de Ação Final */}
      <div className="card" style={{padding: 20, marginTop: 16}}>
        <div className="flex flex-wrap gap-3 justify-center">
          {checkinTime && (deliveryStatus !== 'Entrega em andamento' || problemType) && (
            <button 
              className="btn btn-green"
              onClick={handleSendSummary}
              style={{fontSize: 13, padding: '10px 20px', display: 'inline-flex', alignItems: 'center', gap: 6}}
            >
              <Send style={{width: 16, height: 16}} />
              Enviar Resumo da Rota (WhatsApp)
            </button>
          )}
          {!hasCheckedIn && (
            <button 
              className="btn btn-outline"
              onClick={resetForm}
              style={{fontSize: 13, padding: '10px 20px', display: 'inline-flex', alignItems: 'center', gap: 6}}
            >
              <RefreshCw style={{width: 16, height: 16}} />
              Limpar Formulário
            </button>
          )}
        </div>
      </div>

      {/* Modal de Informações Adicionais */}
      {showInfoModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.4)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: isDarkMode ? '#1f2937' : '#ffffff',
            borderRadius: 8,
            padding: 24,
            minWidth: 380,
            maxWidth: 520,
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            position: 'relative',
            border: isDarkMode ? '1px solid #2a2a2a' : '1px solid #e5e7eb'
          }}>
            <button
              onClick={() => setShowInfoModal(false)}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                fontSize: 18,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: isDarkMode ? '#9ca3af' : '#6b7280'
              }}
              title="Fechar"
            >
              ×
            </button>
            
            <div style={{marginBottom: 20, textAlign: 'center'}}>
              <h2 style={{
                fontWeight: 600,
                fontSize: 18,
                color: isDarkMode ? '#f3f4f6' : '#1f2937',
                marginBottom: 6
              }}>
                Informações Adicionais
              </h2>
              <p style={{
                fontSize: 13,
                color: isDarkMode ? '#9ca3af' : '#6b7280',
                margin: 0
              }}>
                Adicione observações sobre a entrega e envie o resumo via WhatsApp
              </p>
            </div>
            
            <div style={{marginBottom: 20}}>
              <label style={{
                display: 'block',
                fontWeight: 500,
                color: isDarkMode ? '#d1d5db' : '#2a2a2a',
                marginBottom: 6,
                fontSize: 13
              }}>
                Observações:
              </label>
              <textarea
                value={tempInfo}
                onChange={(e) => setTempInfo(e.target.value)}
                rows="5"
                placeholder="Digite informações adicionais sobre a entrega (opcional)..."
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}`,
                  borderRadius: 6,
                  fontSize: 13,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  background: isDarkMode ? '#2a2a2a' : '#ffffff',
                  color: isDarkMode ? '#f3f4f6' : '#1f2937'
                }}
              />
            </div>
            
            <div style={{
              display: 'flex',
              gap: 10,
              justifyContent: 'center'
            }}>
              <button
                onClick={() => setShowInfoModal(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 6,
                  border: `1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}`,
                  background: isDarkMode ? '#2a2a2a' : '#f9fafb',
                  color: isDarkMode ? '#9ca3af' : '#6b7280',
                  fontWeight: 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = isDarkMode ? '#4b5563' : '#e5e7eb';
                  e.target.style.color = isDarkMode ? '#d1d5db' : '#2a2a2a';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = isDarkMode ? '#2a2a2a' : '#f9fafb';
                  e.target.style.color = isDarkMode ? '#9ca3af' : '#6b7280';
                }}
              >
                Pular
              </button>
              
              <button
                onClick={handleSaveInfoAndSendWhatsApp}
                disabled={loading}
                style={{
                  padding: '10px 24px',
                  borderRadius: 6,
                  border: 'none',
                  background: isDarkMode ? '#1f2937' : '#2a2a2a',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                {loading ? (
                  <>
                    <span style={{fontSize: 18}}>⏳</span>
                    Salvando...
                  </>
                ) : (
                  <>
                    <span style={{fontSize: 18}}>💬</span>
                    Salvar e Enviar WhatsApp
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de devolução total */}
      {showDevolucaoModal && (
        <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.35)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{
            background: isDarkMode ? '#2a2a2a' : '#fff',
            borderRadius:16,
            padding:32,
            minWidth:320,
            maxWidth:400,
            boxShadow:'0 8px 32px #0005',
            position:'relative',
            textAlign:'center'
          }}>
            <h2 style={{
              fontWeight:700,
              fontSize:'1.2rem',
              color: isDarkMode ? '#ef4444' : '#e53935',
              marginBottom:18
            }}>Confirmar Devolução Total</h2>
            <p style={{
              fontSize:16,
              color: isDarkMode ? '#f3f4f6' : '#333',
              marginBottom:24
            }}>Tem certeza que deseja registrar <b>Devolução Total</b>?</p>
            <div style={{display:'flex',justifyContent:'center',gap:16}}>
              <button onClick={()=>{setShowDevolucaoModal(false);setOnConfirmDevolucao(null);}} style={{
                padding:'8px 20px',
                borderRadius:8,
                border:'none',
                background: isDarkMode ? '#4b5563' : '#e0e0e0',
                color: isDarkMode ? '#d1d5db' : '#333',
                fontWeight:600,
                fontSize:14,
                cursor:'pointer'
              }}>Cancelar</button>
              <button onClick={onConfirmDevolucao} style={{padding:'8px 20px',borderRadius:8,border:'none',background:'linear-gradient(90deg,#e53935 0%,#ff9800 100%)',color:'#fff',fontWeight:600,fontSize:14,cursor:'pointer'}}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Botão flutuante de chatbox */}
      {/* Remover o botão de chat flutuante */}

      {/* Modal de Problema */}
      {problemModal.open && (
        <div style={{
          position:'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.35)', zIndex:9999,
          display:'flex', alignItems:'center', justifyContent:'center'
        }}>
          <div style={{
            background: isDarkMode ? '#2a2a2a' : '#fff', 
            borderRadius:16, 
            padding:32, 
            minWidth:320, 
            maxWidth:400, 
            boxShadow:'0 8px 32px #0005', 
            position:'relative'
          }}>
            <button onClick={()=>setProblemModal({open:false})} style={{
              position:'absolute',
              top:16,
              right:16,
              fontSize:22,
              background:'none',
              border:'none',
              cursor:'pointer',
              color: isDarkMode ? '#d1d5db' : '#888'
            }} title="Fechar">×</button>
            <h2 style={{
              fontWeight:700, 
              fontSize:'1.3rem', 
              color: isDarkMode ? '#ef4444' : '#e53935', 
              marginBottom:18
            }}>Registrar Problema</h2>
            <div style={{marginBottom:18}}>
              <label style={{
                fontWeight:600, 
                color: isDarkMode ? '#d1d5db' : '#333', 
                marginBottom:6, 
                display:'block'
              }}>Tipo de Problema:</label>
              <select 
                value={selectedProblem} 
                onChange={e=>setSelectedProblem(e.target.value)} 
                className={`w-full p-3 rounded-lg border text-base ${isDarkMode 
                  ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-400' 
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
              >
                <option value="">Selecione...</option>
                {problemTypes.map((p,i)=>(<option key={i} value={p}>{p}</option>))}
              </select>
            </div>
            <div style={{marginBottom:18}}>
              <label style={{
                fontWeight:600, 
                color: isDarkMode ? '#d1d5db' : '#333', 
                marginBottom:6, 
                display:'block'
              }}>Observação (opcional):</label>
              <textarea 
                value={problemInfo} 
                onChange={e=>setProblemInfo(e.target.value)} 
                className={`w-full p-3 rounded-lg border text-base min-h-[60px] ${isDarkMode 
                  ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-400 placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                placeholder="Descreva o problema..."
              ></textarea>
            </div>
            <button
              className="btn btn-red"
              style={{width:'100%',padding:'12px',fontWeight:700,fontSize:16,borderRadius:8,background:'linear-gradient(135deg, #e53935 0%, #ff9800 100%)',color:'#fff',border:'none',cursor:'pointer'}}
              disabled={!selectedProblem}
              onClick={async()=>{
                if (!selectedProblem) return;
                if (!currentDeliveryId) return;
                setLoading(true);
                try {
                  await updateDeliveryRecord(currentDeliveryId, {
                    problem_type: selectedProblem,
                    information: problemInfo
                  });
                  setProblemType(selectedProblem);
                  setInfo(problemInfo);
                  setDeliveryStatus(`Entrega em andamento - ${selectedProblem}`);
                  // Enviar WhatsApp no formato solicitado
                  const message = `🚨ENTREGA COM PROBLEMA🚨

🚛 Fretista: ${selectedFretista || 'N/A'}
🛒 Cliente: ${selectedClient || 'N/A'}
🧰 Vendedor: ${vendedor || 'N/A'}
⚠️ Problema: ${selectedProblem}
📝 Observação: ${problemInfo || 'Nenhuma'}

🫵NO AGUARDO DA RESOLUÇÃO!⌛`;
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
                      alert(`Mensagem gerada:

${message}`);
                    });
                  }
                  setProblemModal({open:false});
                  setSelectedProblem('');
                  setProblemInfo('');
                  showToast('Problema registrado e WhatsApp enviado!', 'warning');
                } catch (error) {
                  showToast('Erro ao registrar problema.', 'error');
                } finally {
                  setLoading(false);
                }
              }}
            >Salvar Problema e Enviar WhatsApp</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Registros;
