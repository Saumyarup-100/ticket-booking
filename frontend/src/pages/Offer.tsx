import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Calendar, MapPin, Clock, Tag, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Offer() {
  const { token } = useParams();
  const [offer, setOffer] = useState<any>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { token: authToken, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/offers/${token}`)
      .then(res => setOffer(res.data))
      .catch(() => setError('This waitlist offer is invalid, expired, or has already been claimed.'));
  }, [token]);

  const handleAccept = async () => {
    if (!user) {
      alert('Please login first to claim this exclusive waitlist offer.');
      navigate('/login');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/offers/${token}/confirm`, {}, { headers: { Authorization: `Bearer ${authToken}` } });
      navigate('/my-bookings');
    } catch (err: any) {
      alert((err as any).response?.data?.message || 'Error accepting offer');
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="glass-panel rounded-3xl p-8 max-w-md w-full text-center space-y-4 border border-red-500/30">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Offer Unavailable</h2>
          <p className="text-xs text-slate-300">{error}</p>
          <Link to="/" className="glass-btn-secondary inline-block px-5 py-2 rounded-xl text-xs font-bold mt-2">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="glass-panel rounded-3xl p-8 max-w-md w-full text-center space-y-3 border border-white/10">
          <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Verifying waitlist invitation token...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-lg glass-panel rounded-3xl p-8 sm:p-10 space-y-6 border border-emerald-500/40 shadow-[0_20px_60px_rgba(16,185,129,0.15)] relative overflow-hidden">
        {/* Background glow spot */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 mx-auto shadow-lg shadow-emerald-500/30 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-block">
            Waitlist Priority Invite
          </span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            You're Off the Waitlist!
          </h1>
          <p className="text-xs text-slate-300">
            A seat has opened up and has been temporarily reserved for your account.
          </p>
        </div>

        {/* Offer Details Card */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3 text-sm">
          <div className="font-extrabold text-white text-lg">
            {offer.show.event.name}
          </div>

          <div className="space-y-1 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>{new Date(offer.show.date).toLocaleDateString()} at {offer.show.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-pink-400" />
              <span>{offer.show.venue.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-emerald-400" />
              <span>Seat Category: <strong className="text-white">{offer.category.name}</strong></span>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-amber-300 font-mono">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Expires at:</span>
            </span>
            <strong>{new Date(offer.offerExpiresAt).toLocaleTimeString()}</strong>
          </div>
        </div>

        {/* Claim Action */}
        <button 
          onClick={handleAccept} 
          disabled={submitting}
          className="glass-btn-emerald w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{submitting ? 'Confirming Reservation...' : 'Claim Seat & Complete Booking'}</span>
        </button>
      </div>
    </div>
  );
}

