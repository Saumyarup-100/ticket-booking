import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  PlusCircle, 
  DollarSign, 
  Users, 
  Ticket, 
  Calendar, 
  MapPin, 
  Sparkles, 
  Plus, 
  Layers, 
  AlertCircle
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function EventSummary({ eventId, token }: { eventId: string; token: string }) {
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    axios
      .get(`${API}/api/events/${eventId}/summary`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setSummary(res.data))
      .catch(() => {});
  }, [eventId, token]);

  if (!summary) {
    return (
      <div className="mt-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-500 animate-pulse">
        Loading analytics metrics...
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 rounded-2xl bg-slate-900/60 border border-white/10 grid grid-cols-3 gap-3">
      <div className="space-y-0.5 text-center">
        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-center gap-1">
          <DollarSign className="w-3 h-3 text-emerald-400" /> Revenue
        </div>
        <div className="text-xl font-mono font-extrabold text-emerald-400">
          ${summary.revenue.toFixed(2)}
        </div>
      </div>

      <div className="space-y-0.5 text-center border-l border-white/10">
        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-center gap-1">
          <Users className="w-3 h-3 text-indigo-400" /> Seats Sold
        </div>
        <div className="text-xl font-mono font-extrabold text-indigo-300">
          {summary.seatsSold}
        </div>
      </div>

      <div className="space-y-0.5 text-center border-l border-white/10">
        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-center gap-1">
          <Ticket className="w-3 h-3 text-purple-400" /> Total Orders
        </div>
        <div className="text-xl font-mono font-extrabold text-purple-300">
          {summary.totalBookings}
        </div>
      </div>
    </div>
  );
}

function AddShowForm({ eventId, token, onAdded }: { eventId: string; token: string; onAdded: () => void }) {
  const [venues, setVenues] = useState<any[]>([]);
  const [venueId, setVenueId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) axios.get(`${API}/api/venues`).then(res => setVenues(res.data));
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(
        `${API}/api/events/${eventId}/shows`,
        { venueId, date, time },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOpen(false);
      setVenueId(''); setDate(''); setTime('');
      onAdded();
    } catch { 
      alert('Error creating show'); 
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button 
        onClick={() => setOpen(true)} 
        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-btn-secondary text-xs font-semibold text-indigo-300 hover:text-white"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add Showtime</span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-3">
      <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
        <span>Schedule New Showtime</span>
      </div>

      <div className="relative">
        <select 
          className="glass-input px-3 py-2 rounded-xl text-xs w-full appearance-none bg-[#0e1424] cursor-pointer" 
          value={venueId} 
          onChange={e => setVenueId(e.target.value)} 
          required
        >
          <option value="" className="bg-[#0e1424]">Select Arena / Venue</option>
          {venues.map(v => <option key={v.id} value={v.id} className="bg-[#0e1424]">{v.name}</option>)}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
          ▼
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-slate-400 block mb-1">Performance Date</label>
          <input 
            className="glass-input px-3 py-2 rounded-xl text-xs w-full" 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)} 
            required 
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-400 block mb-1">Time</label>
          <input 
            className="glass-input px-3 py-2 rounded-xl text-xs w-full" 
            type="time" 
            value={time} 
            onChange={e => setTime(e.target.value)} 
            required 
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button 
          className="glass-btn-primary px-4 py-2 rounded-xl text-xs font-bold" 
          type="submit"
          disabled={submitting}
        >
          {submitting ? 'Creating...' : 'Confirm Showtime'}
        </button>
        <button 
          type="button" 
          onClick={() => setOpen(false)} 
          className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function OrganiserDashboard() {
  const [events, setEvents] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { token, user } = useAuth();

  const fetchEvents = () =>
    axios.get(`${API}/api/events`).then(res => setEvents(res.data));

  useEffect(() => {
    if (user?.role === 'ORGANISER' || user?.role === 'ADMIN') fetchEvents();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/events`, { name, description }, { headers: { Authorization: `Bearer ${token}` } });
      setName(''); setDescription('');
      fetchEvents();
    } catch { 
      alert('Error creating event'); 
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.role !== 'ORGANISER' && user?.role !== 'ADMIN') {
    return (
      <div className="glass-panel rounded-3xl p-12 text-center space-y-4 max-w-md mx-auto my-12 border border-white/10">
        <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Unauthorized Access</h2>
        <p className="text-xs text-slate-400">
          You need an Organiser or Administrator role to access this management dashboard.
        </p>
      </div>
    );
  }

  const myEvents = events.filter(ev => user.role === 'ADMIN' || ev.organiserId === user.id);

  return (
    <div className="space-y-8 py-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-8 h-8 text-purple-400" />
            <span>Organiser Operations Studio</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Create events, manage showtimes, and monitor live revenue analytics.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Create Event Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10 shadow-lg">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <PlusCircle className="w-5 h-5 text-indigo-400" />
            <span>Create New Event</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Event Title</label>
              <input 
                className="glass-input px-4 py-2.5 rounded-xl text-sm w-full" 
                placeholder="e.g. Cyber Symphony 2026" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Description</label>
              <textarea 
                className="glass-input px-4 py-2.5 rounded-xl text-sm w-full h-28 resize-none" 
                placeholder="Details about the performance, artists, and admission guidelines..." 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
              />
            </div>

            <button 
              className="glass-btn-primary w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 cursor-pointer" 
              type="submit"
              disabled={submitting}
            >
              <Sparkles className="w-4 h-4" />
              <span>{submitting ? 'Publishing Event...' : 'Publish Event'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Managed Events & Analytics */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <span>Hosted Events & Analytics ({myEvents.length})</span>
            </h2>
          </div>

          {myEvents.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center space-y-3 border border-white/10">
              <p className="text-slate-400 text-sm">
                No events created yet. Use the event creator on the left to launch your first show.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {myEvents.map(e => (
                <div 
                  key={e.id} 
                  className="glass-panel rounded-3xl p-6 sm:p-8 space-y-5 border border-white/10 shadow-[0_10px_35px_rgba(0,0,0,0.3)]"
                >
                  <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
                    <div>
                      <h3 className="text-2xl font-extrabold text-white tracking-tight">{e.name}</h3>
                      {e.description && (
                        <p className="text-slate-300 text-xs sm:text-sm mt-1 leading-relaxed">
                          {e.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Scheduled Showtimes Grid */}
                  <div className="space-y-2 pt-2">
                    <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      Active Showtimes ({e.shows?.length || 0})
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {e.shows.map((s: any) => (
                        <div 
                          key={s.id} 
                          className="p-3 rounded-xl bg-slate-900/50 border border-white/5 text-xs text-slate-300 space-y-1"
                        >
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-indigo-400" />
                            <span>{new Date(s.date).toLocaleDateString()} at {s.time}</span>
                          </div>
                          <div className="text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-pink-400" />
                            <span>{s.venue?.name || 'Main Hall'}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <AddShowForm eventId={e.id} token={token || ''} onAdded={fetchEvents} />
                  </div>

                  {/* Financial & Sales Analytics Widget */}
                  <EventSummary eventId={e.id} token={token || ''} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

