import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { 
  Ticket, 
  Calendar, 
  MapPin, 
  QrCode, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  AlertOctagon
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function MyBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const fetchBookings = () => {
    setLoading(true);
    axios
      .get(`${API}/api/bookings/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setBookings(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBookings(); }, [token]);

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this booking? Held seats will be released to other attendees or waitlist members.')) return;
    try {
      await axios.post(`${API}/api/bookings/${id}/cancel`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchBookings();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error cancelling booking');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Ticket className="w-8 h-8 text-indigo-400" />
            <span>My Digital Tickets</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Access your confirmed admission passes, QR codes, and seat assignments.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6">
          {[1, 2].map(i => (
            <div key={i} className="glass-card rounded-3xl p-8 h-56 animate-pulse border border-white/5" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center space-y-5 border border-white/10">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
            <Ticket className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">No active bookings found</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            You haven't reserved any tickets yet. Browse available events to get your passes.
          </p>
          <Link 
            to="/" 
            className="glass-btn-primary inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/25"
          >
            <span>Browse Events</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {bookings.map(booking => {
            const isConfirmed = booking.status === 'CONFIRMED';

            return (
              <div 
                key={booking.id} 
                className={`glass-panel rounded-3xl overflow-hidden border transition-all duration-300 relative ${
                  isConfirmed 
                    ? 'border-indigo-500/30 shadow-[0_10px_35px_rgba(99,102,241,0.15)] hover:border-indigo-500/50' 
                    : 'border-white/5 opacity-60'
                }`}
              >
                {/* Holographic Top Banner */}
                <div className={`px-6 py-3 border-b flex items-center justify-between text-xs font-semibold ${
                  isConfirmed 
                    ? 'bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900/40 border-white/10 text-indigo-200' 
                    : 'bg-slate-900/50 border-white/5 text-slate-400'
                }`}>
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    Official Admission Pass
                  </span>
                  <span className="font-mono tracking-wider text-[11px] text-slate-300">
                    REF: <strong className="text-white">{booking.bookingReference}</strong>
                  </span>
                </div>

                {/* Ticket Body */}
                <div className="p-6 sm:p-8 flex flex-col md:flex-row justify-between gap-6">
                  {/* Left Column: Event & Seat Info */}
                  <div className="space-y-4 flex-1">
                    <div>
                      <h2 className="text-2xl font-extrabold text-white tracking-tight">
                        {booking.show.event.name}
                      </h2>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mt-2">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                          {new Date(booking.show.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-pink-400" />
                          {booking.show.venue.name}
                        </span>
                      </div>
                    </div>

                    {/* Seat Badges */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                        Assigned Seats ({booking.seats.length})
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {booking.seats.map((s: any) => (
                          <span 
                            key={s.id} 
                            className="px-3 py-1 rounded-xl bg-slate-900/60 border border-white/10 text-xs font-bold text-slate-200 flex items-center gap-1.5"
                          >
                            <span>Seat {s.seat.seatLabel}</span>
                            <span className="text-[10px] text-slate-400 font-normal">({s.seat.category?.name || 'Standard'})</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Total Price */}
                    <div className="text-sm text-slate-300">
                      Total Paid: <strong className="text-white font-mono text-base">₹{booking.totalAmount.toFixed(2)}</strong>
                    </div>
                  </div>

                  {/* Right Column: Status & QR Visual */}
                  <div className="flex flex-col md:items-end justify-between gap-4 md:border-l md:border-white/10 md:pl-6">
                    {/* Status Badge */}
                    <div className="flex md:flex-col items-center md:items-end gap-2">
                      <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                        isConfirmed 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                          : 'bg-slate-700/40 text-slate-400 border border-white/10'
                      }`}>
                        {isConfirmed ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Confirmed</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-slate-400" />
                            <span>Cancelled</span>
                          </>
                        )}
                      </div>

                      {isConfirmed && (
                        <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          <span>QR E-Ticket Dispatched</span>
                        </div>
                      )}
                    </div>

                    {/* QR Code Icon / Visual Simulation */}
                    {isConfirmed && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                        <QrCode className="w-10 h-10 text-slate-300" />
                        <div className="text-[10px] text-slate-400 font-mono leading-tight">
                          SCAN AT<br />ENTRY GATE
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {isConfirmed && (
                      <button
                        onClick={() => handleCancel(booking.id)}
                        className="glass-btn-danger px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                      >
                        <AlertOctagon className="w-3.5 h-3.5" />
                        <span>Cancel Booking</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

