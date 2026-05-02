import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  lat: number;
  lon: number;
  zoom?: number;
  height?: number | string;
  interactive?: boolean;
  onPick?: (lat: number, lon: number) => void;
  className?: string;
}

// Default Leaflet marker icons don't load via bundlers; use CDN URLs.
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function LocationMap({
  lat,
  lon,
  zoom = 10,
  height = 220,
  interactive = false,
  onPick,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [lat, lon],
      zoom,
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
      attributionControl: true,
    });
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      }
    ).addTo(map);

    markerRef.current = L.marker([lat, lon], { icon: DefaultIcon, draggable: interactive }).addTo(map);

    if (interactive) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        markerRef.current?.setLatLng(e.latlng);
        onPick?.(e.latlng.lat, e.latlng.lng);
      });
      markerRef.current.on("dragend", () => {
        const ll = markerRef.current!.getLatLng();
        onPick?.(ll.lat, ll.lng);
      });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update view + marker when lat/lon change
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    mapRef.current.setView([lat, lon], mapRef.current.getZoom());
    markerRef.current.setLatLng([lat, lon]);
  }, [lat, lon]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height: typeof height === "number" ? `${height}px` : height, width: "100%", borderRadius: 8, overflow: "hidden" }}
    />
  );
}
