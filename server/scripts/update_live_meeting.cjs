const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../client/src/pages/LiveMeeting.tsx');
let c = fs.readFileSync(filePath, 'utf8');

// 1. Add beforeunload effect
const target1 = `  useEffect(() => {
    onLeaveRef.current = onLeave;
  }, [onLeave]);`;

const repl1 = `  useEffect(() => {
    onLeaveRef.current = onLeave;
  }, [onLeave]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeRole !== 'expert' && meetingId) {
        navigator.sendBeacon('/api/sessions/' + meetingId + '/leave');
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (activeRole !== 'expert' && meetingId) {
        axios.post('/api/sessions/' + meetingId + '/leave').catch(() => {});
      }
    };
  }, [meetingId, activeRole]);`;

c = c.replace(/\r\n/g, '\n');
if (!c.includes('navigator.sendBeacon')) {
  c = c.replace(target1, repl1);
}

const target2 = `              <button
                type="button"
                onClick={() => {
                  setShowLeaveModal(false);
                  onLeave();
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                Exit Meeting
              </button>`;

const repl2 = `              <button
                type="button"
                onClick={async () => {
                  setShowLeaveModal(false);
                  try {
                    await axios.post('/api/sessions/' + meetingId + '/leave');
                  } catch (_) {}
                  onLeave();
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                Exit Meeting
              </button>`;

c = c.replace(target2, repl2);

fs.writeFileSync(filePath, c, 'utf8');
console.log('LiveMeeting.tsx successfully updated');
