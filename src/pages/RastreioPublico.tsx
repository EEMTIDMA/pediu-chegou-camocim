
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
 collection,
 query,
 where,
 onSnapshot,
 doc,
 updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import {
 Loader2,
 Star,
 Package,
 Clock,
 ShieldCheck,
 Bike,
 LogOut,
 User,
} from 'lucide-react';


const CorPrincipal = '#312D6F';
const CorDestaque = '#FFD700';


const mapContainerStyle = {
 width: '100%',
 height: '250px',
 borderRadius: '20px',
};


export default function RastreioPublico() {
 const [codigo, setCodigo] = useState('');
 const [pedido, setPedido] = useState(null);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState('');
 const [rating, setRating] = useState(0);
 const [avaliado, setAvaliado] = useState(false);


 const navigate = useNavigate();
 const location = useLocation();


 const { isLoaded } = useJsApiLoader({
   id: 'google-map-script',
   googleMapsApiKey: 'SUA_CHAVE_GOOGLE_REAL_AQUI',
 });


 useEffect(() => {
   const params = new URLSearchParams(location.search);
   const codUrl = params.get('cod');
   if (codUrl) {
     const codLimpo = codUrl.trim().toUpperCase();
     setCodigo(codLimpo);
     buscarPedido(codLimpo);
   }
 }, [location]);


 const buscarPedido = (codParaBusca) => {
   if (!codParaBusca) return;
   setLoading(true);
   setError('');


   const q = query(
     collection(db, 'pedidos'),
     where('codigoRastreio', '==', codParaBusca.trim().toUpperCase())
   );


   const unsub = onSnapshot(
     q,
     (snapshot) => {
       if (snapshot.empty) {
         setError('Código não encontrado. Verifique o padrão PC-0000.');
         setPedido(null);
       } else {
         // CORREÇÃO PROFISSIONAL: Acessando o primeiro documento da lista de resultados
         const docSnap = snapshot.docs[0];
         const dados = docSnap.data();


         setPedido({
           id: docSnap.id,
           ...dados,
         });
         setError('');
       }
       setLoading(false);
     },
     (err) => {
       console.error('Erro Firestore:', err);
       setError(
         'Erro de permissão no Firebase. Verifique as regras de segurança.'
       );
       setLoading(false);
     }
   );


   return () => unsub();
 };


 const handleRating = async (stars) => {
   if (avaliado || !pedido?.entregadorId) return;
   setRating(stars);
   try {
     const entregadorRef = doc(db, 'perfil_entregador', pedido.entregadorId);
     await updateDoc(entregadorRef, { rating: stars });
     setAvaliado(true);
   } catch (err) {
     console.error(err);
   }
 };


 return (
   <div
     style={{
       minHeight: '100vh',
       backgroundColor: '#F0F2F5',
       fontFamily: 'sans-serif',
     }}
   >
     <nav
       style={{
         height: '70px',
         backgroundColor: CorPrincipal,
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'space-between',
         padding: '0 20px',
         borderBottom: `4px solid ${CorDestaque}`,
         position: 'sticky',
         top: 0,
         zIndex: 100,
       }}
     >
       <button
         onClick={() => navigate('/login')}
         style={{
           background: 'rgba(255,255,255,0.1)',
           border: 'none',
           color: '#FFF',
           padding: '8px 12px',
           borderRadius: '10px',
           cursor: 'pointer',
           fontWeight: 'bold',
         }}
       >
         <LogOut size={18} /> SAIR
       </button>
       <div style={{ fontWeight: 900, color: CorDestaque, fontSize: '18px' }}>
         PEDIU CHEGOU
       </div>
       <div style={{ width: '70px' }}></div>
     </nav>


     <main
       style={{
         padding: '30px 20px',
         display: 'flex',
         justifyContent: 'center',
       }}
     >
       <div style={{ width: '100%', maxWidth: '500px' }}>
         {!pedido ? (
           <div
             style={{
               backgroundColor: '#FFF',
               padding: '30px',
               borderRadius: '24px',
               boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
               textAlign: 'center',
             }}
           >
             <Package
               size={50}
               color={CorPrincipal}
               style={{ marginBottom: '15px' }}
             />
             <h2 style={{ margin: '0 0 20px 0', color: CorPrincipal }}>
               Rastreio
             </h2>
             <form
               onSubmit={(e) => {
                 e.preventDefault();
                 buscarPedido(codigo);
               }}
             >
               <input
                 placeholder="PC-0000"
                 value={codigo}
                 onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                 style={{
                   width: '100%',
                   padding: '15px',
                   borderRadius: '12px',
                   border: '2px solid #E2E8F0',
                   marginBottom: '15px',
                   fontSize: '18px',
                   textAlign: 'center',
                   fontWeight: 'bold',
                   boxSizing: 'border-box',
                 }}
               />
               <button
                 type="submit"
                 style={{
                   width: '100%',
                   padding: '15px',
                   backgroundColor: CorPrincipal,
                   color: CorDestaque,
                   borderRadius: '12px',
                   border: 'none',
                   fontWeight: 800,
                   cursor: 'pointer',
                 }}
               >
                 {loading ? <Loader2 className="animate-spin" /> : 'RASTREAR'}
               </button>
               {error && (
                 <p
                   style={{
                     color: 'red',
                     marginTop: '10px',
                     fontSize: '14px',
                   }}
                 >
                   {error}
                 </p>
               )}
             </form>
           </div>
         ) : (
           <div
             style={{
               backgroundColor: '#FFF',
               borderRadius: '24px',
               overflow: 'hidden',
               boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
             }}
           >
             <div
               style={{
                 background: CorPrincipal,
                 padding: '20px',
                 color: '#FFF',
                 textAlign: 'center',
               }}
             >
               <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>
                 {pedido.codigoRastreio}
               </p>
               <h2 style={{ margin: '5px 0', color: CorDestaque }}>
                 {pedido.status === 'entregue'
                   ? '✅ ENTREGUE'
                   : '🛵 ' + (pedido.status?.toUpperCase() || 'EM TRÂNSITO')}
               </h2>
             </div>


             <div style={{ padding: '15px' }}>
               <div
                 style={{
                   height: '250px',
                   backgroundColor: '#F1F5F9',
                   borderRadius: '20px',
                   overflow: 'hidden',
                 }}
               >
                 {isLoaded && pedido.latLoja ? (
                   <GoogleMap
                     mapContainerStyle={mapContainerStyle}
                     center={{
                       lat: Number(pedido.latLoja),
                       lng: Number(pedido.lngLoja),
                     }}
                     zoom={15}
                   >
                     <Marker
                       position={{
                         lat: Number(pedido.latLoja),
                         lng: Number(pedido.lngLoja),
                       }}
                     />
                   </GoogleMap>
                 ) : (
                   <div
                     style={{
                       display: 'flex',
                       flexDirection: 'column',
                       alignItems: 'center',
                       justifyContent: 'center',
                       height: '100%',
                       color: CorPrincipal,
                     }}
                   >
                     <Bike size={40} className="animate-bounce" />
                     <p style={{ fontWeight: 'bold', marginTop: '10px' }}>
                       Acompanhando...
                     </p>
                   </div>
                 )}
               </div>
             </div>


             <div style={{ padding: '20px' }}>
               <div
                 style={{
                   display: 'flex',
                   alignItems: 'center',
                   gap: '15px',
                   marginBottom: '20px',
                   padding: '15px',
                   backgroundColor: '#F8FAFC',
                   borderRadius: '15px',
                   border: '1px solid #EEE',
                 }}
               >
                 <div
                   style={{
                     background: CorPrincipal,
                     padding: '10px',
                     borderRadius: '12px',
                   }}
                 >
                   <User color={CorDestaque} size={20} />
                 </div>
                 <div>
                   <p
                     style={{ margin: 0, fontSize: '12px', color: '#64748B' }}
                   >
                     Entregador
                   </p>
                   <b style={{ color: CorPrincipal }}>
                     {pedido.entregadorNome || 'Aguardando coleta...'}
                   </b>
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
                     padding: '15px',
                     border: '1px solid #EEE',
                     borderRadius: '15px',
                     textAlign: 'center',
                   }}
                 >
                   <Clock size={18} color={CorPrincipal} />
                   <p
                     style={{
                       margin: '5px 0 0 0',
                       fontSize: '11px',
                       color: '#666',
                     }}
                   >
                     Total Pedido
                   </p>
                   <b>R$ {Number(pedido.totalGeral || 0).toFixed(2)}</b>
                 </div>
                 <div
                   style={{
                     padding: '15px',
                     border: '1px solid #EEE',
                     borderRadius: '15px',
                     textAlign: 'center',
                   }}
                 >
                   <ShieldCheck size={18} color={CorPrincipal} />
                   <p
                     style={{
                       margin: '5px 0 0 0',
                       fontSize: '11px',
                       color: '#666',
                     }}
                   >
                     Loja Origem
                   </p>
                   <b style={{ fontSize: '12px' }}>{pedido.lojaNome}</b>
                 </div>
               </div>
             </div>
           </div>
         )}
       </div>
     </main>
   </div>
 );
}


