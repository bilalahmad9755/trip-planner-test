import { useEffect, useRef, useState } from "react";
import { planTrip } from "../services/api";
import Map from "../components/Map";
import Timeline from "../components/Timeline";
import ELDLog from "../components/ELDLog";
import LocationAutocomplete from "../components/LocationAutocomplete";

const Home = () => {
  const [formData, setFormData] = useState({
    current_location: null,
    pickup_location: null,
    dropoff_location: null,
    cycle_used_hours: 0,
  });
  const [tripData, setTripData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const resultsRef = useRef(null);

  const MAPBOX_TOKEN =
    import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ||
    import.meta.env.VITE_MAPBOX_TOKEN;

  useEffect(() => {
    if (!tripData || !resultsRef.current) return;

    resultsRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [tripData]);

  const handleLocationChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCycleChange = (e) => {
    const { value } = e.target;
    setFormData((prev) => ({
      ...prev,
      cycle_used_hours: value === "" ? "" : parseFloat(value),
    }));
  };

  const validateForm = () => {
    if (
      !formData.current_location ||
      !formData.pickup_location ||
      !formData.dropoff_location
    ) {
      return "Please select all locations from suggestions.";
    }

    if (
      formData.cycle_used_hours === "" ||
      Number.isNaN(formData.cycle_used_hours) ||
      formData.cycle_used_hours < 0 ||
      formData.cycle_used_hours > 70
    ) {
      return "Cycle hours must be between 0 and 70.";
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        current_location: formData.current_location,
        pickup_location: formData.pickup_location,
        dropoff_location: formData.dropoff_location,
        cycle_used_hours: Number(formData.cycle_used_hours),
      };

      const data = await planTrip(payload);
      setTripData(data);
    } catch (err) {
      setError(err.message || "Failed to plan trip");
    } finally {
      setLoading(false);
    }
  };

  const route = tripData?.route;
  const stops = tripData?.stops ?? [];
  const logs = tripData?.logs ?? [];

  return (
    <div className="px-4">
      <div className="max-w-[1400px] mx-auto space-y-10">
        <div className="mx-auto w-full max-w-3xl rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,252,246,0.98),rgba(255,247,235,0.96))] p-8 shadow-[0_32px_80px_rgba(143,113,68,0.18)]">
          <div className="text-center mb-10">
            <span className="mb-4 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-amber-800">
              Route Planning Studio
            </span>
            <h2 className="mb-3 text-3xl font-bold text-slate-900 md:text-4xl">
              Trip Planner
            </h2>
            <p className="mx-auto max-w-xl text-slate-600">
              Generate optimized routes and FMCSA-compliant HOS logs.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <LocationAutocomplete
              label="Current Location"
              accessToken={MAPBOX_TOKEN}
              onChange={(val) => handleLocationChange("current_location", val)}
            />

            <LocationAutocomplete
              label="Pickup Location"
              accessToken={MAPBOX_TOKEN}
              onChange={(val) => handleLocationChange("pickup_location", val)}
            />

            <LocationAutocomplete
              label="Dropoff Location"
              accessToken={MAPBOX_TOKEN}
              onChange={(val) => handleLocationChange("dropoff_location", val)}
            />

            <div className="space-y-2">
              <label className="ml-1 text-sm font-semibold text-slate-700">
                Cycle Used Hours
              </label>
              <input
                type="number"
                value={formData.cycle_used_hours}
                onChange={handleCycleChange}
                min="0"
                max="70"
                step="0.1"
                className="w-full rounded-2xl border border-amber-200 bg-white/90 px-4 py-3 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
                required
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-500 py-4 font-bold text-white shadow-[0_18px_36px_rgba(15,118,110,0.28)] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_44px_rgba(15,118,110,0.34)] disabled:opacity-50"
            >
              {loading ? "Processing..." : "Generate Trip Plan"}
            </button>
          </form>
        </div>

        {tripData && route && (
          <div ref={resultsRef} className="space-y-8 pb-8">
            <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-[0_26px_70px_rgba(143,113,68,0.14)]">
              <div className="border-b border-amber-950/10 bg-[linear-gradient(90deg,rgba(255,250,240,0.95),rgba(236,253,245,0.82))] p-6">
                <h3 className="text-2xl font-bold text-slate-900">
                  Route Overview
                </h3>
                <p className="mt-2 text-slate-600">
                  Map, trip totals, and stop timeline for the current route.
                </p>
              </div>

              <Map
                encodedPolyline={route.geometry_polyline}
                accessToken={MAPBOX_TOKEN}
                stops={stops}
              />

              <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
                <div className="rounded-2xl border border-teal-100 bg-teal-50/80 p-5 shadow-[0_12px_30px_rgba(15,118,110,0.08)]">
                  <label className="mb-1 block text-sm font-medium text-teal-800/70">
                    Total Distance
                  </label>
                  <span className="text-3xl font-bold text-primary">
                    {route.distance_miles}{" "}
                    <small className="text-lg font-normal">miles</small>
                  </span>
                </div>
                <div className="rounded-2xl border border-orange-100 bg-orange-50/80 p-5 shadow-[0_12px_30px_rgba(234,88,12,0.08)]">
                  <label className="mb-1 block text-sm font-medium text-orange-800/70">
                    Driving Duration
                  </label>
                  <span className="text-3xl font-bold text-secondary">
                    {route.duration_hours}{" "}
                    <small className="text-lg font-normal">hours</small>
                  </span>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-5 shadow-[0_12px_30px_rgba(180,83,9,0.08)]">
                  <label className="mb-1 block text-sm font-medium text-amber-800/70">
                    ELD Days
                  </label>
                  <span className="text-3xl font-bold text-emerald-500">
                    {logs.length}
                  </span>
                </div>
              </div>

              {stops.length > 0 && (
                <div className="px-6 pb-6">
                  <div className="rounded-2xl border border-amber-100 bg-[linear-gradient(180deg,rgba(255,251,245,1),rgba(255,247,236,0.94))] p-6">
                    <h4 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-900">
                      <span className="h-6 w-2 rounded-full bg-primary"></span>
                      Trip Timeline
                    </h4>
                    <Timeline stops={stops} />
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-5">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">
                  ELD Daily Logs
                </h3>
                <p className="mt-2 text-slate-600">
                  Every simulated day is shown below as its own rectangular log
                  tile.
                </p>
              </div>

              {logs.length > 0 ? (
                <div className="space-y-6">
                  {logs.map((dayLog) => (
                    <ELDLog key={dayLog.day} dayLog={dayLog} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-100 bg-white/85 p-6 text-slate-600 shadow-[0_18px_40px_rgba(143,113,68,0.1)]">
                  No ELD logs were returned for this trip.
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
