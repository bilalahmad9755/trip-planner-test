const ELDLog = ({ dayLog }) => {
  if (!dayLog || !dayLog.events) return null;

  const rowHeight = 40;
  const hourWidth = 40;
  const labelWidth = 100;
  const graphWidth = 24 * hourWidth;
  const graphHeight = 4 * rowHeight;

  const statuses = [
    { key: "OFF_DUTY", label: "OFF DUTY" },
    { key: "DRIVING", label: "DRIVING" },
    { key: "ON_DUTY", label: "ON DUTY" },
  ];

  const getStatusIndex = (status) => {
    const idx = statuses.findIndex((s) => s.key === status);
    return idx !== -1 ? idx : 0;
  };

  // Generate the line segments for the log
  const points = [];
  dayLog.events.forEach((event, idx) => {
    const startX = event.start_hour * hourWidth;
    const endX = event.end_hour * hourWidth;
    const y = getStatusIndex(event.status) * rowHeight + rowHeight / 2;

    // Horizontal line for the event
    points.push(`${startX},${y}`);
    points.push(`${endX},${y}`);

    // Vertical jump to next event if exists
    if (idx < dayLog.events.length - 1) {
      const nextEvent = dayLog.events[idx + 1];
      const nextY =
        getStatusIndex(nextEvent.status) * rowHeight + rowHeight / 2;
      points.push(`${endX},${nextY}`);
    }
  });

  return (
    <div className="rounded-[28px] border border-white/85 bg-white/92 p-6 shadow-[0_24px_60px_rgba(143,113,68,0.14)]">
      <div className="flex flex-col gap-3 mb-4 lg:flex-row lg:items-center lg:justify-between">
        <h4 className="font-bold text-slate-900">Day {dayLog.day} Log Chart</h4>
        <div className="flex flex-wrap gap-4 text-[10px] uppercase tracking-widest text-slate-500">
          <span>0 = Midnight</span>
          <span>12 = Noon</span>
          <span>24 = Midnight</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div
          className="relative flex min-w-max"
          style={{ width: `${labelWidth + graphWidth}px` }}
        >
          {/* Left Labels */}
          <div
            className="flex flex-col"
            style={{ width: `${labelWidth}px`, height: `${graphHeight}px` }}
          >
            {statuses.map((s, i) => (
              <div
                key={i}
                className="flex items-center border-b border-amber-100 text-[10px] font-bold text-slate-500"
                style={{ height: `${rowHeight}px` }}
              >
                {s.label}
              </div>
            ))}
          </div>

          {/* Graph Area */}
          <div
            className="relative border-l border-amber-200"
            style={{ width: `${graphWidth}px`, height: `${graphHeight}px` }}
          >
            {/* Background Grid */}
            <svg
              width={graphWidth}
              height={graphHeight}
              className="absolute top-0 left-0"
            >
              {/* Horizontal Lines */}
              {statuses.map((_, i) => (
                <line
                  key={i}
                  x1="0"
                  y1={i * rowHeight}
                  x2={graphWidth}
                  y2={i * rowHeight}
                  stroke="#f1e5d6"
                  strokeWidth="1"
                />
              ))}
              <line
                x1="0"
                y1={graphHeight}
                x2={graphWidth}
                y2={graphHeight}
                stroke="#f1e5d6"
                strokeWidth="1"
              />

              {/* Vertical Hour Lines */}
              {[...Array(25)].map((_, i) => (
                <line
                  key={i}
                  x1={i * hourWidth}
                  y1="0"
                  x2={i * hourWidth}
                  y2={graphHeight}
                  stroke={i % 6 === 0 ? "#d6c2aa" : "#f1e5d6"}
                  strokeWidth={i % 6 === 0 ? "2" : "1"}
                />
              ))}

              {/* The Log Line */}
              <polyline
                points={points.join(" ")}
                fill="none"
                stroke="#0f766e"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_rgba(15,118,110,0.28)]"
              />
            </svg>

            {/* Hour Numbers */}
            <div className="absolute -bottom-6 left-0 w-full flex justify-between px-[-10px]">
              {[...Array(25)].map((_, i) => (
                <span
                  key={i}
                  className="w-0 flex justify-center font-mono text-[9px] text-slate-500"
                >
                  {i}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-3 border-t border-amber-100 pt-4 text-center sm:grid-cols-3">
        {statuses.map((s, i) => {
          const totalHours = dayLog.events
            .filter((e) => e.status === s.key)
            .reduce((acc, e) => acc + (e.end_hour - e.start_hour), 0);
          return (
            <div
              key={i}
              className="rounded-2xl border border-amber-100 bg-amber-50/55 p-3"
            >
              <div className="text-[10px] uppercase text-slate-500">
                {s.label}
              </div>
              <div className="text-sm font-bold text-slate-800">
                {totalHours.toFixed(2)}h
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ELDLog;
