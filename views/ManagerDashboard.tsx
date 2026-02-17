import React, { useState, useEffect } from 'react';
import { Shift, ShiftStatus } from '../types';
import { getShifts, triggerReplacement, seedDatabase, markShiftAsGhost } from '../services/mockData';
import { notifyGhostsCron } from '../services/notificationService';
import { ShiftCard } from '../components/ShiftCard';
import { Modal } from '../components/Modal';
import { LayoutDashboard, AlertTriangle, Activity, CalendarClock, Database, CheckCircle, Skull, Radio, Megaphone } from 'lucide-react';

export const ManagerDashboard: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);
  
  // Toast State
  const [toast, setToast] = useState<{message: string, type: 'success' | 'warning'} | null>(null);

  const fetchShifts = async () => {
    setLoading(true);
    const data = await getShifts();
    setShifts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const handleSeed = async () => {
    if (confirm("Populate database with demo data?")) {
        setLoading(true);
        await seedDatabase();
        await fetchShifts();
    }
  }

  const handleBroadcast = async () => {
    setBroadcasting(true);
    try {
      const result = await notifyGhostsCron();
      if (result.success && result.notified_count > 0) {
        setToast({ message: `📢 Line Alert Sent for ${result.notified_count} shifts!`, type: 'success' });
        await fetchShifts();
      } else if (result.success) {
        setToast({ message: "No new ghosts to notify.", type: 'warning' });
      } else {
        alert("Broadcast failed: " + result.error);
      }
    } catch (e) {
      console.error(e);
      alert("Error executing broadcast.");
    } finally {
      setBroadcasting(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleFindReplacementClick = (shift: Shift) => {
    setSelectedShift(shift);
    setModalOpen(true);
  };

  // --- New Logic: Simulate Ghosting ---
  const handleSimulateGhost = async (shift: Shift) => {
    if (!confirm(`Mark ${shift.role_required} as NO-SHOW (Ghosted)?`)) return;
    try {
        setLoading(true);
        await markShiftAsGhost(shift.id);
        await fetchShifts();
        setToast({ message: "⚠️ Shift marked as GHOSTED!", type: 'warning' });
        setTimeout(() => setToast(null), 3000);
    } catch (e) {
        alert("Error updating shift.");
    } finally {
        setLoading(false);
    }
  };

  const confirmReplacement = async () => {
    if (!selectedShift) return;
    try {
      await triggerReplacement(selectedShift.id);
      await fetchShifts();
      setModalOpen(false);
      setSelectedShift(null);
      
      // Show Success Toast
      setToast({ message: "Broadcast sent to staff!", type: 'success' });
      setTimeout(() => setToast(null), 3000);
      
    } catch (e) {
      alert("Error triggering replacement");
    }
  };

  // Stats Calculations
  const totalShifts = shifts.length;
  const activeStaff = shifts.filter(s => s.status === ShiftStatus.CHECKED_IN).length;
  const ghostCount = shifts.filter(s => s.status === ShiftStatus.GHOSTED).length;
  const pendingNotificationCount = shifts.filter(s => s.status === ShiftStatus.GHOSTED && !s.is_notified).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-inter relative">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-xl z-50 flex items-center gap-2 animate-bounce ${
            toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'
        }`}>
           {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-400" /> : <Skull className="w-5 h-5 text-white" />}
           <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* 1. Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6 text-indigo-600" />
              ShiftSaver Manager
            </h1>
            <p className="text-xs text-gray-500 font-medium mt-0.5 flex items-center gap-1">
              <CalendarClock className="w-3 h-3" />
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
             
             {/* Broadcast Button */}
             <button 
                onClick={handleBroadcast} 
                disabled={broadcasting}
                className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg transition-colors border ${
                  pendingNotificationCount > 0 
                  ? 'bg-red-600 text-white border-red-700 hover:bg-red-700 animate-pulse' 
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
             >
                {broadcasting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Megaphone className="w-4 h-4" />
                )}
                {pendingNotificationCount > 0 ? `Alert Staff (${pendingNotificationCount})` : 'Broadcast Alerts'}
             </button>

             {/* Seed Button for Empty DB */}
             {shifts.length === 0 && !loading && (
                 <button onClick={handleSeed} className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors">
                    <Database className="w-4 h-4" />
                    Seed Data
                 </button>
             )}
             <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
                M
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        
        {/* 2. Stats Cards (Top Row) */}
        <div className="grid grid-cols-3 gap-4">
          {/* Total Shifts */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center text-center">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Shifts</span>
            <span className="text-3xl font-bold text-gray-900">{totalShifts}</span>
          </div>

          {/* Active Staff */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center text-center">
             <div className="flex items-center gap-1 mb-1">
                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Active Staff</span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
             </div>
            <span className="text-3xl font-bold text-green-600">{activeStaff}</span>
          </div>

          {/* Ghost Alerts */}
          <div className={`p-4 rounded-xl shadow-sm border flex flex-col items-center justify-center text-center transition-all duration-300 ${
            ghostCount > 0 
              ? 'bg-red-600 border-red-700 shadow-red-200 animate-pulse' 
              : 'bg-white border-gray-200'
          }`}>
            <span className={`text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1 ${ghostCount > 0 ? 'text-red-100' : 'text-gray-400'}`}>
              Ghost Alerts
              {ghostCount > 0 && <AlertTriangle className="w-3 h-3" />}
            </span>
            <span className={`text-3xl font-bold ${ghostCount > 0 ? 'text-white' : 'text-gray-900'}`}>
              {ghostCount}
            </span>
          </div>
        </div>

        {/* 3. Main Content: List of shifts */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-gray-500" />
            Today's Schedule
          </h2>

          {loading ? (
             <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <span className="text-gray-400 text-sm">Syncing roster...</span>
             </div>
          ) : shifts.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
              <p>No shifts scheduled for today.</p>
              <p className="text-xs mt-2">Click "Seed Data" in header to generate test shifts.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {shifts.map(shift => {
                 let action, label, color;
                 
                 // Logic for Buttons based on Status
                 if (shift.status === ShiftStatus.SCHEDULED) {
                     action = handleSimulateGhost;
                     label = "Simulate No-Show";
                     color = "bg-gray-800 hover:bg-gray-900";
                 } else if (shift.status === ShiftStatus.GHOSTED) {
                     action = handleFindReplacementClick;
                     label = "Find Replacement";
                     color = "bg-red-600 hover:bg-red-700 shadow-md shadow-red-200 hover:shadow-lg transition-all";
                 }

                 return (
                    <ShiftCard 
                      key={shift.id} 
                      shift={shift} 
                      isManager={true}
                      onAction={action}
                      actionLabel={label}
                      actionColor={color}
                    />
                 );
              })}
            </div>
          )}
        </div>
      </main>

      {/* 4. Action Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Find Replacement Staff"
        footer={
          <>
            <button 
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-lg text-gray-700 font-medium hover:bg-gray-100"
            >
              Cancel
            </button>
            <button 
              onClick={confirmReplacement}
              className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-200"
            >
              Confirm Surge Pay (1.5x)
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-red-800">Staff Ghosted!</h4>
              <p className="text-sm text-red-700 mt-1">
                This shift is currently unmanned. Opening it for bidding will notify all available staff immediately.
              </p>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="text-gray-500">Role Required:</span>
              <span className="font-semibold text-gray-900">{selectedShift?.role_required}</span>
            </div>
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="text-gray-500">Base Rate:</span>
              <span className="font-medium text-gray-600 line-through">${selectedShift?.base_pay_rate.toFixed(2)}/hr</span>
            </div>
            <div className="flex justify-between items-center text-lg mt-2 pt-2 border-t border-gray-200">
              <span className="font-bold text-gray-900">New Surge Rate:</span>
              <span className="font-bold text-red-600">
                ${selectedShift ? (selectedShift.base_pay_rate * 1.5).toFixed(2) : '0.00'}/hr
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};