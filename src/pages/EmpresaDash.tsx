// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { db, auth, storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  collection, addDoc, serverTimestamp, query, where, onSnapshot,
  doc, setDoc, getDoc, updateDoc,
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from 'firebase/auth';
import {
  PackagePlus, Send, History, User, MapPin, LogOut, Printer,
  Camera, Loader2, Upload, Edit, Clock, UserCheck, Bike, CheckCircle
} from 'lucide-react';

import { buscarSugestoes, calcularRotaReal } from '../services/maps';

const CorPrincipal = '#312D6F';
const CorDestaque = '#FFD700';
const CorFundo = '#F0F2F5';
const RAIO_MAXIMO_KM = 4;
const TAXA_FIXA_ADM = 0.30;

const cardBase = { backgroundColor: '#FFF', borderRadius: '20px', padding: '25px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', marginBottom: '20px' };
const inputStyle = { width: '100%', padding: '12px 15px', borderRadius: '12px', border: '2px solid #E0E4EC', fontSize: '14px', outline: 'none', boxSizing: 'border-box' };
const tabActive = { flex: 1, padding: '12px', backgroundColor: CorPrincipal, color: CorDestaque, border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' };
const tabInactive = { flex: 1, padding: '12px', backgroundColor: 'transparent', color: '#666', border: 'none', fontWeight: '600', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' };

export default function EmpresaDash() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('pedidos');
  const [loading, setLoading] = useState(false);
  const [pedidos, setPedidos] = useState([]);
  const [filtroPeriodo, setFiltroPeriodo] = useState('dia');
  const [distanciaKm, setDistanciaKm] = useState(0);
  const [coordCliente, setCoordCliente] = useState({ lat: null, lng: null });
  const [sugestoesEndereco, setSugestoesEndereco] = useState([]);
  
  const [perfil, setPerfil] = useState({
    nomeSocial: '', nomeFantasia: '', responsavel: '', 
    telefoneFixo: '', telefoneComercial: '', whatsapp: '',
    rua: '', numero: '', bairro: '', logo: '', lat: null, lng: null
  });

  const [form, setForm] = useState({
    cliente: '', telefone: '', rua: '', numero: '', bairro: '', 
    descricao: '', valor: '', pagamento: 'pix', entregadorTipo: 'publico'
  });

  useEffect(() => {
    if (!user?.uid) return;
    
    getDoc(doc(db, 'perfil_empresa', user.uid)).then((d) => {
      if (d.exists()) {
        const dados = d.data();
        setPerfil({
          nomeSocial: dados.nomeSocial || '',
          nomeFantasia: dados.nomeFantasia || '',
          responsavel: dados.responsavel || '',
          telefoneFixo: dados.telefoneFixo || '',
          telefoneComercial: dados.telefoneComercial || '',
          whatsapp: dados.whatsapp || '',
          rua: dados.rua || '',
          numero: dados.numero || '',
          bairro: dados.bairro || '',
          logo: dados.logo || '',
          lat: dados.lat || null,
          lng: dados.lng || null
        });
      }
    });

    const q = query(collection(db, 'pedidos'), where('empresaId', '==', String(user.uid)));
    
    const unsub = onSnapshot(q, (s) => {
      const listaRaw = s.docs.map(d => ({ id: d.id, ...d.data() }));
      const agora = new Date();
      const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();
      const seteDias = hoje - (7 * 24 * 60 * 60 * 1000);
      const trintaDias = hoje - (30 * 24 * 60 * 60 * 1000);

      const filtrados = listaRaw.filter(p => {
        const ts = p.horaSolicitacao?.seconds ? p.horaSolicitacao.seconds * 1000 : Date.now();
        if (filtroPeriodo === 'dia') return ts >= hoje;
        if (filtroPeriodo === 'semana') return ts >= seteDias;
        if (filtroPeriodo === 'mes') return ts >= trintaDias;
        return true;
      });
      setPedidos(filtrados.sort((a,b) => (b.horaSolicitacao?.seconds || 0) - (a.horaSolicitacao?.seconds || 0)));
    });
    return () => unsub();
  }, [user, filtroPeriodo]);

  const gerarCodigoPC = () => `PC-${Math.floor(1000 + Math.random() * 9000)}`;
  const taxaEntrega = (km) => km <= 1 ? 4.0 : km <= 3 ? 5.0 : km <= 5 ? 6.0 : km <= 7 ? 7.0 : 10.0 + (10.0 * 0.2 * Math.ceil(km - 7));
  const totalPedido = (Number(form.valor) || 0) + (distanciaKm > 0 ? taxaEntrega(distanciaKm) : 0) + TAXA_FIXA_ADM;

  const handleUploadLogo = async (e) => {
    if (!e.target.files) return;
    setLoading(true);
    try {
      const storageRef = ref(storage, `logos/${user.uid}`);
      await uploadBytes(storageRef, e.target.files[0]);
      const url = await getDownloadURL(storageRef);
      setPerfil(prev => ({ ...prev, logo: url }));
      await setDoc(doc(db, 'perfil_empresa', user.uid), { logo: url }, { merge: true });
      alert("Logo atualizada!");
    } catch (err) { alert("Erro no upload"); }
    setLoading(false);
  };

  const handleCriarPedido = async (e) => {
    e.preventDefault();
    if (distanciaKm <= 0) return alert('Calcule o KM primeiro!');
    if (!perfil.lat) return alert('Fixe o GPS da Loja no Perfil!');
    setLoading(true);
    const codigo = gerarCodigoPC();
    try {
      await addDoc(collection(db, 'pedidos'), {
        ...form,
        clienteNome: form.cliente,
        clienteTelefone: form.telefone,
        enderecoEntrega: { rua: form.rua, numero: form.numero, bairro: form.bairro },
        valorProdutos: Number(form.valor) || 0,
        valorEntrega: taxaEntrega(distanciaKm),
        valorTaxaAdmin: TAXA_FIXA_ADM,
        totalGeral: totalPedido,
        status: 'pendente',
        codigoRastreio: codigo,
        horaSolicitacao: serverTimestamp(),
        empresaId: String(user.uid),
        nomeLoja: perfil.nomeFantasia || 'Loja',
        lojaNome: perfil.nomeFantasia || 'Loja', // Correção para o entregador
        lojaTelefone: perfil.whatsapp || '', // Correção para contato
        distanciaKm: Number(distanciaKm) || 0,
        latLoja: Number(perfil.lat), 
        lngLoja: Number(perfil.lng),
        latCliente: Number(coordCliente.lat), 
        lngCliente: Number(coordCliente.lng),
        raioBusca: 50, // Garante visibilidade
        indiceFila: 0,
        entregadoresNotificados: []
      });
      alert(`Pedido ${codigo} Lançado!`);
      setForm({ cliente: '', telefone: '', rua: '', numero: '', bairro: '', descricao: '', valor: '', pagamento: 'pix', entregadorTipo: 'publico' });
      setDistanciaKm(0);
    } catch (err) { alert('Erro ao gravar'); }
    setLoading(false);
  };

  /* ================= CALCULOS DASHBOARD ================= */
  const pedidosConcluidos = (pedidos || []).filter(p => p?.status === 'entregue');
  const totalProdutosRel = (pedidos || []).reduce((a,b)=>a + (Number(b?.valorProdutos)||0),0);
  const totalFretesRel = (pedidos || []).reduce((a,b)=>a + (Number(b?.valorEntrega)||0),0);
  const totalTaxasRel = (pedidos || []).reduce((a,b)=>a + (Number(b?.valorTaxaAdmin) || TAXA_FIXA_ADM),0);
  const lucroLiquidoRel = totalTaxasRel; 
  const ticketMedioRel = (pedidos || []).length > 0 ? (totalProdutosRel + totalFretesRel + totalTaxasRel) / pedidos.length : 0;

  const rankingEntregadoresRel = Object.values((pedidos || []).reduce((acc,p)=>{
      const nome = p?.entregadorNome || "Não atribuído";
      if(!acc[nome]){ acc[nome] = { nome, pedidos:0 }; }
      acc[nome].pedidos += 1;
      return acc;
    },{})).sort((a,b)=>b.pedidos-a.pedidos);

  const gerarGraficoRel = () => {
    const dias = {};
    (pedidos || []).forEach(p=>{
      const ts = p.horaSolicitacao?.seconds;
      if(!ts) return;
      const data = new Date(ts*1000).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});
      dias[data] = (dias[data]||0) + (Number(p.totalGeral)||0);
    });
    const labels = Object.keys(dias).slice(-7);
    const valores = labels.map(l => dias[l]);
    const max = Math.max(...valores, 1);
    return {labels, valores, max};
  };
  const dG = gerarGraficoRel();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: CorFundo, fontFamily: 'sans-serif' }}>
      <nav style={{ backgroundColor: CorPrincipal, padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#FFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {perfil.logo && <img src={perfil.logo} alt="logo" style={{ width: 35, height: 35, borderRadius: '50%', objectFit: 'cover' }} />}
          <strong>{perfil.nomeFantasia || 'APP PEDIU CHEGOU'}</strong>
        </div>
        <LogOut onClick={() => signOut(auth)} size={20} style={{ cursor: 'pointer' }} />
      </nav>

      <div style={{ backgroundColor: '#FFF', display: 'flex', padding: '10px', gap: '5px' }}>
        <button onClick={() => setActiveTab('pedidos')} style={activeTab === 'pedidos' ? tabActive : tabInactive}><Send size={18} /> HOJE</button>
        <button onClick={() => setActiveTab('historico')} style={activeTab === 'historico' ? tabActive : tabInactive}><History size={18} /> RELATÓRIO</button>
        <button onClick={() => setActiveTab('perfil')} style={activeTab === 'perfil' ? tabActive : tabInactive}><User size={18} /> PERFIL</button>
      </div>

      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        
        {activeTab === 'pedidos' && (
          <section style={cardBase}>
            <form onSubmit={handleCriarPedido} style={{ display: 'grid', gap: '15px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <input style={inputStyle} placeholder="Nome do Cliente" value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} required />
                <input style={inputStyle} placeholder="Telefone / WhatsApp" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: '10px', position: 'relative' }}>
                <div style={{ position: 'relative' }}>
                  <input style={inputStyle} placeholder="Rua" value={form.rua} onChange={async (e) => { 
                    setForm({ ...form, rua: e.target.value }); 
                    const res = await buscarSugestoes(e.target.value); setSugestoesEndereco(res);
                  }} required />
                  {sugestoesEndereco.length > 0 && (
                    <div style={{ position: 'absolute', width: '100%', background: '#FFF', zIndex: 100, border: '1px solid #EEE', top: '100%', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                      {sugestoesEndereco.map((s, i) => (
                        <div key={i} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #EEE', fontSize: '13px' }} onClick={() => {
                          setForm({ ...form, rua: s.rua, bairro: s.bairro || form.bairro });
                          setCoordCliente({ lat: s.lat, lng: s.lng });
                          setSugestoesEndereco([]);
                        }}>{s.rua} {s.bairro ? `- ${s.bairro}` : ''}</div>
                      ))}
                    </div>
                  )}
                </div>
                <input style={inputStyle} placeholder="Nº" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} required />
                <input style={inputStyle} placeholder="Bairro" value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} required />
              </div>
              <textarea style={{ ...inputStyle, height: '60px' }} placeholder="Descrição do Pedido..." value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <select style={inputStyle} value={form.pagamento} onChange={(e) => setForm({ ...form, pagamento: e.target.value })}>
                  <option value="pix">PIX</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cartao">Cartão</option>
                </select>
                <select style={inputStyle} value={form.entregadorTipo} onChange={(e) => setForm({ ...form, entregadorTipo: e.target.value })}>
                  <option value="publico">Entregador Público</option>
                  <option value="privado">Entregador Privado</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <input style={inputStyle} placeholder="Valor Produtos R$" type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} required />
                <button type="button" disabled={loading} onClick={async () => {
                  if (!perfil.lat) return alert('Fixe o GPS da Loja no Perfil!');
                  if (!coordCliente.lat) return alert('Selecione o endereço na lista!');
                  setLoading(true);
                  const km = await calcularRotaReal({ lat: perfil.lat, lng: perfil.lng }, coordCliente);
                  setDistanciaKm(km ? parseFloat(km.toFixed(2)) : 0);
                  setLoading(false);
                }} style={{ ...inputStyle, background: '#F0F7FF', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  {loading ? <Loader2 className="animate-spin" size={16} /> : (distanciaKm > 0 ? `${distanciaKm} KM` : <><MapPin size={16} /> CALCULAR KM</>)}
                </button>
              </div>
              <div style={{ background: '#F8F9FA', padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>TOTAL GERAL:</strong>
                <strong style={{ fontSize: '20px', color: CorPrincipal }}>R$ {totalPedido.toFixed(2)}</strong>
              </div>
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '16px', background: CorPrincipal, color: CorDestaque, borderRadius: '12px', border: 'none', fontWeight: '900', cursor: 'pointer' }}>LANÇAR PEDIDO</button>
            </form>
          </section>
        )}

        {activeTab === 'historico' && (
          <section>
             <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
              {['dia', 'semana', 'mes'].map((f) => (
                <button key={f} onClick={() => setFiltroPeriodo(f)} style={{ flex: 1, padding: '8px', borderRadius: '20px', border: 'none', background: filtroPeriodo === f ? CorPrincipal : '#EEE', color: filtroPeriodo === f ? '#FFF' : '#666', fontWeight: 'bold' }}>{f.toUpperCase()}</button>
              ))}
            </div>
            <div style={{ ...cardBase, background: CorPrincipal, color: '#FFF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '18px' }}>RELATÓRIO FINANCEIRO</h3>
                <Printer size={22} style={{ cursor: 'pointer' }} />
              </div>
              <div style={{ marginBottom:'20px' }}>
                <small style={{ opacity:0.8 }}>Vendas por período</small>
                <div style={{ display:'flex', alignItems:'flex-end', gap:'8px', height:'100px', marginTop:'10px' }}>
                  {(dG?.valores || []).map((v, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ height: `${(v / dG.max) * 100}%`, background: CorDestaque, borderRadius: '6px 6px 0 0', transition: 'height 0.3s' }} />
                      <small style={{ fontSize: '9px' }}>{dG.labels[i]}</small>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '15px' }}>
                  <small style={{ opacity: 0.8 }}>Produtos</small>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>R$ {totalProdutosRel.toFixed(2)}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '15px' }}>
                  <small style={{ opacity: 0.8 }}>Fretes</small>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>R$ {totalFretesRel.toFixed(2)}</div>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px', marginTop:'15px' }}>
                <div style={{ background:'rgba(255,255,255,0.1)', padding:'15px', borderRadius:'15px' }}>
                  <small style={{opacity:0.8}}>Lucro Líquido (Taxas)</small>
                  <div style={{fontSize:'18px',fontWeight:'bold'}}>R$ {lucroLiquidoRel.toFixed(2)}</div>
                </div>
                <div style={{ background:'rgba(255,255,255,0.1)', padding:'15px', borderRadius:'15px' }}>
                  <small style={{opacity:0.8}}>Ticket Médio</small>
                  <div style={{fontSize:'18px',fontWeight:'bold'}}>R$ {ticketMedioRel.toFixed(2)}</div>
                </div>
              </div>
              <div style={{marginTop:'20px'}}>
                <small style={{opacity:0.8}}>Ranking Entregadores (Top 3)</small>
                {rankingEntregadoresRel.slice(0,3).map((e, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', background:'rgba(255,255,255,0.1)', padding:'10px', borderRadius:'10px', marginTop:'6px', fontSize:'13px' }}>
                    <span>{i+1}º {e.nome}</span>
                    <span>{e.pedidos} entregas</span>
                  </div>
                ))}
              </div>
            </div>
            {pedidos.map(p => (
              <div key={p.id} style={{ ...cardBase, borderLeft: `6px solid ${p.status === 'entregue' ? '#2ecc71' : CorDestaque}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
                  <strong>{p.clienteNome || 'Cliente'}</strong>
                  <span style={{fontSize:'11px',fontWeight:'bold', color: CorPrincipal}}>{p.status?.toUpperCase()}</span>
                </div>
                <div style={{fontSize:'12px',color:'#666', display: 'flex', alignItems: 'center', gap: '4px'}}>
                  <MapPin size={14} /> {p.enderecoEntrega?.rua}, {p.enderecoEntrega?.numero}
                </div>
                <div style={{fontSize:'11px',marginTop:'8px', display: 'flex', justifyContent: 'space-between'}}>
                  <span>ID Pedido: <strong>{p.codigoRastreio}</strong></span>
                  <span>Pagamento: <strong>{String(p.pagamento || '').toUpperCase()}</strong></span>
                </div>
                <div style={{ background:'#F8F9FA', padding:'12px', borderRadius:'12px', marginTop:'12px', fontSize:'12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>📦 Prod: <strong>R$ {Number(p.valorProdutos||0).toFixed(2)}</strong></div>
                  <div>🚚 Entr: <strong>R$ {Number(p.valorEntrega||0).toFixed(2)}</strong></div>
                  <div>💎 Taxa: <strong>R$ {Number(p.valorTaxaAdmin || TAXA_FIXA_ADM).toFixed(2)}</strong></div>
                  <div>🏍️ Motoboy: <strong>{p.entregadorNome || '...'}</strong></div>
                </div>
                <div style={{marginTop:'12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                   <small style={{color: '#999'}}>Solicitado: {p.horaSolicitacao?.seconds ? new Date(p.horaSolicitacao.seconds * 1000).toLocaleTimeString() : '--:--'}</small>
                   <strong style={{fontSize:'16px', color: CorPrincipal}}>Total: R$ {Number(p.totalGeral||0).toFixed(2)}</strong>
                </div>
              </div>
            ))}
          </section>
        )}

        {activeTab === 'perfil' && (
          <section style={cardBase}>
            <div style={{ display: 'grid', gap: '15px' }}>
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <div style={{ position: 'relative', width: '110px', height: '110px', margin: '0 auto' }}>
                  <img src={perfil.logo || 'https://via.placeholder.com'} style={{ width: '100%', height: '100%', borderRadius: '50%', border: `3px solid ${CorPrincipal}`, objectFit: 'cover' }} />
                  <button onClick={() => fileInputRef.current.click()} style={{ position: 'absolute', bottom: 0, right: 0, background: CorDestaque, border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}><Camera size={16} color={CorPrincipal} /></button>
                </div>
                <input type="file" ref={fileInputRef} hidden onChange={handleUploadLogo} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: CorPrincipal }}>Nome Social da Empresa</label>
                  <input style={inputStyle} value={perfil.nomeSocial || ''} onChange={e => setPerfil({ ...perfil, nomeSocial: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: CorPrincipal }}>Nome Fantasia</label>
                  <input style={inputStyle} value={perfil.nomeFantasia || ''} onChange={e => setPerfil({ ...perfil, nomeFantasia: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: CorPrincipal }}>Responsável</label>
                  <input style={inputStyle} value={perfil.responsavel || ''} onChange={e => setPerfil({ ...perfil, responsavel: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div><label style={{ fontSize: '11px', fontWeight: 'bold' }}>Fixo</label><input style={inputStyle} value={perfil.telefoneFixo || ''} onChange={e => setPerfil({ ...perfil, telefoneFixo: e.target.value })} /></div>
                <div><label style={{ fontSize: '11px', fontWeight: 'bold' }}>Comercial</label><input style={inputStyle} value={perfil.telefoneComercial || ''} onChange={e => setPerfil({ ...perfil, telefoneComercial: e.target.value })} /></div>
                <div><label style={{ fontSize: '11px', fontWeight: 'bold' }}>WhatsApp</label><input style={inputStyle} value={perfil.whatsapp || ''} onChange={e => setPerfil({ ...perfil, whatsapp: e.target.value })} /></div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: '10px' }}>
                <input style={inputStyle} placeholder="Rua" value={perfil.rua || ''} onChange={e => setPerfil({ ...perfil, rua: e.target.value })} />
                <input style={inputStyle} placeholder="Nº" value={perfil.numero || ''} onChange={e => setPerfil({ ...perfil, numero: e.target.value })} />
                <input style={inputStyle} placeholder="Bairro" value={perfil.bairro || ''} onChange={e => setPerfil({ ...perfil, bairro: e.target.value })} />
              </div>

              <button onClick={() => {
                navigator.geolocation.getCurrentPosition(pos => {
                  setPerfil({ ...perfil, lat: pos.coords.latitude, lng: pos.coords.longitude });
                  alert("GPS da Loja Capturado!");
                });
              }} style={{ ...inputStyle, background: CorDestaque, fontWeight: 'bold', border: 'none', cursor: 'pointer', color: CorPrincipal }}>
                {perfil.lat ? 'GPS DA LOJA ATIVO ✅' : 'ATIVAR GPS DA LOJA'}
              </button>

              <button onClick={async () => {
                setLoading(true);
                await setDoc(doc(db, 'perfil_empresa', user.uid), perfil);
                setLoading(false);
                alert('Dados salvos!');
              }} style={{ ...inputStyle, background: CorPrincipal, color: '#FFF', fontWeight: 'bold', border: 'none', cursor: 'pointer', padding: '18px' }}>
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'SALVAR ALTERAÇÕES'}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
