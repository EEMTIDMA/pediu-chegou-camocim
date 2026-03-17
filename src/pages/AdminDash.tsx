// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
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
Calendar,
MessageSquare,
FileText,
Truck
} from 'lucide-react';

const CorPrincipal = '#312D6F';
const CorDestaque = '#FFD700';

export default function AdminDash() {
const chatEndRef = useRef(null);
const [activeTab, setActiveTab] = useState('entregadores');
const [entregadores, setEntregadores] = useState([]);
const [mensagensChat, setMensagensChat] = useState([]);
const [busca, setBusca] = useState('');
const [entregadorSelecionado, setEntregadorSelecionado] = useState(null);
const [chatAtivo, setChatAtivo] = useState(null);
const [abaModal, setAbaModal] = useState('perfil');
const [msgResposta, setMsgResposta] = useState('');
const [historicoPedidos, setHistoricoPedidos] = useState([]);
const [dadosBanco, setDadosBanco] = useState({ banco: 'INTER', agencia: '0001', conta: '123456-7' });

useEffect(() => {
const unsubE = onSnapshot(collection(db, 'perfil_entregador'), (s) => {
setEntregadores(s.docs.map((d) => ({ id: d.id, ...d.data() })));
});
return () => unsubE();
}, []);

useEffect(() => {
if (!chatAtivo) return;
const qM1 = query(collection(db, 'mensagens_suporte'), where('entregadorId', '==', chatAtivo.id));
const qM2 = query(collection(db, 'respostas_suporte'), where('entregadorId', '==', chatAtivo.id));
let m1 = []; let m2 = [];
const unsubM1 = onSnapshot(qM1, (s) => {
m1 = s.docs.map(d => ({ id: d.id, ...d.data(), remetente: 'entregador', ts: d.data().data?.seconds || 0 }));
setMensagensChat([...m1, ...m2].sort((a, b) => a.ts - b.ts));
});
const unsubM2 = onSnapshot(qM2, (s) => {
m2 = s.docs.map(d => ({ id: d.id, ...d.data(), remetente: 'admin', ts: d.data().timestamp?.seconds || 0 }));
setMensagensChat([...m1, ...m2].sort((a, b) => a.ts - b.ts));
});
return () => { unsubM1(); unsubM2(); };
}, [chatAtivo]);

useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensagensChat]);

const calcularCiclos = (pedidos) => {
const ciclos = {};
pedidos.filter(p => p.status === 'entregue').forEach(p => {
const data = p.horaEntrega?.toDate() || new Date();
const quinzena = data.getDate() <= 15 ? "1ª Quinzena" : "2ª Quinzena";
const chave = `${quinzena} - ${data.getMonth() + 1}/${data.getFullYear()}`;
if (!ciclos[chave]) ciclos[chave] = { valor: 0, status: 'PAGO' };
ciclos[chave].valor += 0.30;
if (!p.pagoAoAdmin) ciclos[chave].status = 'PENDENTE';
});
return Object.entries(ciclos).reverse();
};

const abrirDetalhes = async (e) => {
const q = query(collection(db, 'pedidos'), where('entregadorId', '==', e.id));
const snap = await getDocs(q);
const pedidos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
setHistoricoPedidos(pedidos);
const acumulado = pedidos.filter((p) => p.status === 'entregue' && !p.pagoAoAdmin).length * 0.30;
const diaAtual = new Date().getDate();
const ciclos = calcularCiclos(pedidos);
const temAtrasoCritico = ciclos.some(([ciclo, dados]) => 
dados.status === 'PENDENTE' && 
((ciclo.includes("1ª Quinzena") && diaAtual > 17) || (ciclo.includes("2ª Quinzena") && (diaAtual > 2 && diaAtual < 15)))
);
let statusFinal = e.status;
if (temAtrasoCritico && e.status !== 'bloqueado') {
await updateDoc(doc(db, 'perfil_entregador', e.id), { status: 'bloqueado' });
statusFinal = 'bloqueado';
}
setEntregadorSelecionado({ ...e, taxasPendentes: acumulado, status: statusFinal });
setAbaModal('perfil');
};

