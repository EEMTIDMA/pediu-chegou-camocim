// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
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
  const [activeTab, setActiveTab] = useState('pedidos');
  const [loading, setLoading] = useState(false);
  const [pedidos, setPedidos] = useState([]);
  const [entregadoresOnline, setEntregadoresOnline] = useState([]);
  const [filtroHistorico, setFiltroHistorico] = useState('todos');
  const [buscaPedido, setBuscaPedido] = useState('');
  const [distanciaKm, setDistanciaKm] = useState(0);

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

  const taxaEntregaCalculada =
    distanciaKm <= 1
      ? 4.0
      : distanciaKm <= 3
      ? 5.0
      : distanciaKm <= 5
      ? 6.0
      : 10.0;
  const taxaAdmin = 0.3;
  const valorTotalSoma =
    (parseFloat(form.valor) || 0) +
    (distanciaKm > 0 ? taxaEntregaCalculada : 0) +
    taxaAdmin;

  useEffect(() => {
    if (!user?.uid) return;

    getDoc(doc(db, 'perfil_empresa', user.uid)).then((d) => {
      if (d.exists()) setPerfil(d.data());
    });

    // ESCUTA ENTREGADORES (OK)
    const qEnt = query(
      collection(db, 'perfil_entregador'),
      where('gpsAtivo', '==', true),
      where('status', '==', 'ativo')
    );
    const unsubEnt = onSnapshot(qEnt, (s) => {
      setEntregadoresOnline(s.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // ESCUTA PEDIDOS (CORRIGIDO PARA EVITAR ERRO DE ÍNDICE)
    const qPed = query(
      collection(db, 'pedidos'),
      where('empresaId', '==', String(user.uid))
    );

    const unsubPed = onSnapshot(
      qPed,
      (s) => {
        let lista = s.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Ordenação manual para evitar necessidade de criar índice no Firebase agora
        lista.sort(
          (a, b) =>
            (b.horaSolicitacao?.seconds || 0) -
            (a.horaSolicitacao?.seconds || 0)
        );
        setPedidos(lista);
      },
      (err) => console.error('Erro na busca de pedidos:', err)
    );

    return () => {
      unsubEnt();
      unsubPed();
    };
  }, [user]);

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
        clienteNome: form.cliente,
        clienteTelefone: form.telefone,
        enderecoEntrega: {
          rua: form.rua,
          numero: form.numero,
          bairro: form.bairro,
        },
        lojaNome: perfil.nome || 'Sophya Biju',
        lojaEndereco: `${perfil.rua}, ${perfil.numero} - ${perfil.bairro}`,
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
      alert('Erro ao gravar pedido.');
    }
    setLoading(false);
  };

  const listaFiltrada = pedidos.filter((p) => {
    const segundos =
      p.horaSolicitacao?.seconds || p.horaSolicitacao?._seconds || 0;
    const d = new Date(segundos * 1000);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const termo = (buscaPedido || '').toLowerCase();
    const matchBusca =
      (p.clienteNome || '').toLowerCase().includes(termo) ||
      (p.codigoRastreio || '').toLowerCase().includes(termo);

    if (filtroHistorico === 'dia') return d >= hoje && matchBusca;
    if (filtroHistorico === 'semana')
      return (
        d >= new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000) && matchBusca
      );
    if (filtroHistorico === 'mes')
      return (
        d >= new Date(hoje.getFullYear(), hoje.getMonth(), 1) && matchBusca
      );
    return matchBusca; // Filtro 'todos'
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
          <strong>{perfil.nome || 'SOPHYA BIJU'}</strong>
        </div>
        <LogOut
          onClick={() => signOut(auth)}
          style={{ cursor: 'pointer' }}
          size={20}
        />
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
                  cursor: 'pointer',
                }}
              >
                {loading ? 'PROCESSANDO...' : 'LANÇAR PEDIDO'}
              </button>
            </form>
          </section>
        )}

        {activeTab === 'historico' && (
          <section>
            <div
              style={{ ...cardBase, background: CorPrincipal, color: '#FFF' }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '15px',
                }}
              >
                <h3 style={{ margin: 0 }}>HISTÓRICO</h3>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <select
                    value={filtroHistorico}
                    onChange={(e) => setFiltroHistorico(e.target.value)}
                    style={{
                      borderRadius: '5px',
                      padding: '5px',
                      color: '#000',
                    }}
                  >
                    <option value="todos">Tudo</option>
                    <option value="dia">Hoje</option>
                    <option value="semana">7 dias</option>
                  </select>
                  <button
                    onClick={() => window.print()}
                    style={{
                      background: 'none',
                      border: '1px solid #FFF',
                      color: '#FFF',
                      borderRadius: '5px',
                      padding: '5px',
                    }}
                  >
                    <Printer size={16} />
                  </button>
                </div>
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
            <div style={{ position: 'relative', marginBottom: '15px' }}>
              <Search
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '12px',
                  color: '#666',
                }}
                size={18}
              />
              <input
                style={{ ...inputStyle, paddingLeft: '40px' }}
                placeholder="Buscar cliente ou código..."
                value={buscaPedido}
                onChange={(e) => setBuscaPedido(e.target.value)}
              />
            </div>
            {listaFiltrada.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '20px',
                  color: '#666',
                  background: '#fff',
                  borderRadius: '15px',
                }}
              >
                Nenhum pedido encontrado.
              </div>
            ) : (
              listaFiltrada.map((p) => (
                <div key={p.id} style={cardBase}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <strong>{p.clienteNome || 'Cliente'}</strong>
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        {p.codigoRastreio} • {p.status?.toUpperCase()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ color: CorPrincipal }}>
                        R$ {(parseFloat(p.totalGeral) || 0).toFixed(2)}
                      </strong>
                      <div style={{ fontSize: '10px', color: '#999' }}>
                        {p.horaSolicitacao?.seconds
                          ? new Date(
                              p.horaSolicitacao.seconds * 1000
                            ).toLocaleDateString()
                          : ''}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>
        )}

        {activeTab === 'perfil' && (
          <section style={cardBase}>
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
                    const { latitude, longitude } = pos.coords;
                    await updateDoc(doc(db, 'perfil_empresa', user.uid), {
                      lat: latitude,
                      lng: longitude,
                    });
                    setPerfil({ ...perfil, lat: latitude, lng: longitude });
                    alert('Localização Fixada!');
                  });
                }}
                style={{
                  ...inputStyle,
                  background: CorDestaque,
                  color: CorPrincipal,
                  fontWeight: 'bold',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {perfil.lat ? 'GPS DA LOJA ATIVO ✅' : 'FIXAR GPS DA LOJA'}
              </button>
              <button
                onClick={async () => {
                  setLoading(true);
                  await setDoc(doc(db, 'perfil_empresa', user.uid), perfil);
                  setLoading(false);
                  alert('Perfil Salvo!');
                }}
                style={{
                  ...inputStyle,
                  background: CorPrincipal,
                  color: '#FFF',
                  fontWeight: 'bold',
                  border: 'none',
                  cursor: 'pointer',
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
