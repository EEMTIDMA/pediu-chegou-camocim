// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { db, auth, storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  collection,
  query,
  orderBy,
  doc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  addDoc,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import {
  MapPin,
  LogOut,
  Star,
  MessageSquare,
  Phone,
  Camera,
  Save,
  Edit3,
  Send,
  Loader2,
  Copy,
  AlertTriangle,
  Clock,
  Bell,
  Volume2,
  VolumeX,
} from 'lucide-react';

const CorPrincipal = '#312D6F';
const CorDestaque = '#FFD700';

export default function EntregadorDash() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('hoje');
  const [uploading, setUploading] = useState(false);
  const [pedidos, setPedidos] = useState([]);
  const [mensagensChat, setMensagensChat] = useState([]);
  const [msgSuporte, setMsgSuporte] = useState('');
  const [notificacaoSonora, setNotificacaoSonora] = useState(true);
  const [perfil, setPerfil] = useState({
    nome: '',
    telefone: '',
    veiculoModelo: '',
    veiculoPlaca: '',
    veiculoTipo: '',
    veiculoCor: '',
    foto: '',
    rating: 5,
    cpf: '',
    endereco: { rua: '', numero: '', bairro: '' },
    gpsAtivo: true,
    taxasPendentes: 0,
    dataUltimoPagamento: null,
    historicoPagamentos: [],
  });
  const [isEditing, setIsEditing] = useState(false);
  const [filtroPeriodo, setFiltroPeriodo] = useState('dia');

  const playAlert = () => {
    if (!notificacaoSonora) return;
    const audio = new Audio('https://assets.mixkit.co');
    audio.play().catch(() => {});
  };

  useEffect(() => {
    if (!user?.uid) return;

    onSnapshot(
      doc(db, 'perfil_entregador', user.uid),
      (d) => d.exists() && setPerfil((prev) => ({ ...prev, ...d.data() }))
    );

    const qPed = query(
      collection(db, 'pedidos'),
      orderBy('horaSolicitacao', 'desc')
    );
    const unsubPed = onSnapshot(qPed, (s) => {
      const novosPedidos = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      const temNovoPendente = novosPedidos.some(
        (p) =>
          p.status === 'pendente' && !pedidos.find((old) => old.id === p.id)
      );
      if (temNovoPendente) playAlert();
      setPedidos(novosPedidos);
    });

    const unsubChat = onSnapshot(
      query(
        collection(db, 'mensagens_suporte'),
        where('entregadorId', '==', user.uid)
      ),
      (s1) => {
        const m1 = s1.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          remetente: 'entregador',
          ts: d.data().data?.seconds || 0,
        }));
        onSnapshot(
          query(
            collection(db, 'respostas_suporte'),
            where('entregadorId', '==', user.uid)
          ),
          (s2) => {
            const m2 = s2.docs.map((d) => ({
              id: d.id,
              ...d.data(),
              remetente: 'admin',
              ts: d.data().timestamp?.seconds || 0,
            }));
            if (
              m2.length >
              mensagensChat.filter((m) => m.remetente === 'admin').length
            )
              playAlert();
            setMensagensChat([...m1, ...m2].sort((a, b) => a.ts - b.ts));
          }
        );
      }
    );

    return () => {
      unsubPed();
      unsubChat();
    };
  }, [user, notificacaoSonora]);

  useEffect(() => {
    if (!user?.uid || !perfil.nome) return;
    const verificarDebitos = async () => {
      const dataRef = perfil.dataUltimoPagamento?.toDate?.() || new Date();
      const dias = Math.floor((new Date() - dataRef) / (1000 * 60 * 60 * 24));
      if (dias > 15 && taxaAdminTotal > 0) {
        const qAler = query(
          collection(db, 'alertas_admin'),
          where('entregadorId', '==', user.uid),
          limit(1)
        );
        const sAler = await getDocs(qAler);
        if (sAler.empty) {
          await addDoc(collection(db, 'alertas_admin'), {
            entregadorId: user.uid,
            entregadorNome: perfil.nome,
            tipo: 'atraso_pagamento',
            diasAtraso: dias,
            valorDevido: taxaAdminTotal,
            dataAlerta: serverTimestamp(),
          });
        }
      }
    };
    verificarDebitos();
  }, [perfil, pedidos]);

  const handleUploadFoto = async (e) => {
    const file = e.target.files;
    if (!file) return;
    setUploading(true);
    try {
      const storageRef = ref(
        storage,
        `entregadores/${user.uid}/perfil_${Date.now()}.jpg`
      );
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'perfil_entregador', user.uid), { foto: url });
    } catch (error) {
      alert('Erro ao carregar foto');
    } finally {
      setUploading(false);
    }
  };

  const enviarMensagemSuporte = async () => {
    if (!msgSuporte.trim()) return;
    await addDoc(collection(db, 'mensagens_suporte'), {
      entregadorId: user.uid,
      entregadorNome: perfil.nome,
      texto: msgSuporte,
      data: serverTimestamp(),
      remetente: 'entregador',
      respondido: false,
    });
    setMsgSuporte('');
  };

  const gerenciarStatus = async (id, status) => {
    const refP = doc(db, 'pedidos', id);
    const dados = { status };
    if (status === 'em_transito') {
      dados.entregadorId = user.uid;
      dados.entregadorNome = perfil.nome;
      dados.horaColeta = serverTimestamp();
      setActiveTab('ativos');
    }
    if (status === 'entregue') dados.horaEntrega = serverTimestamp();
    await updateDoc(refP, dados);
  };

  const filtrarGanhos = (lista) => {
    const agora = new Date();
    return lista.filter((p) => {
      const dE = p.horaEntrega?.toDate
        ? p.horaEntrega.toDate()
        : p.horaEntrega?.seconds
        ? new Date(p.horaEntrega.seconds * 1000)
        : null;
      if (!dE) return false;
      const diff = (agora - dE) / (1000 * 60 * 60 * 24);
      const periodo =
        filtroPeriodo === 'dia' ? 1 : filtroPeriodo === 'semana' ? 7 : 30;
      return (
        diff <= periodo &&
        p.entregadorId === user?.uid &&
        p.status === 'entregue'
      );
    });
  };

  const entreguesFiltradas = filtrarGanhos(pedidos);
  const valorBrutoTotal = entreguesFiltradas.reduce(
    (acc, p) => acc + (parseFloat(p.valorEntrega) || 0) + 0.3,
    0
  );
  const taxaAdminTotal = entreguesFiltradas.length * 0.3;
  const valorLiquidoTotal = valorBrutoTotal - taxaAdminTotal;

  const diasPassados = Math.floor(
    (new Date() - (perfil.dataUltimoPagamento?.toDate?.() || new Date())) /
      (1000 * 60 * 60 * 24)
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8F9FA',
        paddingBottom: '80px',
        fontFamily: 'sans-serif',
      }}
    >
      <nav
        style={{
          backgroundColor: CorPrincipal,
          padding: '10px 15px',
          color: '#FFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#EEE',
              overflow: 'hidden',
            }}
          >
            <img
              src={perfil.foto || 'https://via.placeholder.com'}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <div>
            <p style={{ fontSize: '12px', margin: 0, fontWeight: 'bold' }}>
              {perfil.nome}
            </p>
            <button
              onClick={async () =>
                await updateDoc(doc(db, 'perfil_entregador', user.uid), {
                  gpsAtivo: !perfil.gpsAtivo,
                })
              }
              style={{
                background: perfil.gpsAtivo ? '#2ecc71' : '#e74c3c',
                border: 'none',
                color: '#FFF',
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '10px',
              }}
            >
              {perfil.gpsAtivo ? 'ONLINE' : 'OFFLINE'}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div
            onClick={() => setNotificacaoSonora(!notificacaoSonora)}
            style={{ cursor: 'pointer' }}
          >
            {notificacaoSonora ? (
              <Volume2 size={20} color={CorDestaque} />
            ) : (
              <VolumeX size={20} color="#999" />
            )}
          </div>
          <Bell size={20} />
          <LogOut
            onClick={() => signOut(auth)}
            size={20}
            style={{ cursor: 'pointer' }}
          />
        </div>
      </nav>

      <div
        style={{
          display: 'flex',
          backgroundColor: '#FFF',
          borderBottom: '1px solid #DDD',
          position: 'sticky',
          top: '0px',
          zIndex: 90,
        }}
      >
        {['hoje', 'ativos', 'ganhos', 'financeiro', 'conta'].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              flex: 1,
              padding: '15px 5px',
              border: 'none',
              background: 'none',
              color: activeTab === t ? CorPrincipal : '#999',
              borderBottom:
                activeTab === t ? `3px solid ${CorDestaque}` : 'none',
              fontWeight: 'bold',
              fontSize: '10px',
            }}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      <main style={{ padding: '15px' }}>
        {activeTab === 'hoje' && (
          <section>
            <div
              style={{
                background: CorPrincipal,
                padding: '20px',
                borderRadius: '15px',
                color: '#FFF',
                marginBottom: '20px',
              }}
            >
              <h2 style={{ margin: 0 }}>Olá! 👋</h2>
              <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={16}
                    fill={s <= Math.round(perfil.rating) ? CorDestaque : 'none'}
                    color={CorDestaque}
                  />
                ))}
                <span style={{ marginLeft: 5 }}>{perfil.rating}</span>
              </div>
            </div>
            <h3>Pedidos Disponíveis</h3>
            {pedidos
              .filter(
                (p) =>
                  !p.entregadorId && perfil.gpsAtivo && p.status === 'pendente'
              )
              .map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: '#FFF',
                    padding: '15px',
                    borderRadius: '12px',
                    marginBottom: '10px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                  }}
                >
                  <p>
                    <b>{p.lojaNome}</b>
                  </p>
                  <p style={{ fontSize: '13px' }}>
                    <MapPin size={12} /> {p.enderecoEntrega?.rua},{' '}
                    {p.enderecoEntrega?.bairro}
                  </p>
                  <button
                    onClick={() => gerenciarStatus(p.id, 'em_transito')}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: CorPrincipal,
                      color: CorDestaque,
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                    }}
                  >
                    ACEITAR PEDIDO
                  </button>
                </div>
              ))}
          </section>
        )}

        {activeTab === 'ativos' && (
          <section>
            {pedidos
              .filter(
                (p) =>
                  p.entregadorId === user?.uid &&
                  ['em_transito', 'retirado'].includes(p.status)
              )
              .map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: '#FFF',
                    padding: '15px',
                    borderRadius: '15px',
                    marginBottom: '15px',
                    border: `1px solid ${CorPrincipal}`,
                  }}
                >
                  <p style={{ fontSize: '11px', color: '#999' }}>
                    COD: {p.codigoRastreio}
                  </p>
                  <p>
                    <b>Cliente:</b> {p.clienteNome}
                  </p>
                  <p style={{ fontSize: '13px' }}>
                    📍 {p.enderecoEntrega?.rua}, {p.enderecoEntrega?.numero} -{' '}
                    {p.enderecoEntrega?.bairro}
                  </p>
                  <hr
                    style={{ border: '0.5px solid #EEE', margin: '10px 0' }}
                  />
                  <div
                    style={{ display: 'flex', gap: '10px', margin: '15px 0' }}
                  >
                    <button
                      onClick={() =>
                        window.open(
                          `https://wa.me{p.lojaTelefone?.replace(/\D/g, '')}`
                        )
                      }
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #DDD',
                        background: '#FFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                      }}
                    >
                      <MessageSquare size={16} /> Loja
                    </button>
                    <button
                      onClick={() =>
                        window.open(
                          `https://wa.me{p.clienteTelefone?.replace(/\D/g, '')}`
                        )
                      }
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #DDD',
                        background: '#FFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                      }}
                    >
                      <Phone size={16} /> Cliente
                    </button>
                  </div>
                  <button
                    onClick={() =>
                      gerenciarStatus(
                        p.id,
                        p.status === 'em_transito' ? 'retirado' : 'entregue'
                      )
                    }
                    style={{
                      width: '100%',
                      padding: '15px',
                      background: '#2ecc71',
                      color: '#FFF',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: 'bold',
                    }}
                  >
                    {p.status === 'em_transito'
                      ? 'CONFIRMAR COLETA'
                      : 'FINALIZAR ENTREGA'}
                  </button>
                </div>
              ))}
          </section>
        )}

        {activeTab === 'ganhos' && (
          <section>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
              {['dia', 'semana', 'mes'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltroPeriodo(f)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '20px',
                    border: 'none',
                    background: filtroPeriodo === f ? CorPrincipal : '#EEE',
                    color: filtroPeriodo === f ? '#FFF' : '#666',
                    fontWeight: 'bold',
                  }}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
            <div
              style={{
                background: '#FFF',
                padding: '20px',
                borderRadius: '15px',
                textAlign: 'center',
                marginBottom: '15px',
              }}
            >
              <p style={{ color: '#666', margin: 0 }}>
                Ganhos Totais ({filtroPeriodo})
              </p>
              <h2 style={{ color: '#2ecc71', margin: '5px 0' }}>
                R$ {valorBrutoTotal.toFixed(2)}
              </h2>
            </div>
            {entreguesFiltradas.map((p) => (
              <div
                key={p.id}
                style={{
                  background: '#FFF',
                  padding: '15px',
                  borderRadius: '12px',
                  marginBottom: '10px',
                  borderLeft: `4px solid ${CorPrincipal}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '5px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: CorPrincipal,
                    }}
                  >
                    {p.codigoRastreio} • {p.lojaNome}
                  </span>
                  <span style={{ fontSize: '10px', color: '#999' }}>
                    {p.horaEntrega?.toDate?.().toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <p style={{ fontSize: '12px', margin: '2px 0' }}>
                  <b>Cliente:</b> {p.clienteNome}
                </p>
                <p
                  style={{
                    fontSize: '11px',
                    color: '#666',
                    marginBottom: '8px',
                  }}
                >
                  📍 {p.enderecoEntrega?.rua}, {p.enderecoEntrega?.numero} -{' '}
                  {p.enderecoEntrega?.bairro}
                </p>
                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                    fontSize: '10px',
                    color: '#888',
                    marginBottom: '8px',
                  }}
                >
                  <span>
                    <Clock size={10} /> Coleta:{' '}
                    {p.horaColeta
                      ?.toDate?.()
                      .toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                  </span>
                  <span>
                    <Clock size={10} /> Entrega:{' '}
                    {p.horaEntrega
                      ?.toDate?.()
                      .toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                  </span>
                </div>
                <div
                  style={{
                    background: '#F9F9F9',
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    display: 'grid',
                    gap: '3px',
                  }}
                >
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <span>Produto:</span>{' '}
                    <b>R$ {parseFloat(p.valor || 0).toFixed(2)}</b>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      color: '#2ecc71',
                    }}
                  >
                    <span>Entrega:</span>{' '}
                    <b>R$ {parseFloat(p.valorEntrega || 0).toFixed(2)}</b>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      color: '#312D6F',
                    }}
                  >
                    <span>Taxa App:</span> <b>R$ 0.30</b>
                  </div>
                  <hr style={{ border: '0.1px solid #EEE' }} />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontWeight: 'bold',
                    }}
                  >
                    <span>Total Recebido:</span>{' '}
                    <b>
                      R$ {(parseFloat(p.valorEntrega || 0) + 0.3).toFixed(2)}
                    </b>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {activeTab === 'financeiro' && (
          <section>
            {diasPassados > 15 && (
              <div
                style={{
                  background: '#fff1f0',
                  color: '#cf1322',
                  padding: '12px',
                  borderRadius: '12px',
                  marginBottom: '15px',
                  border: '1px solid #ffa39e',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                }}
              >
                <AlertTriangle size={20} />{' '}
                <small>
                  <b>ALERTA:</b> Débito pendente há mais de 15 dias. Regularize.
                </small>
              </div>
            )}
            <div
              style={{
                background: CorPrincipal,
                color: '#FFF',
                padding: '20px',
                borderRadius: '15px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  opacity: 0.8,
                  marginBottom: '10px',
                }}
              >
                <span>RECEBIDO: R$ {valorBrutoTotal.toFixed(2)}</span>
                <span>LÍQUIDO: R$ {valorLiquidoTotal.toFixed(2)}</span>
              </div>
              <p style={{ margin: 0, fontSize: '12px' }}>DÉBITO PARA REPASSE</p>
              <h2 style={{ color: CorDestaque, margin: '5px 0' }}>
                R$ {taxaAdminTotal.toFixed(2)}
              </h2>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('88994125539');
                  alert('Pix Copiado!');
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: CorDestaque,
                  color: CorPrincipal,
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  marginTop: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <Copy size={16} /> COPIAR PIX ADMIN
              </button>
            </div>

            <div
              style={{
                background: '#FFF',
                padding: '15px',
                borderRadius: '12px',
                height: '350px',
                display: 'flex',
                flexDirection: 'column',
                marginBottom: '20px',
              }}
            >
              <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>
                Suporte Master
              </p>
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  background: '#F9F9F9',
                  borderRadius: '8px',
                  padding: '10px',
                  marginBottom: '10px',
                }}
              >
                {mensagensChat.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      textAlign:
                        m.remetente === 'entregador' ? 'right' : 'left',
                      marginBottom: '12px',
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '8px 12px',
                        borderRadius: '12px',
                        background:
                          m.remetente === 'entregador' ? CorPrincipal : '#DDD',
                        color: m.remetente === 'entregador' ? '#FFF' : '#333',
                        fontSize: '12px',
                        maxWidth: '85%',
                      }}
                    >
                      {m.texto}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
                <input
                  value={msgSuporte}
                  onChange={(e) => setMsgSuporte(e.target.value)}
                  placeholder="Mensagem..."
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '1px solid #DDD',
                    borderRadius: '8px',
                  }}
                />
                <button
                  onClick={enviarMensagemSuporte}
                  style={{
                    background: CorPrincipal,
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px',
                  }}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>

            <div
              style={{
                background: '#FFF',
                padding: '15px',
                borderRadius: '12px',
                marginBottom: '15px',
              }}
            >
              <p
                style={{
                  fontWeight: 'bold',
                  fontSize: '14px',
                  marginBottom: '10px',
                }}
              >
                Histórico de Pagamentos
              </p>
              {perfil.historicoPagamentos?.map((pag, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    borderBottom: '1px solid #EEE',
                    padding: '5px 0',
                  }}
                >
                  <span>{pag.data}</span>
                  <b>R$ {parseFloat(pag.valor).toFixed(2)}</b>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'conta' && (
          <section
            style={{
              background: '#FFF',
              padding: '20px',
              borderRadius: '15px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px',
              }}
            >
              <h3>Meus Dados</h3>
              <button
                onClick={async () => {
                  if (isEditing)
                    await updateDoc(
                      doc(db, 'perfil_entregador', user.uid),
                      perfil
                    );
                  setIsEditing(!isEditing);
                }}
                style={{
                  background: CorDestaque,
                  border: 'none',
                  padding: '8px 15px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                }}
              >
                {isEditing ? <Save size={18} /> : <Edit3 size={18} />}
              </button>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  background: '#EEE',
                  margin: '0 auto',
                  position: 'relative',
                  border: `3px solid ${CorPrincipal}`,
                  overflow: 'hidden',
                }}
              >
                {uploading ? (
                  <Loader2
                    className="animate-spin"
                    style={{ margin: '40% auto' }}
                  />
                ) : (
                  <img
                    src={perfil.foto || 'https://via.placeholder.com'}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                )}
                <button
                  onClick={() => fileInputRef.current.click()}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    background: CorPrincipal,
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '50%',
                    padding: '6px',
                  }}
                >
                  <Camera size={14} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleUploadFoto}
                  style={{ display: 'none' }}
                  accept="image/*"
                />
              </div>
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              <input
                disabled={!isEditing}
                placeholder="Nome"
                value={perfil.nome}
                onChange={(e) => setPerfil({ ...perfil, nome: e.target.value })}
                style={{
                  padding: '10px',
                  border: '1px solid #EEE',
                  borderRadius: '8px',
                }}
              />
              <input
                disabled={!isEditing}
                placeholder="Telefone"
                value={perfil.telefone}
                onChange={(e) =>
                  setPerfil({ ...perfil, telefone: e.target.value })
                }
                style={{
                  padding: '10px',
                  border: '1px solid #EEE',
                  borderRadius: '8px',
                }}
              />
              <input
                disabled={!isEditing}
                placeholder="CPF"
                value={perfil.cpf}
                onChange={(e) => setPerfil({ ...perfil, cpf: e.target.value })}
                style={{
                  padding: '10px',
                  border: '1px solid #EEE',
                  borderRadius: '8px',
                }}
              />
              <div style={{ display: 'flex', gap: '5px' }}>
                <input
                  disabled={!isEditing}
                  placeholder="Rua"
                  value={perfil.endereco?.rua}
                  onChange={(e) =>
                    setPerfil({
                      ...perfil,
                      endereco: { ...perfil.endereco, rua: e.target.value },
                    })
                  }
                  style={{
                    flex: 2,
                    padding: '10px',
                    border: '1px solid #EEE',
                    borderRadius: '8px',
                  }}
                />
                <input
                  disabled={!isEditing}
                  placeholder="Nº"
                  value={perfil.endereco?.numero}
                  onChange={(e) =>
                    setPerfil({
                      ...perfil,
                      endereco: { ...perfil.endereco, numero: e.target.value },
                    })
                  }
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '1px solid #EEE',
                    borderRadius: '8px',
                  }}
                />
              </div>
              <input
                disabled={!isEditing}
                placeholder="Bairro"
                value={perfil.endereco?.bairro}
                onChange={(e) =>
                  setPerfil({
                    ...perfil,
                    endereco: { ...perfil.endereco, bairro: e.target.value },
                  })
                }
                style={{
                  padding: '10px',
                  border: '1px solid #EEE',
                  borderRadius: '8px',
                }}
              />
              <div style={{ display: 'flex', gap: '5px' }}>
                <input
                  disabled={!isEditing}
                  placeholder="Modelo Veículo"
                  value={perfil.veiculoModelo}
                  onChange={(e) =>
                    setPerfil({ ...perfil, veiculoModelo: e.target.value })
                  }
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '1px solid #EEE',
                    borderRadius: '8px',
                  }}
                />
                <input
                  disabled={!isEditing}
                  placeholder="Placa"
                  value={perfil.veiculoPlaca}
                  onChange={(e) =>
                    setPerfil({ ...perfil, veiculoPlaca: e.target.value })
                  }
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '1px solid #EEE',
                    borderRadius: '8px',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
                <input
                  disabled={!isEditing}
                  placeholder="Tipo"
                  value={perfil.veiculoTipo}
                  onChange={(e) =>
                    setPerfil({ ...perfil, veiculoTipo: e.target.value })
                  }
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '1px solid #EEE',
                    borderRadius: '8px',
                  }}
                />
                <input
                  disabled={!isEditing}
                  placeholder="Cor"
                  value={perfil.veiculoCor}
                  onChange={(e) =>
                    setPerfil({ ...perfil, veiculoCor: e.target.value })
                  }
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '1px solid #EEE',
                    borderRadius: '8px',
                  }}
                />
              </div>
              <button
                onClick={() => signOut(auth)}
                style={{
                  color: 'red',
                  background: 'none',
                  border: 'none',
                  marginTop: '10px',
                  fontWeight: 'bold',
                }}
              >
                Sair da Conta
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