const gerarBoletoProfissional = () => {
const valor = Number(entregadorSelecionado.taxasPendentes).toFixed(2);
const hoje = new Date();
const vencimento = hoje.getDate() <= 15 ? `17/${hoje.getMonth()+1}/${hoje.getFullYear()}` : `02/${hoje.getMonth()+2}/${hoje.getFullYear()}`;
const pixCopiaECola = `00020126360014BR.GOV.BCB.PIX011188994125539520400005303986540${valor}5802BR5910PEDIUCHEGOU6008CIDADE62070503***6304`;

const win = window.open('', '_blank');
win.document.write(`
<html>
<head><title>Fatura de Repasse - Pediu Chegou</title>
<style>
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #222; line-height: 1.6; }
.header { display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid #312D6F; padding-bottom: 20px; }
.logo-text { font-size: 28px; font-weight: bold; color: #312D6F; }
.logo-destaque { color: #d4af37; }
.doc-title { text-align: right; }
.info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; }
.card { border: 1px solid #eee; padding: 20px; borderRadius: 8px; background: #fafafa; }
.pix-area { margin-top: 40px; border: 2px solid #312D6F; padding: 30px; border-radius: 12px; text-align: center; background: #fff; }
.qr-code { margin: 20px 0; border: 10px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
.footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 11px; text-align: center; color: #666; }
.copy-paste { background: #f0f0f0; padding: 10px; font-family: monospace; font-size: 10px; border-radius: 4px; word-break: break-all; margin-top: 10px; }
@media print { .no-print { display: none; } }
</style>
</head>
<body>
<div class="header">
<div class="logo-text">PEDIU <span class="logo-destaque">CHEGOU</span><br/><small style="font-size:14px">LOGÍSTICA INTEGRADA</small></div>
<div class="doc-title"><h2>FATURA DE REPASSE</h2><p>Ref. Ciclo Quinzenal</p></div>
</div>
<div class="info-section">
<div class="card"><strong>DADOS DO ENTREGADOR</strong><p>${entregadorSelecionado.nome}<br/>CPF: ${entregadorSelecionado.cpf}<br/>Fone: ${entregadorSelecionado.telefone}</p></div>
<div class="card"><strong>RESUMO FINANCEIRO</strong><p>Vencimento: <b>${vencimento}</b><br/>Total das Taxas: <b style="font-size:18px; color:#e74c3c">R$ ${valor}</b></p></div>
</div>
<div class="info-section">
<div class="card"><strong>INSTRUÇÕES DE PAGAMENTO</strong><p>Realize o repasse via PIX utilizando o QR Code ao lado ou a chave copia e cola abaixo. Mantenha seu cadastro ativo realizando o pagamento em até 48h.</p></div>
<div class="card"><strong>DADOS PARA DEPÓSITO</strong><p>Banco: ${dadosBanco.banco}<br/>Ag: ${dadosBanco.agencia} | Conta: ${dadosBanco.conta}<br/>Favorecido: Pediu Chegou - Logística</p></div>
</div>
<div class="pix-area">
<p><strong>SCANNEIE O QR CODE PIX PARA PAGAMENTO DIGITAL</strong></p>
<img class="qr-code" src="https://api.qrserver.com{encodeURIComponent(pixCopiaECola)}" />
<p><b>PIX COPIA E COLA:</b></p>
<div class="copy-paste">${pixCopiaECola}</div>
</div>
<div class="footer">
<p>Este documento é uma fatura de controle interno da Pediu Chegou - Logística. O atraso no repasse resulta no bloqueio automático da conta do entregador no aplicativo. <br/><b>Obrigado pela parceria!</b></p>
</div>
<div style="text-align:center" class="no-print"><button onclick="window.print()" style="margin-top:30px; padding:15px 40px; background:#312D6F; color:#FFF; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">IMPRIMIR AGORA</button></div>
</body>
</html>
`);
};

