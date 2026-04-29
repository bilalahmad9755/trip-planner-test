import { useEffect, useEffectEvent, useRef } from "react";
import mapboxgl from "mapbox-gl";
import polyline from "@mapbox/polyline";
import "mapbox-gl/dist/mapbox-gl.css";

const getStopColor = (type) => {
  switch (type?.toLowerCase()) {
    case "break":
      return "#f59e0b";
    case "fuel":
      return "#f97316";
    case "sleep":
      return "#8b5cf6";
    case "cargo operation":
      return "#10b981";
    default:
      return "#3b82f6";
  }
};

const getStopCoordinate = (coordinates, progress) => {
  if (!coordinates.length) return null;
  if (progress <= 0) return coordinates[0];
  if (progress >= 1) return coordinates[coordinates.length - 1];

  const segmentLengths = [];
  let totalLength = 0;

  for (let idx = 1; idx < coordinates.length; idx += 1) {
    const [prevLng, prevLat] = coordinates[idx - 1];
    const [lng, lat] = coordinates[idx];
    const segmentLength = Math.hypot(lng - prevLng, lat - prevLat);
    segmentLengths.push(segmentLength);
    totalLength += segmentLength;
  }

  if (totalLength === 0) return coordinates[0];

  const targetLength = totalLength * progress;
  let traversed = 0;

  for (let idx = 1; idx < coordinates.length; idx += 1) {
    const segmentLength = segmentLengths[idx - 1];
    const nextTraversed = traversed + segmentLength;

    if (targetLength <= nextTraversed) {
      const [startLng, startLat] = coordinates[idx - 1];
      const [endLng, endLat] = coordinates[idx];
      const ratio =
        segmentLength === 0 ? 0 : (targetLength - traversed) / segmentLength;

      return [
        startLng + (endLng - startLng) * ratio,
        startLat + (endLat - startLat) * ratio,
      ];
    }

    traversed = nextTraversed;
  }

  return coordinates[coordinates.length - 1];
};

const Map = ({ encodedPolyline, accessToken, stops = [] }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);

  const clearMarkers = () => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
  };

  const addMarker = (lngLat, color, html) => {
    const popup = html
      ? new mapboxgl.Popup({ offset: 18 }).setHTML(html)
      : undefined;

    const marker = new mapboxgl.Marker({ color }).setLngLat(lngLat);

    if (popup) {
      marker.setPopup(popup);
    }

    marker.addTo(map.current);
    markersRef.current.push(marker);
  };

  const renderRoute = useEffectEvent((encoded, routeStops) => {
    // Decode polyline: [lat, lon] -> [lon, lat]
    const decoded = polyline.decode(encoded);
    const coordinates = decoded.map(([lat, lon]) => [lon, lat]);

    if (coordinates.length === 0) return;

    clearMarkers();

    // Remove existing layer/source if any
    if (map.current.getSource("route")) {
      map.current.removeLayer("route");
      map.current.removeSource("route");
    }

    // Add source and layer
    map.current.addSource("route", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: coordinates,
        },
      },
    });

    map.current.addLayer({
      id: "route",
      type: "line",
      source: "route",
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#0f766e",
        "line-width": 4,
        "line-opacity": 0.8,
      },
    });

    // Fit bounds
    const bounds = coordinates.reduce(
      (acc, coord) => {
        return acc.extend(coord);
      },
      new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]),
    );

    map.current.fitBounds(bounds, {
      padding: 50,
      duration: 1000,
    });

    addMarker(
      coordinates[0],
      "#10b981",
      "<strong>Start</strong><br />Trip begins here.",
    );

    routeStops
      .filter((stop) => {
        const progress = stop.route_progress ?? 0;
        return progress > 0 && progress < 1;
      })
      .forEach((stop) => {
        const markerCoordinate = getStopCoordinate(
          coordinates,
          stop.route_progress ?? 0,
        );
        if (!markerCoordinate) return;

        addMarker(
          markerCoordinate,
          getStopColor(stop.type),
          `<strong>${stop.type}</strong><br />Day ${stop.day} · ${stop.start_hour}-${stop.end_hour}`,
        );
      });

    addMarker(
      coordinates[coordinates.length - 1],
      "#ef4444",
      "<strong>End</strong><br />Trip ends here.",
    );
  });

  useEffect(() => {
    if (map.current || !accessToken) return;

    mapboxgl.accessToken = accessToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-98.5795, 39.8283], // center of US
      zoom: 3,
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        markersRef.current = [];
      }
    };
  }, [accessToken]);

  useEffect(() => {
    if (map.current && encodedPolyline) {
      if (map.current.loaded()) {
        renderRoute(encodedPolyline, stops);
      } else {
        map.current.once("load", () => renderRoute(encodedPolyline, stops));
      }
    }
  }, [encodedPolyline, stops]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden">
      <div ref={mapContainer} style={{ width: "100%", height: "400px" }} />
      {!accessToken && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/85 text-sm text-slate-600">
          <p>Please set VITE_MAPBOX_ACCESS_TOKEN to view the map.</p>
        </div>
      )}
    </div>
  );
};

export default Map;
