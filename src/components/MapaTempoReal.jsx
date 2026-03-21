import React from 'react';
import { GoogleMap, Marker, Polyline, useJsApiLoader } from '@react-google-maps/api';

const containerStyle = { 
  width: '100%', 
  height: '200px', 
  borderRadius: '15px', 
  marginTop: '12px', 
  border: '1px solid #E0E4EC',
  overflow: 'hidden'
};

export default function MapaTempoReal({ loja, cliente, entregadorPos }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "AIzaSyCNrpuUuLmJHiaK0NTF55p-IaWmE0fUhwo"
  });

  // Mostra erro amigável se a API falhar (ex: billing desativado)
  if (loadError) {
    return (
      <div style={{ height: '200px', background: '#FFF5F5', borderRadius: '15px', border: '1px solid #FEB2B2', padding: '15px', fontSize: '12px', color: '#C53030' }}>
        <strong>Erro no Mapa:</strong> O Google retornou um erro de carregamento. Verifique se o faturamento (Billing) está ativo no Google Cloud Console.
      </div>
    );
  }

  if (!isLoaded) return <div style={{ height: '200px', background: '#F0F2F5', borderRadius: '15px' }} />;

  const center = entregadorPos || cliente || loja;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={14}
      options={{ 
        disableDefaultUI: true, 
        zoomControl: true,
        gestureHandling: 'cooperative'
      }}
    >
      {loja && <Marker position={loja} label="🏪" />}
      {cliente && <Marker position={cliente} label="📍" />}
      {entregadorPos && (
        <Marker 
          position={entregadorPos} 
          icon={{
            url: "https://cdn-icons-png.flaticon.com",
            scaledSize: new window.google.maps.Size(35, 35),
          }}
        />
      )}
      {entregadorPos && cliente && (
        <Polyline
          path={[entregadorPos, cliente]}
          options={{ strokeColor: "#312D6F", strokeOpacity: 0.8, strokeWeight: 3 }}
        />
      )}
    </GoogleMap>
  );
}
