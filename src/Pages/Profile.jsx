import React, { useState } from 'react';
import { useAuth } from '../AuthContext.js';
import { useTheme } from '../contexts/ThemeContext.js';
import { LogOut, User, Shield, Truck, Settings } from 'lucide-react';
import '../App.css';
import PageHeader from '../Components/PageHeader.jsx';
import { useNavigate } from 'react-router-dom';
import AdminUserModal from '../Components/AdminUserModal.jsx';
import { getAllUsers, updateUserType, deleteUser, addUser } from '../firebaseUtils.js';
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db } from '../firebaseConfig.js';
import NotificationSettings from '../Components/NotificationSettings.jsx';

function Profile() {
  const { currentUser, logout } = useAuth();
  const { isDarkMode } = useTheme();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [openUserTypeModal, setOpenUserTypeModal] = useState(false);
  const [openUserConfigModal, setOpenUserConfigModal] = useState(false);
  const [openReportModal, setOpenReportModal] = useState(false);
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [savingUserId, setSavingUserId] = useState(null);
  const [userTypes, setUserTypes] = useState({}); // { userId: 'tipo' }
  const [editingUsers, setEditingUsers] = useState({}); // { userId: { nome, email } }
  const [addingUser, setAddingUser] = useState({ nome: '', email: '', type: 'fretista' });
  const [savingUserConfigId, setSavingUserConfigId] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [addingUserLoading, setAddingUserLoading] = useState(false);
  const [accessLogs, setAccessLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Carregar usuários ao abrir o modal
  React.useEffect(() => {
    if (openUserTypeModal) {
      setLoadingUsers(true);
      getAllUsers().then((data) => {
        setUsers(data);
        // Preencher tipos atuais
        const tipos = {};
        data.forEach(u => { tipos[u.id] = u.type || 'fretista'; });
        setUserTypes(tipos);
      }).catch(() => {
        alert('Erro ao carregar usuários!');
      }).finally(() => setLoadingUsers(false));
    }
  }, [openUserTypeModal]);

  // Carregar usuários ao abrir o modal de configurações
  React.useEffect(() => {
    if (openUserConfigModal) {
      setLoadingUsers(true);
      getAllUsers().then((data) => {
        setUsers(data);
        // Preencher edição
        const ed = {};
        data.forEach(u => { ed[u.id] = { nome: u.nome || '', email: u.email || '' }; });
        setEditingUsers(ed);
      }).catch(() => {
        alert('Erro ao carregar usuários!');
      }).finally(() => setLoadingUsers(false));
    }
  }, [openUserConfigModal]);

  // Carregar logs ao abrir o modal de relatório
  React.useEffect(() => {
    if (openReportModal) {
      setLoadingLogs(true);
      getDocs(collection(db, 'user_access_logs')).then(snapshot => {
        const logs = [];
        snapshot.forEach(doc => logs.push(doc.data()));
        // Ordenar por data/hora decrescente
        logs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        setAccessLogs(logs);
      }).catch(() => {
        alert('Erro ao carregar registros de acesso!');
      }).finally(() => setLoadingLogs(false));
    }
  }, [openReportModal]);

  const handleTypeChange = (userId, newType) => {
    setUserTypes(prev => ({ ...prev, [userId]: newType }));
  };

  const handleSaveType = async (userId) => {
    setSavingUserId(userId);
    try {
      await updateUserType(userId, userTypes[userId]);
      // Recarregar dados para garantir que a alteração foi salva
      const updatedUsers = await getAllUsers();
      setUsers(updatedUsers);
      // Atualizar tipos locais
      const tipos = {};
      updatedUsers.forEach(u => { tipos[u.id] = u.type || 'fretista'; });
      setUserTypes(tipos);
      alert('Tipo de usuário atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar tipo:', error);
      alert('Erro ao atualizar tipo de usuário!');
    }
    setSavingUserId(null);
  };

  const handleEditUserField = (userId, field, value) => {
    setEditingUsers(prev => ({ ...prev, [userId]: { ...prev[userId], [field]: value } }));
  };

  const handleSaveUserConfig = async (userId) => {
    setSavingUserConfigId(userId);
    try {
      await updateUserType(userId, userTypes[userId]); // tipo
      await updateDoc(doc(require('../firebaseConfig.js').db, 'users', userId), editingUsers[userId]); // nome/email
      alert('Usuário atualizado com sucesso!');
    } catch {
      alert('Erro ao atualizar usuário!');
    }
    setSavingUserConfigId(null);
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return;
    setDeletingUserId(userId);
    try {
      await deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
      alert('Usuário excluído com sucesso!');
    } catch {
      alert('Erro ao excluir usuário!');
    }
    setDeletingUserId(null);
  };

  const handleAddUser = async () => {
    if (!addingUser.email || !addingUser.nome) {
      alert('Preencha nome e e-mail!');
      return;
    }
    setAddingUserLoading(true);
    try {
      await addUser(addingUser);
      setAddingUser({ nome: '', email: '', type: 'fretista' });
      setOpenUserConfigModal(false); // Fecha para recarregar
      setTimeout(() => setOpenUserConfigModal(true), 100); // Reabre para recarregar
      alert('Usuário adicionado com sucesso!');
    } catch {
      alert('Erro ao adicionar usuário!');
    }
    setAddingUserLoading(false);
  };

  const handleExportXLSX = () => {
    if (accessLogs.length === 0) {
      alert('Nenhum registro para exportar!');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(accessLogs.map(log => ({
      'E-mail': log.email,
      'Data': log.date,
      'Hora': log.time
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Acessos');
    XLSX.writeFile(wb, 'relatorio_acessos.xlsx');
  };

  // Dummy user roles for demonstration
  const isAdmin = currentUser && ['colaboradordocemel@gmail.com', 'jrobed10@gmail.com', 'eujunio13@gmail.com', 'adm.salvador@frutasdocemel.com.br', 'usuariodocemel@gmail.com', 'obedysg@gmail.com', 'faturamentosalvador@frutasdocemel.com.br', 'jessica.louvores@frutasdocemel.com.br'].includes(currentUser.email);
  const isCollaborator = currentUser && (isAdmin || currentUser.email === 'collaborator@example.com'); // Example collaborator email
  const isFretista = currentUser && !isAdmin && !isCollaborator; // Default if not admin or collaborator

  const handleLogout = async () => {
    if (isLoggingOut) return; // Evitar múltiplos cliques
    
    try {
      // Confirmação antes do logout
      const confirmLogout = window.confirm('Tem certeza que deseja sair da sua conta?');
      if (!confirmLogout) return;
      
      setIsLoggingOut(true);
      await logout();
      console.log('Logout realizado com sucesso');
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      alert('Erro ao fazer logout. Tente novamente.');
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="profile-container" style={{maxWidth: '800px', margin: '0 auto', padding: '16px 0'}}>
      {/* Cabeçalho moderno padrão localização */}
      <PageHeader
        title="Perfil"
        subtitle="Gerencie sua conta e permissões de acesso"
        icon={User}
      />


      {currentUser ? (
        <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
          {/* Informações Básicas */}
          <div className="card" style={{padding: 16}}>
            <h3 style={{fontSize: '1.1rem', color: '#218838', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6}}>
              <User style={{width: 18, height: 18}} />
              Informações Básicas
            </h3>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12}}>
              <div style={{background: isDarkMode ? '#2a2a2a' : '#f8f9fa', padding: 12, borderRadius: 8}}>
                <p style={{fontWeight: 600, color: isDarkMode ? '#d1d5db' : '#495057', margin: '0 0 6px 0', fontSize: 12}}>📧 Email:</p>
                <p style={{color: isDarkMode ? '#10b981' : '#218838', margin: 0, wordBreak: 'break-all', fontSize: 13}}>{currentUser.email}</p>
              </div>
              <div style={{background: isDarkMode ? '#2a2a2a' : '#f8f9fa', padding: 12, borderRadius: 8}}>
                <p style={{fontWeight: 600, color: isDarkMode ? '#d1d5db' : '#495057', margin: '0 0 6px 0', fontSize: 12}}>👤 Tipo de Usuário:</p>
                <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                  {isAdmin ? (
                    <>
                      <Shield style={{width: 14, height: 14, color: '#dc3545'}} />
                      <span style={{color: '#dc3545', fontWeight: 600, fontSize: 13}}>Administrador</span>
                    </>
                  ) : isCollaborator ? (
                    <>
                      <Settings style={{width: 14, height: 14, color: '#ff9800'}} />
                      <span style={{color: '#ff9800', fontWeight: 600, fontSize: 13}}>Colaborador</span>
                    </>
                  ) : (
                    <>
                      <Truck style={{width: 14, height: 14, color: '#1976d2'}} />
                      <span style={{color: '#1976d2', fontWeight: 600, fontSize: 13}}>Fretista</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Configurações de Notificações Push */}
          <NotificationSettings />

          {/* Permissões e Ações */}
          <div className="card" style={{padding: 16}}>
            <h3 style={{fontSize: '1.1rem', color: '#218838', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6}}>
              <Settings style={{width: 18, height: 18}} />
              Permissões e Ações Disponíveis
            </h3>
            
            {isAdmin && (
              <div style={{background: isDarkMode ? '#2d1b1b' : 'linear-gradient(135deg, #fff5f5 0%, #ffe6e6 100%)', border: isDarkMode ? '1px solid #7f1d1d' : '1px solid #ffcdd2', borderRadius: 8, padding: 14}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8}}>
                  <Shield style={{width: 20, height: 20, color: '#dc3545'}} />
                  <h4 style={{color: '#dc3545', margin: 0, fontSize: '1rem'}}>Controles de Administrador</h4>
                </div>
                <p style={{color: isDarkMode ? '#9ca3af' : '#666', marginBottom: 12, fontSize: 12}}>Acesso completo ao sistema com permissões de administrador.</p>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: 8}}>
                  <button className="btn btn-red" style={{fontSize: 12, padding: '6px 12px'}} onClick={() => setOpenUserTypeModal(true)}>👥 Gerenciar Usuários</button>
                  <button className="btn btn-blue" style={{fontSize: 12, padding: '6px 12px'}} onClick={() => setOpenUserConfigModal(true)}>🔧 Configurações</button>
                  <button className="btn btn-green" style={{fontSize: 12, padding: '6px 12px'}} onClick={() => setOpenReportModal(true)}>📊 Relatórios</button>
                </div>
              </div>
            )}

            {isCollaborator && !isAdmin && (
              <div style={{background: isDarkMode ? '#2d1f0d' : 'linear-gradient(135deg, #fff8e1 0%, #fff3e0 100%)', border: isDarkMode ? '1px solid #92400e' : '1px solid #ffcc02', borderRadius: 8, padding: 14}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8}}>
                  <Settings style={{width: 20, height: 20, color: '#ff9800'}} />
                  <h4 style={{color: '#ff9800', margin: 0, fontSize: '1rem'}}>Ações de Colaborador</h4>
                </div>
                <p style={{color: isDarkMode ? '#9ca3af' : '#666', marginBottom: 12, fontSize: 12}}>Acesso para importar rota, enviar arquivos e registrar informações.</p>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: 8}}>
                  <button className="btn btn-orange" style={{fontSize: 12, padding: '6px 12px'}}>📁 Importar Rota</button>
                  <button className="btn btn-blue" style={{fontSize: 12, padding: '6px 12px'}}>📤 Enviar Arquivos</button>
                </div>
              </div>
            )}

            {isFretista && (
              <div style={{background: isDarkMode ? '#1e3a5f' : 'linear-gradient(135deg, #e3f2fd 0%, #e1f5fe 100%)', border: isDarkMode ? '1px solid #1e40af' : '1px solid #2196f3', borderRadius: 8, padding: 14}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8}}>
                  <Truck style={{width: 20, height: 20, color: '#1976d2'}} />
                  <h4 style={{color: '#1976d2', margin: 0, fontSize: '1rem'}}>Ações de Fretista</h4>
                </div>
                <p style={{color: isDarkMode ? '#9ca3af' : '#666', marginBottom: 12, fontSize: 12}}>Acesso para registrar informações, fazer check-in/check-out e consultar dados em tempo real.</p>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: 8}}>
                  <button className="btn btn-green" style={{fontSize: 12, padding: '6px 12px'}}>✅ Check-in/Check-out</button>
                  <button className="btn btn-blue" style={{fontSize: 12, padding: '6px 12px'}}>📝 Registrar Informações</button>
                </div>
              </div>
            )}
          </div>

          {/* Botão de Logout */}
          <div className="card" style={{padding: 24, textAlign: 'center'}}>
            <h3 style={{fontSize: '1.3rem', color: '#dc3545', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8}}>
              <LogOut style={{width: 20, height: 20}} />
              Sair da Conta
            </h3>
            <p style={{color: isDarkMode ? '#9ca3af' : '#666', marginBottom: 20}}>Clique no botão abaixo para sair da sua conta atual.</p>
            <button 
              onClick={handleLogout}
              className="btn btn-red"
              disabled={isLoggingOut}
              style={{fontSize: 12, padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: 6}}
            >
              {isLoggingOut ? (
                <>
                  <div style={{width: 14, height: 14, border: `2px solid ${isDarkMode ? '#d1d5db' : '#fff'}`, borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite'}}></div>
                  <span>Saindo...</span>
                </>
              ) : (
                <>
                  <LogOut style={{width: 14, height: 14}} />
                  <span>Sair da Conta</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{textAlign: 'center', padding: 48}}>
          <User style={{width: 64, height: 64, color: '#ccc', margin: '0 auto 16px auto'}} />
          <h3 style={{color: isDarkMode ? '#9ca3af' : '#666', marginBottom: 16}}>Usuário não autenticado</h3>
          <p style={{color: isDarkMode ? '#6b7280' : '#999'}}>Por favor, faça login para ver seu perfil.</p>
        </div>
      )}

      {/* Modais de Administração */}
      <AdminUserModal open={openUserTypeModal} title="Gerenciar Tipo de Usuário" onClose={() => setOpenUserTypeModal(false)}>
        {loadingUsers ? (
          <div>Carregando usuários...</div>
        ) : (
          <div style={{maxHeight: 300, overflowY: 'auto'}}>
            {users.length === 0 ? (
              <div>Nenhum usuário encontrado.</div>
            ) : (
              <table style={{width:'100%',fontSize:15}}>
                <thead>
                  <tr style={{color: isDarkMode ? '#10b981' : '#218838'}}>
                    <th style={{textAlign:'left',padding:'6px 4px'}}>E-mail</th>
                    <th style={{textAlign:'left',padding:'6px 4px'}}>Nome</th>
                    <th style={{textAlign:'left',padding:'6px 4px'}}>Tipo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td style={{padding:'6px 4px'}}>{user.email}</td>
                      <td style={{padding:'6px 4px'}}>{user.nome || '-'}</td>
                      <td style={{padding:'6px 4px'}}>
                        <select 
                          value={userTypes[user.id] || 'fretista'} 
                          onChange={e => handleTypeChange(user.id, e.target.value)} 
                          className={`p-1 rounded-md border ${isDarkMode 
                            ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-400' 
                            : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                          } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                        >
                          <option value="admin">Administrador</option>
                          <option value="colaborador">Colaborador</option>
                          <option value="fretista">Fretista</option>
                        </select>
                      </td>
                      <td style={{padding:'6px 4px'}}>
                        <button className="btn btn-green" style={{fontSize:11,padding:'4px 8px'}} onClick={() => handleSaveType(user.id)} disabled={savingUserId===user.id}>
                          {savingUserId===user.id ? 'Salvando...' : 'Salvar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </AdminUserModal>
      <AdminUserModal open={openUserConfigModal} title="Configurações de Usuários" onClose={() => setOpenUserConfigModal(false)}>
        {loadingUsers ? (
          <div>Carregando usuários...</div>
        ) : (
          <div style={{maxHeight: 300, overflowY: 'auto'}}>
            <table style={{width:'100%',fontSize:15}}>
              <thead>
                <tr style={{color: isDarkMode ? '#10b981' : '#218838'}}>
                  <th style={{textAlign:'left',padding:'6px 4px'}}>E-mail</th>
                  <th style={{textAlign:'left',padding:'6px 4px'}}>Nome</th>
                  <th style={{textAlign:'left',padding:'6px 4px'}}>Tipo</th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td style={{padding:'6px 4px'}}>
                      <input 
                        value={editingUsers[user.id]?.email || ''} 
                        onChange={e => handleEditUserField(user.id, 'email', e.target.value)} 
                        className={`w-full p-1 rounded-md border ${isDarkMode 
                          ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-400' 
                          : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                      />
                    </td>
                    <td style={{padding:'6px 4px'}}>
                      <input 
                        value={editingUsers[user.id]?.nome || ''} 
                        onChange={e => handleEditUserField(user.id, 'nome', e.target.value)} 
                        className={`w-full p-1 rounded-md border ${isDarkMode 
                          ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-400' 
                          : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                      />
                    </td>
                    <td style={{padding:'6px 4px'}}>
                      <select 
                        value={userTypes[user.id] || 'fretista'} 
                        onChange={e => handleTypeChange(user.id, e.target.value)} 
                        className={`p-1 rounded-md border ${isDarkMode 
                          ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-400' 
                          : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                      >
                        <option value="admin">Administrador</option>
                        <option value="colaborador">Colaborador</option>
                        <option value="fretista">Fretista</option>
                      </select>
                    </td>
                    <td style={{padding:'6px 4px'}}>
                      <button className="btn btn-green" style={{fontSize:11,padding:'4px 8px'}} onClick={() => handleSaveUserConfig(user.id)} disabled={savingUserConfigId===user.id}>
                        {savingUserConfigId===user.id ? 'Salvando...' : 'Salvar'}
                      </button>
                    </td>
                    <td style={{padding:'6px 4px'}}>
                      <button className="btn btn-red" style={{fontSize:11,padding:'4px 8px'}} onClick={() => handleDeleteUser(user.id)} disabled={deletingUserId===user.id}>
                        {deletingUserId===user.id ? 'Excluindo...' : 'Excluir'}
                      </button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td>
                    <input 
                      value={addingUser.email} 
                      onChange={e => setAddingUser({...addingUser, email: e.target.value})} 
                      className={`w-full p-1 rounded-md border ${isDarkMode 
                        ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-400' 
                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                      placeholder="Novo e-mail" 
                    />
                  </td>
                  <td>
                    <input 
                      value={addingUser.nome} 
                      onChange={e => setAddingUser({...addingUser, nome: e.target.value})} 
                      className={`w-full p-1 rounded-md border ${isDarkMode 
                        ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-400' 
                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                      placeholder="Novo nome" 
                    />
                  </td>
                  <td>
                    <select 
                      value={addingUser.type} 
                      onChange={e => setAddingUser({...addingUser, type: e.target.value})} 
                      className={`p-1 rounded-md border ${isDarkMode 
                        ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-400' 
                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    >
                      <option value="admin">Administrador</option>
                      <option value="colaborador">Colaborador</option>
                      <option value="fretista">Fretista</option>
                      <option value="expedidor">Expedidor</option>
                    </select>
                  </td>
                  <td colSpan={2}>
                    <button className="btn btn-blue" style={{fontSize:11,padding:'4px 8px'}} onClick={handleAddUser} disabled={addingUserLoading}>
                      {addingUserLoading ? 'Adicionando...' : 'Adicionar'}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </AdminUserModal>
      <AdminUserModal open={openReportModal} title="Relatório de Acessos dos Usuários" onClose={() => setOpenReportModal(false)}>
        {loadingLogs ? (
          <div>Carregando registros de acesso...</div>
        ) : (
          <div style={{maxHeight: 300, overflowY: 'auto'}}>
            <button className="btn btn-green" style={{marginBottom:12, fontSize: 11, padding: '6px 10px'}} onClick={handleExportXLSX}>Exportar XLSX</button>
            <table style={{width:'100%',fontSize:13}}>
              <thead>
                <tr style={{color: isDarkMode ? '#10b981' : '#218838'}}>
                  <th style={{textAlign:'left',padding:'6px 4px', fontSize: 12}}>E-mail</th>
                  <th style={{textAlign:'left',padding:'6px 4px', fontSize: 12}}>Data</th>
                  <th style={{textAlign:'left',padding:'6px 4px', fontSize: 12}}>Hora</th>
                </tr>
              </thead>
              <tbody>
                {accessLogs.map((log, idx) => (
                  <tr key={`${log.email}-${log.date}-${log.time}-${idx}`}>
                    <td style={{padding:'6px 4px', fontSize: 12}}>{log.email}</td>
                    <td style={{padding:'6px 4px', fontSize: 12}}>{log.date}</td>
                    <td style={{padding:'6px 4px', fontSize: 12}}>{log.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminUserModal>
      {/* Botão flutuante para Registros */}
      <div
        onClick={() => navigate('/registros')}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)',
          boxShadow: '0 6px 20px rgba(255, 152, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: 20,
          color: '#fff',
          zIndex: 1000,
          transition: 'all 0.3s ease',
          border: `2px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)'}`,
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1)';
          e.target.style.boxShadow = '0 8px 24px rgba(255, 152, 0, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 6px 20px rgba(255, 152, 0, 0.3)';
        }}
      >
        🚛
      </div>
    </div>
  );
}

export default Profile;