const confirmarPagamentoTotal = async (entregadorId) => {
if (!window.confirm("Confirmar recebimento e desbloquear entregador?")) return;
const batch = writeBatch(db);
const pendentes = historicoPedidos.filter(p => p.status === 'entregue' && !p.pagoAoAdmin);
pendentes.forEach(p => batch.update(doc(db, 'pedidos', p.id), { pagoAoAdmin: true }));
batch.update(doc(db, 'perfil_entregador', entregadorId), { taxasPendentes: 0, status: 'ativo', dataUltimoPagamento: serverTimestamp() });
await batch.commit();
alert('Pagamento confirmado!');
setEntregadorSelecionado(null);
};

const enviarRespostaAdmin = async () => {
if (!msgResposta.trim() || !chatAtivo) return;
await addDoc(collection(db, 'respostas_suporte'), { entregadorId: chatAtivo.id, texto: msgResposta, adminId: auth.currentUser?.uid, timestamp: serverTimestamp(), remetente: 'admin' });
setMsgResposta('');
};

const copiarPix = (valor) => {
const pix = `00020126360014BR.GOV.BCB.PIX011188994125539520400005303986540${Number(valor).toFixed(2)}5802BR5910PEDIUCHEGOU6008CIDADE62070503***6304`;
navigator.clipboard.writeText(pix);
alert('PIX Copiado!');
};

