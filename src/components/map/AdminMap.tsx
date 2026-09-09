"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createClient } from "@/utils/supabase/client";
import { StatusBadge } from "@/components/custom/status-badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { MAP_CONFIG } from "@/config/map";

// Custom icons based on type
const complaintIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

type MarkerData = {
  id: string;
  type: "COMPLAINT" | "PICKUP";
  lat: number;
  lng: number;
  reference_id: string;
  status: string;
  address: string;
  priority?: string;
  assigned_collector_id?: string | null;
};

export default function AdminMap() {
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterDomain, setFilterDomain] = useState<"ALL" | "COMPLAINTS" | "PICKUPS">("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [filterAssignment, setFilterAssignment] = useState<string>("ALL");

  const supabase = createClient();

  useEffect(() => {
    async function loadMapData() {
      setLoading(true);
      try {
        const results: MarkerData[] = [];
        
        if (filterDomain === "ALL" || filterDomain === "COMPLAINTS") {
          let q = supabase.from("complaints").select("id, latitude, longitude, reference_id, status, address, priority, assigned_collector_id");
          if (filterStatus !== "ALL") q = q.eq("status", filterStatus);
          if (filterPriority !== "ALL") q = q.eq("priority", filterPriority);
          if (filterAssignment === "ASSIGNED") q = q.not("assigned_collector_id", "is", null);
          if (filterAssignment === "UNASSIGNED") q = q.is("assigned_collector_id", null);
          
          const { data: cData } = await q;
          if (cData) {
            cData.forEach(c => {
              if (c.latitude && c.longitude && c.latitude >= -90 && c.latitude <= 90 && c.longitude >= -180 && c.longitude <= 180) {
                results.push({
                  id: c.id,
                  type: "COMPLAINT",
                  lat: c.latitude,
                  lng: c.longitude,
                  reference_id: c.reference_id,
                  status: c.status,
                  address: c.address,
                  priority: c.priority,
                  assigned_collector_id: c.assigned_collector_id
                });
              }
            });
          }
        }

        if (filterDomain === "ALL" || filterDomain === "PICKUPS") {
          let q = supabase.from("pickup_requests").select("id, latitude, longitude, reference_id, status, address, assigned_collector_id");
          if (filterStatus !== "ALL") q = q.eq("status", filterStatus);
          
          // Pickup requests do not have a standard "priority" enum like complaints in Phase 3. 
          // So if filterPriority is NOT "ALL", we just skip loading pickups to match the strict priority filter.
          if (filterPriority === "ALL") {
            if (filterAssignment === "ASSIGNED") q = q.not("assigned_collector_id", "is", null);
            if (filterAssignment === "UNASSIGNED") q = q.is("assigned_collector_id", null);
            
            const { data: pData } = await q;
            if (pData) {
              pData.forEach(p => {
                if (p.latitude && p.longitude && p.latitude >= -90 && p.latitude <= 90 && p.longitude >= -180 && p.longitude <= 180) {
                  results.push({
                    id: p.id,
                    type: "PICKUP",
                    lat: p.latitude,
                    lng: p.longitude,
                    reference_id: p.reference_id,
                    status: p.status,
                    address: p.address,
                    assigned_collector_id: p.assigned_collector_id
                  });
                }
              });
            }
          }
        }
        
        setMarkers(results);
      } catch (err) {
        console.error("Failed to load map data", err);
      } finally {
        setLoading(false);
      }
    }
    loadMapData();
  }, [filterDomain, filterStatus, filterPriority, filterAssignment, supabase]);

  const mapCenter: [number, number] = markers.length > 0 ? [markers[0].lat, markers[0].lng] : MAP_CONFIG.DEFAULT_CENTER;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-md border shadow-sm">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Domain</label>
          <select 
            className="border rounded px-2 py-1.5 text-sm"
            value={filterDomain}
            onChange={e => setFilterDomain(e.target.value as any)}
          >
            <option value="ALL">All Operations</option>
            <option value="COMPLAINTS">Complaints</option>
            <option value="PICKUPS">Pickups</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Status</label>
          <select 
            className="border rounded px-2 py-1.5 text-sm"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved / Completed</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Priority</label>
          <select 
            className="border rounded px-2 py-1.5 text-sm"
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Assignment</label>
          <select 
            className="border rounded px-2 py-1.5 text-sm"
            value={filterAssignment}
            onChange={e => setFilterAssignment(e.target.value)}
          >
            <option value="ALL">All Assignments</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="UNASSIGNED">Unassigned</option>
          </select>
        </div>

        <div className="ml-auto flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div> Complaints</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Pickups</div>
        </div>
      </div>

      <div className="h-[600px] w-full rounded-md border shadow-sm relative overflow-hidden" style={{ zIndex: 0 }}>
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-[400] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        <MapContainer center={mapCenter} zoom={MAP_CONFIG.DEFAULT_ZOOM} scrollWheelZoom={false} style={{ height: "100%", width: "100%", zIndex: 1 }}>
          <TileLayer
            attribution={MAP_CONFIG.TILE_LAYER_ATTRIBUTION}
            url={MAP_CONFIG.TILE_LAYER_URL}
          />
          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={50}
          >
            {markers.map(m => (
              <Marker 
                key={`${m.type}-${m.id}`} 
                position={[m.lat, m.lng]} 
                icon={m.type === "COMPLAINT" ? complaintIcon : pickupIcon}
              >
                <Popup>
                  <div className="space-y-2 min-w-[200px]">
                    <div className="flex justify-between items-center border-b pb-2">
                      <strong className="text-sm font-semibold">{m.reference_id}</strong>
                      <StatusBadge status={m.status as import("@/components/custom/status-badge").StatusType} />
                    </div>
                    <div className="text-xs space-y-1">
                      <p><span className="font-semibold text-gray-500">Type:</span> {m.type}</p>
                      {m.priority && <p><span className="font-semibold text-gray-500">Priority:</span> {m.priority}</p>}
                      <p><span className="font-semibold text-gray-500">Assignment:</span> {m.assigned_collector_id ? "Assigned" : "Unassigned"}</p>
                      <p className="line-clamp-2"><span className="font-semibold text-gray-500">Address:</span> {m.address}</p>
                    </div>
                    <Button render={<a href={m.type === "COMPLAINT" ? `/admin/complaints/${m.id}` : `/admin/pickups/${m.id}`} target="_blank" />} size="sm" className="w-full h-7 mt-2 text-xs">
                      View Details
                    </Button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>
    </div>
  );
}
