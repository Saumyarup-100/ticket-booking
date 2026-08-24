import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  Building, 
  MapPin, 
  Plus, 
  Tag, 
  CheckCircle2, 
  Sparkles, 
  Sliders, 
  AlertCircle,
  Settings2,
  Paintbrush,
  Maximize2,
  DollarSign,
  Grid
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Color themes assigned to category slots for distinct visual hierarchy
const CATEGORY_COLORS = [
  {
    bg: 'bg-amber-500/20 border-amber-500/50 text-amber-300',
    activeRing: 'ring-2 ring-amber-400 bg-amber-500/30 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.4)]',
    seatClass: 'bg-amber-500/30 border-amber-500/60 text-amber-200 hover:bg-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.25)]',
    name: 'Amber Gold (VIP)',
    hex: '#f59e0b'
  },
  {
    bg: 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300',
    activeRing: 'ring-2 ring-indigo-400 bg-indigo-500/30 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.4)]',
    seatClass: 'bg-indigo-500/30 border-indigo-500/60 text-indigo-200 hover:bg-indigo-500/50 shadow-[0_0_8px_rgba(99,102,241,0.25)]',
    name: 'Electric Indigo (Premium)',
    hex: '#6366f1'
  },
  {
    bg: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300',
    activeRing: 'ring-2 ring-emerald-400 bg-emerald-500/30 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.4)]',
    seatClass: 'bg-emerald-500/30 border-emerald-500/60 text-emerald-200 hover:bg-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.25)]',
    name: 'Emerald (Standard)',
    hex: '#10b981'
  },
  {
    bg: 'bg-purple-500/20 border-purple-500/50 text-purple-300',
    activeRing: 'ring-2 ring-purple-400 bg-purple-500/30 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.4)]',
    seatClass: 'bg-purple-500/30 border-purple-500/60 text-purple-200 hover:bg-purple-500/50 shadow-[0_0_8px_rgba(168,85,247,0.25)]',
    name: 'Neon Violet (Balcony)',
    hex: '#a855f7'
  },
  {
    bg: 'bg-pink-500/20 border-pink-500/50 text-pink-300',
    activeRing: 'ring-2 ring-pink-400 bg-pink-500/30 text-pink-200 shadow-[0_0_15px_rgba(236,72,153,0.4)]',
    seatClass: 'bg-pink-500/30 border-pink-500/60 text-pink-200 hover:bg-pink-500/50 shadow-[0_0_8px_rgba(236,72,153,0.25)]',
    name: 'Rose Pink (Boxes)',
    hex: '#ec4899'
  },
  {
    bg: 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300',
    activeRing: 'ring-2 ring-cyan-400 bg-cyan-500/30 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.4)]',
    seatClass: 'bg-cyan-500/30 border-cyan-500/60 text-cyan-200 hover:bg-cyan-500/50 shadow-[0_0_8px_rgba(6,182,212,0.25)]',
    name: 'Cyan (Economy)',
    hex: '#06b6d4'
  }
];

