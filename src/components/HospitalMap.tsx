import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import L from "leaflet";

export type MapHospital = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance: number;
};

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export default function HospitalMap({
  center,
  hospitals,
  onSelect,
}: {
  center: { lat: number; lon: number };
  hospitals: MapHospital[];
  onSelect: (id: string) => void;
}) {
  return (
    <MapContainer
      center={[center.lat, center.lon]}
      zoom={12}
      className="h-[420px] w-full rounded-lg border"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CircleMarker center={[center.lat, center.lon]} radius={9} pathOptions={{ weight: 3 }}>
        <Popup>You are here (approximate)</Popup>
      </CircleMarker>
      {hospitals.map((h) => (
        <Marker
          key={h.id}
          position={[h.latitude, h.longitude]}
          icon={icon}
          eventHandlers={{ click: () => onSelect(h.id) }}
        >
          <Popup>
            <strong>{h.name}</strong>
            <br />
            {h.distance.toFixed(1)} km away
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
