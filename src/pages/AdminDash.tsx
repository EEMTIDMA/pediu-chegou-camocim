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
  writeBatch
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import {
  ShieldAlert,
  Search,
  XCircle,
  Ban,
  Unlock,
  Eye,
  LogOut,
  Bell,
  QrCode,
  CheckCircle,
  Send,
  Printer,
  Landmark,
  Clock,
  Calendar
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
  const [dadosBanco, setDadosBanco] = useState({ banco: 'INTER', agencia: '0001', conta: '123456-7' });

  useEffect(() => {
    const unsubE = onSnapshot(collection(db, 'perfil_entregador'), (s) => {
      setEntregadores(s.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubC = onSnapshot(query(collection(db, 'mensagens_suporte'), orderBy('data', 'desc')), (s) => {
      setChamados(s.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubE(); unsubC(); };
  }, []);

  const abrirDetalhes = async (e) => {
    setEntregadorSelecionado(e);
    setAbaModal('perfil');
    const q = query(collection(db, 'pedidos'), where('entregadorId', '==', e.id));
    const snap = await getDocs(q);
    const pedidos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setHistoricoPedidos(pedidos);

    const acumulado = pedidos
      .filter((p) => p.status === 'entregue' && !p.pagoAoAdmin)
      .reduce((acc) => acc + 0.30, 0);

    await updateDoc(doc(db, 'perfil_entregador', e.id), { taxasPendentes: acumulado });
  };

  const calcularCiclos = (pedidos) => {
    const ciclos = {};
    pedidos.filter(p => p.status === 'entregue').forEach(p => {
      const data = p.horaEntrega?.toDate() || new Date();
      const mes = data.getMonth() + 1;
      const ano = data.getFullYear();
      const quinzena = data.getDate() <= 15 ? "1ª Quinzena" : "2ª Quinzena";
      const chave = `${quinzena} - ${mes}/${ano}`;
      
      if (!ciclos[chave]) ciclos[chave] = { valor: 0, status: p.pagoAoAdmin ? 'PAGO' : 'PENDENTE' };
      ciclos[chave].valor += 0.30;
      if (!p.pagoAoAdmin) ciclos[chave].status = 'PENDENTE';
    });
    return Object.entries(ciclos).reverse();
  };

  const responderChamado = async (chamado) => {
    const texto = respostaSuporte[chamado.id];
    if (!texto) return alert('Digite algo.');
    
    // Envia resposta para o entregador
    await addDoc(collection(db, 'respostas_suporte'), {
      entregadorId: chamado.entregadorId,
      texto: texto,
      adminId: auth.currentUser?.uid,
      timestamp: serverTimestamp(),
      remetente: 'admin',
    });

    // Atualiza o chamado original com a resposta no histórico do admin
    await updateDoc(doc(db, 'mensagens_suporte', chamado.id), { 
      respondido: true,
      respostaAdmin: texto,
      dataResposta: serverTimestamp()
    });

    setRespostaSuporte({ ...respostaSuporte, [chamado.id]: '' });
    alert('Mensagem enviada!');
  };

  const confirmarPagamentoTotal = async (entregadorId) => {
    if (!window.confirm("Zerar todos os débitos deste entregador?")) return;
    const batch = writeBatch(db);
    const pendentes = historicoPedidos.filter(p => p.status === 'entregue' && !p.pagoAoAdmin);
    
    pendentes.forEach(p => {
      batch.update(doc(db, 'pedidos', p.id), { pagoAoAdmin: true });
    });
    
    batch.update(doc(db, 'perfil_entregador', entregadorId), { 
      taxasPendentes: 0, 
      dataUltimoPagamento: serverTimestamp() 
    });
    
    await batch.commit();
    alert('Débitos quitados!');
    setEntregadorSelecionado(null);
  };

  const copiarPix = (valor) => {
    const pix = `00020126360014BR.GOV.BCB.PIX011188994125539520400005303986540${Number(valor).toFixed(2)}5802BR5910ADMIN6008CIDADE62070503***6304`;
    navigator.clipboard.writeText(pix);
    alert('Copia e Cola gerado!');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8F9FA', fontFamily: 'sans-serif' }}>
      <nav style={{ backgroundColor: CorPrincipal, color: '#FFF', padding: '0 20px', height: '60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><ShieldAlert color={CorDestaque} /> <strong>MASTER LOGÍSTICA</strong></div>
        <LogOut onClick={() => signOut(auth)} style={{ cursor: 'pointer' }} />
      </nav>

      <div style={{ display: 'flex', backgroundColor: '#FFF', borderBottom: '1px solid #DDD' }}>
        {['entregadores', 'chamados', 'financeiro'].map((t) => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ flex: 1, padding: '15px', border: 'none', background: 'none', color: activeTab === t ? CorPrincipal : '#999', borderBottom: activeTab === t ? `3px solid ${CorDestaque}` : 'none', fontWeight: 'bold' }}>{t.toUpperCase()}</button>
        ))}
      </div>

      <main style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
        {activeTab === 'entregadores' && (
          <section>
            <input placeholder="Filtrar entregador..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #DDD', marginBottom: '15px' }} />
            <div style={{ background: '#FFF', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#F8F9FA' }}>
                  <tr style={{ fontSize: '12px' }}>
                    <th style={{ padding: '15px', textAlign: 'left' }}>NOME</th>
                    <th style={{ textAlign: 'left' }}>DÉBITO ATUAL</th>
                    <th style={{ textAlign: 'left' }}>STATUS</th>
                    <th style={{ textAlign: 'left' }}>AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {entregadores.filter(e => e.nome?.toLowerCase().includes(busca.toLowerCase())).map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid #F1F1F1' }}>
                      <td style={{ padding: '15px' }}>{e.nome}</td>
                      <td style={{ fontWeight: 'bold', color: e.taxasPendentes > 0 ? '#E74C3C' : '#2ECC71' }}>R$ {Number(e.taxasPendentes || 0).toFixed(2)}</td>
                      <td>{e.status === 'bloqueado' ? '🔴 Bloqueado' : '🟢 Ativo'}</td>
                      <td><Eye onClick={() => abrirDetalhes(e)} style={{ cursor: 'pointer' }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'chamados' && (
          <section>
            {chamados.map(c => (
              <div key={c.id} style={{ background: '#FFF', padding: '15px', borderRadius: '12px', marginBottom: '10px', borderLeft: `5px solid ${c.respondido ? '#2ECC71' : '#E74C3C'}` }}>
                <p><strong>{c.entregadorNome}:</strong> {c.texto}</p>
                
                {/* HISTÓRICO DE RESPOSTA NO CARD */}
                {c.respondido && c.respostaAdmin && (
                  <div style={{ background: '#F0F7FF', padding: '10px', borderRadius: '8px', margin: '10px 0', border: '1px solid #BAE7FF' }}>
                    <small style={{ fontWeight: 'bold', color: CorPrincipal }}>SUA RESPOSTA:</small>
                    <p style={{ margin: '5px 0 0 0', fontSize: '13px' }}>{c.respostaAdmin}</p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <input value={respostaSuporte[c.id] || ''} onChange={(e) => setRespostaSuporte({...respostaSuporte, [c.id]: e.target.value})} placeholder="Resposta..." style={{ flex: 1, padding: '8px', borderRadius: '5px', border: '1px solid #DDD' }} />
                  <button onClick={() => responderChamado(c)} style={{ background: CorPrincipal, color: '#FFF', border: 'none', padding: '8px 15px', borderRadius: '5px' }}><Send size={14} /></button>
                </div>
              </div>
            ))}
          </section>
        )}

        {activeTab === 'financeiro' && (
          <section style={{ background: '#FFF', padding: '20px', borderRadius: '15px' }}>
            <h3>Configuração de Recebimento</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              <div><label style={{ fontSize: '11px', fontWeight: 'bold' }}>BANCO</label><input value={dadosBanco.banco} onChange={(e) => setDadosBanco({...dadosBanco, banco: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #DDD', borderRadius: '8px' }} /></div>
              <div><label style={{ fontSize: '11px', fontWeight: 'bold' }}>AGÊNCIA</label><input value={dadosBanco.agencia} onChange={(e) => setDadosBanco({...dadosBanco, agencia: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #DDD', borderRadius: '8px' }} /></div>
              <div><label style={{ fontSize: '11px', fontWeight: 'bold' }}>CONTA</label><input value={dadosBanco.conta} onChange={(e) => setDadosBanco({...dadosBanco, conta: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #DDD', borderRadius: '8px' }} /></div>
            </div>
          </section>
        )}
      </main>

      {entregadorSelecionado && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: '#FFF', width: '90%', maxWidth: '500px', borderRadius: '20px', padding: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3>{entregadorSelecionado.nome}</h3>
              <XCircle onClick={() => setEntregadorSelecionado(null)} style={{ cursor: 'pointer' }} />
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button onClick={() => setAbaModal('perfil')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: abaModal === 'perfil' ? CorPrincipal : '#EEE', color: abaModal === 'perfil' ? '#FFF' : '#666' }}>DADOS</button>
              <button onClick={() => setAbaModal('cobranca')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: abaModal === 'cobranca' ? CorPrincipal : '#EEE', color: abaModal === 'cobranca' ? '#FFF' : '#666' }}>FECHAMENTOS</button>
            </div>

            {abaModal === 'perfil' ? (
              <div style={{ lineHeight: '2' }}>
                <p><strong>CPF:</strong> {entregadorSelecionado.cpf}</p>
                <p><strong>Telefone:</strong> {entregadorSelecionado.telefone}</p>
                <p><strong>Veículo:</strong> {entregadorSelecionado.veiculoModelo}</p>
                <button onClick={async () => {
                  const novoStatus = entregadorSelecionado.status === 'bloqueado' ? 'ativo' : 'bloqueado';
                  await updateDoc(doc(db, 'perfil_entregador', entregadorSelecionado.id), { status: novoStatus });
                  setEntregadorSelecionado(null);
                }} style={{ width: '100%', padding: '12px', background: entregadorSelecionado.status === 'bloqueado' ? '#2ECC71' : '#E74C3C', color: '#FFF', border: 'none', borderRadius: '10px', marginTop: '15px', fontWeight: 'bold' }}>
                  {entregadorSelecionado.status === 'bloqueado' ? 'DESBLOQUEAR AGORA' : 'BLOQUEAR ENTREGADOR'}
                </button>
              </div>
            ) : (
              <div>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Clock size={18} /> Histórico de Ciclos (15 dias)</h4>
                {calcularCiclos(historicoPedidos).map(([ciclo, dados]) => (
                  <div key={ciclo} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #EEE', fontSize: '13px' }}>
                    <span>{ciclo}</span>
                    <span style={{ fontWeight: 'bold' }}>R$ {dados.valor.toFixed(2)}</span>
                    <span style={{ fontSize: '10px', color: dados.status === 'PAGO' ? '#2ECC71' : '#E74C3C' }}>{dados.status}</span>
                  </div>
                ))}
                
                <div style={{ background: '#F9F9F9', padding: '15px', borderRadius: '12px', marginTop: '20px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '12px' }}>DÉBITO TOTAL ATUAL</p>
                  <h2 style={{ color: '#E74C3C', margin: '5px 0' }}>R$ {Number(entregadorSelecionado.taxasPendentes || 0).toFixed(2)}</h2>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => copiarPix(entregadorSelecionado.taxasPendentes)} style={{ flex: 1, padding: '10px', background: CorPrincipal, color: '#FFF', border: 'none', borderRadius: '8px' }}><QrCode size={14} /> PIX</button>
                    <button onClick={() => window.print()} style={{ flex: 1, padding: '10px', background: '#333', color: '#FFF', border: 'none', borderRadius: '8px' }}><Printer size={14} /> BOLETO</button>
                  </div>
                </div>

                <button onClick={() => confirmarPagamentoTotal(entregadorSelecionado.id)} style={{ width: '100%', padding: '15px', background: '#2ECC71', color: '#FFF', border: 'none', borderRadius: '10px', marginTop: '10px', fontWeight: 'bold' }}><CheckCircle size={18} /> CONFIRMAR RECEBIMENTO TOTAL</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
