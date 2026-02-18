import React, { useState, useEffect } from 'react';
import { Shift, ShiftStatus, User } from '../types';
import { getShifts } from '../services/mockData';
import { supabase } from '../services/supabaseClient';
import { Modal } from '../components/Modal';
import { Briefcase, MapPin, Flame, CalendarCheck, Clock, DollarSign, ChevronRight, Navigation, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

interface StaffDashboardProps {
  currentUser: User;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ currentUser }) => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'SCHEDULE' | 'EXTRA_CASH'>('SCHEDULE');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  // Modal states for acceptance
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [selectedShiftForAccept, setSelectedShiftForAccept] = useState<Shift | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchShifts = async () => {
    setLoading(true);
    const data = await getShifts();
    setShifts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchShifts();
  }, [currentUser]);

  const handleAcceptClick = (shift: Shift) => {
    setSelectedShiftForAccept(shift);
    setAcceptModalOpen(true);
  };

  const handleConfirmAccept = async () => {
    if (!selectedShiftForAccept) return;
    
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('handle-accept-shift', {
        body: { 
          shift_id: selectedShiftForAccept.id, 
          line_user_id: currentUser.line_user_id 
        }
      });

      if (error) {
        setToast({ message: "❌ การเชื่อมต่อผิดพลาด", type: 'error' });
      } else if (data.success) {
        setToast({ message: "✅ " + data.message, type: 'success' });
        await fetchShifts();
        setAcceptModalOpen(false);
        
        setTimeout(() => {
             setActiveTab('SCHEDULE');
             setToast(null);
        }, 1500);
      } else {
        setToast({ message: "❌ " + data.message, type: 'error' });
        setAcceptModalOpen(false);
        await fetchShifts();
        setTimeout(() => setToast(null), 3000);
      }
    } catch (e) {
      setToast({ message: "❌ ระบบขัดข้อง", type: 'error' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckIn = (shift: Shift) => {
    alert(`เช็คอินเข้างานที่ ${shift.location_name} เรียบร้อย!`);
  };

  const myShifts = shifts
    .filter(s => s.user_id === currentUser.id && s.status !== ShiftStatus.CANCELLED)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const hotShifts = shifts
    .filter(s => s.status === ShiftStatus.BIDDING || s.status === ShiftStatus.GHOSTED);

  const isToday = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const formatTimeRange = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.getHours()}:${s.getMinutes().toString().padStart(2, '0')} - ${e.getHours()}:${e.getMinutes().toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <div className="min-h-screen bg-gray-100 font-inter pb-24 relative">
      
      {toast && (
        <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-50 font-bold flex items-center gap-2 animate-bounce transition-all whitespace-nowrap ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
           {toast.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <XCircle className="w-5 h-5"/>}
           {toast.message}
        </div>
      )}

      <div className="bg-white px-5 pt-12 pb-4 shadow-sm sticky top-0 z-20">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">สวัสดี, {currentUser.display_name.split(' ')[0]}</h1>
            <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Reliability: {currentUser.reliability_score}%
            </p>
          </div>
          <img 
            src={currentUser.avatar_url || "https://picsum.photos/100"} 
            alt="Profile" 
            className="w-10 h-10 rounded-full border border-gray-200 shadow-sm" 
          />
        </div>
      </div>

      <main className="px-4 py-4 space-y-4">
        
        {activeTab === 'SCHEDULE' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            {loading ? (
               <div className="p-8 text-center text-gray-400">กำลังโหลดตารางงาน...</div>
            ) : myShifts.length === 0 ? (
               <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
                 <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CalendarCheck className="w-8 h-8 text-gray-300" />
                 </div>
                 <h3 className="font-bold text-gray-900">ยังไม่มีงานเร็วๆ นี้</h3>
                 <p className="text-gray-500 text-sm mt-1">กดที่เมนู 'รับงานเพิ่ม' เพื่อหารายได้พิเศษ!</p>
               </div>
            ) : (
              myShifts.map((shift) => {
                const today = isToday(shift.start_time);
                return (
                  <div key={shift.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500"></div>
                    
                    <div className="flex justify-between items-start mb-3 pl-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-wide">
                            {formatDate(shift.start_time)}
                          </span>
                          {shift.status === ShiftStatus.CHECKED_IN && (
                             <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md uppercase tracking-wide flex items-center gap-1">
                               <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></div> กำลังทำงาน
                             </span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 leading-tight break-words">{shift.role_required}</h3>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{shift.location_name}</p>
                      </div>
                      <div className="text-right shrink-0">
                         <div className="text-lg font-bold text-gray-900">{formatTimeRange(shift.start_time, shift.end_time)}</div>
                         <div className="text-[10px] text-gray-400 font-medium">#{shift.id.slice(0,4)}</div>
                      </div>
                    </div>

                    {today && shift.status === ShiftStatus.SCHEDULED && (
                      <button 
                        onClick={() => handleCheckIn(shift)}
                        className="w-full mt-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                      >
                        <Navigation className="w-5 h-5 fill-current" />
                        CHECK IN
                      </button>
                    )}
                    
                    {shift.status === ShiftStatus.CHECKED_IN && (
                       <div className="mt-3 bg-green-50 border border-green-100 text-green-700 py-2.5 rounded-xl text-center font-bold text-sm flex items-center justify-center gap-2">
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

        {activeTab === 'EXTRA_CASH' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
             
             <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-2 -mr-2 opacity-20">
                   <Flame className="w-24 h-24" />
                </div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                   <Flame className="w-5 h-5 fill-yellow-300 text-yellow-300 animate-pulse" />
                   Surge Pricing Active!
                </h2>
                <p className="text-orange-100 text-xs mt-1 max-w-[85%]">
                   รับงานด่วนเพื่อรับค่าแรงเรทพิเศษ ยืนยันปุ๊บรับงานปั๊บ
                </p>
             </div>

             {loading ? (
                <div className="p-8 text-center text-gray-400">กำลังหาโอกาสรับงาน...</div>
             ) : hotShifts.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                   <div className="bg-gray-200 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Briefcase className="w-8 h-8 text-gray-400" />
                   </div>
                   <p>ขณะนี้ยังไม่มีงานด่วน</p>
                </div>
             ) : (
                hotShifts.map(shift => {
                  const isSurge = shift.current_pay_rate > shift.base_pay_rate;
                  const multiplier = (shift.current_pay_rate / shift.base_pay_rate).toFixed(1);
                  
                  return (
                    <div key={shift.id} className="bg-white rounded-2xl p-1 shadow-md border border-orange-100 relative transform transition-all active:scale-[0.99]">
                      <div className="bg-gradient-to-br from-white to-orange-50 p-4 rounded-xl">
                        
                        <div className="flex justify-between items-start mb-2">
                           <div className="flex items-center gap-1.5 bg-red-100 text-red-700 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0">
                              <Flame className="w-3 h-3 fill-red-600" />
                              งานด่วน
                           </div>
                           <div className="text-[10px] font-bold text-gray-400 truncate ml-2">{formatDate(shift.start_time)}</div>
                        </div>

                        <div className="flex justify-between items-end gap-2 mb-4">
                           <div className="flex-1 min-w-0">
                              <h3 className="text-xl font-bold text-gray-900 leading-tight break-words">{shift.role_required}</h3>
                              <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                 <Clock className="w-3 h-3 shrink-0" />
                                 {formatTimeRange(shift.start_time, shift.end_time)}
                              </div>
                           </div>
                           <div className="text-right shrink-0">
                              {isSurge && (
                                 <div className="text-[10px] text-gray-400 line-through mb-0.5">
                                    ฿{shift.base_pay_rate.toLocaleString()}
                                 </div>
                              )}
                              <div className="flex items-center justify-end gap-1 text-red-600 font-black text-2xl leading-none">
                                 <span>฿{shift.current_pay_rate.toLocaleString()}</span>
                              </div>
                              {isSurge && (
                                 <div className="text-[9px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded mt-1 inline-block uppercase tracking-wider">
                                    เรทพิเศษ {multiplier}x
                                 </div>
                              )}
                           </div>
                        </div>

                        <button 
                           onClick={() => handleAcceptClick(shift)}
                           className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3.5 rounded-xl font-bold text-lg shadow-lg shadow-orange-200 flex items-center justify-center gap-2 active:opacity-90 transition-all"
                        >
                           รับงานทันที
                           <ChevronRight className="w-5 h-5" />
                        </button>
                        
                        <div className="text-center text-[10px] text-gray-400 mt-2 font-medium truncate px-2">
                           {shift.location_name} • ด่วนมาก
                        </div>

                      </div>
                    </div>
                  );
                })
             )}
          </div>
        )}
      </main>

      {/* Acceptance Modal - Mobile Refined */}
      <Modal
        isOpen={acceptModalOpen}
        onClose={() => setAcceptModalOpen(false)}
        title="ยืนยันการรับงาน"
        footer={
          <div className="flex w-full gap-3">
            <button 
              onClick={() => setAcceptModalOpen(false)}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 rounded-xl text-gray-700 font-bold hover:bg-gray-100 disabled:opacity-50 text-sm"
            >
              ยกเลิก
            </button>
            <button 
              onClick={handleConfirmAccept}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 shadow-lg shadow-orange-100 flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : null}
              ตกลงรับงาน
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-orange-50 p-3 rounded-xl border border-orange-100">
             <Info className="w-5 h-5 text-orange-600 shrink-0" />
             <p className="text-xs text-orange-800 font-bold leading-relaxed">
                กรุณาตรวจสอบเวลาและสถานที่ก่อนกดยืนยัน หากรับแล้วไม่มาทำงานจะส่งผลต่อคะแนนความน่าเชื่อถือ
             </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 shadow-inner">
             <div className="grid grid-cols-2 gap-y-4 gap-x-3">
                <div className="col-span-1">
                   <p className="text-gray-400 font-bold uppercase text-[9px] tracking-widest mb-1">ตำแหน่ง</p>
                   <p className="font-bold text-gray-900 text-sm break-words leading-tight">{selectedShiftForAccept?.role_required}</p>
                </div>
                <div className="col-span-1 text-right">
                   <p className="text-gray-400 font-bold uppercase text-[9px] tracking-widest mb-1">ค่าแรง</p>
                   <p className="font-black text-red-600 text-lg">฿{selectedShiftForAccept?.current_pay_rate.toLocaleString()}<span className="text-[10px] text-gray-400 font-normal ml-0.5">/ชม.</span></p>
                </div>
                <div className="col-span-2 border-t border-gray-100 pt-3">
                   <p className="text-gray-400 font-bold uppercase text-[9px] tracking-widest mb-1">สถานที่ทำงาน</p>
                   <div className="flex items-center gap-1.5 font-bold text-gray-900 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="truncate">{selectedShiftForAccept?.location_name}</span>
                   </div>
                </div>
                <div className="col-span-2 border-t border-gray-100 pt-3">
                   <p className="text-gray-400 font-bold uppercase text-[9px] tracking-widest mb-1">ช่วงเวลา</p>
                   <div className="flex items-center gap-1.5 font-bold text-gray-900 text-sm">
                      <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                      <span>{selectedShiftForAccept ? formatTimeRange(selectedShiftForAccept.start_time, selectedShiftForAccept.end_time) : ''}</span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </Modal>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 pb-6 flex justify-around items-center z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => setActiveTab('SCHEDULE')}
          className={`flex flex-col items-center gap-1.5 transition-colors duration-200 ${activeTab === 'SCHEDULE' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <div className={`p-2 rounded-xl ${activeTab === 'SCHEDULE' ? 'bg-blue-50' : ''}`}>
             <CalendarCheck className={`w-6 h-6 ${activeTab === 'SCHEDULE' ? 'fill-blue-100/50' : ''}`} />
          </div>
          <span className="text-[10px] font-bold tracking-wider uppercase">ตารางงาน</span>
        </button>

        <div className="w-px h-8 bg-gray-100"></div>

        <button 
          onClick={() => setActiveTab('EXTRA_CASH')}
          className={`flex flex-col items-center gap-1.5 transition-colors duration-200 ${activeTab === 'EXTRA_CASH' ? 'text-orange-600' : 'text-gray-400'}`}
        >
          <div className={`p-2 rounded-xl ${activeTab === 'EXTRA_CASH' ? 'bg-orange-50' : ''}`}>
             <DollarSign className={`w-6 h-6 ${activeTab === 'EXTRA_CASH' ? 'fill-orange-100/50' : ''}`} />
          </div>
          <span className="text-[10px] font-bold tracking-wider uppercase">รับงานเพิ่ม</span>
        </button>
      </div>
    </div>
  );
};