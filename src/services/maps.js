import { db } from "../firebase/config";
import { doc, getDoc, setDoc } from "firebase/firestore";

export async function buscarSugestoes(texto) {
  if (!texto || texto.length < 3) return [];
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(texto + " Camocim Ceará Brasil")}&limit=5`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.features.map(f => ({
      rua: f.properties.name || "",
      bairro: f.properties.district || f.properties.suburb || "",
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0]
    }));
  } catch (e) {
    return [];
  }
}

export async function calcularRotaReal(origem, destino) {
  const url = `https://router.project-osrm.org/route/v1/driving/${origem.lng},${origem.lat};${destino.lng},${destino.lat}?overview=false`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      return data.routes[0].distance / 1000;
    }
  } catch (e) {}
  return null;
}
