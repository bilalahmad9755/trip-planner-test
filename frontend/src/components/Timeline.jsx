const Timeline = ({ stops }) => {
  if (!stops || stops.length === 0) return null;

  const getStopColor = (type) => {
    switch (type.toLowerCase()) {
      case "break":
        return "bg-amber-500";
      case "fuel":
        return "bg-orange-600";
      case "sleep":
        return "bg-purple-600";
      case "cargo operation":
        return "bg-emerald-500";
      default:
        return "bg-blue-500";
    }
  };

  const getStopIcon = (type) => {
    switch (type.toLowerCase()) {
      case "break":
        return "☕";
      case "fuel":
        return "⛽";
      case "sleep":
        return "🛌";
      case "cargo operation":
        return "📦";
      default:
        return "📍";
    }
  };

  return (
    <div className="relative">
      {/* Vertical Line */}
      <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-amber-200"></div>

      <div className="space-y-8">
        {stops.map((stop, idx) => (
          <div
            key={stop.sequence ?? idx}
            className="relative flex items-start group"
          >
            {/* Indicator Node */}
            <div
              className={`absolute left-0 z-10 flex h-12 w-12 items-center justify-center rounded-full border-4 border-white shadow-[0_14px_28px_rgba(148,123,81,0.18)] transition-transform group-hover:scale-110 ${getStopColor(stop.type)}`}
            >
              <span className="text-xl">{getStopIcon(stop.type)}</span>
            </div>

            {/* Content Card */}
            <div className="ml-16 flex-1 rounded-2xl border border-amber-100 bg-white/95 p-4 shadow-[0_14px_30px_rgba(143,113,68,0.1)] transition-all hover:-translate-y-0.5 hover:border-amber-300">
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-bold text-slate-900">{stop.type}</h4>
                <span className="text-xs font-mono text-slate-500">
                  Day {stop.day}
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-primary font-medium">
                  <span className="opacity-70 text-xs">🕒</span>
                  {stop.start_hour} - {stop.end_hour}
                </div>
                <div className="flex items-center gap-1 text-slate-500">
                  <span className="opacity-70 text-xs">⌛</span>
                  {stop.duration_hours}h
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Timeline;
