/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  format, 
  addDays, 
  startOfToday, 
  isWithinInterval, 
  eachDayOfInterval, 
  isSameDay,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  getDay,
  isToday,
  differenceInDays
} from 'date-fns';
import { 
  LayoutGrid, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Info,
  Monitor,
  ArrowRight,
  Filter,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// --- Types ---

interface Ad {
  id: string;
  title: string;
  client: string;
  startDate: Date;
  endDate: Date;
  color: string;
  revenue: number;
}

interface DisplaySlot {
  liftId: string;
  liftName: string;
  displayId: number;
  ads: Ad[];
}

// --- Mock Data Generation ---

const COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-cyan-500',
  'bg-orange-500'
];

const CLIENTS = ['Pepsi', 'Nike', 'Local Grocery', 'Gym X', 'Real Estate Co', 'Pizza Hut', 'Dental Care', 'Auto Wash'];

const generateMockAds = (liftId: string, displayId: number): Ad[] => {
  const ads: Ad[] = [];
  const today = startOfToday();
  
  // Current Ad
  if (Math.random() > 0.3) {
    ads.push({
      id: `current-${liftId}-${displayId}`,
      title: `${CLIENTS[Math.floor(Math.random() * CLIENTS.length)]} Campaign`,
      client: CLIENTS[Math.floor(Math.random() * CLIENTS.length)],
      startDate: addDays(today, -Math.floor(Math.random() * 5)),
      endDate: addDays(today, Math.floor(Math.random() * 7) + 2),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      revenue: Math.floor(Math.random() * 5000) + 1000
    });
  }

  // Future Ad
  if (Math.random() > 0.5) {
    const lastEnd = ads.length > 0 ? ads[0].endDate : today;
    const start = addDays(lastEnd, Math.floor(Math.random() * 5) + 1);
    ads.push({
      id: `future-${liftId}-${displayId}`,
      title: `${CLIENTS[Math.floor(Math.random() * CLIENTS.length)]} Seasonal`,
      client: CLIENTS[Math.floor(Math.random() * CLIENTS.length)],
      startDate: start,
      endDate: addDays(start, Math.floor(Math.random() * 10) + 5),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      revenue: Math.floor(Math.random() * 8000) + 2000
    });
  }

  return ads;
};

const generateLiftNames = () => {
  const names: string[] = [];
  // Tower 1 & 2: 4 lifts each
  [1, 2].forEach(t => {
    for (let i = 1; i <= 4; i++) names.push(`Tower ${t} - L${i}`);
  });
  // Tower 3 to 11: 3 lifts each
  for (let t = 3; t <= 11; t++) {
    for (let i = 1; i <= 3; i++) names.push(`Tower ${t} - L${i}`);
  }
  // Club: 2 lifts
  for (let i = 1; i <= 2; i++) names.push(`Club - L${i}`);
  return names;
};

const INITIAL_LIFT_NAMES = generateLiftNames();
const DISPLAYS_PER_LIFT = 3;

const INITIAL_MOCK_DATA: DisplaySlot[] = INITIAL_LIFT_NAMES.flatMap((name, lIdx) => 
  Array.from({ length: DISPLAYS_PER_LIFT }).map((_, dIdx) => ({
    liftId: `L${lIdx + 1}`,
    liftName: name,
    displayId: dIdx + 1,
    ads: generateMockAds(`L${lIdx + 1}`, dIdx + 1)
  }))
);

// --- Components ---

const Badge = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", className)}>
    {children}
  </span>
);

