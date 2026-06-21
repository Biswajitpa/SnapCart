"use client";

import React, { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";

interface ILocation {
  latitude: number;
  longitude: number;
}

interface Iprops {
  userLocation: ILocation;
  deliveryBoyLocation: ILocation;
}

export default function LiveMap({ userLocation, deliveryBoyLocation }: Iprops) {
  const [MapFramework, setMapFramework] = useState<any>(null);

  // 🎯 THE FIX GATE: Lazily import Leaflet modules exclusively inside the client browser context
  useEffect(() => {
    const loadLeafletModules = async () => {
      const L = (await import("leaflet")).default;
      const ReactLeaflet = await import("react-leaflet");

      // Custom Recenter helper logic safely inside the loaded scope context
      function Recenter({ positions }: { positions: [number, number] }) {
        const map = ReactLeaflet.useMap();
        useEffect(() => {
          if (positions && positions[0] !== 0 && positions[1] !== 0) {
            map.setView(positions, map.getZoom(), { animate: true });
          }
        }, [positions, map]);
        return null;
      }

      // Configure your premium custom marker assets directly inside the loaded L context instance
      const deliveryBoyIcon = L.icon({
        iconUrl: "https://cdn-icons-png.flaticon.com/128/9561/9561688.png",
        iconSize: [45, 45],
        iconAnchor: [22, 45], // Keeps icon pinned properly on target coordinates point
        popupAnchor: [0, -40]
      });

      const userIcon = L.icon({
        iconUrl: "https://cdn-icons-png.flaticon.com/128/4821/4821951.png",
        iconSize: [45, 45],
        iconAnchor: [22, 45],
        popupAnchor: [0, -40]
      });

      setMapFramework({
        ...ReactLeaflet,
        Recenter,
        deliveryBoyIcon,
        userIcon
      });
    };

    loadLeafletModules();
  }, []);

  // Graceful fallback loader element maps layout placeholders
  if (!MapFramework) {
    return (
      <div className="w-full h-[500px] flex flex-col items-center justify-center bg-gray-100 text-gray-400 gap-2 rounded-xl">
        <span className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></span>
        <p className="text-xs font-medium tracking-wide">Syncing geographic telemetry navigation panels...</p>
      </div>
    );
  }

  // Safely extract out client initialized instances
  const { MapContainer, TileLayer, Marker, Popup, Polyline, Recenter, deliveryBoyIcon, userIcon } = MapFramework;

  // Track coordinates setup fallback assignments guards
  const customerPos: [number, number] = [userLocation?.latitude || 20.1705, userLocation?.longitude || 85.7048];
  const driverPos: [number, number] = deliveryBoyLocation?.latitude && deliveryBoyLocation?.longitude
    ? [deliveryBoyLocation.latitude, deliveryBoyLocation.longitude]
    : customerPos;

  const linePositions = [driverPos, customerPos];
  const center = deliveryBoyLocation?.latitude ? driverPos : customerPos;

  return (
    <div className="w-full h-[500px] rounded-xl overflow-hidden shadow relative z-2">
      <MapContainer center={center} zoom={14} scrollWheelZoom={true} className="w-full h-full">
        {/* Panning monitor node updates view alignments on data changes */}
        <Recenter positions={center} />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Customer Location Anchor Marker node */}
        <Marker position={customerPos} icon={userIcon}>
          <Popup>
            <div className="text-xs font-semibold text-gray-800">Customer Delivery Address</div>
          </Popup>
        </Marker>

        {/* Delivery Boy live geolocation transit indicator marker */}
        {deliveryBoyLocation?.latitude && (
          <Marker position={driverPos} icon={deliveryBoyIcon}>
            <Popup>
              <div className="text-xs font-bold text-green-700">Your Current Route Vector</div>
            </Popup>
          </Marker>
        )}

        {/* Route Line Pathway mapping connecting link anchors */}
        <Polyline positions={linePositions} color="green" weight={4} dashArray="5, 10" />
      </MapContainer>
    </div>
  );
}