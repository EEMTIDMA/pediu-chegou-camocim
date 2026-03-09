import React, { useState } from 'react';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Loader2, Eye, EyeOff, Search } from 'lucide-react';
import Logo from '../components/Logo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [codigoBusca, setCodigoBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), senha);
      setTimeout(() => {
        navigate('/');
        window.location.reload();
      }, 500);
    } catch (err: any) {
      setError('E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecuperarSenha = () => {
    if (!email) {
      alert('Por favor, digite seu e-mail no campo acima primeiro.');
      return;
    }
    sendPasswordResetEmail(auth, email)
      .then(() => alert('E-mail de recuperação enviado com sucesso!'))
      .catch((err) => alert('Erro ao enviar: ' + err.message));
  };

  const handleRastreio = (e: React.FormEvent) => {
    e.preventDefault();
    if (codigoBusca.trim()) {
      navigate(`/rastreio/${codigoBusca.trim().toUpperCase()}`);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#312D6F',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* LOGO OFICIAL CAMOCIM */}
      <div style={{ marginBottom: '40px', textAlign: 'center' }}>
        <Logo size={140} />
      </div>

      {/* CARTÃO DE LOGIN */}
      <div
        style={{
          background: '#F9F9F8',
          padding: '40px',
          borderRadius: '28px',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          boxSizing: 'border-box', // Impede que o cartão estoure
        }}
      >
        <h2
          style={{
            color: '#312D6F',
            textAlign: 'center',
            marginBottom: '25px',
            fontWeight: '900',
            fontSize: '22px',
          }}
        >
          Acesse sua conta
        </h2>

        <form
          onSubmit={handleLogin}
          style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}
        >
          {/* CAMPO EMAIL */}
          <div style={{ width: '100%', boxSizing: 'border-box' }}>
            <input
              type="email"
              placeholder="E-mail"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid #95959A',
                fontSize: '16px',
                outlineColor: '#312D6F',
                boxSizing: 'border-box', // Crucial para não passar do limite
                display: 'block',
              }}
            />
          </div>

          {/* CAMPO SENHA CORRIGIDO */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <input
              type={showSenha ? 'text' : 'password'}
              placeholder="Senha"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              style={{
                width: '100%',
                padding: '14px',
                paddingRight: '45px', // Espaço para o ícone do olho
                borderRadius: '12px',
                border: '1px solid #95959A',
                fontSize: '16px',
                outlineColor: '#312D6F',
                boxSizing: 'border-box', // Crucial para não passar do limite
                display: 'block',
              }}
            />
            <div
              onClick={() => setShowSenha(!showSenha)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                cursor: 'pointer',
                color: '#312D6F',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {showSenha ? <EyeOff size={20} /> : <Eye size={20} />}
            </div>
          </div>

          {/* RECUPERAR SENHA */}
          <button
            type="button"
            onClick={handleRecuperarSenha}
            style={{
              alignSelf: 'flex-end',
              background: 'none',
              border: 'none',
              color: '#312D6F',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginTop: '-5px',
              padding: '2px',
            }}
          >
            Esqueceu a senha?
          </button>

          {error && (
            <p
              style={{
                color: '#EF4444',
                fontSize: '14px',
                textAlign: 'center',
                margin: '0',
                fontWeight: '500',
              }}
            >
              {error}
            </p>
          )}

          {/* BOTÃO ENTRAR */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: '#F9DC3E',
              color: '#312D6F',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '900',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 15px rgba(249, 220, 62, 0.3)',
              boxSizing: 'border-box',
            }}
          >
            {loading ? (
              <Loader2
                style={{ animation: 'spin 1s linear infinite' }}
                size={20}
              />
            ) : (
              <>
                <LogIn size={20} /> ENTRAR
              </>
            )}
          </button>
        </form>

        {/* SEÇÃO RASTREIO PÚBLICO */}
        <div
          style={{
            marginTop: '30px',
            paddingTop: '20px',
            borderTop: '1px solid #E2E8F0',
          }}
        >
          <p
            style={{
              textAlign: 'center',
              color: '#95959A',
              fontSize: '13px',
              marginBottom: '12px',
            }}
          >
            Consulte um pedido sem login:
          </p>
          <form
            onSubmit={handleRastreio}
            style={{
              display: 'flex',
              gap: '8px',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <input
              type="text"
              value={codigoBusca}
              onChange={(e) => setCodigoBusca(e.target.value.toUpperCase())}
              placeholder="Cód. Rastreio"
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                fontSize: '14px',
                boxSizing: 'border-box',
                minWidth: '0', // Evita que o input empurre o botão
              }}
            />
            <button
              type="submit"
              style={{
                padding: '12px',
                background: '#312D6F',
                color: '#FFF',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Search size={18} />
            </button>
          </form>
        </div>

        {/* LINK PARA REGISTRO */}
        <p
          style={{
            textAlign: 'center',
            marginTop: '25px',
            color: '#95959A',
            fontSize: '14px',
          }}
        >
          Novo por aqui?{' '}
          <Link
            to="/register"
            style={{
              color: '#312D6F',
              fontWeight: 'bold',
              textDecoration: 'none',
              padding: '2px',
            }}
          >
            Crie sua conta
          </Link>
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
