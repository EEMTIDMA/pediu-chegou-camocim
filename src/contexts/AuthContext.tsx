import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
// IMPORTAÇÃO CORRIGIDA: Aponta para o seu arquivo config.ts que contém as chaves reais
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// Definição do contexto
export const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ouve as mudanças no estado de autenticação (Login/Logout)
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // 1. Busca os dados complementares (como o 'role') na coleção 'users' do Firestore
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const data = userSnap.data();
            // 2. Mesclamos os dados do Auth com os dados do Firestore para ter o user.role no App.tsx
            const fullUserData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              ...data,
            };
            setUser(fullUserData);
            setUserData(data);
          } else {
            // Caso o usuário exista no Auth mas não no Firestore (ex: erro no cadastro)
            console.warn(
              'Usuário autenticado, mas perfil não encontrado no Firestore.'
            );
            setUser(firebaseUser);
            setUserData(null);
          }
        } else {
          // Caso não haja usuário logado
          setUser(null);
          setUserData(null);
        }
      } catch (error) {
        console.error('Erro ao sincronizar autenticação:', error);
      } finally {
        // Finaliza o estado de carregamento para liberar a renderização da tela
        setLoading(false);
      }
    });

    // Limpa o observador ao desmontar o componente
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading }}>
      {/* Só renderiza os filhos (App) quando terminar de checar o Firebase */}
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Hook personalizado para usar o contexto em outros componentes
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
