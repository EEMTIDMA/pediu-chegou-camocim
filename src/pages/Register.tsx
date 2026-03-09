import React, { useState } from 'react';
import { auth, db } from '../firebase/config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, AlertCircle, X, Check } from 'lucide-react';
import Logo from '../components/Logo';

export default function Register() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [role, setRole] = useState<'entregador' | 'empresa'>('entregador');
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [showModal, setShowModal] = useState(false); // Controle do Modal
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    telefone: '',
    cpf: '',
    rua: '',
    numero: '',
    bbairro: '',
    veiculoModelo: '',
    veiculoPlaca: '',
    responsavel: '',
  });

  // VALIDAÇÕES E MÁSCARAS
  const validarCPF = (cpf: string) => {
    const limpo = cpf.replace(/\D/g, '');
    if (limpo.length !== 11 || !!limpo.match(/^(.)\1{10}$/)) return false;
    let soma = 0;
    for (let i = 1; i <= 9; i++)
      soma += parseInt(limpo.substring(i - 1, i)) * (11 - i);
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(limpo.substring(9, 10))) return false;
    soma = 0;
    for (let i = 1; i <= 10; i++)
      soma += parseInt(limpo.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(limpo.substring(10, 11))) return false;
    return true;
  };

  const maskCPF = (v: string) =>
    v
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  const maskPhone = (v: string) =>
    v
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!aceitouTermos) {
      setError('Você precisa aceitar os Termos de Uso.');
      return;
    }
    if (formData.senha.length < 8) {
      setError('A senha deve ter 8 ou mais caracteres.');
      return;
    }
    if (role === 'entregador' && !validarCPF(formData.cpf)) {
      setError('CPF inválido.');
      return;
    }

    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.senha
      );

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        nome: formData.nome,
        email: formData.email,
        role,
        statusPerfil: 'pendente',
        blocked: false,
        online: false,
        createdAt: Date.now(),
        telefone: formData.telefone,
        endereco: `${formData.rua}, ${formData.numero} - ${formData.bbairro}`,
        aceitouTermosEm: Date.now(),
        localizacao: { lat: -2.9017, lng: -40.8421, timestamp: Date.now() },
      });

      const perfilColl =
        role === 'entregador' ? 'perfil_entregador' : 'perfil_empresa';
      const dadosPerfil: any = {
        nome: formData.nome,
        telefone: formData.telefone,
        rua: formData.rua,
        numero: formData.numero,
        bbairro: formData.bbairro,
        lat: -2.9017,
        lng: -40.8421,
        atualizadoEm: serverTimestamp(),
      };

      if (role === 'entregador') {
        dadosPerfil.cpf = formData.cpf;
        dadosPerfil.veiculoModelo = formData.veiculoModelo.toUpperCase();
        dadosPerfil.veiculoPlaca = formData.veiculoPlaca.toUpperCase();
        dadosPerfil.status = 'ativo';
      } else {
        dadosPerfil.responsavel = formData.responsavel;
      }

      await setDoc(doc(db, perfilColl, user.uid), dadosPerfil);
      alert('Cadastro realizado!');
      navigate('/login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid #CBD5E1',
    fontSize: '14px',
    boxSizing: 'border-box',
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
      }}
    >
      <div style={{ marginBottom: '20px' }}>
        <Logo size={80} />
      </div>

      <div
        style={{
          background: '#F9F9F8',
          padding: '30px',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          boxSizing: 'border-box',
        }}
      >
        <button
          onClick={() => navigate('/login')}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748B',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            marginBottom: '10px',
            fontWeight: 'bold',
          }}
        >
          <ArrowLeft size={18} /> Voltar
        </button>

        <h2
          style={{
            color: '#312D6F',
            marginBottom: '15px',
            fontWeight: '900',
            textAlign: 'center',
          }}
        >
          Novo Cadastro
        </h2>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <button
            type="button"
            onClick={() => setRole('entregador')}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: role === 'entregador' ? '#312D6F' : '#E2E8F0',
              color: role === 'entregador' ? '#FFF' : '#475569',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Entregador
          </button>
          <button
            type="button"
            onClick={() => setRole('empresa')}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: role === 'empresa' ? '#312D6F' : '#E2E8F0',
              color: role === 'empresa' ? '#FFF' : '#475569',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Empresa
          </button>
        </div>

        <form
          onSubmit={handleRegister}
          style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          <input
            placeholder="Nome Completo"
            required
            style={inputStyle}
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              placeholder="E-mail"
              type="email"
              required
              style={inputStyle}
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
            <input
              placeholder="Telefone"
              type="tel"
              required
              style={inputStyle}
              value={formData.telefone}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  telefone: maskPhone(e.target.value),
                })
              }
            />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              placeholder="Senha (Mín. 8)"
              type="password"
              required
              style={inputStyle}
              value={formData.senha}
              onChange={(e) =>
                setFormData({ ...formData, senha: e.target.value })
              }
            />
            {role === 'entregador' ? (
              <input
                placeholder="CPF"
                required
                style={inputStyle}
                value={formData.cpf}
                onChange={(e) =>
                  setFormData({ ...formData, cpf: maskCPF(e.target.value) })
                }
              />
            ) : (
              <input
                placeholder="Responsável"
                required
                style={inputStyle}
                value={formData.responsavel}
                onChange={(e) =>
                  setFormData({ ...formData, responsavel: e.target.value })
                }
              />
            )}
          </div>
          <p
            style={{
              margin: '5px 0',
              fontSize: '12px',
              color: '#64748B',
              fontWeight: 'bold',
            }}
          >
            Endereço Camocim
          </p>
          <input
            placeholder="Rua"
            required
            style={inputStyle}
            value={formData.rua}
            onChange={(e) => setFormData({ ...formData, rua: e.target.value })}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              placeholder="Nº"
              required
              style={{ ...inputStyle, width: '90px' }}
              value={formData.numero}
              onChange={(e) =>
                setFormData({ ...formData, numero: e.target.value })
              }
            />
            <input
              placeholder="Bairro"
              required
              style={inputStyle}
              value={formData.bbairro}
              onChange={(e) =>
                setFormData({ ...formData, bbairro: e.target.value })
              }
            />
          </div>
          {role === 'entregador' && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                placeholder="Modelo Moto"
                required
                style={inputStyle}
                value={formData.veiculoModelo}
                onChange={(e) =>
                  setFormData({ ...formData, veiculoModelo: e.target.value })
                }
              />
              <input
                placeholder="Placa"
                required
                style={inputStyle}
                value={formData.veiculoPlaca}
                onChange={(e) =>
                  setFormData({ ...formData, veiculoPlaca: e.target.value })
                }
              />
            </div>
          )}

          {/* ÁREA DE TERMOS */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px',
              background: '#F1F5F9',
              borderRadius: '12px',
              margin: '5px 0',
            }}
          >
            <input
              type="checkbox"
              checked={aceitouTermos}
              onChange={(e) => setAceitouTermos(e.target.checked)}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <label style={{ fontSize: '12px', color: '#475569' }}>
              Aceito os{' '}
              <button
                type="button"
                onClick={() => setShowModal(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#312D6F',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                Termos de Uso
              </button>
            </label>
          </div>

          {error && (
            <div
              style={{
                background: '#FEF2F2',
                padding: '10px',
                borderRadius: '8px',
                color: '#B91C1C',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '16px',
              background: aceitouTermos ? '#F9DC3E' : '#E2E8F0',
              color: '#312D6F',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '900',
              cursor: aceitouTermos ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              'FINALIZAR CADASTRO'
            )}
          </button>
        </form>
      </div>

      {/* MODAL DE TERMOS DE USO */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              background: '#FFF',
              width: '100%',
              maxWidth: '500px',
              borderRadius: '24px',
              padding: '30px',
              position: 'relative',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute',
                right: '20px',
                top: '20px',
                background: '#F1F5F9',
                border: 'none',
                borderRadius: '50%',
                padding: '5px',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>
            <h3 style={{ color: '#312D6F', marginTop: 0 }}>
              Termos de Uso - Camocim
            </h3>
            <div
              style={{
                fontSize: '14px',
                color: '#475569',
                lineHeight: '1.6',
                textAlign: 'justify',
              }}
            >
              <p>
                <strong>1. Da Operação:</strong> O Pediu Chegou Camocim atua
                como plataforma de logística. Entregadores parceiros devem
                manter conduta ética e seguir as leis de trânsito.
              </p>
              <p>
                <strong>2. Repasses:</strong> Os repasses de taxas de entrega
                seguem o cronograma vigente no painel do parceiro.
              </p>
              <p>
                <strong>3. Conduta:</strong> É proibido o uso da plataforma para
                fins ilícitos. O descumprimento gera bloqueio imediato do
                perfil.
              </p>
              <p>
                <strong>4. Privacidade:</strong> Seus dados são protegidos
                conforme a LGPD e usados apenas para fins operacionais da
                plataforma.
              </p>
            </div>
            <button
              onClick={() => {
                setAceitouTermos(true);
                setShowModal(false);
              }}
              style={{
                width: '100%',
                marginTop: '20px',
                padding: '14px',
                background: '#312D6F',
                color: '#FFF',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
              }}
            >
              <Check size={20} /> LI E CONCORDO
            </button>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
