import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  Clock,
  MapPin,
  ArrowLeft,
  ShoppingBag,
  Sparkles,
  Timer,
  CheckCircle,
  Lock,
  AlertCircle,
  Tag,
  UserCheck,
  Layers
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CATEGORY_THEMES = [
  {
    bg: 'bg-amber-500/20 border-amber-500/50 text-amber-300',
    availableClass: 'bg-amber-500/25 border-amber-500/60 text-amber-200 hover:bg-amber-500/50 hover:scale-110 shadow-[0_0_12px_rgba(245,158,11,0.35)] cursor-pointer',
    pillClass: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
    hex: '#f59e0b'
  },
  {
    bg: 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300',
    availableClass: 'bg-indigo-500/25 border-indigo-500/60 text-indigo-200 hover:bg-indigo-500/50 hover:scale-110 shadow-[0_0_12px_rgba(99,102,241,0.35)] cursor-pointer',
    pillClass: 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300',
    hex: '#6366f1'
  },
  {
    bg: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300',
    availableClass: 'bg-emerald-500/25 border-emerald-500/60 text-emerald-200 hover:bg-emerald-500/50 hover:scale-110 shadow-[0_0_12px_rgba(16,185,129,0.35)] cursor-pointer',
    pillClass: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
    hex: '#10b981'
  },
  {
    bg: 'bg-purple-500/20 border-purple-500/50 text-purple-300',
    availableClass: 'bg-purple-500/25 border-purple-500/60 text-purple-200 hover:bg-purple-500/50 hover:scale-110 shadow-[0_0_12px_rgba(168,85,247,0.35)] cursor-pointer',
    pillClass: 'bg-purple-500/15 border-purple-500/40 text-purple-300',
    hex: '#a855f7'
  },
  {
    bg: 'bg-pink-500/20 border-pink-500/50 text-pink-300',
    availableClass: 'bg-pink-500/25 border-pink-500/60 text-pink-200 hover:bg-pink-500/50 hover:scale-110 shadow-[0_0_12px_rgba(236,72,153,0.35)] cursor-pointer',
    pillClass: 'bg-pink-500/15 border-pink-500/40 text-pink-300',
    hex: '#ec4899'
  },
  {
    bg: 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300',
    availableClass: 'bg-cyan-500/25 border-cyan-500/60 text-cyan-200 hover:bg-cyan-500/50 hover:scale-110 shadow-[0_0_12px_rgba(6,182,212,0.35)] cursor-pointer',
    pillClass: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300',
    hex: '#06b6d4'
  }
];

