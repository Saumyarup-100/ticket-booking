import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminVenues from './pages/AdminVenues';
import OrganiserDashboard from './pages/OrganiserDashboard';
import ShowDetail from './pages/ShowDetail';
import Checkout from './pages/Checkout';
import MyBookings from './pages/MyBookings';
import Offer from './pages/Offer';
import { 
  Ticket, 
  MapPin, 
  LayoutDashboard, 
  ShoppingBag, 
  BookmarkCheck, 
  LogOut, 
  LogIn, 
  UserPlus, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';

function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-4 z-50 px-4 sm:px-8 max-w-7xl mx-auto w-full">
      <nav className="glass-panel rounded-2xl px-5 py-3.5 flex justify-between items-center transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#0b0f19] rounded-[10px] flex items-center justify-center">
              <Ticket className="w-5 h-5 text-indigo-400 group-hover:text-white transition-colors" />
            </div>
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight text-liquid-gradient flex items-center gap-1.5">
              LiquidPass
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 inline animate-pulse" />
            </span>
            <span className="hidden sm:block text-[10px] uppercase tracking-widest text-slate-400 font-medium -mt-1">
              Live Experiences
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            to="/"
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
              isActive('/') 
                ? 'bg-white/10 text-white shadow-inner border border-white/10' 
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Events
          </Link>

          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {user.role === 'ADMIN' && (
                <Link
                  to="/admin/venues"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                    isActive('/admin/venues')
                      ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  <span className="hidden md:inline">Venues</span>
                </Link>
              )}

              {(user.role === 'ORGANISER' || user.role === 'ADMIN') && (
                <Link
                  to="/organiser"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                    isActive('/organiser')
                      ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-purple-400" />
                  <span className="hidden md:inline">Dashboard</span>
                </Link>
              )}

              <Link
                to="/checkout"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  isActive('/checkout')
                    ? 'bg-white/15 text-white border border-white/20'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
                title="Cart / Active Holds"
              >
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Cart</span>
              </Link>

              <Link
                to="/my-bookings"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  isActive('/my-bookings')
                    ? 'bg-white/15 text-white border border-white/20'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <BookmarkCheck className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">My Tickets</span>
              </Link>

              {/* User Profile Pill */}
              <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-white/10">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-xs text-white shadow-md">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-200 leading-tight">{user.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                    <ShieldCheck className="w-2.5 h-2.5 text-indigo-400" />
                    {user.role}
                  </span>
                </div>
              </div>

              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-slate-300 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </Link>
              <Link
                to="/register"
                className="glass-btn-primary flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register</span>
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-20 border-t border-white/5 py-10 px-4 sm:px-8 max-w-7xl mx-auto w-full">
      <div className="glass-card rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center">
            <Ticket className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-slate-200 text-sm">LiquidPass Live Entertainment</div>
            <div>Real-time ticket booking engine & queue management</div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Real-time Seat Sync Active
          </span>
          <span className="text-slate-500">|</span>
          <span>© {new Date().getFullYear()} LiquidPass Inc.</span>
        </div>
      </div>
    </footer>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="relative min-h-screen flex flex-col justify-between overflow-hidden">
          {/* Ambient Liquid Glowing Orbs */}
          <div className="ambient-orb-1 -top-20 -left-20" />
          <div className="ambient-orb-2 top-1/3 -right-20" />
          <div className="ambient-orb-3 -bottom-20 left-1/3" />

          {/* Navigation */}
          <Navbar />

          {/* Main Content View */}
          <main className="relative z-10 flex-grow w-full max-w-7xl mx-auto px-4 sm:px-8 py-6">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/admin/venues" element={<AdminVenues />} />
              <Route path="/organiser" element={<OrganiserDashboard />} />
              <Route path="/shows/:id" element={<ShowDetail />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/my-bookings" element={<MyBookings />} />
              <Route path="/offers/:token" element={<Offer />} />
            </Routes>
          </main>

          {/* Footer */}
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

