import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Clock, 
  Sparkles, 
  Ticket, 
  ChevronRight, 
  Layers, 
  Zap, 
  ShieldCheck,
  Building,
  History,
  CheckCircle2
} from 'lucide-react';

function isShowUpcoming(show: any): boolean {
  try {
    const showDate = new Date(show.date);
    if (show.time) {
      const parts = show.time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (parts) {
        let hours = parseInt(parts[1]);
        const minutes = parseInt(parts[2]);
        const meridiem = parts[3]?.toUpperCase();
        if (meridiem === 'PM' && hours < 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;
        showDate.setHours(hours, minutes, 0, 0);
      }
    }
    // Consider past if show timestamp is earlier than current time
    return showDate.getTime() >= Date.now();
  } catch {
    return new Date(show.date).getTime() >= Date.now();
  }
}

export default function Home() {
  const [events, setEvents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [venues, setVenues] = useState<any[]>([]);
  const [selectedVenue, setSelectedVenue] = useState('');
  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'HISTORY'>('UPCOMING');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch venues for filter dropdown
    axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/venues`)
      .then(res => setVenues(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (selectedVenue) params.append('venueId', selectedVenue);
    
    axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/events?${params.toString()}`)
      .then(res => setEvents(res.data))
      .finally(() => setLoading(false));
  }, [search, selectedVenue]);

  // Separate upcoming shows and past historical shows
  const processedEvents = events.map(event => {
    const upcomingShows = (event.shows || []).filter((s: any) => isShowUpcoming(s));
    const pastShows = (event.shows || []).filter((s: any) => !isShowUpcoming(s));
    return {
      ...event,
      upcomingShows,
      pastShows,
      displayShows: activeTab === 'UPCOMING' ? upcomingShows : pastShows
    };
  }).filter(event => event.displayShows.length > 0);

  const totalUpcomingShows = events.reduce((sum, e) => sum + (e.shows?.filter((s: any) => isShowUpcoming(s)).length || 0), 0);
  const totalPastShows = events.reduce((sum, e) => sum + (e.shows?.filter((s: any) => !isShowUpcoming(s)).length || 0), 0);

  return (
    <div className="space-y-12 py-4">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl p-8 sm:p-12 glass-panel border border-white/10">
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-pill text-xs font-semibold text-indigo-300 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Next-Gen High Concurrency Seating</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] text-liquid-gradient">
            Live Entertainment. <br />
            <span className="text-cyan-gradient">Liquid Precision.</span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl leading-relaxed">
            Reserve the best seats instantly with real-time WebSocket seat locking, automatic waitlist dispatch, and instant digital ticketing.
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10 max-w-xl">
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-white">{events.length}</div>
              <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <Layers className="w-3 h-3 text-indigo-400" /> Events Live
              </div>
            </div>
            <div className="space-y-1 border-l border-white/10 pl-4">
              <div className="text-2xl sm:text-3xl font-extrabold text-white">{venues.length}</div>
              <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <Building className="w-3 h-3 text-cyan-400" /> Venues
              </div>
            </div>
            <div className="space-y-1 border-l border-white/10 pl-4">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 flex items-center gap-1">
                <Zap className="w-5 h-5 text-emerald-400" />
                <span>Live</span>
              </div>
              <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> 10m Hold Lock
              </div>
            </div>
          </div>
        </div>

        {/* Decorative corner ambient glow */}
        <div className="absolute -bottom-10 -right-10 w-96 h-96 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/10 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* View Switcher Tabs (Upcoming vs Concluded History) */}
      <div className="flex justify-center sm:justify-start">
        <div className="glass-panel p-1.5 rounded-2xl flex items-center gap-2 border border-white/10 shadow-lg">
          <button
            onClick={() => setActiveTab('UPCOMING')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'UPCOMING'
                ? 'glass-btn-primary shadow-lg shadow-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-indigo-300" />
            <span>Upcoming Live Shows ({totalUpcomingShows})</span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-lg shadow-purple-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <History className="w-3.5 h-3.5 text-purple-400" />
            <span>Event History & Archives ({totalPastShows})</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <section className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4 border border-white/10 shadow-lg">
        <div className="flex items-center gap-2 text-slate-200 font-semibold text-lg w-full md:w-auto">
          {activeTab === 'UPCOMING' ? (
            <>
              <Ticket className="w-5 h-5 text-indigo-400" />
              <span>Available Upcoming Shows ({totalUpcomingShows})</span>
            </>
          ) : (
            <>
              <History className="w-5 h-5 text-purple-400" />
              <span>Concluded Past Shows ({totalPastShows})</span>
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search concerts, plays, events..." 
              className="glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm w-full placeholder:text-slate-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Venue Dropdown */}
          <div className="relative sm:w-56">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select 
              className="glass-input pl-10 pr-8 py-2.5 rounded-xl text-sm w-full appearance-none bg-[#0e1424] cursor-pointer"
              value={selectedVenue}
              onChange={(e) => setSelectedVenue(e.target.value)}
            >
              <option value="" className="bg-[#0e1424]">All Venues</option>
              {venues.map(v => (
                <option key={v.id} value={v.id} className="bg-[#0e1424]">
                  {v.name}
                </option>
              ))}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
              ▼
            </div>
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="space-y-6">
        {loading ? (
          <div className="grid gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card rounded-2xl p-6 h-48 animate-pulse border border-white/5 flex flex-col justify-between">
                <div className="h-6 bg-white/10 rounded-md w-1/3"></div>
                <div className="h-4 bg-white/5 rounded-md w-2/3"></div>
                <div className="h-12 bg-white/5 rounded-xl"></div>
              </div>
            ))}
          </div>
        ) : processedEvents.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center space-y-4 border border-white/5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
              {activeTab === 'UPCOMING' ? <Ticket className="w-8 h-8" /> : <History className="w-8 h-8" />}
            </div>
            <h3 className="text-xl font-bold text-slate-200">
              {activeTab === 'UPCOMING' ? 'No active upcoming shows found' : 'No past show history found'}
            </h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              {activeTab === 'UPCOMING' 
                ? 'There are currently no upcoming showtimes scheduled matching your filter. Check out the history tab or reset your filters.'
                : 'No concluded historical events matching your filter.'}
            </p>
            <button 
              onClick={() => { setSearch(''); setSelectedVenue(''); }}
              className="glass-btn-secondary px-5 py-2 rounded-xl text-sm font-medium"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid gap-8">
            {processedEvents.map(event => (
              <div 
                key={event.id} 
                className="glass-card glass-card-hover rounded-2xl p-6 sm:p-8 space-y-6 border border-white/10 relative overflow-hidden group"
              >
                {/* Event Header */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight group-hover:text-indigo-300 transition-colors">
                        {event.name}
                      </h2>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        activeTab === 'UPCOMING'
                          ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                          : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                      }`}>
                        {event.displayShows.length} {activeTab === 'UPCOMING' ? 'Upcoming' : 'Concluded'} {event.displayShows.length === 1 ? 'Show' : 'Shows'}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-slate-300 text-sm sm:text-base max-w-3xl leading-relaxed">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Showtimes List */}
                <div className="space-y-3 pt-2">
                  <div className="text-xs uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    {activeTab === 'UPCOMING' ? 'Scheduled Upcoming Showtimes' : 'Archived Showtimes (Historical Blueprint)'}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {event.displayShows.map((show: any) => (
                      <div 
                        key={show.id} 
                        className={`glass-panel p-4 rounded-xl border transition-all flex flex-col justify-between gap-4 group/show ${
                          activeTab === 'UPCOMING'
                            ? 'border-white/10 hover:border-indigo-500/40 bg-slate-900/40 hover:bg-slate-900/60'
                            : 'border-white/5 bg-slate-950/40 opacity-85'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-200 text-sm font-semibold">
                              <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                              <span>{new Date(show.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                            {activeTab === 'HISTORY' && (
                              <span className="text-[10px] uppercase font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">
                                Concluded
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-slate-300 text-xs font-medium">
                            <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <span>{show.time}</span>
                          </div>

                          <div className="flex items-center gap-2 text-slate-400 text-xs">
                            <MapPin className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                            <span className="truncate">{show.venue?.name || 'Main Arena'}</span>
                          </div>
                        </div>

                        {activeTab === 'UPCOMING' ? (
                          <Link 
                            to={`/shows/${show.id}`} 
                            className="glass-btn-primary w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-md group-hover/show:scale-[1.02] transition-transform"
                          >
                            <span>Select Seats</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        ) : (
                          <Link 
                            to={`/shows/${show.id}`} 
                            className="glass-btn-secondary w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 text-slate-300 hover:text-white"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                            <span>View Archived Seating</span>
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}


