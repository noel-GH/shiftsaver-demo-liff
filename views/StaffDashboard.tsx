import React, { useState, useEffect } from 'react';
import { Shift, ShiftStatus, User } from '../types';
import { getShifts, acceptShift } from '../services/mockData';
import { Briefcase, MapPin, Flame, CalendarCheck, Clock, DollarSign, ChevronRight, Navigation, CheckCircle, XCircle } from 'lucide-react';

interface StaffDashboardProps {
  currentUser: User;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ currentUser }) => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'SCHEDULE' | 'EXTRA_CASH'>('SCHEDULE');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const fetchShifts = async () => {
    setLoading(true);
    const data = await getShifts();
    setShifts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchShifts();
  }, [currentUser]);

  const handleAccept = async (shift: Shift) => {
    if (!confirm(`Accept this ${shift.role_required} shift for $${shift.current_pay_rate}/hr?`)) return;
    
    try {
      // ---------------------------------------------------------
      // Using RPC for secure shift acceptance
      // ---------------------------------------------------------
      const result = await acceptShift(shift.id, currentUser.line_user_id);
      
      if (result.success) {
        setToast({ message: "✅ " + (result.message || "You got the job!"), type: 'success' });
        await fetchShifts();
        // Give user a moment to see the success message before switching tabs
        setTimeout(() => {
             setActiveTab('SCHEDULE');
             setToast(null);
        }, 1500);
      } else {
        // Show specific error message from the database (e.g., "Too late!")
        setToast({ message: "❌ " + (result.message || "Failed to accept shift."), type: 'error' });
        await fetchShifts(); // Refresh to remove the card if it's already filled
        setTimeout(() => setToast(null), 3000);
      }
    } catch (e) {
      setToast({ message: "Error processing request. Please check connection.", type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleCheckIn = (shift: Shift) => {
    alert(`Checked in to ${shift.location_name} at ${new Date().toLocaleTimeString()}!`);
    // In real app: Update status to 'checked_in' and log GPS
  };

  // --- Filtering Logic ---
  const myShifts = shifts
    .filter(s => s.user_id === currentUser.id && s.status !== ShiftStatus.CANCELLED)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  // Show both Bidding and Ghosted shifts as opportunities per requirements
  const hotShifts = shifts
    .filter(s => s.status === ShiftStatus.BIDDING || s.status === ShiftStatus.GHOSTED);

  // Helper to check if a shift is "Today"
  const isToday = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // Helper for formatting
  const formatTimeRange = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.getHours()}:${s.getMinutes().toString().padStart(2, '0')} - ${e.getHours()}:${e.getMinutes().toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <div className="min-h-screen bg-gray-100 font-inter pb-24 relative">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-50 font-bold flex items-center gap-2 animate-bounce transition-all ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
           {toast.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <XCircle className="w-5 h-5"/>}
           {toast.message}
        </div>
      )}

      {/* 1. Mobile Header */}
      <div className="bg-white px-5 pt-12 pb-4 shadow-sm sticky top-0 z-20">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Hi, {currentUser.display_name.split(' ')[0]}</h1>
            <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Reliability Score: {currentUser.reliability_score}%
            </p>
          </div>
          <img 
            src={currentUser.avatar_url || "https://picsum.photos/100"} 
            alt="Profile" 
            className="w-10 h-10 rounded-full border border-gray-200" 
          />
        </div>
      </div>

      <main className="px-4 py-4 space-y-4">
        
        {/* --- TAB 1: MY SCHEDULE --- */}
        {activeTab === 'SCHEDULE' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            {loading ? (
               <div className="p-8 text-center text-gray-400">Loading schedule...</div>
            ) : myShifts.length === 0 ? (
               <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
                 <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CalendarCheck className="w-8 h-8 text-gray-300" />
                 </div>
                 <h3 className="font-bold text-gray-900">No Upcoming Shifts</h3>
                 <p className="text-gray-500 text-sm mt-1">Check the extra cash tab to pick up work!</p>
               </div>
            ) : (
              myShifts.map((shift, idx) => {
                const today = isToday(shift.start_time);
                return (
                  <div key={shift.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative overflow-hidden">
                    {/* Date Strip */}
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500"></div>
                    
                    <div className="flex justify-between items-start mb-3 pl-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-wide">
                            {formatDate(shift.start_time)}
                          </span>
                          {shift.status === ShiftStatus.CHECKED_IN && (
                             <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md uppercase tracking-wide flex items-center gap-1">
                               <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> Active
                             </span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{shift.role_required}</h3>
                        <p className="text-sm text-gray-500">{shift.location_name}</p>
                      </div>
                      <div className="text-right">
                         <div className="text-lg font-bold text-gray-900">{formatTimeRange(shift.start_time, shift.end_time)}</div>
                         <div className="text-xs text-gray-400 font-medium">Shift ID: #{shift.id.slice(0,4)}</div>
                      </div>
                    </div>

                    {/* Check In Action (Only if Today and Scheduled) */}
                    {today && shift.status === ShiftStatus.SCHEDULED && (
                      <button 
                        onClick={() => handleCheckIn(shift)}
                        className="w-full mt-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                      >
                        <Navigation className="w-5 h-5 fill-current" />
                        CHECK IN NOW
                      </button>
                    )}
                    
                    {/* Already Checked In */}
                    {shift.status === ShiftStatus.CHECKED_IN && (
                       <div className="mt-3 bg-green-50 border border-green-100 text-green-700 py-2 rounded-xl text-center font-medium text-sm flex items-center justify-center gap-2">
                          <Clock className="w-4 h-4" />
                          On the clock
                       </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* --- TAB 2: GRAB EXTRA CASH --- */}
        {activeTab === 'EXTRA_CASH' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
             
             {/* Header Banner */}
             <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-2 -mr-2 opacity-20">
                   <Flame className="w-24 h-24" />
                </div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                   <Flame className="w-5 h-5 fill-yellow-300 text-yellow-300 animate-pulse" />
                   Surge Pricing Active!
                </h2>
                <p className="text-orange-100 text-sm mt-1 max-w-[80%]">
                   Pick up these high-priority shifts to earn bonus rates. First come, first served.
                </p>
             </div>

             {loading ? (
                <div className="p-8 text-center text-gray-400">Finding opportunities...</div>
             ) : hotShifts.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                   <div className="bg-gray-200 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Briefcase className="w-8 h-8 text-gray-400" />
                   </div>
                   <p>No extra shifts available right now.</p>
                </div>
             ) : (
                hotShifts.map(shift => {
                  const isSurge = shift.current_pay_rate > shift.base_pay_rate;
                  const multiplier = (shift.current_pay_rate / shift.base_pay_rate).toFixed(1);
                  
                  return (
                    <div key={shift.id} className="bg-white rounded-2xl p-1 shadow-md border border-orange-100 relative transform transition-all active:scale-[0.99]">
                      <div className="bg-gradient-to-br from-white to-orange-50 p-4 rounded-xl">
                        
                        {/* Hot Badge */}
                        <div className="flex justify-between items-start mb-2">
                           <div className="flex items-center gap-1.5 bg-red-100 text-red-700 px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                              <Flame className="w-3 h-3 fill-red-600" />
                              Hot Shift
                           </div>
                           <div className="text-xs font-bold text-gray-400">{formatDate(shift.start_time)}</div>
                        </div>

                        {/* Role & Pay */}
                        <div className="flex justify-between items-end mb-4">
                           <div>
                              <h3 className="text-xl font-bold text-gray-900">{shift.role_required}</h3>
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                 <Clock className="w-3 h-3" />
                                 {formatTimeRange(shift.start_time, shift.end_time)}
                              </div>
                           </div>
                           <div className="text-right">
                              {isSurge && (
                                 <div className="text-xs text-gray-400 line-through mb-0.5">
                                    ${shift.base_pay_rate.toFixed(2)}/hr
                                 </div>
                              )}
                              <div className="flex items-center gap-1 text-red-600 font-bold text-xl">
                                 <span>${shift.current_pay_rate.toFixed(2)}</span>
                                 <span className="text-xs text-red-500 font-normal">/hr</span>
                              </div>
                              {isSurge && (
                                 <div className="text-[10px] font-bold bg-red-600 text-white px-1.5 rounded inline-block">
                                    {multiplier}x RATE
                                 </div>
                              )}
                           </div>
                        </div>

                        {/* Action Button */}
                        <button 
                           onClick={() => handleAccept(shift)}
                           className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-orange-200 flex items-center justify-center gap-2 active:opacity-90"
                        >
                           ACCEPT NOW
                           <ChevronRight className="w-5 h-5" />
                        </button>
                        
                        <div className="text-center text-[10px] text-gray-400 mt-2 font-medium">
                           {shift.location_name} • Instant Confirmation
                        </div>

                      </div>
                    </div>
                  );
                })
             )}
          </div>
        )}
      </main>

      {/* --- BOTTOM NAVIGATION --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 pb-6 flex justify-around items-center z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => setActiveTab('SCHEDULE')}
          className={`flex flex-col items-center gap-1 transition-colors duration-200 ${activeTab === 'SCHEDULE' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <div className={`p-1.5 rounded-full ${activeTab === 'SCHEDULE' ? 'bg-blue-50' : ''}`}>
             <CalendarCheck className={`w-6 h-6 ${activeTab === 'SCHEDULE' ? 'fill-blue-100' : ''}`} />
          </div>
          <span className="text-[10px] font-bold tracking-wide">My Shifts</span>
        </button>

        <div className="w-px h-8 bg-gray-100"></div>

        <button 
          onClick={() => setActiveTab('EXTRA_CASH')}
          className={`flex flex-col items-center gap-1 transition-colors duration-200 ${activeTab === 'EXTRA_CASH' ? 'text-orange-600' : 'text-gray-400'}`}
        >
          <div className={`p-1.5 rounded-full ${activeTab === 'EXTRA_CASH' ? 'bg-orange-50' : ''}`}>
             <DollarSign className={`w-6 h-6 ${activeTab === 'EXTRA_CASH' ? 'fill-orange-100' : ''}`} />
          </div>
          <span className="text-[10px] font-bold tracking-wide">Extra Cash</span>
        </button>
      </div>
    </div>
  );
};