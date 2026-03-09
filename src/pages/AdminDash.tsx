// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  orderBy,
  serverTimestamp,
  addDoc,
  where,
  getDocs,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import {
  Users,
  ShieldAlert,
  MessageSquare,
  Search,
  XCircle,
  Ban,
  Unlock,
  User,
  Eye,
  LogOut,
  Bell,
  QrCode,
  FileText,
  CheckCircle,
  Send,
  Printer,
  Landmark,
} from 'lucide-react';

const CorPrincipal = '#312D6F';
const CorDestaque = '#FFD700';

export default function AdminDash() {
  const [activeTab, setActiveTab] = useState('entregadores');
  const [entregadores, setEntregadores] = useState([]);
  const [chamados, setChamados] = useState([]);
  const [busca, setBusca] = useState('');
  const [entregadorSelecionado, setEntregadorSelecionado] = useState(null);
  const [abaModal, setAbaModal] = useState('perfil');
  const [respostaSuporte, setRespostaSuporte] = useState({});
  const [historicoPedidos, setHistoricoPedidos] = useState([]);
  const [dadosBanco, setDadosBanco] = useState({
    banco: 'INTER',
    agencia: '0001',
    conta: '123456-7',
  });

  useEffect(() => {
    const unsubE = onSnapshot(collection(db, 'perfil_entregador'), (s) => {
      setEntregadores(s.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubC = onSnapshot(
      query(collection(db, 'mensagens_suporte'), orderBy('timestamp', 'desc')),
      (s) => {
        setChamados(s.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );
    return () => {
      unsubE();
      unsubC();
    };
  }, []);

  // FUNÇÃO QUE ALINHA O VALOR COM O ENTREGADOR
  const abrirDetalhes = async (e) => {
    setEntregadorSelecionado(e);
    setAbaModal('perfil');
    // Alinhado para buscar na coleção 'pedidos' que a Empresa agora usa
    const q = query(
      collection(db, 'pedidos'),
      where('entregadorId', '==', e.id)
    );
    const snap = await getDocs(q);
    const pedidos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setHistoricoPedidos(pedidos);

    // SOMA AS TAXAS: valorTaxaAdmin (0.30) enviado pela empresa
    const acumulado = pedidos
      .filter((p) => p.status === 'entregue' && !p.pagoAoAdmin)
      .reduce((acc, p) => acc + (Number(p.valorTaxaAdmin) || 0.3), 0);

    // SALVA O VALOR NO PERFIL PARA O ENTREGADOR VER
    await updateDoc(doc(db, 'perfil_entregador', e.id), {
      taxasPendentes: acumulado,
    });
  };

  const responderChamado = async (chamado) => {
    const texto = respostaSuporte[chamado.id];
    if (!texto) return alert('Digite uma resposta.');
    await addDoc(collection(db, 'mensagens_suporte'), {
      chamadoId: chamado.id,
      entregadorId: chamado.entregadorId,
      texto: `ADMIN: ${texto}`,
      adminId: auth.currentUser?.uid,
      timestamp: serverTimestamp(),
      remetente: 'admin',
      respondido: true,
    });
    await updateDoc(doc(db, 'mensagens_suporte', chamado.id), {
      respondido: true,
    });
    setRespostaSuporte((prev) => ({ ...prev, [chamado.id]: '' }));
    alert('Resposta enviada!');
  };

  const alternarBloqueio = async (e) => {
    const novoStatus = e.status === 'bloqueado' ? 'ativo' : 'bloqueado';
    await updateDoc(doc(db, 'perfil_entregador', e.id), { status: novoStatus });
  };

  const copiarPix = (valor) => {
    const pix = `00020126360014BR.GOV.BCB.PIX011188994125539520400005303986540${Number(
      valor
    ).toFixed(2)}5802BR5910ADMIN6008CIDADE62070503***6304`;
    navigator.clipboard.writeText(pix);
    alert('Código Pix copiado!');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8F9FA',
        fontFamily: 'sans-serif',
      }}
    >
      <nav
        style={{
          backgroundColor: CorPrincipal,
          color: '#FFF',
          padding: '0 20px',
          height: '60px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldAlert color={CorDestaque} size={24} />
          <strong>PAINEL MASTER</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Bell size={20} color={CorDestaque} />
          <div style={{ textAlign: 'right', fontSize: '11px' }}>
            <strong>{auth.currentUser?.email}</strong>
          </div>
          <LogOut
            size={22}
            onClick={() => signOut(auth)}
            style={{ cursor: 'pointer', color: '#FF7675' }}
          />
        </div>
      </nav>

      <div
        style={{
          display: 'flex',
          backgroundColor: '#FFF',
          borderBottom: '1px solid #DDD',
          position: 'sticky',
          top: '60px',
          zIndex: 900,
        }}
      >
        {['entregadores', 'chamados', 'financeiro'].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              flex: 1,
              padding: '15px',
              border: 'none',
              background: 'none',
              color: activeTab === t ? CorPrincipal : '#999',
              borderBottom:
                activeTab === t ? `3px solid ${CorDestaque}` : 'none',
              fontWeight: 'bold',
              fontSize: '12px',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <main style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
        {activeTab === 'entregadores' && (
          <section>
            <div style={{ position: 'relative', marginBottom: '15px' }}>
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '12px',
                  color: '#999',
                }}
              />
              <input
                placeholder="Buscar por nome ou CPF..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 40px',
                  borderRadius: '10px',
                  border: '1px solid #DDD',
                }}
              />
            </div>
            <div
              style={{
                background: '#FFF',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#F8F9FA', fontSize: '11px' }}>
                  <tr>
                    <th style={{ padding: '15px', textAlign: 'left' }}>NOME</th>
                    <th style={{ textAlign: 'left' }}>STATUS</th>
                    <th style={{ textAlign: 'left' }}>DÉBITO (R$)</th>
                    <th style={{ textAlign: 'left' }}>AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {entregadores
                    .filter((e) =>
                      e.nome?.toLowerCase().includes(busca.toLowerCase())
                    )
                    .map((e) => (
                      <tr
                        key={e.id}
                        style={{
                          borderBottom: '1px solid #F1F1F1',
                          fontSize: '14px',
                        }}
                      >
                        <td style={{ padding: '12px' }}>{e.nome}</td>
                        <td>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 'bold',
                              color:
                                e.status === 'bloqueado'
                                  ? '#D93025'
                                  : '#2E7D32',
                            }}
                          >
                            {e.status?.toUpperCase() || 'ATIVO'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 'bold' }}>
                          {Number(e.taxasPendentes || 0).toFixed(2)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => abrirDetalhes(e)}
                              style={{
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => alternarBloqueio(e)}
                              style={{
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              {e.status === 'bloqueado' ? (
                                <Unlock size={18} color="#2E7D32" />
                              ) : (
                                <Ban size={18} color="#D93025" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'chamados' && (
          <section>
            {chamados.map((c) => (
              <div
                key={c.id}
                style={{
                  background: '#FFF',
                  padding: '15px',
                  borderRadius: '12px',
                  marginBottom: '10px',
                  borderLeft: `5px solid ${
                    c.respondido ? '#2ecc71' : CorPrincipal
                  }`,
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between' }}
                >
                  <strong>{c.entregadorNome}</strong>
                  <small style={{ color: '#999' }}>
                    {c.timestamp?.toDate().toLocaleString()}
                  </small>
                </div>
                <p style={{ fontSize: '13px', margin: '10px 0' }}>{c.texto}</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    value={respostaSuporte[c.id] || ''}
                    onChange={(e) =>
                      setRespostaSuporte({
                        ...respostaSuporte,
                        [c.id]: e.target.value,
                      })
                    }
                    placeholder="Digite a resposta..."
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #DDD',
                    }}
                  />
                  <button
                    onClick={() => responderChamado(c)}
                    style={{
                      padding: '10px 20px',
                      background: CorPrincipal,
                      color: '#FFF',
                      border: 'none',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    <Send size={14} /> RESPONDER
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {activeTab === 'financeiro' && (
          <section
            style={{
              background: '#FFF',
              padding: '25px',
              borderRadius: '15px',
              border: '1px solid #EEE',
            }}
          >
            <h3 style={{ marginTop: 0 }}>Configuração Bancária</h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '15px',
                marginTop: '20px',
              }}
            >
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold' }}>
                  BANCO
                </label>
                <input
                  value={dadosBanco.banco}
                  onChange={(e) =>
                    setDadosBanco({ ...dadosBanco, banco: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #DDD',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold' }}>
                  AGÊNCIA
                </label>
                <input
                  value={dadosBanco.agencia}
                  onChange={(e) =>
                    setDadosBanco({ ...dadosBanco, agencia: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #DDD',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold' }}>
                  CONTA
                </label>
                <input
                  value={dadosBanco.conta}
                  onChange={(e) =>
                    setDadosBanco({ ...dadosBanco, conta: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #DDD',
                  }}
                />
              </div>
            </div>
          </section>
        )}

        {entregadorSelecionado && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0,0,0,0.6)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 2000,
            }}
          >
            <div
              style={{
                background: '#FFF',
                width: '500px',
                borderRadius: '20px',
                padding: '25px',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '15px',
                }}
              >
                <h3>{entregadorSelecionado.nome}</h3>
                <XCircle
                  onClick={() => setEntregadorSelecionado(null)}
                  style={{ cursor: 'pointer', color: '#999' }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  marginBottom: '15px',
                  borderBottom: '1px solid #EEE',
                }}
              >
                <button
                  onClick={() => setAbaModal('perfil')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: 'none',
                    background: 'none',
                    fontWeight: 'bold',
                    color: abaModal === 'perfil' ? CorPrincipal : '#999',
                    borderBottom:
                      abaModal === 'perfil'
                        ? `2px solid ${CorPrincipal}`
                        : 'none',
                  }}
                >
                  PERFIL
                </button>
                <button
                  onClick={() => setAbaModal('cobranca')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: 'none',
                    background: 'none',
                    fontWeight: 'bold',
                    color: abaModal === 'cobranca' ? CorPrincipal : '#999',
                    borderBottom:
                      abaModal === 'cobranca'
                        ? `2px solid ${CorPrincipal}`
                        : 'none',
                  }}
                >
                  COBRANÇA
                </button>
              </div>

              {abaModal === 'perfil' && (
                <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
                  <p>
                    <b>CPF:</b> {entregadorSelecionado.cpf}
                  </p>
                  <p>
                    <b>Telefone:</b> {entregadorSelecionado.telefone}
                  </p>
                  <p>
                    <b>Veículo:</b> {entregadorSelecionado.veiculoModelo} (
                    {entregadorSelecionado.veiculoPlaca})
                  </p>
                </div>
              )}

              {abaModal === 'cobranca' && (
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      background: '#FFF',
                      padding: '15px',
                      border: '1px solid #000',
                      textAlign: 'left',
                      fontSize: '10px',
                      fontFamily: 'monospace',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid #000',
                        paddingBottom: '5px',
                        marginBottom: '10px',
                      }}
                    >
                      <Landmark size={18} /> <strong>{dadosBanco.banco}</strong>{' '}
                      <b>00190.00009 02345.678901 12345.67890 1 900000000</b>
                    </div>
                    <p>
                      <b>SACADO:</b> {entregadorSelecionado.nome} | <b>CPF:</b>{' '}
                      {entregadorSelecionado.cpf}
                    </p>
                    <p>
                      <b>VENCIMENTO:</b>{' '}
                      {new Date(Date.now() + 172800000).toLocaleDateString()} |{' '}
                      <b>
                        VALOR TOTAL: R${' '}
                        {Number(
                          entregadorSelecionado.taxasPendentes || 0
                        ).toFixed(2)}
                      </b>
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        height: '35px',
                        background: '#fff',
                        marginTop: '10px',
                        gap: '1px',
                        justifyContent: 'center',
                      }}
                    >
                      {[...Array(60)].map((_, i) => (
                        <div
                          key={i}
                          style={{
                            width: i % 4 === 0 ? '1px' : '2px',
                            height: '100%',
                            background: '#000',
                          }}
                        ></div>
                      ))}
                    </div>
                  </div>
                  <div
                    style={{ display: 'flex', gap: '10px', marginTop: '20px' }}
                  >
                    <button
                      onClick={() =>
                        copiarPix(entregadorSelecionado.taxasPendentes)
                      }
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: CorPrincipal,
                        color: '#FFF',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: 'bold',
                      }}
                    >
                      <QrCode size={16} /> PIX
                    </button>
                    <button
                      onClick={() => window.print()}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: '#333',
                        color: '#FFF',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: 'bold',
                      }}
                    >
                      <Printer size={16} /> IMPRIMIR
                    </button>
                  </div>
                  <button
                    onClick={async () => {
                      const promises = historicoPedidos.map((p) =>
                        updateDoc(doc(db, 'pedidos', p.id), {
                          pagoAoAdmin: true,
                        })
                      );
                      await Promise.all(promises);
                      await updateDoc(
                        doc(db, 'perfil_entregador', entregadorSelecionado.id),
                        {
                          taxasPendentes: 0,
                          status: 'ativo',
                          dataUltimoPagamento: serverTimestamp(),
                        }
                      );
                      setEntregadorSelecionado(null);
                      alert('Pago e Desbloqueado!');
                    }}
                    style={{
                      width: '100%',
                      marginTop: '10px',
                      padding: '12px',
                      background: '#2E7D32',
                      color: '#FFF',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: 'bold',
                    }}
                  >
                    <CheckCircle size={16} /> CONFIRMAR PAGAMENTO TOTAL
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