return (
<div style={{ minHeight: '100vh', backgroundColor: '#F8F9FA', fontFamily: 'sans-serif' }}>
<nav style={{ backgroundColor: CorPrincipal, color: '#FFF', padding: '0 20px', height: '60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Truck color={CorDestaque} size={24} /> <strong>PEDIU CHEGOU - LOGÍSTICA</strong></div>
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
<div style={{ position: 'relative', marginBottom: '15px' }}>
<Search style={{ position: 'absolute', left: '12px', top: '12px', color: '#999' }} size={20} />
<input placeholder="Filtrar entregador..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '10px', border: '1px solid #DDD' }} />
</div>
<div style={{ background: '#FFF', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
<table style={{ width: '100%', borderCollapse: 'collapse' }}>
<thead style={{ background: '#F8F9FA' }}>
<tr style={{ fontSize: '12px' }}><th style={{ padding: '15px', textAlign: 'left' }}>NOME</th><th style={{ textAlign: 'left' }}>DÉBITO ATUAL</th><th style={{ textAlign: 'left' }}>STATUS</th><th style={{ textAlign: 'center' }}>AÇÕES</th></tr>
</thead>
<tbody>
{entregadores.filter(e => e.nome?.toLowerCase().includes(busca.toLowerCase())).map(e => (
<tr key={e.id} style={{ borderBottom: '1px solid #F1F1F1' }}>
<td style={{ padding: '15px' }}>{e.nome}</td>
<td style={{ fontWeight: 'bold', color: e.taxasPendentes > 0 ? '#E74C3C' : '#2ECC71' }}>R$ {Number(e.taxasPendentes || 0).toFixed(2)}</td>
<td>{e.status === 'bloqueado' ? '🔴 Bloqueado' : '🟢 Ativo'}</td>
<td style={{ textAlign: 'center' }}><Eye onClick={() => abrirDetalhes(e)} style={{ cursor: 'pointer', color: CorPrincipal }} /></td>
</tr>
))}
</tbody>
</table>
</div>
</section>
)}

{activeTab === 'chamados' && (
<section style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', height: '70vh' }}>
<div style={{ background: '#FFF', borderRadius: '12px', overflowY: 'auto', border: '1px solid #DDD' }}>
<div style={{ padding: '15px', borderBottom: '1px solid #EEE', fontWeight: 'bold' }}>Chat Logística</div>
{entregadores.map(e => (
<div key={e.id} onClick={() => setChatAtivo(e)} style={{ padding: '15px', cursor: 'pointer', borderBottom: '1px solid #F9F9F9', background: chatAtivo?.id === e.id ? '#F0F7FF' : 'transparent' }}>
<div style={{ fontSize: '14px', fontWeight: 'bold' }}>{e.nome}</div>
<small style={{ color: '#999' }}>{e.telefone}</small>
</div>
))}
</div>
<div style={{ background: '#FFF', borderRadius: '12px', display: 'flex', flexDirection: 'column', border: '1px solid #DDD', overflow: 'hidden' }}>
{chatAtivo ? (
<>
<div style={{ padding: '15px', background: CorPrincipal, color: '#FFF', fontWeight: 'bold' }}>Canal de Suporte: {chatAtivo.nome}</div>
<div style={{ flex: 1, padding: '15px', overflowY: 'auto', background: '#F4F7F6' }}>
{mensagensChat.map(m => (
<div key={m.id} style={{ textAlign: m.remetente === 'admin' ? 'right' : 'left', marginBottom: '15px' }}>
<div style={{ display: 'inline-block', padding: '10px 15px', borderRadius: '15px', maxWidth: '80%', fontSize: '13px', background: m.remetente === 'admin' ? CorPrincipal : '#FFF', color: m.remetente === 'admin' ? '#FFF' : '#333' }}>{m.texto}</div>
</div>
))}
<div ref={chatEndRef} />
</div>
<div style={{ padding: '15px', borderTop: '1px solid #EEE', display: 'flex', gap: '10px' }}>
<input value={msgResposta} onChange={(e) => setMsgResposta(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && enviarRespostaAdmin()} placeholder="Enviar mensagem..." style={{ flex: 1, padding: '12px', border: '1px solid #DDD', borderRadius: '10px' }} />
<button onClick={enviarRespostaAdmin} style={{ background: CorPrincipal, color: '#FFF', border: 'none', borderRadius: '10px', padding: '0 20px' }}><Send size={18} /></button>
</div>
</>
) : (<div style={{ margin: 'auto', color: '#999', textAlign: 'center' }}><MessageSquare size={48} /><p>Selecione um entregador</p></div>)}
</div>
</section>
)}

{activeTab === 'financeiro' && (
<section style={{ background: '#FFF', padding: '20px', borderRadius: '15px' }}>
<h3><Landmark size={20} /> Painel Administrativo Financeiro</h3>
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginTop: '20px' }}>
<div><label style={{ fontSize: '11px', fontWeight: 'bold' }}>BANCO</label><input value={dadosBanco.banco} onChange={(e) => setDadosBanco({...dadosBanco, banco: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #DDD', borderRadius: '8px' }} /></div>
<div><label style={{ fontSize: '11px', fontWeight: 'bold' }}>AGÊNCIA</label><input value={dadosBanco.agencia} onChange={(e) => setDadosBanco({...dadosBanco, agencia: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #DDD', borderRadius: '8px' }} /></div>
<div><label style={{ fontSize: '11px', fontWeight: 'bold' }}>CONTA</label><input value={dadosBanco.conta} onChange={(e) => setDadosBanco({...dadosBanco, conta: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #DDD', borderRadius: '8px' }} /></div>
</div>
<div style={{ marginTop: '30px', padding: '30px', background: '#F8F9FA', borderRadius: '15px', textAlign: 'center', border: '2px dashed #DDD' }}>
<p style={{ color: '#666', fontWeight: 'bold' }}>CHAVE PIX OFICIAL - PEDIU CHEGOU:</p>
<strong style={{ fontSize: '26px', color: CorPrincipal }}>88994125539</strong>
</div>
</section>
)}
</main>

{entregadorSelecionado && (
<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '15px' }}>
<div style={{ background: '#FFF', width: '100%', maxWidth: '550px', borderRadius: '20px', padding: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}><h3>{entregadorSelecionado.nome}</h3><XCircle onClick={() => setEntregadorSelecionado(null)} style={{ cursor: 'pointer' }} /></div>
<div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
<button onClick={() => setAbaModal('perfil')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: abaModal === 'perfil' ? CorPrincipal : '#EEE', color: abaModal === 'perfil' ? '#FFF' : '#666', fontWeight: 'bold' }}>DADOS</button>
<button onClick={() => setAbaModal('cobranca')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: abaModal === 'cobranca' ? CorPrincipal : '#EEE', color: abaModal === 'cobranca' ? '#FFF' : '#666', fontWeight: 'bold' }}>COBRANÇA</button>
</div>

{abaModal === 'perfil' ? (
<div style={{ lineHeight: '2.2' }}>
<p><strong>CPF:</strong> {entregadorSelecionado.cpf}</p>
<p><strong>Telefone:</strong> {entregadorSelecionado.telefone}</p>
<p><strong>Status:</strong> <b style={{color: entregadorSelecionado.status === 'bloqueado' ? 'red' : 'green'}}>{entregadorSelecionado.status?.toUpperCase()}</b></p>
<button onClick={async () => {
const novoStatus = entregadorSelecionado.status === 'bloqueado' ? 'ativo' : 'bloqueado';
await updateDoc(doc(db, 'perfil_entregador', entregadorSelecionado.id), { status: novoStatus });
setEntregadorSelecionado(null);
}} style={{ width: '100%', padding: '15px', background: entregadorSelecionado.status === 'bloqueado' ? '#2ECC71' : '#E74C3C', color: '#FFF', border: 'none', borderRadius: '12px', marginTop: '20px', fontWeight: 'bold' }}>
{entregadorSelecionado.status === 'bloqueado' ? <Unlock size={18} /> : <Ban size={18} />} {entregadorSelecionado.status === 'bloqueado' ? 'DESBLOQUEAR ACESSO' : 'BLOQUEAR AGORA'}
</button>
</div>
) : (
<div>
<h4 style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Clock size={18} /> Ciclos Quinzenais</h4>
{calcularCiclos(historicoPedidos).map(([ciclo, dados]) => {
const diaAt = new Date().getDate();
const isVencido = dados.status === 'PENDENTE' && ((ciclo.includes("1ª Quinzena") && diaAt > 17) || (ciclo.includes("2ª Quinzena") && (diaAt > 2 && diaAt < 15)));
return (
<div key={ciclo} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 10px', borderBottom: '1px solid #EEE', fontSize: '13px', background: isVencido ? '#FFF1F0' : 'transparent' }}>
<div><span>{ciclo}</span>{isVencido && <small style={{display:'block', color:'red', fontWeight:'bold'}}>⚠️ FATURA VENCIDA</small>}</div>
<span style={{ color: dados.status === 'PAGO' ? '#2ECC71' : '#E74C3C', fontWeight: 'bold' }}>R$ {dados.valor.toFixed(2)}</span>
</div>
)})}
<div style={{ background: '#F9F9F9', padding: '25px', borderRadius: '15px', marginTop: '20px', textAlign: 'center', border: '1px solid #DDD' }}>
<p style={{ margin: 0, fontSize: '12px', color: '#666' }}>DÉBITO PENDENTE TOTAL</p>
<h2 style={{ color: '#E74C3C', margin: '5px 0', fontSize: '32px' }}>R$ {Number(entregadorSelecionado.taxasPendentes || 0).toFixed(2)}</h2>
<div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
<button onClick={gerarBoletoProfissional} style={{ flex: 1, padding: '15px', background: '#333', color: '#FFF', border: 'none', borderRadius: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
<FileText size={18} /> GERAR FATURA
</button>
<button onClick={() => copiarPix(entregadorSelecionado.taxasPendentes)} style={{ flex: 1, padding: '15px', background: CorPrincipal, color: '#FFF', border: 'none', borderRadius: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
<QrCode size={18} /> PIX COPIAR
</button>
</div>
<button onClick={() => confirmarPagamentoTotal(entregadorSelecionado.id)} style={{ width: '100%', padding: '20px', background: '#2ECC71', color: '#FFF', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px' }}>CONFIRMAR RECEBIMENTO E ZERAR</button>
</div>
</div>
)}
</div>
</div>
)}
</div>
);
}
