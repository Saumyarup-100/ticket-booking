import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShoppingBag, 
  Clock, 
  Calendar, 
  MapPin, 
  Trash2, 
  ShieldCheck, 
  ArrowRight, 
  Ticket, 
  Sparkles
} from 'lucide-react';

function CountdownTimer({ expiresAt, onExpire }: { expiresAt: string, onExpire: () => void }) {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
  
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      const remaining = new Date(expiresAt).getTime() - Date.now();
      if (remaining <= 0) {
        setTimeLeft(0);
        clearInterval(interval);
        onExpire();
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, timeLeft, onExpire]);
  
  if (timeLeft <= 0) {
    return (
      <span className="px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold font-mono">
        EXPIRED
      </span>
    );
  }
  
  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  return (
    <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-sm font-mono font-bold flex items-center gap-1.5 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
      <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
      <span>{minutes}:{seconds.toString().padStart(2, '0')}</span>
    </span>
  );
}

export default function Checkout() {
  const [holds, setHolds] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { token } = useAuth();
  const navigate = useNavigate();

  const fetchHolds = () => {
    axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/bookings/holds`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setHolds(res.data));
  };

  useEffect(() => {
    fetchHolds();
  }, [token]);

  const handleCheckout = async (showId: string) => {
    setSubmitting(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/bookings`, { showId }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.emailPreviewUrl) {
        const open = window.confirm(`Booking confirmed! \n\nA QR ticket was sent to your email.\n\nDev mode: Click OK to preview the email in your browser.`);
        if (open) window.open(res.data.emailPreviewUrl, '_blank');
      }
      navigate('/my-bookings');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelHold = async (showId: string, seatId: string) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/shows/${showId}/seats/${seatId}/hold`, { headers: { Authorization: `Bearer ${token}` } });
      fetchHolds();
    } catch {
      alert('Error releasing seat');
    }
  };

  const holdsByShow = holds.reduce((acc: any, hold: any) => {
    if (!acc[hold.showId]) acc[hold.showId] = { show: hold.show, seats: [], total: 0, expiresAt: hold.holdExpiresAt };
    acc[hold.showId].seats.push(hold);
    acc[hold.showId].total += hold.seat.category.basePrice;
    // Keep earliest expiry
    if (new Date(hold.holdExpiresAt) < new Date(acc[hold.showId].expiresAt)) {
      acc[hold.showId].expiresAt = hold.holdExpiresAt;
    }
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-8 h-8 text-indigo-400" />
            <span>Review & Checkout</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Complete your order before the hold timer expires to lock in your seats.
          </p>
        </div>
      </div>

      {Object.values(holdsByShow).length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center space-y-5 border border-white/10">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">Your cart is empty</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            You don't have any active seat holds right now. Explore upcoming events to reserve your passes.
          </p>
          <Link 
            to="/" 
            className="glass-btn-primary inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/25"
          >
            <span>Explore Events</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.values(holdsByShow).map((group: any) => (
            <div 
              key={group.show.id} 
              className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-indigo-500/30 relative overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
            >
              {/* Top Banner with Countdown */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-white/10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-extrabold text-white">{group.show.event.name}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {group.seats.length} {group.seats.length === 1 ? 'Seat' : 'Seats'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      {new Date(group.show.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-pink-400" />
                      {group.show.venue.name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Time Remaining</div>
                    <CountdownTimer expiresAt={group.expiresAt} onExpire={fetchHolds} />
                  </div>
                </div>
              </div>

              {/* Seats Breakdown List */}
              <div className="space-y-3">
                <div className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5 text-indigo-400" />
                  Reserved Seat Details
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {group.seats.map((h: any) => (
                    <div 
                      key={h.id} 
                      className="p-3.5 rounded-xl bg-slate-900/50 border border-white/5 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold text-slate-200">
                          Seat <span className="text-white font-extrabold">{h.seat.seatLabel}</span>
                        </div>
                        <div className="text-xs text-slate-400">
                          Category: {h.seat.category.name}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-indigo-300">
                          ${h.seat.category.basePrice.toFixed(2)}
                        </span>
                        <button 
                          onClick={() => handleCancelHold(group.show.id, h.seatId)} 
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Release this seat"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total & Checkout Action Footer */}
              <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-slate-400">Total Amount:</span>
                  <span className="text-3xl font-extrabold font-mono text-white">${group.total.toFixed(2)}</span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="hidden md:flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Instant Digital QR Ticket</span>
                  </div>

                  <button 
                    onClick={() => handleCheckout(group.show.id)}
                    disabled={submitting}
                    className="glass-btn-emerald w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{submitting ? 'Confirming...' : 'Pay & Confirm Reservation'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

