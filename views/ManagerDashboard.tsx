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
        setToast({ message: `📢 ส่งแจ้งเตือน LINE แล้ว ${result.notified_count} งาน!`, type: 'success' });
        await fetchShifts();
      } else if (result.success) {
        setToast({ message: "ไม่มีงานด่วนที่ต้องแจ้งเตือน", type: 'warning' });
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

  const handleSimulateGhost = async (shift: Shift) => {
    if (!confirm(`ยืนยันการทำ NO-SHOW สำหรับ ${shift.role_required}?`)) return;
    try {
        setLoading(true);
        await markShiftAsGhost(shift.id);
        await fetchShifts();
        setToast({ message: "⚠️ บันทึกสถานะ Ghosted แล้ว!", type: 'warning' });
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
      setToast({ message: "ส่งแจ้งเตือนงานด่วนให้พนักงานแล้ว!", type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (e) {
      alert("Error triggering replacement");
    }
  };

  const totalShifts = shifts.length;
  const activeStaff = shifts.filter(s => s.status === ShiftStatus.CHECKED_IN).length;
  const ghostCount = shifts.filter(s => s.status === ShiftStatus.GHOSTED).length;
  const pendingNotificationCount = shifts.filter(s => s.status === ShiftStatus.GHOSTED && !s.is_notified).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-inter relative">
      
      {toast && (
        <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-xl z-50 flex items-center gap-2 animate-bounce whitespace-nowrap ${
            toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'
        }`}>
           {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-400" /> : <Skull className="w-5 h-5 text-white" />}
           <span className="font-bold">{toast.message}</span>
        </div>
      )}

      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black text-indigo-900 flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6 text-indigo-600" />
              ShiftSaver
            </h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Manager Control</p>
          </div>
          <div className="flex items-center gap-3">
             <button 
                onClick={handleBroadcast} 
                disabled={broadcasting}
                className={`flex items-center gap-2 text-[10px] font-bold px-3 py-2 rounded-xl transition-all border ${
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
                {pendingNotificationCount > 0 ? `แจ้งเตือนด่วน (${pendingNotificationCount})` : 'แจ้งเตือนพนักงาน'}
             </button>

             {shifts.length === 0 && !loading && (
                 <button onClick={handleSeed} className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors">
                    <Database className="w-4 h-4" />
                 </button>
             )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
            <span className="text-gray-400 text-[9px] font-bold uppercase tracking-wider mb-1">งานทั้งหมด</span>
            <span className="text-2xl font-black text-gray-900">{totalShifts}</span>
          </div>

          <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
             <div className="flex items-center gap-1 mb-1">
                <span className="text-gray-400 text-[9px] font-bold uppercase tracking-wider">กำลังทำงาน</span>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                </span>
             </div>
            <span className="text-2xl font-black text-green-600">{activeStaff}</span>
          </div>

          <div className={`p-3 rounded-2xl shadow-sm border flex flex-col items-center justify-center text-center transition-all duration-300 ${
            ghostCount > 0 
              ? 'bg-red-600 border-red-700 shadow-red-100 animate-pulse' 
              : 'bg-white border-gray-100'
          }`}>
            <span className={`text-[9px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1 ${ghostCount > 0 ? 'text-red-100' : 'text-gray-400'}`}>
              Ghosted
              {ghostCount > 0 && <AlertTriangle className="w-2.5 h-2.5" />}
            </span>
            <span className={`text-2xl font-black ${ghostCount > 0 ? 'text-white' : 'text-gray-900'}`}>
              {ghostCount}
            </span>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-gray-400" />
            ตารางงานวันนี้
          </h2>

          {loading ? (
             <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <span className="text-gray-400 text-sm">กำลังอัปเดตข้อมูล...</span>
             </div>
          ) : (
            <div className="space-y-3">
              {shifts.map(shift => {
                 let action, label, color;
                 
                 if (shift.status === ShiftStatus.SCHEDULED) {
                     action = handleSimulateGhost;
                     label = "บันทึก No-Show";
                     color = "bg-gray-800 hover:bg-gray-900";
                 } else if (shift.status === ShiftStatus.GHOSTED) {
                     action = handleFindReplacementClick;
                     label = "ประกาศหาพนักงานด่วน";
                     color = "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-100";
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

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="หาพนักงานมาแทนด่วน"
        footer={
          <div className="flex w-full gap-3">
            <button 
              onClick={() => setModalOpen(false)}
              className="flex-1 px-4 py-3 rounded-xl text-gray-700 font-bold hover:bg-gray-100 text-sm"
            >
              ยกเลิก
            </button>
            <button 
              onClick={confirmReplacement}
              className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-100 text-sm"
            >
              ยืนยัน Surge (1.5x)
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="bg-red-50 p-3 rounded-xl border border-red-100 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-red-800 text-sm">พนักงานไม่มาทำงาน!</h4>
              <p className="text-xs text-red-700 mt-1 leading-relaxed">
                การประกาศหาพนักงานด่วนจะส่งแจ้งเตือนไปยังพนักงานทุกคนทันที โดยเพิ่มค่าแรงเป็น 1.5 เท่า
              </p>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
             <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                   <p className="text-gray-400 font-bold uppercase text-[9px] tracking-widest mb-1">ตำแหน่ง</p>
                   <p className="font-bold text-gray-900 truncate">{selectedShift?.role_required}</p>
                </div>
                <div className="text-right">
                   <p className="text-gray-400 font-bold uppercase text-[9px] tracking-widest mb-1">เรทเดิม</p>
                   <p className="font-medium text-gray-400 line-through">฿{selectedShift?.base_pay_rate.toLocaleString()}/ชม.</p>
                </div>
                <div className="col-span-2 border-t border-gray-200 pt-3 mt-1 flex justify-between items-center">
                   <span className="font-black text-gray-900">เรทพิเศษด่วน:</span>
                   <span className="font-black text-red-600 text-xl">
                    ฿{selectedShift ? (selectedShift.base_pay_rate * 1.5).toLocaleString() : '0'}/ชม.
                   </span>
                </div>
             </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};