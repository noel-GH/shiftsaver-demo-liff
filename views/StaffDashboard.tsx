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

  const fetchShifts = async () => {
    setLoading(true);
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
      setLoading(false);
    }
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
        setToast({ message: "การเชื่อมต่อผิดพลาด", type: 'error' });
      } else if (data.success) {
        setToast({ message: data.message, type: 'success' });
        await fetchShifts();
        setAcceptModalOpen(false);
        
        setTimeout(() => {
             setActiveTab('SCHEDULE');
        }, 1500);
      } else {
        setToast({ message: data.message, type: 'error' });
        setAcceptModalOpen(false);
        await fetchShifts();
      }
    } catch (e) {
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
                  <div key={shift.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isCompleted ? 'bg-google-green' : isCheckedIn ? 'bg-google-yellow' : 'bg-google-blue'}`}></div>
                    
                    <div className="flex justify-between items-start mb-3 pl-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${
                            isCompleted ? 'text-google-green-dark bg-green-50' : 
                            isCheckedIn ? 'text-google-yellow-dark bg-yellow-50' : 
                            'text-google-blue bg-blue-50'
                          }`}>
                            {formatDate(shift.start_time)}
                          </span>
                          {isCheckedIn && (
                             <span className="text-[10px] font-bold text-google-yellow-dark bg-yellow-50 px-2 py-0.5 rounded-md uppercase tracking-wide flex items-center gap-1">
                               <div className="w-1 h-1 rounded-full bg-google-yellow animate-pulse"></div> กำลังทำงาน
                             </span>
                          )}
                          {isCompleted && (
                             <span className="text-[10px] font-bold text-google-green-dark bg-green-50 px-2 py-0.5 rounded-md uppercase tracking-wide flex items-center gap-1">
                               <CheckCircle className="w-3 h-3" /> งานเสร็จสิ้น
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

                    <div className="mt-4">
                      {!attendanceLog && today && (
                        <M3Button 
                          onClick={() => handleCheckIn(shift)}
                          loading={isProcessing}
                          className="w-full py-5 text-lg shadow-lg shadow-blue-100 bg-google-blue hover:bg-blue-600"
                          icon={<MapPin className="w-5 h-5" />}
                        >
                          📍 CHECK IN
                        </M3Button>
                      )}

                      {isCheckedIn && (
                        <M3Button 
                          onClick={() => handleCheckOut(attendanceLog.id)}
                          loading={isProcessing}
                          className="w-full bg-google-red hover:bg-red-700 py-5 text-lg shadow-lg shadow-red-100"
                          icon={<CheckCircle className="w-5 h-5" />}
                        >
                          🏁 CHECK OUT NOW
                        </M3Button>
                      )}

                      {isCompleted && (
                        <div className="w-full bg-green-50 text-green-700 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 border border-green-100">
                          <CheckCircle className="w-5 h-5" />
                          ✅ Shift Completed
                        </div>
                      )}

                      {!today && !attendanceLog && (
                        <div className="text-center py-2 text-xs text-gray-400 font-medium italic">
                          งานจะเริ่มในวันที่ {formatDate(shift.start_time)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'EXTRA_CASH' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
             
             <div className="bg-gradient-to-r from-google-yellow to-google-red rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-2 -mr-2 opacity-20">
                   <Flame className="w-24 h-24" />
                </div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                   <Flame className="w-5 h-5 fill-yellow-300 text-yellow-300 animate-pulse" />
                   Surge Pricing Active!
                </h2>
                <p className="text-yellow-100 text-xs mt-1 max-w-[85%]">
                   รับงานด่วนเพื่อรับค่าแรงเรทพิเศษ ยืนยันปุ๊บรับงานปั๊บ
                </p>
             </div>

             {loading ? (
                <div className="p-8 text-center text-gray-400">กำลังหาโอกาสรับงาน...</div>
             ) : hotShifts.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                   <div className="bg-gray-200 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Briefcase className="w-8 h-8 text-gray-400" />
                   </div>
                   <p>ขณะนี้ยังไม่มีงานด่วน</p>
                </div>
             ) : (
                hotShifts.map(shift => {
                  const isSurge = shift.current_pay_rate > shift.base_pay_rate;
                  const multiplier = Number((shift.current_pay_rate / shift.base_pay_rate).toFixed(2));
                  
                  return (
                    <div key={shift.id} className="bg-white rounded-2xl p-1 shadow-md border border-orange-100 relative transform transition-all active:scale-[0.99]">
                      <div className="bg-gradient-to-br from-white to-orange-50 p-4 rounded-2xl">
                        
                        <div className="flex justify-between items-start mb-2">
                           <div className="flex items-center gap-1.5 bg-red-100 text-google-red px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0">
                              <Flame className="w-3 h-3 fill-google-red" />
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
                                    ฿{shift.base_pay_rate?.toLocaleString()}
                                 </div>
                              )}
                              <div className="flex items-center justify-end gap-1 text-google-red-dark font-black text-2xl leading-none">
                                 <span>฿{shift.current_pay_rate?.toLocaleString()}</span>
                              </div>
                              {isSurge && (
                                 <div className="text-[9px] font-bold bg-google-red-dark text-white px-1.5 py-0.5 rounded mt-1 inline-block uppercase tracking-wider">
                                    เรทพิเศษ {multiplier}x
                                 </div>
                              )}
                           </div>
                        </div>

                        <M3Button 
                           onClick={() => handleAcceptClick(shift)}
                           className="w-full bg-gradient-to-r from-google-yellow to-google-red py-5 text-xl shadow-xl shadow-red-100"
                           icon={<ChevronRight className="w-6 h-6" />}
                        >
                           รับงานทันที
                        </M3Button>
                        
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
             <p className="text-xs text-blue-800 font-bold leading-relaxed">
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
