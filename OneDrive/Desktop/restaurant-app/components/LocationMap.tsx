"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

type LocationMapProps = {
  customerLat: number;
  customerLng: number;
};

const RESTAURANT_LAT = 28.641936;
const RESTAURANT_LNG = 77.9556954;

export default function LocationMap({
  customerLat,
  customerLng,
}: LocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    const setupMap = async () => {
      if (!mapContainerRef.current) return;

      const L = await import("leaflet");

      if (cancelled || !mapContainerRef.current) return;

      // Remove any previous Leaflet instance attached to this DOM node.
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const restaurant: [number, number] = [
        RESTAURANT_LAT,
        RESTAURANT_LNG,
      ];

      const customer: [number, number] = [
        customerLat,
        customerLng,
      ];

      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: true,
      });

      mapRef.current = map;

      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }
      ).addTo(map);

      const restaurantIcon = L.divIcon({
        className: "",
        html: `
          <div style="
            width:36px;
            height:36px;
            border-radius:50%;
            background:#f97316;
            border:3px solid white;
            box-shadow:0 3px 12px rgba(0,0,0,.35);
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:18px;
          ">🍽️</div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const customerIcon = L.divIcon({
        className: "",
        html: `
          <div style="
            width:36px;
            height:36px;
            border-radius:50%;
            background:#22c55e;
            border:3px solid white;
            box-shadow:0 3px 12px rgba(0,0,0,.35);
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:18px;
          ">📍</div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      L.marker(restaurant, {
        icon: restaurantIcon,
      })
        .addTo(map)
        .bindPopup("<b>YASH SAINI RESTAURANT</b>");

      L.marker(customer, {
        icon: customerIcon,
      })
        .addTo(map)
        .bindPopup("<b>Your Delivery Location</b>");

      L.polyline([restaurant, customer], {
        weight: 4,
        dashArray: "8 8",
      }).addTo(map);

      const bounds = L.latLngBounds([restaurant, customer]);

      if (restaurant[0] === customer[0] && restaurant[1] === customer[1]) {
        map.setView(customer, 15);
      } else {
        map.fitBounds(bounds, {
          padding: [40, 40],
          maxZoom: 15,
        });
      }

      // Leaflet needs a size recalculation after the container becomes visible.
      window.setTimeout(() => {
        if (!cancelled && mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 100);
    };

    setupMap().catch((error) => {
      console.error("Location map error:", error);
    });

    return () => {
      cancelled = true;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [customerLat, customerLng]);

  return (
    <div
      ref={mapContainerRef}
      className="h-[320px] w-full bg-[#17120f]"
      aria-label="Delivery location map"
    />
  );
}
