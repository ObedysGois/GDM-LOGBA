import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Edit, Trash2, Eye, Image, 
  Download, FileText, 
  Share, Calendar as CalendarIcon, Clock, 
  Thermometer, Package, AlertTriangle, 
  CheckCircle, TrendingDown,
  User, Building, Truck, 
  XCircle
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../AuthContext';
import { ToastContext } from '../App.js';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer
} from 'recharts';
import { supabase } from '../supabaseConfig';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const ChecklistExpedicao = () => {
  const { theme } = useTheme();
  const { currentUser: user } = useAuth();
  const { showToast } = useContext(ToastContext);
  
  // Estados principais - DEVEM vir antes de qualquer return condicional
  const [activeTab, setActiveTab] = useState('form');
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(100);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Dados dos CSVs
  const [empresasData, setEmpresasData] = useState([]);
  const [fretistasData, setFretistasData] = useState([]);
  
  // Estados para campos customizados
  const [showCustomPlaca, setShowCustomPlaca] = useState(false);
  const [showCustomFretista, setShowCustomFretista] = useState(false);
  const [customPlaca, setCustomPlaca] = useState('');
  const [customFretista, setCustomFretista] = useState('');
  
  // Estado do formulário
  const [formData, setFormData] = useState({
    empresa: '',
    data: new Date().toISOString().split('T')[0],
    placa: '',
    fretista: '',
    hora_chegada: '',
    hora_saida: '',
    temperatura: '',
    condicao_bau: 'Conforme',
    pontualidade: 'Pontual',
    qtd_pbr: '',
    qtd_desc: '',
    observacao: '',
    qtd_devolvida: ''
  });

  // Definir funções antes dos useEffects
  const loadCSVData = React.useCallback(async () => {
    try {
      console.log('🔄 Carregando dados dos CSVs...');
      
      // Carregar dados das empresas
      const empresasResponse = await fetch('/empresas.csv');
      const empresasText = await empresasResponse.text();
      const empresasLines = empresasText.split('\n').filter(line => line.trim());
      const empresasHeaders = empresasLines[0].split(',');
      
      const empresas = empresasLines.slice(1).map(line => {
        const values = line.split(',');
        const empresa = {};
        empresasHeaders.forEach((header, index) => {
          empresa[header.trim()] = values[index]?.trim() || '';
        });
        return empresa;
      }).filter(emp => emp.nome_fantasia); // Filtrar empresas válidas
      
      console.log('📊 Empresas carregadas:', empresas);
      setEmpresasData(empresas);
      
      // Carregar dados dos fretistas
      const fretistasResponse = await fetch('/fretistas.csv');
      const fretistasText = await fretistasResponse.text();
      const fretistasLines = fretistasText.split('\n').filter(line => line.trim());
      const fretistasHeaders = fretistasLines[0].split(',');
      
      const fretistas = fretistasLines.slice(1).map(line => {
        const values = line.split(',');
        const fretista = {};
        fretistasHeaders.forEach((header, index) => {
          fretista[header.trim()] = values[index]?.trim() || '';
        });
        return fretista;
      }).filter(fret => fret.placa && fret.nome); // Filtrar fretistas válidos
      
      console.log('🚛 Fretistas carregados:', fretistas);
      setFretistasData(fretistas);
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados CSV:', error);
      // Fallback para dados simulados em caso de erro
      setEmpresasData([
        { cnpj: '12345678000199', razao_social: 'Empresa A Ltda', nome_fantasia: 'Empresa A' },
        { cnpj: '98765432000188', razao_social: 'Empresa B S.A.', nome_fantasia: 'Empresa B' },
        { cnpj: '11223344000177', razao_social: 'Empresa C Eireli', nome_fantasia: 'Empresa C' }
      ]);
      
      setFretistasData([
        { placa: 'ABC1234', nome: 'João Silva' },
        { placa: 'DEF5678', nome: 'Maria Santos' },
        { placa: 'GHI9012', nome: 'Pedro Oliveira' }
      ]);
    }
  }, []);

  const loadRegistros = React.useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('expedicoes')
        .select('*')
        .order('criado_em', { ascending: false });
      
      if (error) throw error;
      setRegistros(data || []);
    } catch (error) {
      console.error('Erro ao carregar registros:', error);
      showToast('Erro ao carregar registros', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Carregar dados dos CSVs - useEffect DEVE vir antes de qualquer return condicional
  useEffect(() => {
    loadCSVData();
    loadRegistros();
  }, []); // Remover dependências que causam re-renders desnecessários
  
  // Controle de acesso por tipo de usuário
  let userType = user?.type || 'novo';
  
  // Debug temporário
  console.log('DEBUG - User object:', user);
  console.log('DEBUG - Original userType:', userType);
  
  // Mapear diferentes variações de tipos para os tipos padrão
  const typeMapping = {
    'admin': 'administrador',
    'administrator': 'administrador',
    'colaborador': 'colaborador',
    'fretista': 'fretista',
    'expedidor': 'expedidor',
    'vendedor': 'vendedor',
    'novo': 'novo'
  };
  
  userType = typeMapping[userType] || userType;
  
  console.log('DEBUG - Mapped userType:', userType);
  
  const isDarkMode = theme === 'dark';
  
  // Verificar se o usuário tem acesso à tela
  const hasAccess = ['colaborador', 'administrador', 'fretista', 'expedidor'].includes(userType);
  
  console.log('DEBUG - hasAccess:', hasAccess);
  console.log('DEBUG - Allowed types:', ['colaborador', 'administrador', 'fretista', 'expedidor']);
  console.log('DEBUG - userType in allowed types:', ['colaborador', 'administrador', 'fretista', 'expedidor'].includes(userType));
  
  // Definir quais seções o usuário pode ver
  const canSeeForm = ['colaborador', 'administrador', 'expedidor'].includes(userType); // 1ª parte
  const canSeeAnalytics = ['colaborador', 'administrador', 'fretista', 'expedidor'].includes(userType); // 2ª parte
  const canSeeTable = ['colaborador', 'administrador', 'fretista', 'expedidor'].includes(userType); // 3ª parte
  const canSeeReports = ['colaborador', 'administrador', 'expedidor'].includes(userType); // 4ª parte
  
  // Ajustar activeTab baseado no acesso do usuário
  useEffect(() => {
    if (canSeeForm) {
      setActiveTab('form');
    } else if (canSeeAnalytics) {
      setActiveTab('analytics');
    } else if (canSeeTable) {
      setActiveTab('table');
    }
  }, []); // Executar apenas uma vez no mount
  
  // Se não tem acesso, mostrar mensagem
  if (!hasAccess) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>Acesso Negado</h2>
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Você não tem permissão para acessar esta tela.</p>
        </div>
      </div>
    );
  }

  // Cálculos automáticos
  const calculateSaldoAndStatus = (qtdPbr, qtdDevolvida) => {
    const pbr = parseInt(qtdPbr) || 0;
    const devolvida = parseInt(qtdDevolvida) || 0;
    const saldo = pbr - devolvida;
    const status = saldo === 0 ? 'Conforme' : saldo > 0 ? 'Pendente' : 'Excesso';
    return { saldo, status };
  };

  // Auto-preenchimento do fretista baseado na placa
  const handlePlacaChange = (placa) => {
    if (placa === 'OUTRO_DIGITAR') {
      setShowCustomPlaca(true);
      setFormData(prev => ({
        ...prev,
        placa: '',
        fretista: ''
      }));
    } else {
      setShowCustomPlaca(false);
      setCustomPlaca('');
      const fretista = fretistasData.find(f => f.placa === placa);
      setFormData(prev => ({
        ...prev,
        placa,
        fretista: fretista ? fretista.nome : ''
      }));
    }
  };

  // Função para lidar com mudança no campo customizado de placa
  const handleCustomPlacaChange = (value) => {
    setCustomPlaca(value);
    setFormData(prev => ({
      ...prev,
      placa: value,
      fretista: '' // Limpar fretista quando placa customizada é digitada
    }));
  };

  // Função para lidar com mudança no fretista
  const handleFretistaChange = (fretista) => {
    if (fretista === 'OUTRO_DIGITAR') {
      setShowCustomFretista(true);
      setFormData(prev => ({
        ...prev,
        fretista: ''
      }));
    } else {
      setShowCustomFretista(false);
      setCustomFretista('');
      setFormData(prev => ({
        ...prev,
        fretista
      }));
    }
  };

  // Função para lidar com mudança no campo customizado de fretista
  const handleCustomFretistaChange = (value) => {
    setCustomFretista(value);
    setFormData(prev => ({
      ...prev,
      fretista: value
    }));
  };

  // Salvar registro
  const handleSaveRecord = async () => {
    try {
      console.log('🔄 Iniciando salvamento do registro...');
      console.log('📋 Dados do formulário:', formData);
      
      // Validações obrigatórias
      const requiredFields = [
        { field: 'empresa', label: 'Empresa' },
        { field: 'data', label: 'Data' },
        { field: 'placa', label: 'Placa' },
        { field: 'fretista', label: 'Fretista' },
        { field: 'qtd_pbr', label: 'Quantidade PBR' }
      ];

      const missingFields = requiredFields.filter(({ field }) => !formData[field] || formData[field].toString().trim() === '');
      
      if (missingFields.length > 0) {
        const fieldNames = missingFields.map(({ label }) => label).join(', ');
        console.log('❌ Campos obrigatórios faltando:', fieldNames);
        showToast(`Campos obrigatórios não preenchidos: ${fieldNames}`, 'error');
        return;
      }

      console.log('✅ Validações obrigatórias passaram');

      // Validações de formato
      if (formData.placa && !/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(formData.placa.replace(/[^A-Z0-9]/g, ''))) {
        console.log('❌ Formato de placa inválido:', formData.placa);
        showToast('Formato de placa inválido. Use o formato ABC1234 ou ABC1D23', 'error');
        return;
      }

      if (formData.qtd_pbr && (isNaN(formData.qtd_pbr) || parseInt(formData.qtd_pbr) < 0)) {
        console.log('❌ Quantidade PBR inválida:', formData.qtd_pbr);
        showToast('Quantidade PBR deve ser um número válido e positivo', 'error');
        return;
      }

      if (formData.qtd_desc && (isNaN(formData.qtd_desc) || parseInt(formData.qtd_desc) < 0)) {
        console.log('❌ Quantidade Descartáveis inválida:', formData.qtd_desc);
        showToast('Quantidade Descartáveis deve ser um número válido e positivo', 'error');
        return;
      }

      if (formData.qtd_devolvida && (isNaN(formData.qtd_devolvida) || parseInt(formData.qtd_devolvida) < 0)) {
        console.log('❌ Quantidade Devolvida inválida:', formData.qtd_devolvida);
        showToast('Quantidade Devolvida deve ser um número válido e positivo', 'error');
        return;
      }

      if (formData.temperatura && (isNaN(formData.temperatura) || parseFloat(formData.temperatura) < -50 || parseFloat(formData.temperatura) > 50)) {
        console.log('❌ Temperatura inválida:', formData.temperatura);
        showToast('Temperatura deve estar entre -50°C e 50°C', 'error');
        return;
      }

      console.log('✅ Todas as validações passaram');
      setLoading(true);
      
      const { saldo, status } = calculateSaldoAndStatus(formData.qtd_pbr, formData.qtd_devolvida);
      console.log('📊 Saldo calculado:', saldo, 'Status:', status);
      
      // Preparar dados base (SEM colunas geradas: saldo e status)
      const baseData = {
        ...formData,
        usuario: user?.email || 'Sistema',
        qtd_pbr: parseInt(formData.qtd_pbr) || 0,
        qtd_desc: parseInt(formData.qtd_desc) || 0,
        qtd_devolvida: parseInt(formData.qtd_devolvida) || 0,
        temperatura: parseFloat(formData.temperatura) || null
      };

      console.log('📦 Dados preparados para Supabase (sem colunas geradas):', baseData);
      console.log('🔗 Testando conexão com Supabase...');

      let result;
      if (editingRecord) {
        console.log('✏️ Atualizando registro existente, ID:', editingRecord.id);
        // Para updates, podemos incluir as colunas geradas
        const updateData = { ...baseData, saldo, status };
        result = await supabase
          .from('expedicoes')
          .update(updateData)
          .eq('id', editingRecord.id);
      } else {
        console.log('➕ Criando novo registro (sem saldo e status - colunas geradas)...');
        // Para inserts, NÃO incluir saldo nem status (colunas geradas)
        result = await supabase
          .from('expedicoes')
          .insert([baseData]);
      }

      console.log('📊 Resultado da operação Supabase:', result);

      if (result.error) {
        console.error('❌ Erro do Supabase:', result.error);
        console.error('❌ Detalhes do erro:', {
          message: result.error.message,
          details: result.error.details,
          hint: result.error.hint,
          code: result.error.code
        });
        throw result.error;
      }

      console.log('✅ Registro salvo com sucesso!');
      showToast(editingRecord ? 'Registro atualizado com sucesso!' : 'Registro salvo com sucesso!', 'success');

      // Reset form
      setFormData({
        empresa: '',
        data: new Date().toISOString().split('T')[0],
        placa: '',
        fretista: '',
        hora_chegada: '',
        hora_saida: '',
        temperatura: '',
        condicao_bau: 'Conforme',
        pontualidade: 'Pontual',
        qtd_pbr: '',
        qtd_desc: '',
        observacao: '',
        qtd_devolvida: ''
      });
      
      setEditingRecord(null);
      setShowModal(false);
      console.log('🔄 Recarregando registros...');
      loadRegistros();
      
    } catch (error) {
      console.error('❌ Erro ao salvar registro:', error);
      console.error('❌ Detalhes completos do erro:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        stack: error.stack
      });
      showToast(`Erro ao salvar registro: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Estatísticas
  const calculateStats = () => {
    const total = registros.length;
    const totalPBR = registros.reduce((sum, r) => sum + (r.qtd_pbr || 0), 0);
    const totalDesc = registros.reduce((sum, r) => sum + (r.qtd_desc || 0), 0);
    const pendentes = registros.filter(r => r.status === 'Pendente').length;
    const conformes = registros.filter(r => r.status === 'Conforme').length;
    const atrasos = registros.filter(r => r.pontualidade === 'Com Atraso').length;
    const naoConformes = registros.filter(r => r.condicao_bau === 'Não Conforme').length;
    const tempMedia = registros.length > 0 ? 
      registros.reduce((sum, r) => sum + (r.temperatura || 0), 0) / registros.length : 0;

    return {
      total,
      totalPBR,
      totalDesc,
      pendentes,
      conformes,
      atrasos,
      naoConformes,
      tempMedia: tempMedia.toFixed(1)
    };
  };

  const stats = calculateStats();

  // Dados para gráficos
  const getAtrasos7Dias = () => {
    const hoje = new Date();
    const dados = [];
    
    for (let i = 6; i >= 0; i--) {
      const data = new Date(hoje);
      data.setDate(data.getDate() - i);
      const dataStr = data.toISOString().split('T')[0];
      
      const atrasos = registros.filter(r => 
        r.data === dataStr && r.pontualidade === 'Com Atraso'
      ).length;
      
      dados.push({
        data: data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        atrasos
      });
    }
    
    return dados;
  };

  const getTempMediaPorFretista = () => {
    const fretistas = {};
    
    registros.forEach(r => {
      if (r.fretista && r.temperatura) {
        if (!fretistas[r.fretista]) {
          fretistas[r.fretista] = { total: 0, count: 0 };
        }
        fretistas[r.fretista].total += r.temperatura;
        fretistas[r.fretista].count += 1;
      }
    });
    
    return Object.entries(fretistas).map(([nome, data]) => ({
      fretista: nome.split(' ')[0], // Primeiro nome
      temperatura: (data.total / data.count).toFixed(1)
    }));
  };

  const getPendenciasPBR = () => {
    return registros
      .filter(r => r.status === 'Pendente')
      .map(r => ({
        data: new Date(r.data).toLocaleDateString('pt-BR'),
        placa: r.placa,
        fretista: r.fretista,
        qtd: r.saldo,
        status: r.status
      }));
  };

  const getAtrasosPorFretista = () => {
    return registros
      .filter(r => r.pontualidade === 'Com Atraso')
      .map(r => ({
        data: new Date(r.data).toLocaleDateString('pt-BR'),
        placa: r.placa,
        fretista: r.fretista,
        hora_chegada: r.hora_chegada,
        pontualidade: r.pontualidade
      }));
  };

  // Filtros
  const filteredRegistros = registros.filter(registro => {
    const matchSearch = !searchTerm || 
      registro.fretista?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registro.placa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registro.empresa?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchDate = !dateFilter || registro.data === dateFilter;
    const matchStatus = !statusFilter || registro.status === statusFilter;
    
    return matchSearch && matchDate && matchStatus;
  });

  // Paginação
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredRegistros.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredRegistros.length / recordsPerPage);

  // Funções de relatórios
  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Cabeçalho do relatório
    doc.setFontSize(20);
    doc.setTextColor(33, 136, 56); // Verde da empresa
    doc.text('RELATÓRIO DE CHECKLIST EXPEDIÇÃO', 20, 25);
    
    // Linha separadora
    doc.setDrawColor(33, 136, 56);
    doc.setLineWidth(0.5);
    doc.line(20, 30, 190, 30);
    
    // Informações do relatório
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Data de Geração: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 20, 40);
    doc.text(`Total de Registros: ${filteredRegistros.length}`, 20, 45);
    doc.text(`Usuário: ${user?.email || 'N/A'}`, 20, 50);
    
    // Resumo estatístico
    const totalPBR = filteredRegistros.reduce((sum, r) => sum + (parseFloat(r.qtd_pbr) || 0), 0);
    const totalDesc = filteredRegistros.reduce((sum, r) => sum + (parseFloat(r.qtd_desc) || 0), 0);
    const totalSaldo = filteredRegistros.reduce((sum, r) => sum + (parseFloat(r.saldo) || 0), 0);
    
    doc.setFontSize(12);
    doc.setTextColor(33, 136, 56);
    doc.text('RESUMO GERAL:', 20, 65);
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total PBR: ${totalPBR.toFixed(2)}`, 20, 75);
    doc.text(`Total Descarga: ${totalDesc.toFixed(2)}`, 70, 75);
    doc.text(`Saldo Total: ${totalSaldo.toFixed(2)}`, 130, 75);
    
    // Status dos registros
    const statusCount = filteredRegistros.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});
    
    let yPos = 85;
    doc.text('Status dos Registros:', 20, yPos);
    Object.entries(statusCount).forEach(([status, count]) => {
      yPos += 5;
      doc.text(`${status}: ${count}`, 25, yPos);
    });
    
    // Tabela de dados
    const tableData = filteredRegistros.map(r => [
      new Date(r.data).toLocaleDateString('pt-BR'),
      r.empresa || '-',
      r.placa || '-',
      r.fretista || '-',
      (parseFloat(r.qtd_pbr) || 0).toFixed(2),
      (parseFloat(r.qtd_desc) || 0).toFixed(2),
      (parseFloat(r.saldo) || 0).toFixed(2),
      r.status || '-',
      r.observacao ? r.observacao.substring(0, 30) + '...' : '-'
    ]);
    
    autoTable(doc, {
      head: [['Data', 'Empresa', 'Placa', 'Fretista', 'PBR', 'Descarga', 'Saldo', 'Status', 'Observação']],
      body: tableData,
      startY: yPos + 15,
      theme: 'grid',
      headStyles: {
        fillColor: [33, 136, 56],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 8,
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 20 }, // Data
        1: { cellWidth: 25 }, // Empresa
        2: { cellWidth: 20 }, // Placa
        3: { cellWidth: 25 }, // Fretista
        4: { cellWidth: 15 }, // PBR
        5: { cellWidth: 18 }, // Descarga
        6: { cellWidth: 15 }, // Saldo
        7: { cellWidth: 20 }, // Status
        8: { cellWidth: 30 }  // Observação
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });
    
    // Rodapé
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Página ${i} de ${pageCount}`, 170, 285);
      doc.text('Sistema de Gestão Logística - GDM LOGBA', 20, 285);
    }
    
    doc.save(`checklist-expedicao-${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('PDF gerado com sucesso!', 'success');
  };

  const generateHTML = () => {
    const totalPBR = filteredRegistros.reduce((sum, r) => sum + (parseFloat(r.qtd_pbr) || 0), 0);
    const totalDesc = filteredRegistros.reduce((sum, r) => sum + (parseFloat(r.qtd_desc) || 0), 0);
    const totalSaldo = filteredRegistros.reduce((sum, r) => sum + (parseFloat(r.saldo) || 0), 0);
    
    const statusCount = filteredRegistros.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Checklist Expedição</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #218838 0%, #28a745 100%);
            color: white;
            padding: 30px;
            text-align: center;
            position: relative;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            opacity: 0.3;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
        }
        
        .header .subtitle {
            font-size: 1.1rem;
            opacity: 0.9;
            position: relative;
            z-index: 1;
        }
        
        .report-info {
            background: #f8f9fa;
            padding: 25px;
            border-bottom: 3px solid #218838;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .info-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
            border-left: 4px solid #218838;
        }
        
        .info-card h3 {
            color: #218838;
            margin-bottom: 10px;
            font-size: 1.1rem;
        }
        
        .info-card p {
            color: #666;
            font-size: 0.95rem;
        }
        
        .summary-section {
            padding: 30px;
            background: white;
        }
        
        .summary-title {
            color: #218838;
            font-size: 1.8rem;
            margin-bottom: 25px;
            text-align: center;
            position: relative;
        }
        
        .summary-title::after {
            content: '';
            position: absolute;
            bottom: -10px;
            left: 50%;
            transform: translateX(-50%);
            width: 80px;
            height: 3px;
            background: linear-gradient(90deg, #218838, #28a745);
            border-radius: 2px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: linear-gradient(135deg, #218838 0%, #28a745 100%);
            color: white;
            padding: 25px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 8px 25px rgba(33, 136, 56, 0.3);
            transform: translateY(0);
            transition: transform 0.3s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
        }
        
        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 0.9rem;
            opacity: 0.9;
        }
        
        .status-section {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }
        
        .status-item {
            background: white;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 3px 10px rgba(0,0,0,0.1);
        }
        
        .table-section {
            padding: 0 30px 30px;
        }
        
        .table-container {
            overflow-x: auto;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            background: white;
        }
        
        th {
            background: linear-gradient(135deg, #218838 0%, #28a745 100%);
            color: white;
            padding: 15px 10px;
            text-align: center;
            font-weight: 600;
            font-size: 0.9rem;
        }
        
        td {
            padding: 12px 10px;
            text-align: center;
            border-bottom: 1px solid #eee;
            font-size: 0.85rem;
        }
        
        tr:nth-child(even) {
            background: #f8f9fa;
        }
        
        tr:hover {
            background: #e8f5e8;
        }
        
        .status-badge {
            padding: 4px 8px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .status-concluido {
            background: #d4edda;
            color: #155724;
        }
        
        .status-pendente {
            background: #fff3cd;
            color: #856404;
        }
        
        .status-cancelado {
            background: #f8d7da;
            color: #721c24;
        }
        
        .footer {
            background: #343a40;
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 0.9rem;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .container {
                box-shadow: none;
                border-radius: 0;
            }
            
            .stat-card:hover {
                transform: none;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 RELATÓRIO DE CHECKLIST EXPEDIÇÃO</h1>
            <p class="subtitle">Sistema de Gestão Logística - GDM LOGBA</p>
        </div>
        
        <div class="report-info">
            <div class="info-grid">
                <div class="info-card">
                    <h3>📅 Data de Geração</h3>
                    <p>${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
                </div>
                <div class="info-card">
                    <h3>📊 Total de Registros</h3>
                    <p>${filteredRegistros.length} registros encontrados</p>
                </div>
                <div class="info-card">
                    <h3>👤 Usuário</h3>
                    <p>${user?.email || 'N/A'}</p>
                </div>
            </div>
        </div>
        
        <div class="summary-section">
            <h2 class="summary-title">📈 RESUMO EXECUTIVO</h2>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${totalPBR.toFixed(2)}</div>
                    <div class="stat-label">Total PBR</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${totalDesc.toFixed(2)}</div>
                    <div class="stat-label">Total Descarga</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${totalSaldo.toFixed(2)}</div>
                    <div class="stat-label">Saldo Total</div>
                </div>
            </div>
            
            <div class="status-section">
                <h3 style="color: #218838; margin-bottom: 15px;">📋 Status dos Registros</h3>
                <div class="status-grid">
                    ${Object.entries(statusCount).map(([status, count]) => `
                        <div class="status-item">
                            <strong>${count}</strong><br>
                            <small>${status}</small>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        
        <div class="table-section">
            <h2 style="color: #218838; margin-bottom: 20px; text-align: center;">📋 DETALHAMENTO DOS REGISTROS</h2>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Empresa</th>
                            <th>Placa</th>
                            <th>Fretista</th>
                            <th>PBR</th>
                            <th>Descarga</th>
                            <th>Saldo</th>
                            <th>Status</th>
                            <th>Observação</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredRegistros.map(r => `
                            <tr>
                                <td>${new Date(r.data).toLocaleDateString('pt-BR')}</td>
                                <td>${r.empresa || '-'}</td>
                                <td><strong>${r.placa || '-'}</strong></td>
                                <td>${r.fretista || '-'}</td>
                                <td>${(parseFloat(r.qtd_pbr) || 0).toFixed(2)}</td>
                                <td>${(parseFloat(r.qtd_desc) || 0).toFixed(2)}</td>
                                <td><strong>${(parseFloat(r.saldo) || 0).toFixed(2)}</strong></td>
                                <td><span class="status-badge status-${r.status?.toLowerCase() || 'pendente'}">${r.status || '-'}</span></td>
                                <td>${r.observacao || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="footer">
            <p>© ${new Date().getFullYear()} GDM LOGBA - Sistema de Gestão Logística</p>
            <p>Relatório gerado automaticamente em ${new Date().toLocaleString('pt-BR')}</p>
        </div>
    </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `checklist-expedicao-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Relatório HTML gerado com sucesso!', 'success');
  };

  const generateXLS = () => {
    const ws = XLSX.utils.json_to_sheet(filteredRegistros);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Checklist Expedição');
    XLSX.writeFile(wb, 'checklist-expedicao.xlsx');
    showToast('Excel gerado com sucesso!', 'success');
  };

  const shareWhatsApp = () => {
    const message = `📊 *Resumo Checklist Expedição*\n\n` +
      `📅 Data: ${new Date().toLocaleDateString('pt-BR')}\n` +
      `📦 Total Registros: ${stats.total}\n` +
      `🚛 PBR Expedidos: ${stats.totalPBR}\n` +
      `📋 Descartáveis: ${stats.totalDesc}\n` +
      `⏰ Atrasos: ${stats.atrasos}\n` +
      `❌ Não Conformes: ${stats.naoConformes}\n` +
      `🌡️ Temp. Média: ${stats.tempMedia}°C`;
    
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Controle de acesso por tipo de usuário
  const canAccessForm = () => {
    return ['colaborador', 'administrador', 'expedidor'].includes(userType);
  };

  const canAccessAnalytics = () => {
    return ['colaborador', 'administrador', 'fretista', 'expedidor'].includes(userType);
  };

  const canAccessTable = () => {
    return ['colaborador', 'administrador', 'fretista', 'expedidor'].includes(userType);
  };

  const canAccessReports = () => {
    return ['colaborador', 'administrador', 'expedidor'].includes(userType);
  };

  // Componente do Formulário
  const FormSection = () => {
    if (!canAccessForm()) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: 24,
          marginBottom: 24,
          background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
          backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
          border: isDarkMode ? '1px solid #0F0F0F' : '1px solid #e0e0e0',
          borderRadius: 16,
          boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : '0 4px 12px rgba(0,0,0,0.1)'
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'}`}>
            <Plus className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold">Novo Registro de Expedição</h2>
        </div>

        {/* Informações Básicas */}
        <div style={{
          background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.8) 0%, rgba(25, 25, 25, 0.6) 100%)' : '#f8fafc',
          backdropFilter: isDarkMode ? 'blur(15px)' : 'none',
          border: isDarkMode ? '1px solid #0F0F0F' : '1px solid #e2e8f0',
          borderRadius: 12,
          padding: 16,
          marginBottom: 24
        }}>
          <div className="flex items-center gap-2 mb-4">
            <Building className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold" style={{ color: isDarkMode ? '#fff' : '#2d3748' }}>Informações Básicas</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Empresa */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <Building className="w-4 h-4 inline mr-1 text-blue-600" />
                Empresa *
              </label>
              <select
                value={formData.empresa}
                onChange={(e) => setFormData(prev => ({ ...prev, empresa: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: isDarkMode ? '1px solid #0F0F0F' : '1px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: 14,
                  background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.8) 0%, rgba(25, 25, 25, 0.6) 100%)' : '#fff',
                  color: isDarkMode ? '#FFFFFF' : '#333',
                  backdropFilter: isDarkMode ? 'blur(15px)' : 'none',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = isDarkMode ? '#0F0F0F' : '#e2e8f0'}
                required
              >
                <option value="">Selecione a empresa</option>
                {empresasData.map(emp => (
                  <option key={emp.cnpj} value={emp.nome_fantasia}>
                    {emp.nome_fantasia}
                  </option>
                ))}
              </select>
            </div>

            {/* Data */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <CalendarIcon className="w-4 h-4 inline mr-1 text-green-600" />
                Data *
              </label>
              <input
                type="date"
                value={formData.data}
                onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: isDarkMode ? '1px solid #0F0F0F' : '1px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: 14,
                  background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.8) 0%, rgba(25, 25, 25, 0.6) 100%)' : '#fff',
                  color: isDarkMode ? '#FFFFFF' : '#333',
                  backdropFilter: isDarkMode ? 'blur(15px)' : 'none',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#10b981'}
                onBlur={(e) => e.target.style.borderColor = isDarkMode ? '#0F0F0F' : '#e2e8f0'}
                required
              />
            </div>

            {/* Placa */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <Truck className="w-4 h-4 inline mr-1 text-orange-600" />
                Placa *
              </label>
              <select
                value={showCustomPlaca ? 'OUTRO_DIGITAR' : formData.placa}
                onChange={(e) => handlePlacaChange(e.target.value)}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`}
                required
              >
                <option value="">Selecione a placa</option>
                {fretistasData.map(fret => (
                  <option key={fret.placa} value={fret.placa}>
                    {fret.placa}
                  </option>
                ))}
                <option value="OUTRO_DIGITAR">Outro (digitar)</option>
              </select>
              
              {/* Campo customizado para placa */}
              {showCustomPlaca && (
                <input
                  type="text"
                  value={customPlaca}
                  onChange={(e) => handleCustomPlacaChange(e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all mt-2 ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`}
                  placeholder="Digite a placa personalizada"
                  required
                />
              )}
            </div>

            {/* Fretista */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <User className="w-4 h-4 inline mr-1 text-purple-600" />
                Fretista
              </label>
              {!showCustomPlaca ? (
                <input
                  type="text"
                  value={formData.fretista}
                  readOnly
                  className={`w-full p-3 border rounded-lg ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-slate-300' : 'bg-gray-100 border-gray-300 text-gray-600'}`}
                  placeholder="Auto-preenchido pela placa"
                />
              ) : (
                <>
                  <select
                    value={showCustomFretista ? 'OUTRO_DIGITAR' : formData.fretista}
                    onChange={(e) => handleFretistaChange(e.target.value)}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="">Selecione o fretista</option>
                    {[...new Set(fretistasData.map(fret => fret.nome))].map(nome => (
                      <option key={nome} value={nome}>
                        {nome}
                      </option>
                    ))}
                    <option value="OUTRO_DIGITAR">Outro (digitar)</option>
                  </select>
                  
                  {/* Campo customizado para fretista */}
                  {showCustomFretista && (
                    <input
                      type="text"
                      value={customFretista}
                      onChange={(e) => handleCustomFretistaChange(e.target.value)}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all mt-2 ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`}
                      placeholder="Digite o nome do fretista"
                      required
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Horários */}
        <div className={`${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-50'} rounded-lg p-4 mb-6`}>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold">Controle de Horários</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Hora de Chegada */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <Clock className="w-4 h-4 inline mr-1 text-green-600" />
                Hora de Chegada
              </label>
              <input
                type="time"
                value={formData.hora_chegada}
                onChange={(e) => setFormData(prev => ({ ...prev, hora_chegada: e.target.value }))}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`}
              />
            </div>

            {/* Hora de Saída */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <Clock className="w-4 h-4 inline mr-1 text-red-600" />
                Hora de Saída
              </label>
              <input
                type="time"
                value={formData.hora_saida}
                onChange={(e) => setFormData(prev => ({ ...prev, hora_saida: e.target.value }))}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`}
              />
            </div>
          </div>
        </div>

        {/* Condições e Qualidade */}
        <div className={`${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-50'} rounded-lg p-4 mb-6`}>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-semibold">Condições e Qualidade</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Temperatura */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <Thermometer className="w-4 h-4 inline mr-1 text-cyan-600" />
                Temperatura (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.temperatura}
                onChange={(e) => setFormData(prev => ({ ...prev, temperatura: e.target.value }))}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`}
                placeholder="Ex: -18.5"
              />
            </div>

            {/* Condições do Baú */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <Package className="w-4 h-4 inline mr-1 text-amber-600" />
                Condições do Baú
              </label>
              <select
                value={formData.condicao_bau}
                onChange={(e) => setFormData(prev => ({ ...prev, condicao_bau: e.target.value }))}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`}
              >
                <option value="Conforme">✅ Conforme</option>
                <option value="Não Conforme">❌ Não Conforme</option>
              </select>
            </div>

            {/* Pontualidade */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <Clock className="w-4 h-4 inline mr-1 text-emerald-600" />
                Pontualidade
              </label>
              <select
                value={formData.pontualidade}
                onChange={(e) => setFormData(prev => ({ ...prev, pontualidade: e.target.value }))}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`}
              >
                <option value="Pontual">⏰ Pontual</option>
                <option value="Com Atraso">⏳ Com Atraso</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quantidades */}
        <div className={`${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-50'} rounded-lg p-4 mb-6`}>
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Controle de Quantidades</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Qtd. PBR */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <Package className="w-4 h-4 inline mr-1 text-blue-600" />
                Qtd. PBR *
              </label>
              <input
                type="number"
                value={formData.qtd_pbr}
                onChange={(e) => setFormData(prev => ({ ...prev, qtd_pbr: e.target.value }))}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`}
                placeholder="Quantidade de PBR"
                required
              />
            </div>

            {/* Qtd. Descartáveis */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <Trash2 className="w-4 h-4 inline mr-1 text-red-600" />
                Qtd. Descartáveis
              </label>
              <input
                type="number"
                value={formData.qtd_desc}
                onChange={(e) => setFormData(prev => ({ ...prev, qtd_desc: e.target.value }))}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`}
                placeholder="Quantidade de descartáveis"
              />
            </div>

            {/* Qtd. Devolvida */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <TrendingDown className="w-4 h-4 inline mr-1 text-orange-600" />
                Qtd. Devolvida
              </label>
              <input
                type="number"
                value={formData.qtd_devolvida}
                onChange={(e) => setFormData(prev => ({ ...prev, qtd_devolvida: e.target.value }))}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`}
                placeholder="Quantidade devolvida"
              />
            </div>
          </div>
        </div>

        {/* Observações */}
        <div className={`${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-50'} rounded-lg p-4 mb-6`}>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold">Observações</h3>
          </div>
          <textarea
            value={formData.observacao}
            onChange={(e) => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`}
            rows="4"
            placeholder="Observações adicionais, problemas encontrados, comentários..."
          />
        </div>

        {/* Botões de Ação */}
        <div className={`${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-50'} rounded-lg p-4`}>
          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            <button
              onClick={() => {/* Implementar upload de imagens */}}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Image className="w-5 h-5" />
              Anexar Evidências
            </button>
            
            <button
              onClick={handleSaveRecord}
              disabled={loading}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <CheckCircle className="w-5 h-5" />
              {loading ? 'Salvando...' : 'Salvar Registro'}
            </button>
            
            <button
              onClick={shareWhatsApp}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Share className="w-5 h-5" />
              Compartilhar
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  // Componente de Estatísticas
  const StatsSection = () => {
    if (!canAccessAnalytics()) return null;

    const atrasos7Dias = getAtrasos7Dias();
    const tempPorFretista = getTempMediaPorFretista();
    const pendenciasPBR = getPendenciasPBR();
    const atrasosPorFretista = getAtrasosPorFretista();

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Checklists</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">PBR Expedidos</p>
                <p className="text-2xl font-bold">{stats.totalPBR}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Package className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Descartáveis</p>
                <p className="text-2xl font-bold">{stats.totalDesc}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Trash2 className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pendentes</p>
                <p className="text-2xl font-bold">{stats.pendentes}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Conformes</p>
                <p className="text-2xl font-bold">{stats.conformes}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Atrasos</p>
                <p className="text-2xl font-bold">{stats.atrasos}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Não Conformes</p>
                <p className="text-2xl font-bold">{stats.naoConformes}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Temp. Média</p>
                <p className="text-2xl font-bold">{stats.tempMedia}°C</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Thermometer className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
          <h3 className="text-lg font-semibold mb-4">Filtros</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Buscar</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Fretista, placa, empresa..."
                className={`w-full p-3 border rounded-lg ${theme === 'dark' ? 'bg-slate-700 border-gray-600' : 'bg-white border-gray-300'}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Data</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className={`w-full p-3 border rounded-lg ${theme === 'dark' ? 'bg-slate-700 border-gray-600' : 'bg-white border-gray-300'}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`w-full p-3 border rounded-lg ${theme === 'dark' ? 'bg-slate-700 border-gray-600' : 'bg-white border-gray-300'}`}
              >
                <option value="">Todos</option>
                <option value="Conforme">Conforme</option>
                <option value="Pendente">Pendente</option>
                <option value="Excesso">Excesso</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setDateFilter('');
                  setStatusFilter('');
                }}
                className="w-full p-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Tabelas de Análise */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pendências PBR por Fretista */}
          <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
            <h3 className="text-lg font-semibold mb-4">Pendências PBR por Fretista</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-50'}`}>
                    <th className="p-2 text-left">Data</th>
                    <th className="p-2 text-left">Placa</th>
                    <th className="p-2 text-left">Fretista</th>
                    <th className="p-2 text-left">Qtd</th>
                    <th className="p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pendenciasPBR.slice(0, 5).map((item, index) => (
                    <tr key={index} className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                      <td className="p-2">{item.data}</td>
                      <td className="p-2">{item.placa}</td>
                      <td className="p-2">{item.fretista}</td>
                      <td className="p-2">{item.qtd}</td>
                      <td className="p-2">
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Atrasos por Fretista */}
          <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
            <h3 className="text-lg font-semibold mb-4">Atrasos por Fretista</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-50'}`}>
                    <th className="p-2 text-left">Data</th>
                    <th className="p-2 text-left">Placa</th>
                    <th className="p-2 text-left">Fretista</th>
                    <th className="p-2 text-left">Hora Chegada</th>
                    <th className="p-2 text-left">Pontualidade</th>
                  </tr>
                </thead>
                <tbody>
                  {atrasosPorFretista.slice(0, 5).map((item, index) => (
                    <tr key={index} className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                      <td className="p-2">{item.data}</td>
                      <td className="p-2">{item.placa}</td>
                      <td className="p-2">{item.fretista}</td>
                      <td className="p-2">{item.hora_chegada}</td>
                      <td className="p-2">
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                          {item.pontualidade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Atrasos nos Últimos 7 Dias */}
          <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
            <h3 className="text-lg font-semibold mb-4">Atrasos nos Últimos 7 Dias</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={atrasos7Dias}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="atrasos" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de Temperatura Média por Fretista */}
          <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
            <h3 className="text-lg font-semibold mb-4">Temperatura Média por Fretista</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tempPorFretista}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fretista" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="temperatura" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>
    );
  };

  // Componente da Tabela
  const TableSection = () => {
    if (!canAccessTable()) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-lg p-6`}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Registros de Expedição</h2>
          <div className="text-sm text-gray-500">
            {filteredRegistros.length} registros encontrados
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-50'}`}>
                    <th className="p-3 text-left">Data</th>
                    <th className="p-3 text-left">Empresa</th>
                    <th className="p-3 text-left">Placa</th>
                    <th className="p-3 text-left">Fretista</th>
                    <th className="p-3 text-left">Chegada</th>
                    <th className="p-3 text-left">Saída</th>
                    <th className="p-3 text-left">Temp.</th>
                    <th className="p-3 text-left">Baú</th>
                    <th className="p-3 text-left">Pontualidade</th>
                    <th className="p-3 text-left">Qtd. PBR</th>
                    <th className="p-3 text-left">Qtd. Desc.</th>
                    <th className="p-3 text-left">Qtd. Dev.</th>
                    <th className="p-3 text-left">Saldo</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">Observação</th>
                    <th className="p-3 text-left">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRecords.map((registro) => (
                    <tr key={registro.id} className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} hover:bg-gray-50 ${theme === 'dark' ? 'hover:bg-slate-700' : ''}`}>
                      <td className="p-3">{new Date(registro.data).toLocaleDateString('pt-BR')}</td>
                      <td className="p-3">{registro.empresa}</td>
                      <td className="p-3">{registro.placa}</td>
                      <td className="p-3">{registro.fretista}</td>
                      <td className="p-3">{registro.hora_chegada}</td>
                      <td className="p-3">{registro.hora_saida}</td>
                      <td className="p-3">{registro.temperatura}°C</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          registro.condicao_bau === 'Conforme' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {registro.condicao_bau}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          registro.pontualidade === 'Pontual' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {registro.pontualidade}
                        </span>
                      </td>
                      <td className="p-3">{registro.qtd_pbr}</td>
                      <td className="p-3">{registro.qtd_desc}</td>
                      <td className="p-3">{registro.qtd_devolvida}</td>
                      <td className="p-3">{registro.saldo}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          registro.status === 'Conforme' 
                            ? 'bg-green-100 text-green-800' 
                            : registro.status === 'Pendente'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {registro.status}
                        </span>
                      </td>
                      <td className="p-3 max-w-xs truncate">{registro.observacao}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingRecord(registro);
                              setFormData(registro);
                              setShowModal(true);
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingRecord(registro);
                              setShowModal(true);
                            }}
                            className="p-1 text-green-600 hover:bg-green-100 rounded"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm('Deseja excluir este registro?')) {
                                try {
                                  const { error } = await supabase
                                    .from('expedicoes')
                                    .delete()
                                    .eq('id', registro.id);
                                  
                                  if (error) throw error;
                                  showToast('Registro excluído com sucesso!', 'success');
                                  loadRegistros();
                                } catch (error) {
                                  showToast('Erro ao excluir registro', 'error');
                                }
                              }
                            }}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-purple-600 hover:bg-purple-100 rounded">
                            <Image className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                Mostrando {indexOfFirstRecord + 1} a {Math.min(indexOfLastRecord, filteredRegistros.length)} de {filteredRegistros.length} registros
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="px-3 py-1">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    );
  };

  // Componente de Relatórios
  const ReportsSection = () => {
    if (!canAccessReports()) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-lg p-6`}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-green-900' : 'bg-green-100'}`}>
            <Download className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="text-xl font-bold">Relatórios e Exportação</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={generatePDF}
            className="flex items-center gap-3 p-4 border-2 border-dashed border-red-300 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors"
          >
            <FileText className="w-8 h-8 text-red-600" />
            <div className="text-left">
              <div className="font-semibold">Gerar PDF</div>
              <div className="text-sm text-gray-500">Relatório completo</div>
            </div>
          </button>

          <button
            onClick={generateXLS}
            className="flex items-center gap-3 p-4 border-2 border-dashed border-green-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <Download className="w-8 h-8 text-green-600" />
            <div className="text-left">
              <div className="font-semibold">Gerar XLS</div>
              <div className="text-sm text-gray-500">Planilha Excel</div>
            </div>
          </button>

          <button
            onClick={generateHTML}
            className="flex items-center gap-3 p-4 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <FileText className="w-8 h-8 text-blue-600" />
            <div className="text-left">
              <div className="font-semibold">Gerar HTML</div>
              <div className="text-sm text-gray-500">Página web</div>
            </div>
          </button>

          <button
            onClick={shareWhatsApp}
            className="flex items-center gap-3 p-4 border-2 border-dashed border-green-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <Share className="w-8 h-8 text-green-600" />
            <div className="text-left">
              <div className="font-semibold">WhatsApp</div>
              <div className="text-sm text-gray-500">Compartilhar resumo</div>
            </div>
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Informações dos Relatórios</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• PDF: Relatório completo com todas as informações</li>
            <li>• XLS: Planilha para análise de dados</li>
            <li>• HTML: Página web para visualização</li>
            <li>• WhatsApp: Resumo executivo para compartilhamento</li>
          </ul>
        </div>
      </motion.div>
    );
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Checklist Expedição</h1>
          <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Controle completo de expedição de mercadorias</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {canAccessForm() && (
            <button
              onClick={() => setActiveTab('form')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'form'
                  ? 'bg-blue-600 text-white'
                  : theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              1ª Parte - Formulário
            </button>
          )}
          
          {canAccessAnalytics() && (
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-blue-600 text-white'
                  : theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              2ª Parte - Análises
            </button>
          )}
          
          {canAccessTable() && (
            <button
              onClick={() => setActiveTab('table')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'table'
                  ? 'bg-blue-600 text-white'
                  : theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              3ª Parte - Tabela
            </button>
          )}
          
          {canAccessReports() && (
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'reports'
                  ? 'bg-blue-600 text-white'
                  : theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              4ª Parte - Relatórios
            </button>
          )}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'form' && <FormSection key="form" />}
          {activeTab === 'analytics' && <StatsSection key="analytics" />}
          {activeTab === 'table' && <TableSection key="table" />}
          {activeTab === 'reports' && <ReportsSection key="reports" />}
        </AnimatePresence>

        {/* Modal para visualizar/editar registros */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                   {editingRecord ? 'Detalhes do Registro' : 'Novo Registro'}
                 </h3>
                 <button
                   onClick={() => {
                     setShowModal(false);
                     setEditingRecord(null);
                   }}
                   className="text-gray-500 hover:text-gray-700"
                 >
                   ✕
                 </button>
               </div>

               {editingRecord && (
                 <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-medium mb-1">Empresa</label>
                       <p className={`p-2 rounded ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'}`}>
                         {editingRecord.empresa}
                       </p>
                     </div>
                     <div>
                       <label className="block text-sm font-medium mb-1">Data</label>
                       <p className={`p-2 rounded ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'}`}>
                         {new Date(editingRecord.data).toLocaleDateString('pt-BR')}
                       </p>
                     </div>
                     <div>
                       <label className="block text-sm font-medium mb-1">Placa</label>
                       <p className={`p-2 rounded ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'}`}>
                         {editingRecord.placa}
                       </p>
                     </div>
                     <div>
                       <label className="block text-sm font-medium mb-1">Fretista</label>
                       <p className={`p-2 rounded ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'}`}>
                         {editingRecord.fretista}
                       </p>
                     </div>
                     <div>
                       <label className="block text-sm font-medium mb-1">Hora Chegada</label>
                       <p className={`p-2 rounded ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'}`}>
                         {editingRecord.hora_chegada}
                       </p>
                     </div>
                     <div>
                       <label className="block text-sm font-medium mb-1">Hora Saída</label>
                       <p className={`p-2 rounded ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'}`}>
                         {editingRecord.hora_saida}
                       </p>
                     </div>
                     <div>
                       <label className="block text-sm font-medium mb-1">Temperatura</label>
                       <p className={`p-2 rounded ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'}`}>
                         {editingRecord.temperatura}°C
                       </p>
                     </div>
                     <div>
                       <label className="block text-sm font-medium mb-1">Condição do Baú</label>
                       <p className={`p-2 rounded ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'}`}>
                         {editingRecord.condicao_bau}
                       </p>
                     </div>
                     <div>
                       <label className="block text-sm font-medium mb-1">Pontualidade</label>
                       <p className={`p-2 rounded ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'}`}>
                         {editingRecord.pontualidade}
                       </p>
                     </div>
                     <div>
                       <label className="block text-sm font-medium mb-1">Qtd. PBR</label>
                       <p className={`p-2 rounded ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'}`}>
                         {editingRecord.qtd_pbr}
                       </p>
                     </div>
                     <div>
                       <label className="block text-sm font-medium mb-1">Qtd. Descartáveis</label>
                       <p className={`p-2 rounded ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'}`}>
                         {editingRecord.qtd_desc}
                       </p>
                     </div>
                     <div>
                       <label className="block text-sm font-medium mb-1">Qtd. Devolvida</label>
                       <p className={`p-2 rounded ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'}`}>
                         {editingRecord.qtd_devolvida}
                       </p>
                     </div>
                     <div>
                       <label className="block text-sm font-medium mb-1">Saldo</label>
                       <p className={`p-2 rounded ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'}`}>
                         {editingRecord.saldo}
                       </p>
                     </div>
                     <div>
                       <label className="block text-sm font-medium mb-1">Status</label>
                       <span className={`px-2 py-1 rounded-full text-xs ${
                         editingRecord.status === 'Conforme' 
                           ? 'bg-green-100 text-green-800' 
                           : editingRecord.status === 'Pendente'
                           ? 'bg-red-100 text-red-800'
                           : 'bg-yellow-100 text-yellow-800'
                       }`}>
                         {editingRecord.status}
                       </span>
                     </div>
                   </div>
                   
                   {editingRecord.observacao && (
                     <div>
                       <label className="block text-sm font-medium mb-1">Observação</label>
                       <p className={`p-2 rounded ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'}`}>
                         {editingRecord.observacao}
                       </p>
                     </div>
                   )}

                   <div>
                     <label className="block text-sm font-medium mb-1">Usuário</label>
                     <p className={`p-2 rounded ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'}`}>
                       {editingRecord.usuario}
                     </p>
                   </div>

                   <div>
                     <label className="block text-sm font-medium mb-1">Criado em</label>
                     <p className={`p-2 rounded ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'}`}>
                       {new Date(editingRecord.criado_em).toLocaleString('pt-BR')}
                     </p>
                   </div>
                 </div>
               )}
             </div>
           </div>
         )}
       </div>
     </div>
   );
 };

 export default ChecklistExpedicao;


