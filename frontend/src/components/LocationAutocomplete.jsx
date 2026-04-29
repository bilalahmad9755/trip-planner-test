import { useState, useRef, useEffect } from "react";

const MAPBOX_GEOCODING_URL =
  "https://api.mapbox.com/geocoding/v5/mapbox.places";

const LocationAutocomplete = ({
  label,
  placeholder = "Search city or address...",
  accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN,
  onChange,
  proximity, // optional: { lat, lng }
}) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const debounceTimer = useRef(null);
  const abortRef = useRef(null);
  const wrapperRef = useRef(null);
  useEffect(() => {
    if (!accessToken) {
      console.warn("⚠️ Mapbox token missing. Check VITE_MAPBOX_ACCESS_TOKEN");
    }
  }, [accessToken]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const fetchSuggestions = async (value) => {
    if (!value.trim() || !accessToken || value.length < 2) return;

    if (abortRef.current) abortRef.current.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    try {
      const url = `${MAPBOX_GEOCODING_URL}/${encodeURIComponent(value)}.json`;

      const params = new URLSearchParams({
        access_token: accessToken,
        autocomplete: true,
        limit: 5,
        types: "place,locality,address",
      });

      if (proximity?.lat && proximity?.lng) {
        params.append("proximity", `${proximity.lng},${proximity.lat}`);
      }

      const res = await fetch(`${url}?${params}`, {
        signal: controller.signal,
      });

      if (!res.ok) throw new Error("Failed to fetch suggestions");

      const data = await res.json();

      setSuggestions(data.features || []);
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Geocoding error:", err);
        setSuggestions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setSelected(null);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!value.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      onChange(null);
      return;
    }

    setIsOpen(true);

    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  const handleSelect = (feature) => {
    const [lng, lat] = feature.center;

    const payload = {
      name: feature.text,
      full_address: feature.place_name,
      lat,
      lng,
      place_id: feature.id,
    };

    setQuery(feature.place_name);
    setSuggestions([]);
    setIsOpen(false);
    setSelected(feature);

    onChange(payload);
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setIsOpen(false);
    setSelected(null);
    onChange(null);
  };

  return (
    <div className="space-y-2 relative" ref={wrapperRef}>
      {label && (
        <label className="ml-1 text-sm font-semibold text-slate-700">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        <span className="absolute left-3 text-amber-700/70">📍</span>

        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-amber-200 bg-white/90 pl-9 pr-9 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
        />

        <span className="absolute right-3">
          {loading ? (
            <span className="text-xs text-slate-400">...</span>
          ) : query ? (
            <button
              onClick={handleClear}
              type="button"
              className="text-slate-400 hover:text-slate-700"
            >
              ✕
            </button>
          ) : null}
        </span>
      </div>

      {isOpen && (
        <ul className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-[0_24px_48px_rgba(143,113,68,0.18)]">
          {loading && (
            <li className="px-4 py-3 text-sm text-slate-500">Searching...</li>
          )}

          {!loading &&
            suggestions.length > 0 &&
            suggestions.map((feature) => (
              <li
                key={feature.id}
                onMouseDown={() => handleSelect(feature)}
                className="cursor-pointer px-4 py-3 hover:bg-amber-50"
              >
                <p className="truncate text-sm font-medium text-slate-900">
                  {feature.text}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {feature.place_name}
                </p>
              </li>
            ))}

          {!loading && suggestions.length === 0 && query.length >= 2 && (
            <li className="px-4 py-3 text-sm text-slate-500">
              No results found
            </li>
          )}
        </ul>
      )}

      {selected && (
        <p className="ml-1 text-[11px] font-mono text-slate-500">
          {selected.center[1].toFixed(4)}, {selected.center[0].toFixed(4)}
        </p>
      )}
    </div>
  );
};

export default LocationAutocomplete;
