"use client";

import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { MapPin, Crosshair } from "lucide-react";

import { MAP_CONFIG } from "@/config/map";

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// A component to catch map clicks and update state
function LocationEvents({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

// A component to programmatically pan the map when location changes via GPS
function MapUpdater({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
}

interface LocationPickerProps {
  onLocationSelect: (lat: number | null, lng: number | null) => void;
  defaultLat?: number;
  defaultLng?: number;
}

export default function LocationPicker({ onLocationSelect, defaultLat, defaultLng }: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    defaultLat && defaultLng ? [defaultLat, defaultLng] : null
  );
  const [mapCenter, setMapCenter] = useState<[number, number]>(MAP_CONFIG.DEFAULT_CENTER);
  const [geoError, setGeoError] = useState("");

  const handleMapClick = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    onLocationSelect(lat, lng);
  };

  const locateUser = () => {
    setGeoError("");
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition([latitude, longitude]);
        setMapCenter([latitude, longitude]);
        onLocationSelect(latitude, longitude);
      },
      (err) => {
        setGeoError("Unable to retrieve your location. Please drop a pin manually.");
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <MapPin className="h-4 w-4" /> 
          Pinpoint Location (Optional)
        </label>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={locateUser}
          className="gap-1 text-xs"
        >
          <Crosshair className="h-3 w-3" /> Use My GPS
        </Button>
      </div>

      {geoError && <p className="text-xs text-red-500">{geoError}</p>}

      <div className="h-[250px] w-full rounded-md overflow-hidden border relative" style={{ zIndex: 0 }}>
        <MapContainer 
          center={position || mapCenter} 
          zoom={position ? MAP_CONFIG.DETAIL_ZOOM : MAP_CONFIG.DEFAULT_ZOOM} 
          scrollWheelZoom={false} 
          style={{ height: "100%", width: "100%", zIndex: 1 }}
        >
          <TileLayer
            attribution={MAP_CONFIG.TILE_LAYER_ATTRIBUTION}
            url={MAP_CONFIG.TILE_LAYER_URL}
          />
          <LocationEvents onChange={handleMapClick} />
          {position && <MapUpdater center={position} />}
          {position && <Marker position={position} icon={icon} />}
        </MapContainer>
        
        {!position && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[400] bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm text-xs font-medium text-gray-600 pointer-events-none">
            Click on the map to set location
          </div>
        )}
      </div>

      {position && (
        <p className="text-xs text-muted-foreground">
          Selected Coordinates: {position[0].toFixed(5)}, {position[1].toFixed(5)}
        </p>
      )}
    </div>
  );
}
