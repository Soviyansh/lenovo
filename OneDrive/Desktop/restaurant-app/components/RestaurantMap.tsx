"use client";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const RESTAURANT_LAT = 28.641936;
const RESTAURANT_LNG = 77.9556954;

type RestaurantMapProps = {
  customerLat?: number | null;
  customerLng?: number | null;
};

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function RestaurantMap({
  customerLat = null,
  customerLng = null,
}: RestaurantMapProps) {
  const hasCustomerLocation =
    typeof customerLat === "number" &&
    typeof customerLng === "number";

  return (
    <div className="w-full overflow-hidden rounded-2xl">
      <MapContainer
        center={[RESTAURANT_LAT, RESTAURANT_LNG]}
        zoom={15}
        scrollWheelZoom={true}
        className="h-[320px] w-full"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker
          position={[RESTAURANT_LAT, RESTAURANT_LNG]}
          icon={markerIcon}
        >
          <Popup>
            <strong>YASH SAINI RESTAURANT</strong>
            <br />
            B.B. Nagar, Bulandshahr
          </Popup>
        </Marker>

        {hasCustomerLocation && (
          <Marker
            position={[customerLat, customerLng]}
            icon={markerIcon}
          >
            <Popup>
              <strong>Your Location</strong>
              <br />
              Location detected successfully.
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}