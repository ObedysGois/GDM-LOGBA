import React, { useState, useEffect } from 'react';
import { Filter, Send, Download, Calendar, BarChart3, Clock, CheckCircle, XCircle, AlertTriangle, Loader2, User } from 'lucide-react';
import { getDeliveryRecordsByUser } from '../firebaseUtils.js';
import { useAuth } from '../AuthContext.js';
import { useTheme } from '../contexts/ThemeContext';
import '../App.css';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../Components/PageHeader.jsx';

function MeuResumo() {
  const { currentUser } = useAuth();
  const { isDarkMode } = useTheme();
  const [filterPeriod, setFilterPeriod] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({
    entregasFinalizadas: 0,
    devolucoes: 0,
    problemas: 0,
    tempoMedio: 0
  });

  const navigate = useNavigate();

  // useRef para controlar se o componente está montado
  const isMounted = React.useRef(true);

  // Limpar flag ao desmontar
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Função para calcular estatísticas dos registros
  const calculateStats = (records) => {
    const stats = {
      entregasFinalizadas: 0,
      devolucoes: 0,
      problemas: 0,
      tempoMedio: 0
    };

    let totalTempo = 0;
    let registrosComTempo = 0;

    records.forEach(record => {
      // Contar entregas finalizadas
      if (record.status === 'Entrega finalizada') {
        stats.entregasFinalizadas++;
      }
      
      // Contar devoluções
      if (record.status === 'Entrega devolvida') {
        stats.devolucoes++;
      }
      
      // Contar problemas
      if (record.problem_type && record.problem_type.trim() !== '') {
        stats.problemas++;
      }
      
      // Calcular tempo médio
      if (record.duration && record.duration.includes('min')) {
        const tempoStr = record.duration.replace(' min', '');
        const tempo = parseInt(tempoStr);
        if (!isNaN(tempo)) {
          totalTempo += tempo;
          registrosComTempo++;
        }
      }
    });

    stats.tempoMedio = registrosComTempo > 0 ? Math.round(totalTempo / registrosComTempo) : 0;
    return stats;
  };

  // Função para obter registros baseado nos filtros
  const fetchRecords = async () => {
    if (!currentUser?.email) return;

    setLoading(true);
    try {
      // Aplicar filtros de período
      const now = new Date();
      let startDateFilter = null;
      let endDateFilter = null;

      switch (filterPeriod) {
        case 'today':
          startDateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          break;
        case 'thisWeek':
          const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
          startDateFilter = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate());
          endDateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          break;
        case 'currentMonth':
          startDateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
          endDateFilter = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          break;
        case 'lastMonth':
          startDateFilter = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDateFilter = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
          break;
        case 'currentQuarter':
          const quarter = Math.floor(now.getMonth() / 3);
          startDateFilter = new Date(now.getFullYear(), quarter * 3, 1);
          endDateFilter = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59);
          break;
        case 'lastQuarter':
          const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
          const lastQuarterYear = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
          const lastQuarterMonth = lastQuarter < 0 ? 9 : lastQuarter * 3;
          startDateFilter = new Date(lastQuarterYear, lastQuarterMonth, 1);
          endDateFilter = new Date(lastQuarterYear, lastQuarterMonth + 3, 0, 23, 59, 59);
          break;
        case 'currentSemester':
          const semester = Math.floor(now.getMonth() / 6);
          startDateFilter = new Date(now.getFullYear(), semester * 6, 1);
          endDateFilter = new Date(now.getFullYear(), (semester + 1) * 6, 0, 23, 59, 59);
          break;
        case 'lastSemester':
          const lastSemester = Math.floor(now.getMonth() / 6) - 1;
          const lastSemesterYear = lastSemester < 0 ? now.getFullYear() - 1 : now.getFullYear();
          const lastSemesterMonth = lastSemester < 0 ? 6 : lastSemester * 6;
          startDateFilter = new Date(lastSemesterYear, lastSemesterMonth, 1);
          endDateFilter = new Date(lastSemesterYear, lastSemesterMonth + 6, 0, 23, 59, 59);
          break;
        case 'lastYear':
          startDateFilter = new Date(now.getFullYear() - 1, 0, 1);
          endDateFilter = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
          break;
        default:
          // Default case for unexpected filterPeriod values
          startDateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
          endDateFilter = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          break;
      }

      // Se há datas específicas, usar elas
      if (startDate && endDate) {
        startDateFilter = new Date(startDate + 'T00:00:00');
        endDateFilter = new Date(endDate + 'T23:59:59');
      }

      console.log('🔍 Filtros aplicados:', { startDateFilter, endDateFilter, filterPeriod, startDate, endDate });

      // Buscar registros do usuário
      const allRecords = await getDeliveryRecordsByUser(currentUser.email);
      console.log('📥 Registros brutos do usuário:', allRecords.length);
      
      // Filtrar por período
      const filteredRecords = allRecords.filter(record => {
        if (!startDateFilter || !endDateFilter) return true;
        const recordDate = new Date(record.timestamp?.toDate() || record.checkin_time);
        const isInPeriod = recordDate >= startDateFilter && recordDate <= endDateFilter;
        console.log('📅 Registro:', { 
          recordDate: recordDate.toISOString(), 
          startDateFilter: startDateFilter.toISOString(), 
          endDateFilter: endDateFilter.toISOString(),
          isInPeriod 
        });
        return isInPeriod;
      });

      console.log('📊 Registros filtrados:', filteredRecords.length);
      setRecords(filteredRecords);
      setStats(calculateStats(filteredRecords));
    } catch (error) {
      console.error('❌ Erro ao buscar registros:', error);
      alert('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados quando o componente montar ou filtros mudarem
  useEffect(() => {
    fetchRecords();
  }, [filterPeriod, startDate, endDate, currentUser?.email]);

  const handleGenerateDaySummary = () => {
    // Determinar a data baseada no filtro
    let targetDate = new Date();
    if (filterPeriod === 'today') {
      // targetDate já é hoje
    } else if (startDate) {
      targetDate = new Date(startDate);
    }
    const formattedDate = targetDate.toLocaleDateString('pt-BR');

    // Filtrar registros apenas do dia selecionado
    const recordsForSummary = records.filter(record => {
      if (!record.checkin_time) return false;
      const recordDate = new Date(record.checkin_time);
      return recordDate.toDateString() === targetDate.toDateString();
    });

    if (recordsForSummary.length === 0) {
      alert('Nenhum registro encontrado para o dia selecionado.');
      return;
    }

    // Calcular resumo geral
    const completedDeliveries = recordsForSummary.filter(r => r.status === 'Entrega finalizada').length;
    const returnedDeliveries = recordsForSummary.filter(r => r.status === 'Entrega devolvida').length;
    const problemDeliveries = recordsForSummary.filter(r => r.problem_type).length;
    
    // Calcular tempo médio
    let totalDurationMinutes = 0;
    let validDurations = 0;
    recordsForSummary.forEach(record => {
      if (record.duration) {
        const match = record.duration.match(/(\d+)\s*min/);
        if (match) {
          totalDurationMinutes += parseInt(match[1]);
          validDurations++;
        }
      }
    });
    const averageTime = validDurations > 0 
      ? `${Math.round(totalDurationMinutes / validDurations)} min` 
      : 'N/A';

    // Montar mensagem
    let message = `🚚 *Resumo do Dia - ${formattedDate}*\n\n`;
    message += `✅ Entregas Finalizadas: ${completedDeliveries}\n`;
    message += `📦 Entregas Devolvidas: ${returnedDeliveries}\n`;
    message += `⚠️ Entregas com Problemas: ${problemDeliveries}\n`;
    message += `⏱️ Tempo Médio: ${averageTime}\n\n`;
    message += `📋 *Registros Realizados:*\n`;

    // Adicionar cada registro
    recordsForSummary.forEach((record, index) => {
      message += `\n📌 *Registro ${index + 1}:*\n`;
      message += `👤 Cliente: ${record.client || 'N/A'}\n`;
      message += `🚛 Fretista: ${record.driver || 'N/A'}\n`;
      message += `⏱️ Check-in: ${record.checkin_time ? new Date(record.checkin_time).toLocaleTimeString('pt-BR') : 'N/A'}\n`;
      message += `⏱️ Check-out: ${record.checkout_time ? new Date(record.checkout_time).toLocaleTimeString('pt-BR') : 'N/A'}\n`;
      message += `⏱️ Duração: ${record.duration || 'N/A'}\n`;
      message += `📊 Status: ${record.status || 'N/A'}\n`;
      if (record.problem_type) {
        message += `⚠️ Problema: ${record.problem_type}\n`;
      }
      if (record.information) {
        message += `📝 Informações: ${record.information}\n`;
      }
    });

    // Adicionar links dos anexos
    let hasAttachments = false;
    message += `\n📎 *Anexos:*\n`;
    recordsForSummary.forEach((record, recordIndex) => {
      if (record.attachments && record.attachments.length > 0) {
        hasAttachments = true;
        message += `\n📄 *Registro ${recordIndex + 1}:*\n`;
        record.attachments.forEach((att, attIndex) => {
          const fileName = att.original_name || att.file_name || `Anexo ${attIndex + 1}`;
          const fileUrl = att.file_url || 'Link não disponível';
          message += `🔗 ${fileName}: ${fileUrl}\n`;
        });
      }
    });

    if (!hasAttachments) {
      message += `Nenhum anexo encontrado.\n`;
    }

    message += `\n🏁 *Rota finalizada com sucesso!* ✅`;

    // Codificar e abrir no WhatsApp
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
  };

  const handleGenerateWeekSummary = () => {
    // Determinar o período baseado no filtro
    let startDateFilter = new Date();
    let endDateFilter = new Date();
    const now = new Date();

    switch (filterPeriod) {
      case 'today':
        startDateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'thisWeek':
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        startDateFilter = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate());
        endDateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'currentMonth':
        startDateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
        endDateFilter = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'lastMonth':
        startDateFilter = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDateFilter = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      case 'currentQuarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDateFilter = new Date(now.getFullYear(), quarter * 3, 1);
        endDateFilter = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59);
        break;
      case 'lastQuarter':
        const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
        const lastQuarterYear = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
        const lastQuarterMonth = lastQuarter < 0 ? 9 : lastQuarter * 3;
        startDateFilter = new Date(lastQuarterYear, lastQuarterMonth, 1);
        endDateFilter = new Date(lastQuarterYear, lastQuarterMonth + 3, 0, 23, 59, 59);
        break;
      case 'currentSemester':
        const semester = Math.floor(now.getMonth() / 6);
        startDateFilter = new Date(now.getFullYear(), semester * 6, 1);
        endDateFilter = new Date(now.getFullYear(), (semester + 1) * 6, 0, 23, 59, 59);
        break;
      case 'lastSemester':
        const lastSemester = Math.floor(now.getMonth() / 6) - 1;
        const lastSemesterYear = lastSemester < 0 ? now.getFullYear() - 1 : now.getFullYear();
        const lastSemesterMonth = lastSemester < 0 ? 6 : lastSemester * 6;
        startDateFilter = new Date(lastSemesterYear, lastSemesterMonth, 1);
        endDateFilter = new Date(lastSemesterYear, lastSemesterMonth + 6, 0, 23, 59, 59);
        break;
      case 'lastYear':
        startDateFilter = new Date(now.getFullYear() - 1, 0, 1);
        endDateFilter = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
        break;
      default:
        startDateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
        endDateFilter = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
    }

    // Se há datas específicas, usar elas
    if (startDate && endDate) {
      startDateFilter = new Date(startDate + 'T00:00:00');
      endDateFilter = new Date(endDate + 'T23:59:59');
    }

    const formattedStartDate = startDateFilter.toLocaleDateString('pt-BR');
    const formattedEndDate = endDateFilter.toLocaleDateString('pt-BR');

    // Filtrar registros do período selecionado
    const recordsForSummary = records.filter(record => {
      if (!record.checkin_time) return false;
      const recordDate = new Date(record.checkin_time);
      return recordDate >= startDateFilter && recordDate <= endDateFilter;
    });

    if (recordsForSummary.length === 0) {
      alert('Nenhum registro encontrado para o período selecionado.');
      return;
    }

    // Calcular resumo geral
    const completedDeliveries = recordsForSummary.filter(r => r.status === 'Entrega finalizada').length;
    const returnedDeliveries = recordsForSummary.filter(r => r.status === 'Entrega devolvida').length;
    const problemDeliveries = recordsForSummary.filter(r => r.problem_type).length;
    
    // Calcular tempo médio
    let totalDurationMinutes = 0;
    let validDurations = 0;
    recordsForSummary.forEach(record => {
      if (record.duration) {
        const match = record.duration.match(/(\d+)\s*min/);
        if (match) {
          totalDurationMinutes += parseInt(match[1]);
          validDurations++;
        }
      }
    });
    const averageTime = validDurations > 0 
      ? `${Math.round(totalDurationMinutes / validDurations)} min` 
      : 'N/A';

    // Montar mensagem
    let message = `🚚 *Resumo do Período - ${formattedStartDate} a ${formattedEndDate}*\n\n`;
    message += `✅ Entregas Finalizadas: ${completedDeliveries}\n`;
    message += `📦 Entregas Devolvidas: ${returnedDeliveries}\n`;
    message += `⚠️ Entregas com Problemas: ${problemDeliveries}\n`;
    message += `⏱️ Tempo Médio: ${averageTime}\n\n`;
    message += `📋 *Registros Realizados:*\n`;

    // Adicionar cada registro
    recordsForSummary.forEach((record, index) => {
      message += `\n📌 *Registro ${index + 1}:*\n`;
      message += `📅 Data: ${record.checkin_time ? new Date(record.checkin_time).toLocaleDateString('pt-BR') : 'N/A'}\n`;
      message += `👤 Cliente: ${record.client || 'N/A'}\n`;
      message += `🚛 Fretista: ${record.driver || 'N/A'}\n`;
      message += `⏱️ Check-in: ${record.checkin_time ? new Date(record.checkin_time).toLocaleTimeString('pt-BR') : 'N/A'}\n`;
      message += `⏱️ Check-out: ${record.checkout_time ? new Date(record.checkout_time).toLocaleTimeString('pt-BR') : 'N/A'}\n`;
      message += `⏱️ Duração: ${record.duration || 'N/A'}\n`;
      message += `📊 Status: ${record.status || 'N/A'}\n`;
      if (record.problem_type) {
        message += `⚠️ Problema: ${record.problem_type}\n`;
      }
      if (record.information) {
        message += `📝 Informações: ${record.information}\n`;
      }
    });

    // Adicionar links dos anexos
    let hasAttachments = false;
    message += `\n📎 *Anexos:*\n`;
    recordsForSummary.forEach((record, recordIndex) => {
      if (record.attachments && record.attachments.length > 0) {
        hasAttachments = true;
        message += `\n📄 *Registro ${recordIndex + 1}:*\n`;
        record.attachments.forEach((att, attIndex) => {
          const fileName = att.original_name || att.file_name || `Anexo ${attIndex + 1}`;
          const fileUrl = att.file_url || 'Link não disponível';
          message += `🔗 ${fileName}: ${fileUrl}\n`;
        });
      }
    });

    if (!hasAttachments) {
      message += `Nenhum anexo encontrado.\n`;
    }

    message += `\n🏁 *Período finalizado com sucesso!* ✅`;

    // Codificar e abrir no WhatsApp
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
  };

  const handleGeneratePdf = () => {
    alert('Funcionalidade de PDF será implementada em breve.');
  };

  const handleClearFilters = () => {
    setFilterPeriod('today');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className={`meu-resumo-container ${isDarkMode ? 'dark-theme' : ''}`} style={{maxWidth: '1200px', margin: '0 auto', padding: '24px 0', background: isDarkMode ? '#0a0a0a' : 'transparent', minHeight: '100vh'}}>
      {/* Cabeçalho moderno padrão localização */}
      <PageHeader
        title="Meu Resumo"
        subtitle="Veja seu desempenho e histórico de entregas"
        icon={User}
      />

      {/* Filtros */}
      <div className={`card ${isDarkMode ? 'dark-card' : ''}`} style={{padding: 24, marginBottom: 24, background: isDarkMode ? '#1a1a1a' : '#fff', border: isDarkMode ? '1px solid #333' : '1px solid #e0e0e0'}}>
        <h3 style={{fontSize: '1.3rem', color: isDarkMode ? '#00ff88' : '#218838', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8}}>
          <Filter style={{width: 20, height: 20}} />
          Filtros de Período
        </h3>
        
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16}}>
          <div>
            <label style={{display: 'block', fontWeight: 600, color: isDarkMode ? '#ccc' : '#495057', marginBottom: 8}}>📅 Período Rápido:</label>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              style={{
                width: '100%', 
                padding: '12px 16px', 
                border: isDarkMode ? '1px solid #444' : '1px solid #e0e0e0', 
                borderRadius: 8, 
                fontSize: 15,
                background: isDarkMode ? '#2a2a2a' : '#fff',
                color: isDarkMode ? '#ccc' : '#333'
              }}
            >
              <option value="today">Hoje</option>
              <option value="thisWeek">Esta Semana</option>
              <option value="currentMonth">Mês Atual</option>
              <option value="lastMonth">Mês Anterior</option>
              <option value="currentQuarter">Trimestre Atual</option>
              <option value="lastQuarter">Trimestre Passado</option>
              <option value="currentSemester">Semestre Atual</option>
              <option value="lastSemester">Semestre Passado</option>
              <option value="lastYear">Ano Passado</option>
            </select>
          </div>

          <div>
            <label style={{display: 'block', fontWeight: 600, color: isDarkMode ? '#ccc' : '#495057', marginBottom: 8}}>📅 Data Início:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: '100%', 
                padding: '12px 16px', 
                border: isDarkMode ? '1px solid #444' : '1px solid #e0e0e0', 
                borderRadius: 8, 
                fontSize: 15,
                background: isDarkMode ? '#2a2a2a' : '#fff',
                color: isDarkMode ? '#ccc' : '#333'
              }}
            />
          </div>

          <div>
            <label style={{display: 'block', fontWeight: 600, color: isDarkMode ? '#ccc' : '#495057', marginBottom: 8}}>📅 Data Fim:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                width: '100%', 
                padding: '12px 16px', 
                border: isDarkMode ? '1px solid #444' : '1px solid #e0e0e0', 
                borderRadius: 8, 
                fontSize: 15,
                background: isDarkMode ? '#2a2a2a' : '#fff',
                color: isDarkMode ? '#ccc' : '#333'
              }}
            />
          </div>

          <div style={{display: 'flex', alignItems: 'end'}}>
            <button 
              type="button"
              onClick={handleClearFilters}
              style={{
                padding: '10px 18px',
                borderRadius: 8,
                border: 'none',
                background: isDarkMode ? 'linear-gradient(90deg, #00ff88 0%, #ff9800 100%)' : 'linear-gradient(90deg, #43a047 0%, #1976d2 100%)',
                color: isDarkMode ? '#000' : '#fff',
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
        </div>
      </div>

      {/* Métricas do Resumo */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24, marginBottom: 32}}>
        <div className={`card ${isDarkMode ? 'dark-card' : ''}`} style={{padding: 24, textAlign: 'center', background: isDarkMode ? '#1a1a1a' : '#fff', border: isDarkMode ? '1px solid #333' : '1px solid #e0e0e0'}}>
          <div style={{background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)', borderRadius: '50%', width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'}}>
            <CheckCircle style={{color: '#fff', width: 24, height: 24}} />
          </div>
          <h3 style={{fontSize: '1.2rem', color: isDarkMode ? '#00ff88' : '#218838', marginBottom: 8}}>Entregas Finalizadas</h3>
          <p style={{fontSize: '1.5rem', fontWeight: 700, color: '#4caf50', margin: 0}}>
            {loading ? <Loader2 style={{width: 24, height: 24, animation: 'spin 1s linear infinite'}} /> : stats.entregasFinalizadas}
          </p>
        </div>

        <div className="card" style={{
          padding: 24, 
          textAlign: 'center',
          backgroundColor: isDarkMode ? '#2d3748' : '#fff',
          border: isDarkMode ? '1px solid #4a5568' : '1px solid #e2e8f0'
        }}>
          <div style={{background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)', borderRadius: '50%', width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'}}>
            <XCircle style={{color: '#fff', width: 24, height: 24}} />
          </div>
          <h3 style={{fontSize: '1.2rem', color: isDarkMode ? '#00ff88' : '#218838', marginBottom: 8}}>Devoluções</h3>
          <p style={{fontSize: '1.5rem', fontWeight: 700, color: '#dc3545', margin: 0}}>
            {loading ? <Loader2 style={{width: 24, height: 24, animation: 'spin 1s linear infinite'}} /> : stats.devolucoes}
          </p>
        </div>

        <div className="card" style={{
          padding: 24, 
          textAlign: 'center',
          backgroundColor: isDarkMode ? '#2d3748' : '#fff',
          border: isDarkMode ? '1px solid #4a5568' : '1px solid #e2e8f0'
        }}>
          <div style={{background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)', borderRadius: '50%', width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'}}>
            <AlertTriangle style={{color: '#fff', width: 24, height: 24}} />
          </div>
          <h3 style={{fontSize: '1.2rem', color: isDarkMode ? '#00ff88' : '#218838', marginBottom: 8}}>Problemas</h3>
          <p style={{fontSize: '1.5rem', fontWeight: 700, color: '#ff9800', margin: 0}}>
            {loading ? <Loader2 style={{width: 24, height: 24, animation: 'spin 1s linear infinite'}} /> : stats.problemas}
          </p>
        </div>

        <div className="card" style={{
          padding: 24, 
          textAlign: 'center',
          backgroundColor: isDarkMode ? '#2d3748' : '#fff',
          border: isDarkMode ? '1px solid #4a5568' : '1px solid #e2e8f0'
        }}>
          <div style={{background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', borderRadius: '50%', width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'}}>
            <Clock style={{color: '#fff', width: 24, height: 24}} />
          </div>
          <h3 style={{fontSize: '1.2rem', color: isDarkMode ? '#00ff88' : '#218838', marginBottom: 8}}>Tempo Médio</h3>
          <p style={{fontSize: '1.5rem', fontWeight: 700, color: '#1976d2', margin: 0}}>
            {loading ? <Loader2 style={{width: 24, height: 24, animation: 'spin 1s linear infinite'}} /> : `${stats.tempoMedio} min`}
          </p>
        </div>
      </div>

      {/* Resumo Detalhado */}
      <div className="card" style={{
        padding: 24, 
        marginBottom: 24,
        backgroundColor: isDarkMode ? '#2d3748' : '#fff',
        border: isDarkMode ? '1px solid #4a5568' : '1px solid #e2e8f0'
      }}>
        <h3 style={{fontSize: '1.3rem', color: isDarkMode ? '#00ff88' : '#218838', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8}}>
          <BarChart3 style={{width: 20, height: 20}} />
          Resumo dos Meus Registros
        </h3>
        
        {loading ? (
          <div style={{
            background: isDarkMode ? '#1a202c' : '#f8f9fa', 
            padding: 40, 
            borderRadius: 12, 
            textAlign: 'center'
          }}>
            <Loader2 style={{width: 48, height: 48, color: isDarkMode ? '#a0aec0' : '#666', marginBottom: 16, animation: 'spin 1s linear infinite'}} />
            <p style={{color: isDarkMode ? '#a0aec0' : '#666', margin: 0, fontSize: 16}}>Carregando dados...</p>
          </div>
        ) : records.length === 0 ? (
          <div style={{
            background: isDarkMode ? '#1a202c' : '#f8f9fa', 
            padding: 40, 
            borderRadius: 12, 
            textAlign: 'center'
          }}>
            <Calendar style={{width: 48, height: 48, color: isDarkMode ? '#a0aec0' : '#666', marginBottom: 16}} />
            <p style={{color: isDarkMode ? '#a0aec0' : '#666', margin: 0, fontSize: 16}}>Nenhum resumo disponível para o período selecionado.</p>
            <p style={{color: isDarkMode ? '#718096' : '#999', margin: '8px 0 0 0', fontSize: 14}}>Selecione um período para visualizar suas estatísticas</p>
          </div>
        ) : (
          <div style={{
            background: isDarkMode ? '#1a202c' : '#f8f9fa', 
            padding: 24, 
            borderRadius: 12
          }}>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16}}>
              <div style={{textAlign: 'center'}}>
                <h4 style={{color: isDarkMode ? '#00ff88' : '#218838', marginBottom: 8}}>Total de Registros</h4>
                <p style={{fontSize: '1.5rem', fontWeight: 700, color: isDarkMode ? '#e2e8f0' : '#495057', margin: 0}}>{records.length}</p>
              </div>
              <div style={{textAlign: 'center'}}>
                <h4 style={{color: isDarkMode ? '#00ff88' : '#218838', marginBottom: 8}}>Taxa de Sucesso</h4>
                <p style={{fontSize: '1.5rem', fontWeight: 700, color: '#4caf50', margin: 0}}>
                  {records.length > 0 ? Math.round((stats.entregasFinalizadas / records.length) * 100) : 0}%
                </p>
              </div>
              <div style={{textAlign: 'center'}}>
                <h4 style={{color: isDarkMode ? '#00ff88' : '#218838', marginBottom: 8}}>Taxa de Problemas</h4>
                <p style={{fontSize: '1.5rem', fontWeight: 700, color: '#ff9800', margin: 0}}>
                  {records.length > 0 ? Math.round((stats.problemas / records.length) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="card" style={{
        padding: 24,
        backgroundColor: isDarkMode ? '#2d3748' : '#fff',
        border: isDarkMode ? '1px solid #4a5568' : '1px solid #e2e8f0'
      }}>
        <h3 style={{fontSize: '1.3rem', color: isDarkMode ? '#00ff88' : '#218838', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8}}>
          <Send style={{width: 20, height: 20}} />
          Ações de Compartilhamento
        </h3>
        
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center'}}>
          <button 
            className="btn btn-green"
            onClick={handleGenerateDaySummary}
            disabled={loading}
            style={{
              fontSize: 16, 
              padding: '14px 32px', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 8,
              backgroundColor: isDarkMode ? '#38a169' : '#28a745',
              borderColor: isDarkMode ? '#38a169' : '#28a745',
              color: '#fff'
            }}
          >
            <Send style={{width: 18, height: 18}} />
            Enviar Resumo do Dia (WhatsApp)
          </button>
          
          <button 
            className="btn btn-blue"
            onClick={handleGenerateWeekSummary}
            disabled={loading}
            style={{
              fontSize: 16, 
              padding: '14px 32px', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 8,
              backgroundColor: isDarkMode ? '#3182ce' : '#007bff',
              borderColor: isDarkMode ? '#3182ce' : '#007bff',
              color: '#fff'
            }}
          >
            <Send style={{width: 18, height: 18}} />
            Enviar Resumo da Semana (WhatsApp)
          </button>
          
          <button 
            className="btn btn-orange"
            onClick={handleGeneratePdf}
            disabled={loading}
            style={{
              fontSize: 16, 
              padding: '14px 32px', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 8,
              backgroundColor: isDarkMode ? '#dd6b20' : '#fd7e14',
              borderColor: isDarkMode ? '#dd6b20' : '#fd7e14',
              color: '#fff'
            }}
          >
            <Download style={{width: 18, height: 18}} />
            Gerar PDF (Admin)
          </button>
        </div>
      </div>

      {/* Botão flutuante para Registros */}
      <div
        onClick={() => navigate('/registros')}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: isDarkMode 
            ? 'linear-gradient(135deg, #dd6b20 0%, #c53030 100%)' 
            : 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)',
          boxShadow: isDarkMode 
            ? '0 8px 24px rgba(221, 107, 32, 0.3)' 
            : '0 8px 24px rgba(255, 152, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: 24,
          color: '#fff',
          zIndex: 1000,
          transition: 'all 0.3s ease',
          border: '3px solid rgba(255, 255, 255, 0.2)',
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1)';
          e.target.style.boxShadow = isDarkMode 
            ? '0 12px 32px rgba(221, 107, 32, 0.4)' 
            : '0 12px 32px rgba(255, 152, 0, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = isDarkMode 
            ? '0 8px 24px rgba(221, 107, 32, 0.3)' 
            : '0 8px 24px rgba(255, 152, 0, 0.3)';
        }}
      >
        🚛
      </div>
    </div>
  );
}

export default MeuResumo;