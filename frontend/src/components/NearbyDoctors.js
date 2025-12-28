
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function NearbyDoctors({ doctors, userLocation }) {
  return (
    <MapContainer
      center={[userLocation.lat, userLocation.lng]}
      zoom={14}
      style={{ height: "400px", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {doctors.map((d, i) => (
        <Marker key={i} position={[d.lat, d.lng]}>
          <Popup>
            <strong>{d.name}</strong><br />
            {d.speciality || "Clinic"}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
