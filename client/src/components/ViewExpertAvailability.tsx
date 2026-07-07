import { useEffect, useState } from "react";
import axios from '../lib/axios';
import { useNavigate } from "react-router-dom";
import { PrimaryButton } from '../pages/ExpertDashboard';
import { Clock, Calendar as CalendarIcon, Edit3 } from "lucide-react";

const formatKolkataDateString = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

interface Slot {
  from: string;
  to: string;
}

interface Availability {
  sessionDuration: number;
  allowedDurations?: number[];
  defaultMeetingLink?: string | null;
  maxPerDay: number;
  weekly: Record<string, Slot[]>;
  breakDates: { start: string; end: string }[];
}

interface ProfileState {
  availability: Availability;
}

// Convert "14:30" -> "02:30 PM"
const displayTime = (time24: string) => {
  if (!time24) return "";
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? "PM" : "AM";
  let hour = h % 12;
  if (hour === 0) hour = 12;
  return `${hour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
};

const ViewExpertAvailability = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [loading, setLoading] = useState(true);

  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const dayLabel: Record<string, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };

  useEffect(() => {
    fetchAvailability();
  }, []);

  async function fetchAvailability() {
    try {
      setLoading(true);
      const res = await axios.get("/api/expert/availability");
      const data = res.data.data;
      const weekly = data.weekly || {};

      Object.keys(weekly).forEach(day => {
        if (Array.isArray(weekly[day])) {
          weekly[day] = weekly[day].map((slot: any) => ({ from: slot.from, to: slot.to }));
        }
      });

      const allowed = Array.isArray(data.allowedDurations) && data.allowedDurations.length > 0
        ? data.allowedDurations.filter((d: number) => d === 30 || d === 60)
        : (data.sessionDuration === 30 || data.sessionDuration === 60 ? [data.sessionDuration] : [30]);
      
      setProfile({
        availability: {
          sessionDuration: data.sessionDuration || 30,
          allowedDurations: allowed,
          defaultMeetingLink: data.defaultMeetingLink || null,
          maxPerDay: data.maxPerDay || 4,
          weekly: weekly,
          breakDates: data.breakDates || [],
        }
      });
    } catch (err) {
      console.error("Error fetching availability:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 bg-white z-10">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Availability & Scheduling</h1>
          <p className="text-sm text-gray-500 mt-1">View your weekly hours and session preferences.</p>
        </div>
        <PrimaryButton onClick={() => navigate('/dashboard/availability/edit')}>
          Edit Availability
        </PrimaryButton>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Settings & Blocked Dates */}
          <div className="space-y-6">

            {/* Global Settings Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Clock size={18} className="text-blue-600" />
                Session Settings
              </h3>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Durations Offered</p>
                  <div className="flex gap-2">
                    {profile.availability.allowedDurations?.map(d => (
                      <span key={d} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-sm font-medium border border-blue-100">
                        {d} mins
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Default Meet Link</p>
                  {profile.availability.defaultMeetingLink ? (
                    <a href={profile.availability.defaultMeetingLink} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline break-all font-medium">
                      {profile.availability.defaultMeetingLink}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Not set</p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Default Slot Length</p>
                  <p className="text-sm font-medium text-gray-800">{profile.availability.sessionDuration} Minutes</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Max Sessions / Day</p>
                  <p className="text-sm font-medium text-gray-800">{profile.availability.maxPerDay} sessions</p>
                </div>
              </div>
            </div>

            {/* Blocked Dates Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                <CalendarIcon size={18} className="text-red-500" />
                Blocked Dates
              </h3>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {profile.availability.breakDates.length === 0 && (
                  <p className="text-sm text-gray-400 italic text-center py-4">No dates blocked.</p>
                )}
                {profile.availability.breakDates.map((date, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-red-50 border border-red-100 px-3 py-2 rounded-lg text-sm text-red-700">
                    <span className="font-medium">{formatKolkataDateString(date.start)}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Weekly Schedule */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-white flex justify-between items-center">
                <h3 className="font-bold text-gray-900">Weekly Schedule</h3>
              </div>

              <div className="divide-y divide-gray-100">
                {days.map((day) => {
                  const slots = profile.availability.weekly[day] || [];
                  const isAvailable = slots.length > 0;

                  return (
                    <div key={day} className={`p-6 transition-colors ${isAvailable ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="w-32 pt-1 flex-shrink-0">
                          <span className={`font-semibold ${isAvailable ? 'text-gray-900' : 'text-gray-400'}`}>
                            {dayLabel[day]}
                          </span>
                        </div>

                        <div className="flex-1">
                          {!isAvailable ? (
                            <div className="text-sm text-gray-400 italic pt-1">Unavailable</div>
                          ) : (
                            <div className="space-y-3">
                              {slots.map((slot, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                  <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 font-medium">
                                    {displayTime(slot.from)}
                                  </div>
                                  <span className="text-gray-400">-</span>
                                  <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 font-medium">
                                    {displayTime(slot.to)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ViewExpertAvailability;
