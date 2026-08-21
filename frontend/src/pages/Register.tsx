import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, UserPlus, AlertCircle, ShieldCheck } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CUSTOMER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/register`, { name, email, password, role });
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-md glass-panel rounded-3xl p-8 sm:p-10 space-y-6 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] relative overflow-hidden">
        {/* Background glow spot */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-indigo-600 p-0.5 mx-auto shadow-lg shadow-purple-500/30 flex items-center justify-center">
            <UserPlus className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Create Account</h2>
          <p className="text-xs text-slate-400">
            Join LiquidPass for real-time ticket booking and event management.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                className="glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm w-full" 
                type="text" 
                placeholder="Alex Morgan" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                className="glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm w-full" 
                type="email" 
                placeholder="alex@example.com" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                className="glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm w-full" 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
              />
            </div>
          </div>

          {/* Account Role Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Account Type</label>
            <div className="relative">
              <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select 
                className="glass-input pl-10 pr-8 py-2.5 rounded-xl text-sm w-full appearance-none bg-[#0e1424] cursor-pointer" 
                value={role} 
                onChange={e => setRole(e.target.value)}
              >
                <option value="CUSTOMER" className="bg-[#0e1424]">Customer (Book Tickets)</option>
                <option value="ORGANISER" className="bg-[#0e1424]">Organiser (Host Events)</option>
                <option value="ADMIN" className="bg-[#0e1424]">Administrator (Manage Venues)</option>
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                ▼
              </div>
            </div>
          </div>

          <button 
            className="glass-btn-primary w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 cursor-pointer mt-2" 
            type="submit"
            disabled={loading}
          >
            <UserPlus className="w-4 h-4" />
            <span>{loading ? 'Creating Account...' : 'Register'}</span>
          </button>
        </form>

        {/* Footer Link */}
        <div className="pt-4 border-t border-white/10 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-4">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

