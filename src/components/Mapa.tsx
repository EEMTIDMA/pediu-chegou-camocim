// @ts-nocheck
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Ícones corrigidos para não sumirem no React
const defaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com',
  shadowUrl: 'https://cdnjs.cloudflare.com',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ChangeView({ center }: { center: any }) {
  const map = useMap();
  map.setView(center);
  return null;
}

interface MapaProps {
  lat: number;
  lng: number;
  titulo?: string;
}

export default function Mapa({ lat, lng, titulo = 'Localização' }: MapaProps) {
  const posicao: [number, number] = [lat, lng];

  return (
    <div
      style={{
        height: '300px',
        width: '100%',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <MapContainer
        center={posicao}
        zoom={15}
        style={{ height: '100%', width: '100%', borderRadius: '12px' }}
      >
        <ChangeView center={posicao} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap"
        />
        <Marker position={posicao} icon={defaultIcon}>
          <Popup>{titulo}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
