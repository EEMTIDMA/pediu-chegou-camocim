// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { db, auth, storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
collection,
addDoc,
serverTimestamp,
query,
where,
onSnapshot,
orderBy,
doc,
setDoc,
getDoc,
updateDoc,
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from 'firebase/auth';
import {
PackagePlus,
Send,
History,
User,
MapPin,
LogOut,
Printer,
Building2,
Search,
Bell,
Volume2,
VolumeX,
Camera,
Loader2,
Clock,
CheckCircle,
} from 'lucide-react';

const CorPrincipal = '#312D6F';
const CorDestaque = '#FFD700';
const CorFundo = '#F0F2F5';

const cardBase = {
backgroundColor: '#FFF',
borderRadius: '20px',
padding: '25px',
boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
marginBottom: '20px',
};

const inputStyle = {
width: '100%',
padding: '12px 15px',
borderRadius: '12px',
border: '2px solid #E0E4EC',
fontSize: '14px',
outline: 'none',
boxSizing: 'border-box',
};

const tabActive = {
flex: 1,
padding: '12px',
backgroundColor: CorPrincipal,
color: CorDestaque,
border: 'none',
borderRadius: '12px',
fontWeight: '800',
cursor: 'pointer',
display: 'flex',
justifyContent: 'center',
alignItems: 'center',
gap: '8px',
};

const tabInactive = {
flex: 1,
padding: '12px',
backgroundColor: 'transparent',
color: '#666',
border: 'none',
fontWeight: '600',
cursor: 'pointer',
display: 'flex',
justifyContent: 'center',
alignItems: 'center',
gap: '8px',
};

export default function EmpresaDash() {
const { user } = useAuth();
const fileInputRef = useRef(null);
const [activeTab, setActiveTab] = useState('pedidos');
const [loading, setLoading] = useState(false);
const [uploading, setUploading] = useState(false);
const [pedidos, setPedidos] = useState([]);
const [entregadoresOnline, setEntregadoresOnline] = useState([]);
const [filtroHistorico, setFiltroHistorico] = useState('todos');
const [buscaPedido, setBuscaPedido] = useState('');
const [distanciaKm, setDistanciaKm] = useState(0);
const [notificacaoSonora, setNotificacaoSonora] = useState(true);

const [perfil, setPerfil] = useState({
nome: '',
responsavel: '',
telefone: '',
rua: '',
numero: '',
bairro: '',
logo: '',
lat: null,
lng: null,
gpsAtivo: true,
});

const [form, setForm] = useState({
cliente: '',
telefone: '',
rua: '',
numero: '',
bairro: '',
descricao: '',
valor: '',
pagamento: 'pix',
entregadorTipo: 'publico',
entregadorId: '',
});

// --- LÓGICA DE TAXA DE ENTREGA ---
const calcularTaxaEntrega = (km) => {
if (km <= 1) return 4.0;
if (km <= 3) return 5.0;
if (km <= 5) return 6.0;
if (km <= 7) return 7.0;
const kmExtra = Math.ceil(km - 7);
return 10.0 + (10.0 * 0.2 * kmExtra); 
};

const taxaEntregaCalculada = calcularTaxaEntrega(distanciaKm);
const taxaAdmin = 0.3;
const valorTotalSoma = (parseFloat(form.valor) || 0) + (distanciaKm > 0 ? taxaEntregaCalculada : 0) + taxaAdmin;

// --- SCRIPT DE AUTOMAÇÃO RAIO PROGRESSIVO ---
useEffect(() => {
const interval = setInterval(async () => {
const pedidosPendentes = pedidos.filter(
(p) => p.status === 'pendente' && !p.entregadorId
);
for (const pedido of pedidosPendentes) {
const agora = Date.now();
const criacao = pedido.horaSolicitacao?.seconds * 1000 || agora;
const decorrido = (agora - criacao) / 1000;
let novoRaio = 1;
if (decorrido >= 90) novoRaio = 8;
else if (decorrido >= 60) novoRaio = 4;
else if (decorrido >= 30) novoRaio = 2;

if (novoRaio > (pedido.raioBusca || 1)) {
await updateDoc(doc(db, 'pedidos', pedido.id), {
raioBusca: novoRaio,
});
}
}
}, 10000);
return () => clearInterval(interval);
}, [pedidos]);

useEffect(() => {
if (!user?.uid) return;
getDoc(doc(db, 'perfil_empresa', user.uid)).then((d) => {
if (d.exists()) setPerfil((prev) => ({ ...prev, ...d.data() }));
});
const qEnt = query(
collection(db, 'perfil_entregador'),
where('gpsAtivo', '==', true)
);
const unsubEnt = onSnapshot(qEnt, (s) => {
setEntregadoresOnline(s.docs.map((d) => ({ id: d.id, ...d.data() })));
});
const qPed = query(
collection(db, 'pedidos'),
where('empresaId', '==', String(user.uid))
);
const unsubPed = onSnapshot(qPed, (s) => {
let lista = s.docs.map((d) => ({ id: d.id, ...d.data() }));
lista.sort(
(a, b) =>
(b.horaSolicitacao?.seconds || 0) - (a.horaSolicitacao?.seconds || 0)
);
setPedidos(lista);
});
return () => {
unsubEnt();
unsubPed();
};
}, [user]);

const handleUploadLogo = async (e) => {
const file = e.target.files[0];
if (!file) return;
setUploading(true);
try {
const storageRef = ref(storage, `empresas/${user.uid}/logo.jpg`);
await uploadBytes(storageRef, file);
const url = await getDownloadURL(storageRef);
await updateDoc(doc(db, 'perfil_empresa', user.uid), { logo: url });
setPerfil((prev) => ({ ...prev, logo: url }));
} catch (error) {
alert('Erro no upload');
}
setUploading(false);
};

const calcularHaversine = (lat1, lon1, lat2, lon2) => {
const R = 6371;
const dLat = ((lat2 - lat1) * Math.PI) / 180;
const dLon = ((lon2 - lon1) * Math.PI) / 180;
const a =
Math.sin(dLat / 2) * Math.sin(dLat / 2) +
Math.cos((lat1 * Math.PI) / 180) *
Math.cos((lat2 * Math.PI) / 180) *
Math.sin(dLon / 2) *
Math.sin(dLon / 2);
return parseFloat(
(R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))).toFixed(2)
);
};