export default function App() {
  const [view, setView] = useState<'grid' | 'calendar'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLift, setSelectedLift] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(startOfToday());
  const [hoveredAd, setHoveredAd] = useState<Ad | null>(null);
  const [data, setData] = useState<DisplaySlot[]>(INITIAL_MOCK_DATA);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);

  const days = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => addDays(currentDate, i));
  }, [currentDate]);

  const filteredData = useMemo(() => {
    return data.filter(slot => {
      const matchesSearch = searchQuery === '' || 
        slot.liftName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        slot.ads.some(ad => ad.client.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesLift = selectedLift === null || slot.liftId === selectedLift;
      return matchesSearch && matchesLift;
    });
  }, [searchQuery, selectedLift, data]);

  const totalRevenue = useMemo(() => {
    return data.reduce((acc, slot) => {
      return acc + slot.ads.reduce((adAcc, ad) => adAcc + ad.revenue, 0);
    }, 0);
  }, [data]);

  const activeAdsCount = useMemo(() => {
    const today = startOfToday();
    return data.reduce((acc, slot) => {
      return acc + slot.ads.filter(ad => isWithinInterval(today, { start: ad.startDate, end: ad.endDate })).length;
    }, 0);
  }, [data]);

  const getAdForDay = (ads: Ad[], day: Date) => {
    return ads.find(ad => isWithinInterval(day, { start: ad.startDate, end: ad.endDate }));
  };

  const updateAdRevenue = (adId: string, newRevenue: number) => {
    setData(prevData => prevData.map(slot => ({
      ...slot,
      ads: slot.ads.map(ad => ad.id === adId ? { ...ad, revenue: newRevenue } : ad)
    })));
    if (editingAd?.id === adId) {
      setEditingAd(prev => prev ? { ...prev, revenue: newRevenue } : null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <Monitor size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Divino Lift Management System</h1>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Society Management System</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
          <button 
            onClick={() => setView('grid')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all",
              view === 'grid' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <LayoutGrid size={16} /> Grid View
          </button>
          <button 
            onClick={() => setView('calendar')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all",
              view === 'calendar' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <CalendarIcon size={16} /> Calendar
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search tower, lift or client..."
              className="pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all w-full md:w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
            <Filter size={20} />
          </button>
        </div>
      </header>

      <main className="p-6 max-w-[1600px] mx-auto">
        {/* Stats / Legend */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <Monitor size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">Total Displays</p>
              <p className="text-2xl font-black">{INITIAL_LIFT_NAMES.length * DISPLAYS_PER_LIFT}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <ArrowRight size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">Active Ads</p>
              <p className="text-2xl font-black">{activeAdsCount}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center text-violet-600">
              <span className="text-xl font-black">₹</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">Total Revenue</p>
              <p className="text-2xl font-black">₹{totalRevenue.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-4 mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Booked</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Available</span>
              </div>
            </div>
            <button className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline">
              <Download size={12} /> Export Schedule
            </button>
          </div>
        </div>

        {view === 'grid' ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
            {/* Grid Controls */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-4">
                <h2 className="font-bold text-gray-700">Timeline View</h2>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                    className="p-1.5 hover:bg-white rounded-md border border-transparent hover:border-gray-200 transition-all"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm font-bold min-w-[120px] text-center">
                    {format(currentDate, 'MMMM yyyy')}
                  </span>
                  <button 
                    onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                    className="p-1.5 hover:bg-white rounded-md border border-transparent hover:border-gray-200 transition-all"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              <div className="text-xs text-gray-400 font-medium italic flex items-center gap-1">
                <Info size={14} /> Click on an ad to edit revenue
              </div>
            </div>

            {/* The Grid */}
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full border-collapse table-fixed">
                <thead>
                  <tr className="bg-white">
                    <th className="sticky left-0 z-30 bg-white border-b border-r border-gray-200 p-4 text-left w-[200px] shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)]">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lift & Display</div>
                    </th>
                    {days.map(day => (
                      <th key={day.toISOString()} className={cn(
                        "border-b border-gray-100 p-3 text-center min-w-[60px]",
                        isToday(day) && "bg-blue-50/50"
                      )}>
                        <div className="text-[10px] font-black text-gray-400 uppercase">{format(day, 'EEE')}</div>
                        <div className={cn(
                          "text-sm font-bold mt-1 w-8 h-8 mx-auto flex items-center justify-center rounded-full",
                          isToday(day) ? "bg-blue-600 text-white" : "text-gray-700"
                        )}>
                          {format(day, 'd')}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((slot, idx) => (
                    <tr key={`${slot.liftId}-${slot.displayId}`} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="sticky left-0 z-20 bg-white border-b border-r border-gray-200 p-4 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-[10px] group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors text-center p-1 leading-tight">
                            {slot.liftName.split(' - ')[1]}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-800">{slot.liftName}</div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase">Display {slot.displayId}</div>
                          </div>
                        </div>
                      </td>
                      {days.map(day => {
                        const ad = getAdForDay(slot.ads, day);
                        const isStart = ad && isSameDay(day, ad.startDate);
                        
                        return (
                          <td 
                            key={day.toISOString()} 
                            className={cn(
                              "border-b border-gray-100 p-1 relative h-16",
                              isToday(day) && "bg-blue-50/20"
                            )}
                          >
                            {ad ? (
                              <div 
                                className={cn(
                                  "absolute inset-y-2 left-0 right-0 rounded-md shadow-sm cursor-pointer transition-all hover:scale-[1.02] hover:z-10",
                                  ad.color,
                                  !isStart && "rounded-l-none border-l-transparent"
                                )}
                                onMouseEnter={() => setHoveredAd(ad)}
                                onMouseLeave={() => setHoveredAd(null)}
                                onClick={() => setEditingAd(ad)}
                              >
                                {isStart && (
                                  <div className="px-2 py-1 overflow-hidden">
                                    <div className="text-[9px] font-black text-white/90 uppercase truncate leading-tight">
                                      {ad.client}
                                    </div>
                                    <div className="text-[8px] font-bold text-white/70 truncate">
                                      ₹{ad.revenue.toLocaleString()}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all">
                                  +
                                </button>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                  <CalendarIcon size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-800">Monthly View</h2>
                  <p className="text-sm text-gray-500 font-medium">Select a lift and display to see detailed monthly schedule</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <select 
                  className="bg-gray-100 border-none rounded-lg px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500"
                  value={selectedLift || ''}
                  onChange={(e) => setSelectedLift(e.target.value || null)}
                >
                  <option value="">All Lifts</option>
                  {INITIAL_LIFT_NAMES.map((name, i) => (
                    <option key={i} value={`L${i + 1}`}>{name}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                  <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-white rounded-md transition-all"><ChevronLeft size={16} /></button>
                  <span className="px-4 text-sm font-black uppercase tracking-widest">{format(currentDate, 'MMMM yyyy')}</span>
                  <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white rounded-md transition-all"><ChevronRight size={16} /></button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="bg-gray-50 p-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {day}
                </div>
              ))}
              {Array.from({ length: getDay(startOfMonth(currentDate)) }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-gray-50/50 h-32"></div>
              ))}
              {eachDayOfInterval({ 
                start: startOfMonth(currentDate), 
                end: endOfMonth(currentDate) 
              }).map(day => {
                const ads = data
                  .filter(s => !selectedLift || s.liftId === selectedLift)
                  .flatMap(s => s.ads)
                  .filter(ad => isWithinInterval(day, { start: ad.startDate, end: ad.endDate }));

                return (
                  <div key={day.toISOString()} className={cn(
                    "bg-white h-32 p-3 border-t border-gray-100 transition-colors hover:bg-gray-50/50 group",
                    isToday(day) && "bg-blue-50/30"
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn(
                        "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full",
                        isToday(day) ? "bg-blue-600 text-white" : "text-gray-700"
                      )}>
                        {format(day, 'd')}
                      </span>
                      {ads.length > 0 && (
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase">
                          {ads.length} Ads
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 overflow-y-auto max-h-[70px] custom-scrollbar-mini">
                      {ads.slice(0, 3).map(ad => (
                        <div 
                          key={ad.id} 
                          className={cn("text-[9px] font-bold text-white px-2 py-1 rounded-md truncate cursor-pointer hover:opacity-80", ad.color)}
                          onClick={() => setEditingAd(ad)}
                        >
                          {ad.client} (₹{ad.revenue})
                        </div>
                      ))}
                      {ads.length > 3 && (
                        <div className="text-[8px] font-bold text-gray-400 text-center uppercase">
                          + {ads.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Ad Detail Tooltip */}
      <AnimatePresence>
        {hoveredAd && !editingAd && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-white border border-gray-200 rounded-2xl shadow-2xl p-6 flex items-center gap-6 min-w-[400px]"
          >
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg", hoveredAd.color)}>
              <Monitor size={32} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-black text-gray-800">{hoveredAd.client}</h3>
                <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
              </div>
              <p className="text-sm text-gray-500 font-medium mb-3">{hoveredAd.title}</p>
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-gray-400 uppercase">Revenue</span>
                  <span className="text-xs font-bold text-blue-600">₹{hoveredAd.revenue.toLocaleString()}</span>
                </div>
                <div className="w-px h-8 bg-gray-100"></div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-gray-400 uppercase">Remaining</span>
                  <span className="text-xs font-bold text-gray-700">{differenceInDays(hoveredAd.endDate, startOfToday())} Days</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Revenue Modal */}
      <AnimatePresence>
        {editingAd && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setEditingAd(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className={cn("h-24 flex items-end p-6", editingAd.color)}>
                <h3 className="text-2xl font-black text-white">{editingAd.client}</h3>
              </div>
              <div className="p-8">
                <div className="mb-6">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Campaign Title</label>
                  <p className="text-sm font-bold text-gray-700">{editingAd.title}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Start Date</label>
                    <p className="text-xs font-bold">{format(editingAd.startDate, 'PPP')}</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">End Date</label>
                    <p className="text-xs font-bold">{format(editingAd.endDate, 'PPP')}</p>
                  </div>
                </div>

                <div className="mb-8 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">Revenue Received (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 font-black">₹</span>
                    <input 
                      type="number" 
                      className="w-full bg-white border-none rounded-xl pl-10 pr-4 py-3 text-lg font-black text-blue-600 focus:ring-2 focus:ring-blue-500 shadow-sm"
                      value={editingAd.revenue}
                      onChange={(e) => updateAdRevenue(editingAd.id, parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <button 
                  onClick={() => setEditingAd(null)}
                  className="w-full bg-[#1A1A1A] text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg"
                >
                  Save & Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .custom-scrollbar-mini::-webkit-scrollbar {
          width: 2px;
        }
        .custom-scrollbar-mini::-webkit-scrollbar-thumb {
          background: #e2e8f0;
        }
      `}</style>
    </div>
  );
}