export default function AdminVenues() {
  const [venues, setVenues] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [selectedVenue, setSelectedVenue] = useState<any>(null);
  
  // Category management state
  const [catName, setCatName] = useState('');
  const [catPrice, setCatPrice] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string>('');
  
  // Interactive Hall Seating Grid State
  const [gridRows, setGridRows] = useState(8);
  const [gridCols, setGridCols] = useState(12);
  const [seatMap, setSeatMap] = useState<Record<string, string>>({}); // key: `${r}_${c}` -> categoryId
  const [isMouseDown, setIsMouseDown] = useState(false);
  
  // Loading & submission state
  const [submittingVenue, setSubmittingVenue] = useState(false);
  const [submittingCat, setSubmittingCat] = useState(false);
  const [savingSeating, setSavingSeating] = useState(false);
  const { token, user } = useAuth();
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchVenues = () =>
    axios.get(`${API}/api/venues`).then(res => setVenues(res.data));

  useEffect(() => {
    if (user?.role === 'ADMIN') fetchVenues();
  }, [user]);

  // Global mouse up listener to stop drag painting outside grid
  useEffect(() => {
    const handleGlobalMouseUp = () => setIsMouseDown(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const fetchVenueDetail = async (id: string) => {
    try {
      const res = await axios.get(`${API}/api/venues/${id}`);
      const v = res.data;
      setSelectedVenue(v);
      
      // If venue has categories, default active category to first one
      if (v.categories && v.categories.length > 0) {
        setActiveCategoryId(v.categories[0].id);
      } else {
        setActiveCategoryId('');
      }

      // Restore existing layout or existing seats
      if (v.layouts && v.layouts.length > 0 && v.layouts[0].layoutJson) {
        const layout = v.layouts[0].layoutJson;
        const r = layout.rows || 8;
        const c = layout.cols || 12;
        setGridRows(r);
        setGridCols(c);
        
        const newMap: Record<string, string> = {};
        if (layout.categoryMap) {
          for (let row = 0; row < r; row++) {
            for (let col = 0; col < c; col++) {
              const seatKey = `${row}_${col}`;
              newMap[seatKey] = layout.categoryMap[seatKey] ?? layout.categoryMap[String(row)] ?? v.categories[0]?.id;
            }
          }
        }
        setSeatMap(newMap);
      } else if (v.seats && v.seats.length > 0) {
        let maxR = 0;
        let maxC = 0;
        const newMap: Record<string, string> = {};
        v.seats.forEach((s: any) => {
          if (s.row > maxR) maxR = s.row;
          if (s.col > maxC) maxC = s.col;
          newMap[`${s.row}_${s.col}`] = s.categoryId;
        });
        setGridRows(maxR + 1);
        setGridCols(maxC + 1);
        setSeatMap(newMap);
      } else {
        // Fresh default grid
        initEmptyGrid(8, 12, v.categories);
      }
    } catch {
      alert('Error loading venue details');
    }
  };

  const initEmptyGrid = (r: number, c: number, categories: any[]) => {
    setGridRows(r);
    setGridCols(c);
    const newMap: Record<string, string> = {};
    const defaultCatId = categories && categories.length > 0 ? categories[0].id : '';
    for (let row = 0; row < r; row++) {
      for (let col = 0; col < c; col++) {
        newMap[`${row}_${col}`] = defaultCatId;
      }
    }
    setSeatMap(newMap);
  };

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingVenue(true);
    try {
      const res = await axios.post(`${API}/api/venues`, { name, address }, authHeader);
      setName(''); setAddress('');
      await fetchVenues();
      fetchVenueDetail(res.data.id);
    } catch { 
      alert('Error creating venue'); 
    } finally {
      setSubmittingVenue(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVenue) return;
    setSubmittingCat(true);
    try {
      const res = await axios.post(`${API}/api/venues/${selectedVenue.id}/categories`, { name: catName, basePrice: parseFloat(catPrice) }, authHeader);
      setCatName(''); setCatPrice('');
      await fetchVenueDetail(selectedVenue.id);
      setActiveCategoryId(res.data.id);
    } catch { 
      alert('Error adding category'); 
    } finally {
      setSubmittingCat(false);
    }
  };

  // Paint a single seat with the active category
  const paintSeat = (r: number, c: number) => {
    if (!activeCategoryId) {
      alert('Please add and select a seat category first to paint seats.');
      return;
    }
    setSeatMap(prev => ({
      ...prev,
      [`${r}_${c}`]: activeCategoryId
    }));
  };

  // Paint an entire row with active category
  const paintRow = (r: number) => {
    if (!activeCategoryId) {
      alert('Please select an active category first.');
      return;
    }
    setSeatMap(prev => {
      const updated = { ...prev };
      for (let c = 0; c < gridCols; c++) {
        updated[`${r}_${c}`] = activeCategoryId;
      }
      return updated;
    });
  };

  // Preset: Auto-split hall from front (top) to back (bottom)
  const handleAutoSplit = () => {
    if (!selectedVenue || selectedVenue.categories.length === 0) {
      alert('Add categories first to auto-split.');
      return;
    }
    const cats = selectedVenue.categories;
    const updated: Record<string, string> = {};
    for (let r = 0; r < gridRows; r++) {
      const catIndex = Math.min(Math.floor((r / gridRows) * cats.length), cats.length - 1);
      const catId = cats[catIndex].id;
      for (let c = 0; c < gridCols; c++) {
        updated[`${r}_${c}`] = catId;
      }
    }
    setSeatMap(updated);
  };

  // Preset: Fill all seats with active category
  const handleFillAll = () => {
    if (!activeCategoryId) return;
    const updated: Record<string, string> = {};
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        updated[`${r}_${c}`] = activeCategoryId;
      }
    }
    setSeatMap(updated);
  };

  // Save confirmed seating configuration
  const handleSaveSeating = async () => {
    if (!selectedVenue || selectedVenue.categories.length === 0) {
      alert('Please create at least one category before saving.');
      return;
    }

    const defaultCatId = selectedVenue.categories[0].id;
    // Build a sanitized full map ensuring every seat in grid has a valid categoryId
    const validatedMap: Record<string, string> = {};
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const key = `${r}_${c}`;
        validatedMap[key] = seatMap[key] || activeCategoryId || defaultCatId;
      }
    }

    setSavingSeating(true);
    try {
      const res = await axios.post(
        `${API}/api/venues/${selectedVenue.id}/seats`, 
        { 
          rows: gridRows, 
          cols: gridCols, 
          categoryMap: validatedMap 
        }, 
        authHeader
      );
      alert(`Success: ${res.data.message || 'Hall seating configured successfully!'}`);
      fetchVenueDetail(selectedVenue.id);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Error saving hall seating');
    } finally {
      setSavingSeating(false);
    }
  };

  const getCategoryTheme = (catId: string) => {
    if (!selectedVenue) return CATEGORY_COLORS[0];
    const index = selectedVenue.categories.findIndex((c: any) => c.id === catId);
    return CATEGORY_COLORS[index >= 0 ? index % CATEGORY_COLORS.length : 0];
  };

  // Calculate live stats
  const totalSeatsCount = gridRows * gridCols;
  const categoryStats = selectedVenue?.categories?.map((cat: any) => {
    const count = Object.values(seatMap).filter(id => id === cat.id).length;
    return {
      ...cat,
      count,
      revenue: count * cat.basePrice
    };
  }) || [];

  const projectedFullRevenue = categoryStats.reduce((sum: number, c: any) => sum + c.revenue, 0);

  if (user?.role !== 'ADMIN') {
    return (
      <div className="glass-panel rounded-3xl p-12 text-center space-y-4 max-w-md mx-auto my-12 border border-white/10">
        <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Administrator Access Required</h2>
        <p className="text-xs text-slate-400">
          Only administrators have access to venue seating blueprints and hall builders.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-4">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Building className="w-8 h-8 text-indigo-400" />
            <span>Interactive Hall & Seating Studio</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Build complete arena blueprints, paint seat tiers (VIP Front, Standard Back), and drag-to-assign seats.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Venue List & Creator (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Add Venue Card */}
          <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10 shadow-lg">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>Create Venue</span>
            </h2>

            <form onSubmit={handleCreateVenue} className="space-y-3">
              <input 
                className="glass-input px-3.5 py-2 rounded-xl text-xs w-full" 
                placeholder="Venue name (e.g. Royal Liquid Opera)" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
              />
              <input 
                className="glass-input px-3.5 py-2 rounded-xl text-xs w-full" 
                placeholder="Address / Location" 
                value={address} 
                onChange={e => setAddress(e.target.value)} 
                required 
              />
              <button 
                className="glass-btn-primary w-full py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer" 
                type="submit"
                disabled={submittingVenue}
              >
                {submittingVenue ? 'Creating...' : '+ Create Venue'}
              </button>
            </form>
          </div>

          {/* Venues Selector List */}
          <div className="glass-panel rounded-3xl p-6 space-y-3 border border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-purple-400" />
                <span>Venues ({venues.length})</span>
              </h3>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {venues.map(v => {
                const isSelected = selectedVenue?.id === v.id;
                return (
                  <div 
                    key={v.id}
                    onClick={() => fetchVenueDetail(v.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected 
                        ? 'bg-indigo-600/25 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3)] ring-1 ring-indigo-400' 
                        : 'bg-slate-900/40 border-white/5 hover:border-white/20 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="space-y-0.5 overflow-hidden">
                      <div className="font-bold text-slate-200 text-xs truncate">{v.name}</div>
                      <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-pink-400 shrink-0" />
                        <span>{v.address}</span>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 ${
                      isSelected ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-400'
                    }`}>
                      {isSelected ? 'Editing' : 'Select'}
                    </span>
                  </div>
                );
              })}

              {venues.length === 0 && (
                <p className="text-slate-500 text-xs text-center py-4">
                  No venues found. Create one above to start designing.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Hall Blueprint Studio (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedVenue ? (
            <div className="space-y-6">
              {/* Studio Header Bar */}
              <div className="glass-panel rounded-3xl p-6 border border-indigo-500/30 flex flex-col md:flex-row justify-between md:items-center gap-4 shadow-lg">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <Settings2 className="w-3.5 h-3.5" />
                    <span>Hall Seating Blueprint Studio</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white">{selectedVenue.name}</h2>
                  <p className="text-xs text-slate-400">{selectedVenue.address}</p>
                </div>

                <div className="flex items-center gap-3 self-start md:self-auto">
                  <button 
                    onClick={handleSaveSeating}
                    disabled={savingSeating}
                    className="glass-btn-emerald px-6 py-2.5 rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-500/25 flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{savingSeating ? 'Saving Blueprint...' : 'Save & Confirm Seating'}</span>
                  </button>
                </div>
              </div>

              {/* 1. Category Palette & Brush Selector */}
              <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div className="text-xs uppercase font-extrabold tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Paintbrush className="w-4 h-4 text-indigo-400" />
                    <span>Step 1: Select Active Category Brush</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Click a tier below, then click & drag over seats on the hall grid to paint them
                  </div>
                </div>

                {/* Category Palette Pills */}
                <div className="flex flex-wrap gap-2.5">
                  {selectedVenue.categories.map((cat: any) => {
                    const theme = getCategoryTheme(cat.id);
                    const isActive = activeCategoryId === cat.id;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategoryId(cat.id)}
                        className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer ${
                          isActive ? theme.activeRing : `${theme.bg} hover:scale-105`
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.hex }}></span>
                        <span>{cat.name}</span>
                        <span className="font-mono text-[11px] opacity-80">₹{cat.basePrice.toFixed(2)}</span>
                        {isActive && <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-mono">ACTIVE BRUSH</span>}
                      </button>
                    );
                  })}

                  {selectedVenue.categories.length === 0 && (
                    <div className="text-xs text-amber-300 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      No categories created yet. Add your first seat category below (e.g. VIP Front ₹100, Standard ₹45).
                    </div>
                  )}
                </div>

                {/* Add Category Inline Form */}
                <form onSubmit={handleAddCategory} className="flex flex-wrap gap-2 pt-2 border-t border-white/10 items-center">
                  <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-indigo-400" /> + Add Tier:
                  </span>
                  <input 
                    className="glass-input px-3 py-1.5 rounded-xl text-xs flex-1 min-w-[140px]" 
                    placeholder="Tier Name (e.g. VIP Front Row)" 
                    value={catName} 
                    onChange={e => setCatName(e.target.value)} 
                    required 
                  />
                  <input 
                    className="glass-input px-3 py-1.5 rounded-xl text-xs w-28 font-mono" 
                    placeholder="Price (₹)" 
                    type="number" 
                    step="0.01" 
                    value={catPrice} 
                    onChange={e => setCatPrice(e.target.value)} 
                    required 
                  />
                  <button 
                    className="glass-btn-primary px-4 py-1.5 rounded-xl text-xs font-bold cursor-pointer" 
                    type="submit"
                    disabled={submittingCat}
                  >
                    {submittingCat ? 'Adding...' : 'Add Tier'}
                  </button>
                </form>
              </div>

              {/* 2. Grid Dimensions & Presets Toolbar */}
              <div className="glass-panel rounded-3xl p-5 space-y-4 border border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Grid Size Inputs */}
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5 text-purple-400" />
                      <span>Hall Grid Size:</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-slate-400">Rows</label>
                      <input 
                        className="glass-input px-2.5 py-1 rounded-lg text-xs w-16 text-center font-mono font-bold" 
                        type="number" 
                        min="1" 
                        max="26" 
                        value={gridRows} 
                        onChange={e => {
                          const val = Math.max(1, Math.min(26, parseInt(e.target.value) || 1));
                          setGridRows(val);
                        }} 
                      />
                    </div>
                    <span className="text-slate-500">✕</span>
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-slate-400">Cols</label>
                      <input 
                        className="glass-input px-2.5 py-1 rounded-lg text-xs w-16 text-center font-mono font-bold" 
                        type="number" 
                        min="1" 
                        max="30" 
                        value={gridCols} 
                        onChange={e => {
                          const val = Math.max(1, Math.min(30, parseInt(e.target.value) || 1));
                          setGridCols(val);
                        }} 
                      />
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAutoSplit}
                      className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
                      title="Automatically split rows from Front (VIP) to Back (Standard)"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Auto-Split Front → Back</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleFillAll}
                      className="px-3 py-1.5 rounded-xl glass-btn-secondary text-xs font-semibold cursor-pointer transition-all"
                    >
                      Fill All with Active Brush
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Visual Hall Canvas with Drag-to-Select Painting */}
              <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10 relative overflow-hidden select-none">
                {/* Stage Lighting / Front Indicator */}
                <div className="flex flex-col items-center">
                  <div className="w-3/4 h-12 stage-beam pointer-events-none" />
                  <div className="w-2/3 py-2 rounded-full bg-gradient-to-r from-indigo-500/30 via-purple-500/40 to-pink-500/30 border border-indigo-400/50 text-center shadow-[0_0_25px_rgba(99,102,241,0.4)]">
                    <span className="text-[11px] uppercase font-extrabold tracking-[0.3em] text-indigo-200">
                      ★ FRONT OF HALL / STAGE ★
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    (Click and hold mouse to drag-paint seats with currently selected brush)
                  </div>
                </div>

                {/* Interactive Seat Matrix */}
                <div 
                  ref={gridContainerRef}
                  className="overflow-x-auto py-4"
                  onMouseLeave={() => setIsMouseDown(false)}
                >
                  <div className="space-y-2 min-w-max mx-auto flex flex-col items-center">
                    {Array.from({ length: gridRows }).map((_, r) => {
                      const rowLetter = String.fromCharCode(65 + r);
                      const isFront = r === 0;
                      const isBack = r === gridRows - 1;

                      return (
                        <div key={r} className="flex items-center gap-2">
                          {/* Row Label + Quick Row Fill Action */}
                          <button
                            type="button"
                            onClick={() => paintRow(r)}
                            title={`Click to fill entire Row ${rowLetter} with active category`}
                            className="w-20 px-2 py-1.5 rounded-xl bg-slate-900/60 border border-white/10 hover:border-indigo-400 hover:bg-indigo-950/40 text-[10px] font-mono font-bold text-slate-300 flex items-center justify-between gap-1 transition-all cursor-pointer"
                          >
                            <span>Row {rowLetter}</span>
                            <span className="text-[9px] text-indigo-400 font-normal">
                              {isFront ? '(Front)' : isBack ? '(Back)' : 'Fill'}
                            </span>
                          </button>

                          {/* Seat Buttons in Row */}
                          <div className="flex gap-1.5">
                            {Array.from({ length: gridCols }).map((_, c) => {
                              const seatKey = `${r}_${c}`;
                              const catId = seatMap[seatKey] || selectedVenue.categories[0]?.id;
                              const theme = getCategoryTheme(catId);
                              const cat = selectedVenue.categories.find((k: any) => k.id === catId);
                              const seatLabel = `${rowLetter}${c + 1}`;

                              return (
                                <button
                                  key={seatKey}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setIsMouseDown(true);
                                    paintSeat(r, c);
                                  }}
                                  onMouseEnter={() => {
                                    if (isMouseDown) {
                                      paintSeat(r, c);
                                    }
                                  }}
                                  title={`Seat ${seatLabel} — ${cat ? `${cat.name} ($${cat.basePrice})` : 'Unassigned'}`}
                                  className={`w-9 h-9 rounded-xl border text-[10px] font-bold font-mono transition-all flex items-center justify-center cursor-pointer select-none ${
                                    theme.seatClass
                                  }`}
                                >
                                  {seatLabel}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Hall Orientation Legend */}
                <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Top = Front Rows (Stage) | Bottom = Back Rows</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Total Seats: <strong className="text-white font-mono">{totalSeatsCount}</strong></span>
                  </div>
                </div>
              </div>

              {/* 4. Live Seating Breakdown & Financial Projections */}
              <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
                <div className="text-xs uppercase font-extrabold tracking-wider text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Grid className="w-4 h-4 text-indigo-400" />
                    <span>Seating Allocation & Full-House Projection</span>
                  </span>
                  <span className="text-emerald-400 font-mono text-sm font-extrabold flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    <span>Max Revenue: ₹{projectedFullRevenue.toFixed(2)}</span>
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {categoryStats.map((cat: any) => {
                    const theme = getCategoryTheme(cat.id);
                    const percent = totalSeatsCount > 0 ? Math.round((cat.count / totalSeatsCount) * 100) : 0;

                    return (
                      <div key={cat.id} className="p-3.5 rounded-2xl bg-slate-900/50 border border-white/5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.hex }}></span>
                            {cat.name}
                          </span>
                          <span className="font-mono text-xs text-indigo-300 font-semibold">₹{cat.basePrice.toFixed(2)}</span>
                        </div>

                        <div className="flex items-baseline justify-between text-xs">
                          <span className="text-slate-400 font-mono">{cat.count} seats ({percent}%)</span>
                          <span className="text-emerald-400 font-mono font-bold">₹{cat.revenue.toFixed(2)}</span>
                        </div>

                        {/* Progress visual */}
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${percent}%`, backgroundColor: theme.hex }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-3xl p-16 text-center space-y-4 border border-white/10 my-6">
              <Sliders className="w-12 h-12 text-slate-500 mx-auto" />
              <h3 className="text-xl font-bold text-slate-200">Select a Venue to Start Designing</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Choose an existing venue from the left column or create a new one to open the interactive hall layout builder.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


