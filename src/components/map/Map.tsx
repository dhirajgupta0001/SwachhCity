"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { MAP_CONFIG } from "@/config/map";

// Fix Leaflet's default icon path issues in Next.js
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapProps {
  lat: number;
  lng: number;
  title?: string;
  zoom?: number;
  height?: string;
}

export default function Map({ lat, lng, title = "Location", zoom = MAP_CONFIG.DETAIL_ZOOM, height = "300px" }: MapProps) {
  // Defensive check for invalid coordinates
  if (!lat || !lng || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-100 rounded-md border text-gray-500 text-sm" 
        style={{ height, width: "100%" }}
      >
        No valid location data available.
      </div>
    );
  }

  return (
    <div style={{ height, width: "100%", zIndex: 0 }} className="rounded-md overflow-hidden border">
      <MapContainer 
        center={[lat, lng]} 
        zoom={zoom} 
        scrollWheelZoom={false} 
        style={{ height: "100%", width: "100%", zIndex: 1 }}
      >
        <TileLayer
          attribution={MAP_CONFIG.TILE_LAYER_ATTRIBUTION}
          url={MAP_CONFIG.TILE_LAYER_URL}
        />
        <Marker position={[lat, lng]} icon={icon}>
          <Popup>{title}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