const handleCriarPedido = async (e) => {
e.preventDefault();
if (distanciaKm <= 0) return alert('Calcule a distância primeiro!');
setLoading(true);
const cod = `PC-${Math.floor(1000 + Math.random() * 9000)}`;
try {
await addDoc(collection(db, 'pedidos'), {
...form,
entregadorId:
form.entregadorTipo === 'publico' ? '' : form.entregadorId,
clienteNome: form.cliente,
clienteTelefone: form.telefone,
enderecoEntrega: {
rua: form.rua,
numero: form.numero,
bairro: form.bairro,
},
lojaNome: perfil.nome,
lojaTelefone: perfil.telefone,
valorProdutos: parseFloat(form.valor),
valorEntrega: taxaEntregaCalculada,
valorTaxaAdmin: taxaAdmin,
totalGeral: valorTotalSoma,
status: 'pendente',
codigoRastreio: cod,
horaSolicitacao: serverTimestamp(),
empresaId: String(user.uid),
latLoja: perfil.lat,
lngLoja: perfil.lng,
raioBusca: 1,
pagoAoAdmin: false,
});
alert('Pedido Gerado: ' + cod);
setForm({
cliente: '',
telefone: '',
rua: '',
numero: '',
bairro: '',
descricao: '',
valor: '',
pagamento: 'pix',
entregadorTipo: 'publico',
entregadorId: '',
});
setDistanciaKm(0);
} catch (err) {
alert('Erro ao gravar');
}
setLoading(false);
};

const listaFiltrada = pedidos.filter((p) => {
const termo = (buscaPedido || '').toLowerCase();
return (
(p.clienteNome || '').toLowerCase().includes(termo) ||
(p.codigoRastreio || '').toLowerCase().includes(termo)
);
});

