import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { logUserAccess, addUser } from './firebaseUtils.js';
import { getDocs, query, collection, where, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebaseConfig.js';
import { adminEmails } from './firebaseUtils.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('DEBUG AuthContext - Iniciando listener de autenticação');
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('DEBUG AuthContext - onAuthStateChanged chamado, user:', user);
      if (user) {
        console.log('DEBUG AuthContext - Usuário autenticado:', user.email);
        // Buscar tipo do usuário no Firestore
        const q = query(collection(db, 'users'), where('email', '==', user.email));
        const querySnapshot = await getDocs(q);
        let userType = 'fretista'; // padrão
        let userDoc = null;
        
        if (!querySnapshot.empty) {
          userDoc = querySnapshot.docs[0];
          const userData = userDoc.data();
          userType = userData.type || 'fretista';
        } else {
          // Usuário não existe no Firestore - cadastrar automaticamente como fretista
          try {
            const newUserData = {
              email: user.email,
              type: 'fretista',
              nome: user.displayName || user.email.split('@')[0],
              createdAt: new Date().toISOString()
            };
            await addUser(newUserData);
            console.log('Usuário cadastrado automaticamente como fretista:', user.email);
          } catch (error) {
            console.error('Erro ao cadastrar usuário automaticamente:', error);
          }
        }
        
        // Verificar se é expedidor baseado no domínio do email ou outros critérios
        if (user.email.includes('@expedidor.') || user.email.includes('expedidor')) {
          userType = 'expedidor';
          // Atualizar no Firestore se necessário
          if (userDoc && userDoc.data().type !== 'expedidor') {
            try {
              await updateDoc(doc(db, 'users', userDoc.id), { type: 'expedidor' });
            } catch (error) {
              console.error('Erro ao atualizar tipo para expedidor:', error);
            }
          }
        }
        
        // Se o e-mail estiver na lista de administradores, força admin
        if (adminEmails.includes(user.email)) {
          userType = 'admin';
          // Atualizar no Firestore se necessário
          if (userDoc && userDoc.data().type !== 'admin') {
            try {
              await updateDoc(doc(db, 'users', userDoc.id), { type: 'admin' });
            } catch (error) {
              console.error('Erro ao atualizar tipo para admin:', error);
            }
          }
        }
        
        setCurrentUser({ ...user, type: userType });
        console.log('DEBUG AuthContext - setCurrentUser chamado com:', { ...user, type: userType });
        logUserAccess(user.email);
      } else {
        console.log('DEBUG AuthContext - Usuário não autenticado, setCurrentUser(null)');
        setCurrentUser(null);
      }
      console.log('DEBUG AuthContext - setLoading(false)');
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      // O estado do usuário será automaticamente atualizado pelo onAuthStateChanged
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