export default function ShowDetail() {
  const { id } = useParams();
  const [seats, setSeats] = useState<any[]>([]);
  const [show, setShow] = useState<any>(null);
  const [holding, setHolding] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [highlightCategory, setHighlightCategory] = useState<string | null>(null);
  const { user, token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    axios.get(`${API}/api/shows/${id}/seats`).then(res => {
      setSeats(res.data);
      if (res.data.length > 0 && res.data[0].show) setShow(res.data[0].show);
    }).finally(() => setLoading(false));

    const socket: Socket = io(API, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000
    });

    const joinCurrentShow = () => {
      if (id) {
        socket.emit('join_show', id);
      }
    };

    // If socket is already connected or when it connects/reconnects
    if (socket.connected) {
      joinCurrentShow();
    }
    socket.on('connect', joinCurrentShow);
    socket.io.on('reconnect', joinCurrentShow);

    socket.on('seat:held', (data: any) => {
      if (data.showId === id) {
        setSeats(prev => prev.map(s => s.seatId === data.seatId
          ? {
            ...s,
            status: 'HELD',
            heldBy: data.heldBy ?? s.heldBy,
            holdExpiresAt: data.holdExpiresAt ?? s.holdExpiresAt
          }
          : s
        ));
      }
    });

    socket.on('seat:released', (data: any) => {
      if (data.showId === id) {
        setSeats(prev => prev.map(s => s.seatId === data.seatId
          ? { ...s, status: 'AVAILABLE', heldBy: null, holdExpiresAt: null }
          : s
        ));
      }
    });

    socket.on('seat:booked', (data: any) => {
      if (data.showId === id) {
        setSeats(prev => prev.map(s => s.seatId === data.seatId
          ? { ...s, status: 'BOOKED', heldBy: null, holdExpiresAt: null }
          : s
        ));
      }
    });

    return () => {
      socket.emit('leave_show', id);
      socket.off('connect', joinCurrentShow);
      socket.off('seat:held');
      socket.off('seat:released');
      socket.off('seat:booked');
      socket.disconnect();
    };
  }, [id]);

  const handleSeatClick = async (seatId: string, status: string) => {
    if (!user) { navigate('/login'); return; }

    // If already held by this user — toggle off (release)
    const seat = seats.find(s => s.seatId === seatId);
    if (status === 'HELD' && seat?.heldBy === user.id) {
      try {
        await axios.delete(`${API}/api/shows/${id}/seats/${seatId}/hold`, { headers: { Authorization: `Bearer ${token}` } });
        setSeats(prev => prev.map(s => s.seatId === seatId ? { ...s, status: 'AVAILABLE', heldBy: null } : s));
      } catch { /* ignore */ }
      return;
    }

    if (status !== 'AVAILABLE') return;
    if (holding) return; // debounce

    setHolding(seatId);
    try {
      await axios.post(`${API}/api/shows/${id}/seats/${seatId}/hold`, {}, { headers: { Authorization: `Bearer ${token}` } });
      // Update local state immediately
      setSeats(prev => prev.map(s => s.seatId === seatId
        ? { ...s, status: 'HELD', heldBy: user.id }
        : s
      ));
    } catch (error: any) {
      alert(error.response?.data?.message || 'Seat no longer available');
    } finally {
      setHolding(null);
    }
  };

  const handleJoinWaitlist = async (categoryId: string) => {
    if (!user) { navigate('/login'); return; }
    try {
      await axios.post(`${API}/api/shows/${id}/waitlist`, { categoryId }, { headers: { Authorization: `Bearer ${token}` } });
      alert('Added to waitlist! You will be emailed when a seat becomes available.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error joining waitlist');
    }
  };

  // Group seats by category
  const categories = seats.reduce((acc: Record<string, any>, s) => {
    const catId = s.seat.categoryId;
    if (!acc[catId]) acc[catId] = { ...s.seat.category, seats: [] };
    acc[catId].seats.push(s);
    return acc;
  }, {});

  const categoryList = Object.values(categories);

  const getCategoryTheme = (catId: string) => {
    const index = categoryList.findIndex((c: any) => c.id === catId);
    return CATEGORY_THEMES[index >= 0 ? index % CATEGORY_THEMES.length : 0];
  };

  const isSoldOut = (catSeats: any[]) => catSeats.every(s => s.status === 'BOOKED');

  // Seats currently held by this user
  const myHeldSeats = seats.filter(s => s.status === 'HELD' && s.heldBy === user?.id);
  const cartTotal = myHeldSeats.reduce((sum, s) => sum + s.seat.category.basePrice, 0);
  const earliestExpiry = myHeldSeats.reduce((min: string | null, s) =>
    !min || new Date(s.holdExpiresAt) < new Date(min) ? s.holdExpiresAt : min, null);

  return (
    <div className="space-y-8 py-2">
      {/* Top Breadcrumb & Show Details Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to all events
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>{show?.event?.name || 'Live Performance'}</span>
            <Sparkles className="w-5 h-5 text-indigo-400 inline" />
          </h1>
          {show && (
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full glass-pill">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                {new Date(show.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full glass-pill">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                {show.time}
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full glass-pill">
                <MapPin className="w-3.5 h-3.5 text-pink-400" />
                {show.venue?.name || 'Main Hall'}
              </span>
            </div>
          )}
        </div>

        {/* Live sync indicator badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-pill text-xs text-slate-300 self-start md:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>Live WebSocket Sync</span>
        </div>
      </div>

      {/* Seat Types Palette Bar */}
      {categoryList.length > 0 && (
        <div className="glass-panel rounded-2xl p-4 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
          <div className="text-xs uppercase font-extrabold tracking-wider text-slate-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Seat Types & Tiers:</span>
          </div>

          <div className="flex flex-wrap gap-2.5 items-center">
            {categoryList.map((cat: any) => {
              const theme = getCategoryTheme(cat.id);
              const availableCount = cat.seats.filter((s: any) => s.status === 'AVAILABLE').length;
              const isSelected = highlightCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setHighlightCategory(prev => prev === cat.id ? null : cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${isSelected
                      ? 'ring-2 ring-white bg-white/20 text-white shadow-lg'
                      : theme.pillClass
                    }`}
                  title="Click to highlight seats of this type"
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.hex }}></span>
                  <span>{cat.name}</span>
                  <span className="font-mono text-[11px] opacity-90">₹{cat.basePrice.toFixed(2)}</span>
                  <span className="text-[10px] bg-white/10 px-1.5 py-0.2 rounded font-mono">
                    {availableCount} left
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Main Seat Map Arena */}
        <div className="flex-1 w-full glass-panel rounded-3xl p-6 sm:p-8 space-y-8 relative overflow-hidden border border-white/10">
          {/* Stage Area */}
          <div className="relative flex flex-col items-center">
            {/* Ambient Stage Light Beam */}
            <div className="w-4/5 h-20 stage-beam absolute top-0 pointer-events-none" />

            {/* Stage Curved Bar */}
            <div className="relative z-10 w-3/4 py-2.5 rounded-full bg-gradient-to-r from-indigo-500/20 via-purple-500/30 to-pink-500/20 border border-indigo-400/40 text-center shadow-[0_0_25px_rgba(99,102,241,0.3)] backdrop-blur-md">
              <span className="text-xs uppercase font-extrabold tracking-[0.25em] text-indigo-200">
                ★ STAGE / SCREEN (FRONT) ★
              </span>
            </div>
          </div>

          {/* Seat Grid Layout */}
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-400">Loading seat layout...</p>
            </div>
          ) : seats.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              No seats configured for this show.
            </div>
          ) : (
            <div className="overflow-x-auto py-4">
              <div className="flex flex-wrap gap-2.5 justify-center max-w-2xl mx-auto min-w-[320px]">
                {seats
                  .sort((a, b) => a.seat.row === b.seat.row ? a.seat.col - b.seat.col : a.seat.row - b.seat.row)
                  .map(s => {
                    const isMyHold = s.status === 'HELD' && s.heldBy === user?.id;
                    const isLoading = holding === s.seatId;
                    const isHeldByOther = s.status === 'HELD' && !isMyHold;
                    const catTheme = getCategoryTheme(s.seat.categoryId);
                    const isHighlighted = highlightCategory ? s.seat.categoryId === highlightCategory : true;

                    return (
                      <button
                        key={s.id}
                        onClick={() => handleSeatClick(s.seatId, s.status)}
                        disabled={isLoading || (s.status !== 'AVAILABLE' && !isMyHold)}
                        title={`Seat ${s.seat.seatLabel} — ${s.seat.category.name} (₹${s.seat.category.basePrice})`}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all relative group
                          ${!isHighlighted && s.status === 'AVAILABLE' ? 'opacity-30' : ''}
                          ${isLoading ? 'bg-slate-700/50 cursor-wait animate-pulse' :
                            isMyHold ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white ring-2 ring-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.6)] scale-105 cursor-pointer z-10' :
                              s.status === 'AVAILABLE' ? `${catTheme.availableClass}` :
                                isHeldByOther ? 'bg-amber-500/20 border border-amber-500/30 text-amber-300 cursor-not-allowed' :
                                  'bg-white/[0.03] border border-white/5 text-slate-600 cursor-not-allowed opacity-40'}`}
                      >
                        {isMyHold ? (
                          <UserCheck className="w-4 h-4" />
                        ) : isHeldByOther ? (
                          <Lock className="w-3.5 h-3.5 opacity-75" />
                        ) : (
                          <span>{s.seat.seatLabel}</span>
                        )}

                        {/* Floating Micro Tooltip on Hover */}
                        <span className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-30 px-2.5 py-1 bg-slate-900/95 text-[10px] text-slate-200 rounded-lg shadow-xl border border-white/15 whitespace-nowrap pointer-events-none">
                          <span className="font-bold text-white">Seat {s.seat.seatLabel}</span>
                          <span className="flex items-center gap-1 text-[9px]" style={{ color: catTheme.hex }}>
                            ● {s.seat.category.name} · ₹{s.seat.category.basePrice}
                          </span>
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Seat Status & Seat Type Legend */}
          <div className="pt-6 border-t border-white/10 space-y-4">
            {/* Category Colors Legend */}
            <div className="space-y-1.5 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Seat Types & Colors (Available)
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300">
                {categoryList.map((cat: any) => {
                  const theme = getCategoryTheme(cat.id);
                  return (
                    <div key={cat.id} className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-lg border" style={{ backgroundColor: `${theme.hex}40`, borderColor: theme.hex }}></div>
                      <span>{cat.name} (₹{cat.basePrice})</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status Legend */}
            <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 ring-1 ring-indigo-400"></div>
                <span className="text-slate-200">Your Selection</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-lg bg-amber-500/20 border border-amber-500/40"></div>
                <span>Held by Others</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-lg bg-white/[0.03] border border-white/5 opacity-40"></div>
                <span>Booked</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Categories & Cart Panel */}
        <div className="w-full lg:w-80 space-y-6 shrink-0">
          {/* Category Pricing Tiers */}
          <div className="glass-card rounded-2xl p-5 space-y-4 border border-white/10">
            <div className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-400" />
              Seat Categories & Pricing
            </div>

            <div className="space-y-3">
              {categoryList.map((cat: any) => {
                const theme = getCategoryTheme(cat.id);
                const availableCount = cat.seats.filter((s: any) => s.status === 'AVAILABLE').length;
                const soldOut = isSoldOut(cat.seats);

                return (
                  <div key={cat.id} className="p-3 rounded-xl bg-slate-900/40 border border-white/5 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-200 text-sm flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.hex }}></span>
                        <span>{cat.name}</span>
                      </span>
                      <span className="font-mono font-bold text-indigo-300 text-sm">₹{cat.basePrice.toFixed(2)}</span>
                    </div>

                    {availableCount === 0 ? (
                      <div className="space-y-2 pt-1">
                        <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
                          <span>{soldOut ? 'Sold Out' : 'All Seats Occupied'}</span>
                          <span className="text-slate-400 font-normal">Waitlist Open</span>
                        </div>
                        <button
                          onClick={() => handleJoinWaitlist(cat.id)}
                          className="glass-btn-primary w-full py-1.5 rounded-lg text-xs font-semibold shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Tag className="w-3.5 h-3.5" />
                          <span>Join Category Waitlist</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>{availableCount} {availableCount === 1 ? 'seat' : 'seats'} available</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cart & Active Holds Drawer */}
          {myHeldSeats.length > 0 ? (
            <div className="glass-panel rounded-2xl p-5 space-y-4 border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="font-bold text-white text-sm flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-indigo-400" />
                  <span>Selected Seats ({myHeldSeats.length})</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Hold Active
                </span>
              </div>

              {/* Seats list */}
              <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {myHeldSeats.map(s => (
                  <li key={s.id} className="flex justify-between items-center p-2 rounded-lg bg-white/[0.04] text-xs">
                    <span className="font-medium text-slate-200">
                      Seat <strong className="text-white">{s.seat.seatLabel}</strong> <span className="text-slate-400">({s.seat.category.name})</span>
                    </span>
                    <span className="font-mono text-indigo-300 font-bold">₹{s.seat.category.basePrice.toFixed(2)}</span>
                  </li>
                ))}
              </ul>

              {/* Total */}
              <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                <span className="text-xs text-slate-300">Total Price</span>
                <span className="text-xl font-mono font-extrabold text-white">₹{cartTotal.toFixed(2)}</span>
              </div>

              {/* Expiry Warning */}
              {earliestExpiry && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                  <Timer className="w-4 h-4 shrink-0 animate-pulse text-amber-400" />
                  <span>Hold expires at {new Date(earliestExpiry).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}

              {myHeldSeats.length >= 6 && (
                <div className="text-[11px] text-slate-400 text-center">
                  Maximum seat limit reached (6 seats per hold)
                </div>
              )}

              {/* Checkout Button */}
              <Link
                to="/checkout"
                className="glass-btn-emerald w-full py-3 rounded-xl text-center font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
              >
                <span>Proceed to Checkout</span>
                <span>→</span>
              </Link>
            </div>
          ) : (
            !user && (
              <div className="glass-card rounded-2xl p-5 text-center space-y-3 border border-white/10">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-200 text-sm">Account Required</h4>
                <p className="text-xs text-slate-400">
                  Please login or register to hold seats and reserve your tickets.
                </p>
                <Link to="/login" className="glass-btn-primary block w-full py-2 rounded-xl text-xs font-bold">
                  Login to Continue
                </Link>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}


