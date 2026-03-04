import React, { useState, useEffect } from 'react';
import { Shift, ShiftStatus, User } from '../types';
import { getShifts, getStaffShifts, checkIn, checkOut } from '../services/mockData';
import { supabase } from '../services/supabaseClient';
import { M3AppBar, M3Toolbar } from '../components/ui/M3AppBar';
import { M3Button, M3IconButton } from '../components/ui/M3Button';
import { M3NavigationBar } from '../components/ui/M3NavigationBar';
import { M3LoadingIndicator } from '../components/ui/M3Indicators';
import { motion, AnimatePresence } from 'motion/react';
import { Modal } from '../components/Modal';
import { Toast } from '../components/Toast';
import { Briefcase, MapPin, Flame, CalendarCheck, Clock, DollarSign, ChevronRight, Navigation, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

interface StaffDashboardProps {
  currentUser: User;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ currentUser }) => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [myAcceptedShifts, setMyAcceptedShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'SCHEDULE' | 'EXTRA_CASH'>('SCHEDULE');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  // Modal states for acceptance
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [selectedShiftForAccept, setSelectedShiftForAccept] = useState<Shift | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchShifts = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [allShifts, userShifts] = await Promise.all([
        getShifts(),
        getStaffShifts(currentUser.id)
      ]);
      setShifts(allShifts);
      setMyAcceptedShifts(userShifts);
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts(true);

    // Subscribe to real-time changes
    const channel = supabase
      .channel('staff-dashboard-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shifts' },
        () => {
          console.log('Shifts table changed, fetching updates...');
          fetchShifts(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_logs' },
        () => {
          console.log('Attendance logs changed, fetching updates...');
          fetchShifts(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
        console.error("Edge function error:", error);
        setToast({ message: "การเชื่อมต่อผิดพลาด", type: 'error' });
      } else if (data && data.success) {
        setToast({ message: data.message, type: 'success' });
        
        // Close modal immediately to avoid "blank screen" feel
        setAcceptModalOpen(false);
        setSelectedShiftForAccept(null);
        
        // Refresh data
        await fetchShifts();
        
        // Auto switch tab after a short delay
        setTimeout(() => {
          setActiveTab('SCHEDULE');
        }, 800);
      } else {
        setToast({ message: data?.message || "ไม่สามารถรับงานได้", type: 'error' });
        setAcceptModalOpen(false);
        await fetchShifts();
      }
    } catch (e) {
      console.error("Accept error:", e);
      setToast({ message: "ระบบขัดข้อง", type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckIn = async (shift: Shift) => {
    if (!navigator.geolocation) {
      setToast({ message: "เบราว์เซอร์ไม่รองรับ GPS", type: 'error' });
      return;
    }

    setIsProcessing(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const result = await checkIn(shift.id, currentUser.id, latitude, longitude);
        
        if (result.success) {
          setToast({ message: "เช็คอินสำเร็จ!", type: 'success' });
          await fetchShifts();
        } else {
          setToast({ message: result.error || "เช็คอินไม่สำเร็จ", type: 'error' });
        }
        setIsProcessing(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setToast({ message: "ไม่สามารถเข้าถึงตำแหน่ง GPS ได้ กรุณาอนุญาตสิทธิ์", type: 'error' });
        setIsProcessing(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCheckOut = async (logId: string) => {
    setIsProcessing(true);
    try {
      const result = await checkOut(logId);
      if (result.success) {
        setToast({ message: "เช็คเอาท์สำเร็จ!", type: 'success' });
        await fetchShifts();
      } else {
        setToast({ message: result.error || "เช็คเอาท์ไม่สำเร็จ", type: 'error' });
      }
    } catch (e) {
      setToast({ message: "เกิดข้อผิดพลาด", type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const myShifts = myAcceptedShifts
    .filter(s => s.status !== ShiftStatus.CANCELLED)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const hotShifts = shifts
    .filter(s => s.status === ShiftStatus.BIDDING);

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
    <div className="min-h-screen bg-white pb-24 relative">
      
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      <M3AppBar 
        title={`สวัสดี, ${currentUser.display_name.split(' ')[0]}`}
        subtitle={`Reliability: ${currentUser.reliability_score}%`}
        rightActions={
          <img 
            src={currentUser.avatar_url || "https://picsum.photos/100"} 
            alt="Profile" 
            className="w-10 h-10 rounded-2xl border border-gray-200 shadow-sm" 
          />
        }
      />

      <main className="px-4 pt-32 pb-24 space-y-4">
        
        {activeTab === 'SCHEDULE' && (
          <div className="space-y-4">
            {loading ? (
               <div className="p-8 text-center flex flex-col items-center gap-4">
                 <M3LoadingIndicator />
                 <span className="text-gray-400 text-sm font-bold uppercase tracking-widest">กำลังโหลดตารางงาน...</span>
               </div>
            ) : myShifts.length === 0 ? (
               <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
                 <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <CalendarCheck className="w-8 h-8 text-gray-300" />
                 </div>
                 <h3 className="font-bold text-gray-900">ยังไม่มีงานเร็วๆ นี้</h3>
                 <p className="text-gray-500 text-sm mt-1">กดที่เมนู 'รับงานเพิ่ม' เพื่อหารายได้พิเศษ!</p>
               </div>
            ) : (
              myShifts.map((shift) => {
                const today = isToday(shift.start_time);
                const attendanceLog = shift.attendance_logs?.[0];
                const isCheckedIn = attendanceLog && attendanceLog.check_in_time && !attendanceLog.check_out_time;
                const isCompleted = attendanceLog && attendanceLog.check_out_time;

                return (
                  <motion.div 
                    key={shift.id} 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`
                      relative p-5 mb-4 rounded-[24px] transition-all duration-300
                      ${isCompleted || isCheckedIn 
                        ? 'bg-gray-100 border-transparent shadow-none' 
                        : 'bg-white border border-gray-100 shadow-lg shadow-slate-900/5'
                      }
                      active:scale-[0.98]
                    `}
                  >
                    {/* Status Indicator Strip */}
                    <div className={`absolute left-0 top-6 bottom-6 w-1.5 rounded-r-full ${
                      isCompleted ? 'bg-google-green' : 
                      isCheckedIn ? 'bg-google-yellow' : 
                      'bg-google-blue'
                    }`}></div>
                    
                    <div className="flex justify-between items-start mb-4 pl-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${
                            isCompleted ? 'text-white bg-google-green' : 
                            isCheckedIn ? 'text-google-navy-dark bg-google-yellow' : 
                            'text-white bg-google-blue'
                          }`}>
                            {formatDate(shift.start_time)}
                          </span>
                          
                          {isCheckedIn && (
                             <span className="text-[10px] font-black text-google-yellow-dark bg-yellow-100/50 px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 border border-google-yellow/20">
                               <div className="w-1.5 h-1.5 rounded-full bg-google-yellow animate-pulse"></div>
                               กำลังทำงาน
                             </span>
                          )}
                          
                          {isCompleted && (
                             <span className="text-[10px] font-black text-google-green-dark bg-green-100/50 px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 border border-google-green/20">
                               <CheckCircle className="w-3.5 h-3.5" />
                               งานเสร็จสิ้น
                             </span>
                          )}
                        </div>
                        
                        <h3 className={`text-xl font-black leading-tight break-words ${isCompleted || isCheckedIn ? 'text-gray-800' : 'text-google-navy-dark'}`}>
                          {shift.role_required}
                        </h3>
                        
                        <div className="flex items-center gap-1.5 mt-1.5 text-gray-500">
                          <MapPin className="w-3.5 h-3.5 shrink-0 opacity-60" />
                          <span className="text-[11px] font-bold uppercase tracking-widest truncate">
                            {shift.location_name}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                         <div className="text-lg font-black text-google-blue bg-blue-50 px-3 py-1 rounded-xl">
                           {formatTimeRange(shift.start_time, shift.end_time)}
                         </div>
                         <div className="text-[10px] text-gray-400 font-bold tracking-tighter uppercase">ID: {shift.id.slice(0,6)}</div>
                      </div>
                    </div>

                    <div className="mt-6">
                      {!attendanceLog && today && (
                        <M3Button 
                          onClick={() => handleCheckIn(shift)}
                          loading={isProcessing}
                          className="w-full py-5 text-lg font-black rounded-[20px] shadow-xl shadow-blue-200 bg-gradient-to-r from-google-blue to-blue-600 hover:to-blue-700"
                          icon={<Navigation className="w-5 h-5" />}
                        >
                          CHECK IN NOW
                        </M3Button>
                      )}

                      {isCheckedIn && (
                        <M3Button 
                          onClick={() => handleCheckOut(attendanceLog.id)}
                          loading={isProcessing}
                          className="w-full py-5 text-lg font-black rounded-[20px] shadow-xl shadow-red-200 bg-gradient-to-r from-google-red to-red-600 hover:to-red-700"
                          icon={<CheckCircle className="w-5 h-5" />}
                        >
                          FINISH SHIFT
                        </M3Button>
                      )}

                      {isCompleted && (
                        <div className="w-full bg-white/60 text-google-green-dark py-4 rounded-[20px] font-black text-sm flex items-center justify-center gap-3 border border-google-green/10 shadow-sm">
                          <div className="w-8 h-8 rounded-full bg-google-green flex items-center justify-center text-white">
                            <CheckCircle className="w-5 h-5" />
                          </div>
                          SHIFT COMPLETED
                        </div>
                      )}

                      {!today && !attendanceLog && (
                        <div className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100 flex items-center justify-center gap-2">
                          <Clock className="w-4 h-4 text-gray-300" />
                          <span className="text-xs text-gray-400 font-bold uppercase tracking-widest italic">
                            Starts on {formatDate(shift.start_time)}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'EXTRA_CASH' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
             
             <div className="bg-white border-2 border-google-yellow rounded-2xl p-4 text-gray-900 shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-2 -mr-2 opacity-10">
                   <Flame className="w-24 h-24 text-google-red" />
                </div>
                <h2 className="text-lg font-bold flex items-center gap-2 text-google-red">
                   <Flame className="w-5 h-5 fill-google-red text-google-red animate-pulse" />
                   Surge Pricing Active!
                </h2>
                <p className="text-gray-600 text-xs mt-1 max-w-[85%] font-medium">
                   รับงานด่วนเพื่อรับค่าแรงเรทพิเศษ ยืนยันปุ๊บรับงานปั๊บ
                </p>
             </div>

             {loading ? (
                <div className="p-8 text-center text-gray-400">กำลังหาโอกาสรับงาน...</div>
             ) : hotShifts.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                   <div className="bg-gray-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-gray-100">
                      <Briefcase className="w-8 h-8 text-gray-300" />
                   </div>
                   <p className="font-bold">ขณะนี้ยังไม่มีงานด่วน</p>
                </div>
             ) : (
                hotShifts.map(shift => {
                  const isSurge = shift.current_pay_rate > shift.base_pay_rate;
                  const multiplier = Number((shift.current_pay_rate / shift.base_pay_rate).toFixed(2));
                  
                  return (
                    <div key={shift.id} className="bg-white rounded-2xl p-1 shadow-sm border border-gray-100 relative transform transition-all active:scale-[0.99]">
                      <div className="bg-white p-4 rounded-2xl">
                        
                        <div className="flex justify-between items-start mb-2">
                           <div className="flex items-center gap-1.5 bg-red-50 text-google-red px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 border border-red-100">
                              <Flame className="w-3 h-3 fill-google-red" />
                              งานด่วน
                           </div>
                           <div className="text-[10px] font-bold text-gray-400 truncate ml-2">{formatDate(shift.start_time)}</div>
                        </div>

                        <div className="flex justify-between items-end gap-2 mb-4">
                           <div className="flex-1 min-w-0">
                              <h3 className="text-xl font-bold text-gray-900 leading-tight break-words">{shift.role_required}</h3>
                              <div className="text-xs text-gray-500 flex items-center gap-1 mt-1 font-medium">
                                 <Clock className="w-3 h-3 shrink-0 text-google-blue" />
                                 {formatTimeRange(shift.start_time, shift.end_time)}
                              </div>
                           </div>
                           <div className="text-right shrink-0">
                              {isSurge && (
                                 <div className="text-[10px] text-gray-400 line-through mb-0.5">
                                    ฿{shift.base_pay_rate?.toLocaleString()}
                                 </div>
                              )}
                              <div className="flex items-center justify-end gap-1 text-google-red font-black text-2xl leading-none">
                                 <span>฿{shift.current_pay_rate?.toLocaleString()}</span>
                              </div>
                              {isSurge && (
                                 <div className="text-[9px] font-bold bg-google-red text-white px-1.5 py-0.5 rounded mt-1 inline-block uppercase tracking-wider">
                                    เรทพิเศษ {multiplier}x
                                 </div>
                              )}
                           </div>
                        </div>

                        <M3Button 
                           onClick={() => handleAcceptClick(shift)}
                           className="w-full bg-google-blue py-5 text-xl shadow-lg shadow-blue-100"
                           icon={<ChevronRight className="w-6 h-6" />}
                        >
                           รับงานทันที
                        </M3Button>
                        
                        <div className="text-center text-[10px] text-gray-400 mt-2 font-medium break-words whitespace-normal px-2">
                           <MapPin className="w-3 h-3 inline mr-1 text-gray-300" />
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
              className="flex-1 px-4 py-3 rounded-2xl text-gray-700 font-bold hover:bg-gray-100 disabled:opacity-50 text-sm"
            >
              ยกเลิก
            </button>
            <button 
              onClick={handleConfirmAccept}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 rounded-2xl bg-google-blue text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
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
          <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-2xl border border-blue-100">
             <Info className="w-5 h-5 text-google-blue shrink-0" />
             <p className="text-xs text-google-blue font-bold leading-relaxed">
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
                   <p className="font-black text-google-red-dark text-lg">฿{selectedShiftForAccept?.current_pay_rate?.toLocaleString()}<span className="text-[10px] text-gray-400 font-normal ml-0.5">/ชม.</span></p>
                </div>
                <div className="col-span-2 border-t border-gray-100 pt-3">
                   <p className="text-gray-400 font-bold uppercase text-[9px] tracking-widest mb-1">สถานที่ทำงาน</p>
                   <div className="flex items-center gap-1.5 font-bold text-gray-900 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="break-words whitespace-normal">{selectedShiftForAccept?.location_name}</span>
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

      <M3NavigationBar 
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as 'SCHEDULE' | 'EXTRA_CASH')}
        items={[
          { id: 'SCHEDULE', label: 'ตารางงาน', icon: <CalendarCheck className="w-6 h-6" /> },
          { id: 'EXTRA_CASH', label: 'รับงานเพิ่ม', icon: <DollarSign className="w-6 h-6" /> }
        ]}
      />
    </div>
  );
};