return (
<div
style={{
minHeight: '100vh',
backgroundColor: CorFundo,
fontFamily: 'sans-serif',
}}
>
<nav
style={{
backgroundColor: CorPrincipal,
padding: '15px 25px',
display: 'flex',
justifyContent: 'space-between',
alignItems: 'center',
color: '#FFF',
borderBottom: `4px solid ${CorDestaque}`,
}}
>
<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
<PackagePlus color={CorDestaque} size={28} />
<strong>{perfil.nome || 'APP PEDIU CHEGOU'}</strong>
</div>
<div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
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
<Bell size={20} style={{ cursor: 'pointer' }} />
<LogOut
onClick={() => signOut(auth)}
style={{ cursor: 'pointer' }}
size={20}
/>
</div>
</nav>

<div
style={{
backgroundColor: '#FFF',
display: 'flex',
padding: '10px',
gap: '5px',
boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
}}
>
<button
onClick={() => setActiveTab('pedidos')}
style={activeTab === 'pedidos' ? tabActive : tabInactive}
>
<Send size={18} /> NOVO
</button>
<button
onClick={() => setActiveTab('historico')}
style={activeTab === 'historico' ? tabActive : tabInactive}
>
<History size={18} /> RELATÓRIO
</button>
<button
onClick={() => setActiveTab('perfil')}
style={activeTab === 'perfil' ? tabActive : tabInactive}
>
<User size={18} /> PERFIL
</button>
</div>

<div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
{activeTab === 'pedidos' && (
<section style={cardBase}>
<form
onSubmit={handleCriarPedido}
style={{ display: 'grid', gap: '15px' }}
>
<div
style={{
display: 'grid',
gridTemplateColumns: '1fr 1fr',
gap: '15px',
}}
>
<input
style={inputStyle}
placeholder="Cliente"
value={form.cliente}
onChange={(e) =>
setForm({ ...form, cliente: e.target.value })
}
required
/>
<input
style={inputStyle}
placeholder="WhatsApp"
value={form.telefone}
onChange={(e) =>
setForm({ ...form, telefone: e.target.value })
}
required
/>
</div>
<div
style={{
display: 'grid',
gridTemplateColumns: '2fr 1fr 2fr',
gap: '10px',
}}
>
<input
style={inputStyle}
placeholder="Rua"
value={form.rua}
onChange={(e) => setForm({ ...form, rua: e.target.value })}
required
/>
<input
style={inputStyle}
placeholder="Nº"
value={form.numero}
onChange={(e) => setForm({ ...form, numero: e.target.value })}
required
/>
<input
style={inputStyle}
placeholder="Bairro"
value={form.bairro}
onChange={(e) => setForm({ ...form, bairro: e.target.value })}
required
/>
</div>
<textarea
style={{ ...inputStyle, height: '60px' }}
placeholder="Itens do Pedido"
value={form.descricao}
onChange={(e) =>
setForm({ ...form, descricao: e.target.value })
}
required
/>
<div
style={{
display: 'grid',
gridTemplateColumns: '1fr 1fr',
gap: '15px',
}}
>
<select
style={inputStyle}
value={form.pagamento}
onChange={(e) =>
setForm({ ...form, pagamento: e.target.value })
}
>
<option value="pix">PIX</option>
<option value="dinheiro">Dinheiro</option>
<option value="cartao">Cartão</option>
</select>
<select
style={inputStyle}
value={form.entregadorTipo}
onChange={(e) =>
setForm({ ...form, entregadorTipo: e.target.value })
}
>
<option value="publico">Envio Público</option>
<option value="escolha">Escolher Entregador</option>
</select>
</div>
{form.entregadorTipo === 'escolha' && (
<select
style={{ ...inputStyle, border: `2px solid ${CorPrincipal}` }}
value={form.entregadorId}
onChange={(e) =>
setForm({ ...form, entregadorId: e.target.value })
}
required
>
<option value="">
{entregadoresOnline.length > 0
? 'Selecionar Entregador...'
: 'Nenhum entregador disponível'}
</option>
{entregadoresOnline.map((ent) => (
<option key={ent.id} value={ent.id}>
{ent.nome}
</option>
))}
</select>
)}
<div
style={{
display: 'grid',
gridTemplateColumns: '1fr 1fr',
gap: '15px',
}}
>
<input
style={inputStyle}
placeholder="Valor Produtos R$"
type="number"
step="0.01"
value={form.valor}
onChange={(e) => setForm({ ...form, valor: e.target.value })}
required
/>
<button
type="button"
onClick={() => {
if (!perfil.lat) return alert('Fixe o GPS no Perfil!');
navigator.geolocation.getCurrentPosition((p) =>
setDistanciaKm(
calcularHaversine(
perfil.lat,
perfil.lng,
p.coords.latitude,
p.coords.longitude
)
)
);
}}
style={{
...inputStyle,
background: '#F0F7FF',
fontWeight: 'bold',
color: CorPrincipal,
}}
>
<MapPin size={14} />{' '}
{distanciaKm > 0 ? `${distanciaKm} KM` : 'KM'}
</button>
</div>
<div
style={{
background: '#F8F9FA',
padding: '15px',
borderRadius: '12px',
display: 'flex',
justifyContent: 'space-between',
alignItems: 'center',
border: '1px solid #E0E4EC',
}}
>
<span style={{ fontSize: '13px', fontWeight: 'bold' }}>
TOTAL GERAL:
</span>
<strong style={{ fontSize: '20px', color: CorPrincipal }}>
R$ {valorTotalSoma.toFixed(2)}
</strong>
</div>
<button
type="submit"
disabled={loading}
style={{
width: '100%',
padding: '16px',
background: CorPrincipal,
color: CorDestaque,
borderRadius: '12px',
border: 'none',
fontWeight: '900',
}}
>
LANÇAR PEDIDO
</button>
</form>
</section>
)}

{activeTab === 'historico' && (
<section>
<div
style={{ ...cardBase, background: CorPrincipal, color: '#FFF' }}
>
<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
<h3>RELATÓRIO DE PEDIDOS</h3>
<Printer size={20} style={{cursor: 'pointer'}} onClick={() => window.print()} />
</div>
<div
style={{
display: 'grid',
gridTemplateColumns: '1fr 1fr',
gap: '10px',
}}
>
<div
style={{
background: 'rgba(255,255,255,0.1)',
padding: '10px',
borderRadius: '10px',
}}
>
<small>Produtos</small>
<br />
<strong>
R${' '}
{listaFiltrada
.reduce(
(a, b) => a + (parseFloat(b.valorProdutos) || 0),
0
)
.toFixed(2)}
</strong>
</div>
<div
style={{
background: 'rgba(255,255,255,0.1)',
padding: '10px',
borderRadius: '10px',
}}
>
<small>Fretes</small>
<br />
<strong>
R${' '}
{listaFiltrada
.reduce(
(a, b) => a + (parseFloat(b.valorEntrega) || 0),
0
)
.toFixed(2)}
</strong>
</div>
</div>
</div>
<input
style={{ ...inputStyle, margin: '15px 0' }}
placeholder="🔍 Buscar cliente ou código..."
value={buscaPedido}
onChange={(e) => setBuscaPedido(e.target.value)}
/>
{listaFiltrada.map((p) => (
<div
key={p.id}
style={{ ...cardBase, padding: '15px', fontSize: '13px' }}
>
<div
style={{
display: 'flex',
justifyContent: 'space-between',
borderBottom: '1px solid #F0F0F0',
paddingBottom: '8px',
marginBottom: '8px',
}}
>
<strong>
{p.codigoRastreio} - {p.clienteNome}
</strong>
<span style={{ fontWeight: 'bold', color: CorPrincipal }}>
{p.status?.toUpperCase()}
</span>
</div>
<p>
📍 <b>Endereço:</b> {p.enderecoEntrega?.rua},{' '}
{p.enderecoEntrega?.numero} - {p.enderecoEntrega?.bairro}
</p>
<p>
🛵 <b>Entregador:</b> {p.entregadorNome || 'Buscando...'}
</p>
<div
style={{
display: 'grid',
gridTemplateColumns: '1fr 1fr',
gap: '10px',
background: '#F9F9F9',
padding: '10px',
borderRadius: '8px',
margin: '10px 0',
}}
>
<span>
<Clock size={12} /> <b>Coleta:</b>{' '}
{p.horaColeta
? new Date(
p.horaColeta.seconds * 1000
).toLocaleTimeString()
: '--:--'}
</span>
<span>
<CheckCircle size={12} /> <b>Entrega:</b>{' '}
{p.horaEntrega
? new Date(
p.horaEntrega.seconds * 1000
).toLocaleTimeString()
: '--:--'}
</span>
</div>
<div
style={{
display: 'grid',
gridTemplateColumns: '1fr 1fr 1fr',
gap: '5px',
fontWeight: 'bold',
}}
>
<span>
Prod: R$ {parseFloat(p.valorProdutos || 0).toFixed(2)}
</span>
<span>
Frete: R$ {parseFloat(p.valorEntrega || 0).toFixed(2)}
</span>
<span style={{ color: '#e67e22' }}>Taxa App: R$ 0.30</span>
</div>
</div>
))}
</section>
)}

{activeTab === 'perfil' && (
<section style={cardBase}>
<div style={{ textAlign: 'center', marginBottom: '20px' }}>
<div
style={{
width: 80,
height: 80,
borderRadius: '50%',
background: '#EEE',
margin: '0 auto',
position: 'relative',
overflow: 'hidden',
border: `2px solid ${CorPrincipal}`,
}}
>
{uploading ? (
<Loader2
className="animate-spin"
style={{ marginTop: '30px' }}
/>
) : (
<img
src={perfil.logo || 'https://via.placeholder.com'}
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
padding: '5px',
}}
>
<Camera size={14} />
</button>
</div>
<input
type="file"
ref={fileInputRef}
onChange={handleUploadLogo}
style={{ display: 'none' }}
accept="image/*"
/>
</div>
<div
style={{
display: 'flex',
justifyContent: 'space-between',
alignItems: 'center',
background: '#F8F9FA',
padding: '12px',
borderRadius: '12px',
marginBottom: '15px',
}}
>
<span style={{ fontWeight: 'bold', fontSize: '13px' }}>
STATUS GPS (ONLINE):
</span>
<button
onClick={() =>
setPerfil({ ...perfil, gpsAtivo: !perfil.gpsAtivo })
}
style={{
background: perfil.gpsAtivo ? '#2ecc71' : '#e74c3c',
color: '#FFF',
border: 'none',
padding: '6px 18px',
borderRadius: '20px',
fontWeight: 'bold',
}}
>
{perfil.gpsAtivo ? 'ATIVO' : 'INATIVO'}
</button>
</div>
<div
style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}
>
<input
style={inputStyle}
placeholder="Nome"
value={perfil.nome}
onChange={(e) => setPerfil({ ...perfil, nome: e.target.value })}
/>
<input
style={inputStyle}
placeholder="Responsável"
value={perfil.responsavel}
onChange={(e) =>
setPerfil({ ...perfil, responsavel: e.target.value })
}
/>
<input
style={inputStyle}
placeholder="Telefone"
value={perfil.telefone}
onChange={(e) =>
setPerfil({ ...perfil, telefone: e.target.value })
}
/>
<div
style={{
display: 'grid',
gridTemplateColumns: '2fr 1fr',
gap: '10px',
}}
>
<input
style={inputStyle}
placeholder="Rua"
value={perfil.rua}
onChange={(e) =>
setPerfil({ ...perfil, rua: e.target.value })
}
/>
<input
style={inputStyle}
placeholder="Nº"
value={perfil.numero}
onChange={(e) =>
setPerfil({ ...perfil, numero: e.target.value })
}
/>
</div>
<input
style={inputStyle}
placeholder="Bairro"
value={perfil.bairro}
onChange={(e) =>
setPerfil({ ...perfil, bairro: e.target.value })
}
/>
<button
onClick={() => {
navigator.geolocation.getCurrentPosition(async (pos) => {
setPerfil({
...perfil,
lat: pos.coords.latitude,
lng: pos.coords.longitude,
});
alert('GPS Capturado!');
});
}}
style={{
...inputStyle,
background: CorDestaque,
color: CorPrincipal,
fontWeight: 'bold',
border: 'none',
}}
>
{perfil.lat ? 'GPS CAPTURADO ✅' : 'FIXAR GPS DA LOJA'}
</button>
<button
onClick={async () => {
setLoading(true);
await setDoc(doc(db, 'perfil_empresa', user.uid), perfil);
setLoading(false);
alert('Perfil Atualizado!');
}}
style={{
...inputStyle,
background: CorPrincipal,
color: '#FFF',
fontWeight: 'bold',
border: 'none',
}}
>
{loading ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
</button>
</div>
</section>
)}
</div>
</div>
);
}
