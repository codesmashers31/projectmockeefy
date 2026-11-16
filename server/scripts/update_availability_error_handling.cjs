const fs = require('fs');
const path = require('path');

// 1. Update BookSessionPage.tsx
{
  const filePath = path.join(__dirname, '../../client/src/components/BookSessionPage.tsx');
  let c = fs.readFileSync(filePath, 'utf8');
  c = c.replace(/\r\n/g, '\n');

  // Carousel error state
  const oldCarousel = `                {dates.length > 0 ? (
                  dates.map((date) => {`;
  const newCarousel = `                {hasAvailabilityError ? (
                  <div className="w-full py-5 px-4 text-center bg-rose-50/70 rounded-xl border border-rose-200 flex flex-col items-center justify-center gap-2">
                    <p className="text-xs font-semibold text-rose-800">{sessionsError || "Unable to load interview slot availability."}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSessionsLoading(true);
                        setSessionsError(null);
                        fetchSessions();
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>Retry</span>
                    </button>
                  </div>
                ) : dates.length > 0 ? (
                  dates.map((date) => {`;

  if (!c.includes('hasAvailabilityError ? (\n                  <div className="w-full py-5')) {
    c = c.replace(oldCarousel, newCarousel);
  }

  // Grid error state
  const oldGrid = `            ) : dates.length === 0 ? (
              <div className="py-8 text-center bg-slate-50/60 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-4">`;
  const newGrid = `            ) : hasAvailabilityError ? (
              <div className="py-8 text-center bg-rose-50/60 rounded-xl border-2 border-dashed border-rose-200 flex flex-col items-center justify-center p-4">
                <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
                <p className="text-xs sm:text-sm font-bold text-rose-900">Unable to load interview slots</p>
                <p className="text-xs text-rose-700 mt-0.5 max-w-sm">
                  {sessionsError || "An error occurred while fetching availability. Please try again."}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsSessionsLoading(true);
                    setSessionsError(null);
                    fetchSessions();
                  }}
                  className="mt-3 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span>Retry</span>
                </button>
              </div>
            ) : dates.length === 0 ? (
              <div className="py-8 text-center bg-slate-50/60 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-4">`;

  if (!c.includes('hasAvailabilityError ? (\n              <div className="py-8 text-center bg-rose-50/60')) {
    c = c.replace(oldGrid, newGrid);
  }

  fs.writeFileSync(filePath, c, 'utf8');
  console.log('BookSessionPage.tsx updated with error retry state');
}

// 2. Update BookingModal.tsx
{
  const filePath = path.join(__dirname, '../../client/src/components/BookingModal.tsx');
  let c = fs.readFileSync(filePath, 'utf8');
  c = c.replace(/\r\n/g, '\n');

  // Carousel error state
  const oldCarousel = `              {dates.length > 0 ? (
                dates.map((date) => {`;
  const newCarousel = `              {hasAvailabilityError ? (
                <div className="w-full py-5 px-4 text-center bg-rose-50/70 rounded-xl border border-rose-200 flex flex-col items-center justify-center gap-2">
                  <p className="text-xs font-semibold text-rose-800">{sessionsError || "Unable to load interview slot availability."}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSessionsLoading(true);
                      setSessionsError(null);
                      fetchSessions();
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>Retry</span>
                  </button>
                </div>
              ) : dates.length > 0 ? (
                dates.map((date) => {`;

  if (!c.includes('hasAvailabilityError ? (\n                <div className="w-full py-5')) {
    c = c.replace(oldCarousel, newCarousel);
  }

  // Grid error state
  const oldGrid = `          {dates.length === 0 ? (
            <div className="py-8 text-center bg-slate-50/60 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-6 min-h-[140px]">`;
  const newGrid = `          {hasAvailabilityError ? (
            <div className="py-8 text-center bg-rose-50/60 rounded-2xl border-2 border-dashed border-rose-200 flex flex-col items-center justify-center p-6 min-h-[140px]">
              <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
              <p className="text-sm font-bold text-rose-900">Unable to load interview slots</p>
              <p className="text-xs text-rose-700 mt-1 max-w-sm">
                {sessionsError || "An error occurred while fetching availability. Please try again."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsSessionsLoading(true);
                  setSessionsError(null);
                  fetchSessions();
                }}
                className="mt-3 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>Retry</span>
              </button>
            </div>
          ) : dates.length === 0 ? (
            <div className="py-8 text-center bg-slate-50/60 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-6 min-h-[140px]">`;

  if (!c.includes('hasAvailabilityError ? (\n            <div className="py-8 text-center bg-rose-50/60')) {
    c = c.replace(oldGrid, newGrid);
  }

  fs.writeFileSync(filePath, c, 'utf8');
  console.log('BookingModal.tsx updated with error retry state');
}
