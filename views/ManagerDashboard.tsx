import React, { useState, useEffect, useMemo } from 'react';
import { Shift, ShiftStatus, User } from '../types';
import { getShifts, triggerReplacement, seedDatabase, markShiftAsGhost, createShift, getAllStaff, cancelShift, updateShift, confirmShifts, broadcastShift } from '../services/mockData';
import { supabase } from '../services/supabaseClient';
import { notifyGhostsCron, notifySingleShift } from '../services/notificationService';
import { M3AppBar, M3Toolbar } from '../components/ui/M3AppBar';
import { M3Button, M3IconButton } from '../components/ui/M3Button';
import { M3ButtonGroup, M3SplitButton } from '../components/ui/M3ButtonGroup';
import { M3LoadingIndicator, M3ProgressIndicator } from '../components/ui/M3Indicators';
import { motion, AnimatePresence } from 'motion/react';
import { Modal } from '../components/Modal';
import { Toast } from '../components/Toast';
import { CustomSelect } from '../components/CustomSelect';
import { LayoutDashboard, AlertTriangle, Activity, CalendarSync, CalendarClock, Database, CheckCircle, Skull, Megaphone, Plus, Clock, MapPin, Briefcase, Wallet, Users, Info, Trash2, Layers, ChevronRight, Pencil, Check } from 'lucide-react';
import { format, differenceInHours, isBefore, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isWithinInterval, addDays, startOfToday } from 'date-fns';
import { ShiftCard } from '../components/ShiftCard';

export const ManagerDashboard: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [staffList, setStaffList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Replacement Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  
  // Create Shift Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  
  // Calendar States
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(addDays(new Date(), 1));
  
  // สร้างรายการวันที่ล่วงหน้า 30 วันสำหรับ Carousel
  const carouselDays = useMemo(() => {
    const today = startOfToday();
    return Array.from({ length: 30 }).map((_, i) => addDays(today, i));
  }, []);

  // สร้างรายการเวลาทุกๆ 30 นาที สำหรับให้เลือก (08:00 - 23:30)
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = 8; h <= 23; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`);
      slots.push(`${h.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

  const [newShift, setNewShift] = useState({
    role_required: 'WH Office',
    location_name: 'Main Store',
    start_time: '09:00',
    end_time: '17:00',
    base_pay_rate: 150,
    multiplier: 1,
    user_id: '',
    num_slots: 1
  });

  const [broadcasting, setBroadcasting] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'warning' | 'error'} | null>(null);

  const fetchInitialData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [shiftsData, staffData] = await Promise.all([
        getShifts(),
        getAllStaff()
      ]);
      setShifts(shiftsData);
      setStaffList(staffData);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData(true);

    // Subscribe to real-time changes
    const channel = supabase
      .channel('manager-dashboard-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shifts' },
        () => {
          console.log('Shifts table changed, fetching updates...');
          fetchInitialData(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_logs' },
        () => {
          console.log('Attendance logs changed, fetching updates...');
          fetchInitialData(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- Calculations for Create Shift Modal ---
  const calculatedStats = useMemo(() => {
    try {
      if (!startDate || !endDate) return { hours: 0, singlePay: 0, currentPayRate: 0, totalPay: 0, isValidRange: false, daysCount: 0 };

      const start = new Date(`2000-01-01T${newShift.start_time}`);
      const end = new Date(`2000-01-01T${newShift.end_time}`);
      
      let hours = differenceInHours(end, start);
      if (hours < 0) hours = 0; 
      
      const daysCount = eachDayOfInterval({ start: startDate, end: endDate }).length;
      const singlePay = hours * newShift.base_pay_rate;
      const currentPayRate = Math.round(newShift.base_pay_rate * newShift.multiplier);
      const totalPay = hours * currentPayRate * newShift.num_slots * daysCount;
      
      return { 
        hours, 
        singlePay, 
        currentPayRate,
        totalPay, 
        isValidRange: end > start && endDate >= startDate,
        daysCount
      };
    } catch {
      return { hours: 0, singlePay: 0, currentPayRate: 0, totalPay: 0, isValidRange: false, daysCount: 0 };
    }
  }, [newShift, startDate, endDate]);

  const handleSeed = async () => {
    if (confirm("Populate database with demo data?")) {
        setLoading(true);
        await seedDatabase();
        await fetchInitialData();
    }
  }

  const handleBroadcast = async () => {
    setBroadcasting(true);
    try {
      const result = await notifyGhostsCron();
      if (result.success && result.notified_count > 0) {
        setToast({ message: "ส่งแจ้งเตือน LINE เรียบร้อยแล้ว!", type: 'success' });
        await fetchInitialData();
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
    }
  };

  const handleSingleBroadcast = async (shift: Shift) => {
    if (shift.status === null) {
      setToast({ message: "โปรดบันทึกตารางงานก่อนประกาศ", type: 'warning' });
      return;
    }

    setBroadcasting(true);
    try {
      let result;
      if (shift.status === ShiftStatus.CREATED) {
        // Step 1: Mark as Ghosted (Internal state, not yet bidding)
        await markShiftAsGhost(shift.id);
        setToast({ message: `เปลี่ยนสถานะ ${shift.role_required} เป็น Ghosted แล้ว`, type: 'success' });
        await fetchInitialData();
      } else if (shift.status === ShiftStatus.GHOSTED || shift.status === ShiftStatus.BIDDING) {
        // Step 2: Broadcast to LINE and set to BIDDING
        result = await broadcastShift(shift.id);
        if (result.success) {
          setToast({ message: `ประกาศงาน ${shift.role_required} เรียบร้อย!`, type: 'success' });
          await fetchInitialData();
        } else {
          alert("Broadcast failed: " + result.error);
        }
      }
    } catch (e) {
      console.error(e);
      alert("Error executing action.");
    } finally {
      setBroadcasting(false);
    }
  };

  const handleConfirmAllDrafts = async () => {
    const draftIds = shifts.filter(s => s.status === null).map(s => s.id);
    if (draftIds.length === 0) return;

    setLoading(true);
    try {
      const result = await confirmShifts(draftIds);
      if (result.success) {
        setToast({ message: "บันทึกตารางงานทั้งหมดเรียบร้อย!", type: 'success' });
        await fetchInitialData();
      } else {
        alert("Error confirming shifts: " + result.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!calculatedStats.isValidRange || !startDate || !endDate) {
        setToast({ message: "โปรดตรวจสอบเวลาและวันที่ให้ถูกต้อง", type: 'error' });
        return;
    }

    const todayAtStart = new Date();
    todayAtStart.setHours(0, 0, 0, 0);
    if (isBefore(startDate, todayAtStart)) {
        setToast({ message: "ไม่สามารถสร้างงานย้อนหลังได้", type: 'error' });
        return;
    }

    setSummaryModalOpen(true);
  };

  const handleConfirmCreate = async () => {
    setIsCreating(true);
    try {
      if (editingShift) {
        // Handle Update
        const dateStr = format(startDate!, 'yyyy-MM-dd');
        const startTimeISO = new Date(`${dateStr}T${newShift.start_time}`).toISOString();
        const endTimeISO = new Date(`${dateStr}T${newShift.end_time}`).toISOString();

        const result = await updateShift(editingShift.id, {
          role_required: newShift.role_required,
          location_name: newShift.location_name,
          start_time: startTimeISO,
          end_time: endTimeISO,
          base_pay_rate: Number(newShift.base_pay_rate),
          current_pay_rate: calculatedStats.currentPayRate,
          user_id: newShift.user_id || undefined,
        });

        if (result.success) {
          setToast({ message: "แก้ไขงานสำเร็จ!", type: 'success' });
          setSummaryModalOpen(false);
          setCreateModalOpen(false);
          setEditingShift(null);
          setNewShift({ ...newShift, user_id: '', num_slots: 1 });
          await fetchInitialData();
        } else {
          setToast({ message: "เกิดข้อผิดพลาดในการแก้ไขงาน", type: 'error' });
        }
      } else {
        // Handle Create
        const days = eachDayOfInterval({ start: startDate!, end: endDate! });
        let successCount = 0;

        for (const day of days) {
          const dateStr = format(day, 'yyyy-MM-dd');
          const startTimeISO = new Date(`${dateStr}T${newShift.start_time}`).toISOString();
          const endTimeISO = new Date(`${dateStr}T${newShift.end_time}`).toISOString();

          const result = await createShift({
            role_required: newShift.role_required,
            location_name: newShift.location_name,
            start_time: startTimeISO,
            end_time: endTimeISO,
            base_pay_rate: Number(newShift.base_pay_rate),
            current_pay_rate: calculatedStats.currentPayRate,
            user_id: newShift.user_id || undefined,
          }, newShift.num_slots);

          if (result.success) successCount++;
        }

        if (successCount > 0) {
          setToast({ message: `สร้างงานสำเร็จ ${successCount * newShift.num_slots} ตำแหน่ง!`, type: 'success' });
          setSummaryModalOpen(false);
          setCreateModalOpen(false);
          setNewShift({ ...newShift, user_id: '', num_slots: 1 });
          await fetchInitialData();
        } else {
          setToast({ message: "เกิดข้อผิดพลาดในการสร้างงาน", type: 'error' });
        }
      }
    } catch (err) {
      setToast({ message: "รูปแบบข้อมูลไม่ถูกต้อง", type: 'error' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setStartDate(new Date(shift.start_time));
    setEndDate(new Date(shift.start_time));
    setNewShift({
      role_required: shift.role_required,
      location_name: shift.location_name,
      start_time: format(new Date(shift.start_time), 'HH:mm'),
      end_time: format(new Date(shift.end_time), 'HH:mm'),
      base_pay_rate: shift.base_pay_rate,
      multiplier: Math.round((shift.current_pay_rate / shift.base_pay_rate) * 100) / 100,
      user_id: shift.user_id || '',
      num_slots: 1
    });
    setCreateModalOpen(true);
  };

  const handleCancelShiftAction = async (shift: Shift) => {
    if (!confirm(`ยืนยันการลบงาน ${shift.role_required} (${format(new Date(shift.start_time), 'HH:mm')})?\nข้อมูลจะถูกลบออกจากระบบถาวร`)) return;
    
    setLoading(true);
    try {
      const result = await cancelShift(shift.id);
      if (result.success) {
          // Guaranteed UI update
          setShifts(prev => prev.filter(s => String(s.id) !== String(shift.id)));
          setToast({ message: "ลบงานออกจากระบบเรียบร้อยแล้ว", type: 'success' });
          // Also re-fetch to ensure sync
          await fetchInitialData();
      } else {
          alert("❌ ไม่สามารถลบงานได้: " + result.error);
      }
    } catch (err) {
      alert("❌ เกิดข้อผิดพลาดในการลบงาน");
    } finally {
      setLoading(false);
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
        await fetchInitialData();
        setToast({ message: "บันทึกสถานะ Ghosted แล้ว!", type: 'warning' });
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
      await fetchInitialData();
      setModalOpen(false);
      setSelectedShift(null);
      setToast({ message: "ส่งแจ้งเตือนงานด่วนให้พนักงานแล้ว!", type: 'success' });
    } catch (e) {
      alert("Error triggering replacement");
    }
  };

  const totalShifts = shifts.length;
  const activeStaff = shifts.filter(s => s.status === ShiftStatus.CHECKED_IN).length;
  const ghostCount = shifts.filter(s => s.status === ShiftStatus.GHOSTED).length;
  const pendingNotificationCount = shifts.filter(s => s.status === ShiftStatus.GHOSTED && !s.is_notified).length;

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
        title="ShiftSaver" 
        subtitle="Manager Control"
        leftAction={<CalendarSync className="w-6 h-6 text-google-blue" />}
        rightActions={
          <div className="flex items-center gap-2">
            <M3Button 
              variant="tonal"
              onClick={handleBroadcast} 
              loading={broadcasting}
              // เพิ่ม Logic สำหรับขอบ (Border) ให้กะพริบด้วย animate-pulse
              className={`px-3 py-1.5 h-9 text-xs min-w-[64px] bg-white border transition-all duration-200
                ${pendingNotificationCount > 0 
                  ? 'border-google-red animate-pulse hover:bg-red-50 active:bg-red-100' 
                  : 'border-gray-100 hover:bg-gray-50 active:bg-gray-100'
                }
              `}
              icon={
                <Megaphone 
                  className={`w-4 h-4 ${
                    pendingNotificationCount > 0 ? 'text-google-red' : 'text-gray-400'
                  }`} 
                />
              }
            >
              {/* ส่วนตัวเลขที่กะพริบพร้อมกัน */}
              <span className={`
                ${pendingNotificationCount > 0 
                  ? 'text-google-red font-black' 
                  : 'text-gray-500'
                }
              `}>
                {pendingNotificationCount}
              </span>
            </M3Button>
            {shifts.length === 0 && !loading && (
              <M3IconButton 
                onClick={handleSeed}
                icon={<Database className="w-4 h-4" />}
                className="p-2"
              />
            )}
          </div>
        }
      />

      <main className="max-w-4xl mx-auto px-4 pt-24 pb-6 space-y-8">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'งานทั้งหมด', value: totalShifts, color: 'bg-google-blue' },
            { label: 'กำลังทำงาน', value: activeStaff, color: 'bg-google-yellow' },
            { label: 'งานด่วน', value: ghostCount, color: 'bg-google-red-dark' }
          ].map((stat, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: idx * 0.1, type: "spring" }}
              className={`${stat.color} p-4 rounded-[24px] shadow-lg flex flex-col items-center justify-center text-center text-white border border-white/10 transition-all hover:shadow-xl`}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest mb-1 text-white">
                {stat.label}
              </span>
              <span className="text-3xl font-black text-white">{stat.value}</span>
            </motion.div>
          ))}
        </div>

        {/* Action Buttons: Create & Save Grid */}
        <div className="grid grid-cols-2 gap-3">
          <M3Button 
             onClick={() => {
               setEditingShift(null);
               setStartDate(new Date());
               setEndDate(addDays(new Date(), 1));
               setNewShift({
                 role_required: 'WH Office',
                 location_name: 'Main Store',
                 start_time: '09:00',
                 end_time: '17:00',
                 base_pay_rate: 150,
                 multiplier: 1,
                 user_id: '',
                 num_slots: 1
               });
               setCreateModalOpen(true);
             }}
             className="w-full py-4 text-xs font-black shadow-lg shadow-slate-500/10 bg-google-navy-dark hover:bg-google-navy-dark rounded-2xl"
             icon={<Plus className="w-4 h-4" />}
          >
             สร้างกะงาน
          </M3Button>

          <M3Button 
            onClick={handleConfirmAllDrafts}
            disabled={!shifts.some(s => s.status === null)}
            variant={shifts.some(s => s.status === null) ? 'filled' : 'outlined'}
            className={`w-full py-4 text-xs font-black rounded-2xl transition-all duration-300 ${
              shifts.some(s => s.status === null)
                ? 'bg-google-green-dark hover:bg-green-800 shadow-lg shadow-green-100 border-transparent text-white' 
                : 'border-gray-200 text-gray-300 bg-transparent opacity-50'
            }`}
            icon={<Check className="w-4 h-4" />}
          >
            บันทึกทั้งหมด
          </M3Button>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-gray-400" />
            ตารางงานวันนี้
          </h2>

          {loading && shifts.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <M3LoadingIndicator />
                <span className="text-gray-400 text-sm font-bold uppercase tracking-widest">กำลังอัปเดตข้อมูล...</span>
             </div>
          ) : (
            <div className="space-y-3">
              {shifts.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                    <CalendarClock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">ยังไม่มีการสร้างตารางงาน</p>
                </div>
              ) : (
                shifts.map(shift => {
                   let action, label, color;
                   
                   if (shift.status === ShiftStatus.SCHEDULED) {
                       action = handleSimulateGhost;
                       label = "บันทึก No-Show";
                       color = "bg-gray-800 hover:bg-gray-900";
                   } else if (shift.status === ShiftStatus.GHOSTED || shift.status === ShiftStatus.BIDDING || shift.status === ShiftStatus.CREATED) {
                       action = handleFindReplacementClick;
                       label = shift.status === ShiftStatus.BIDDING ? "จัดการงานว่าง" : 
                               shift.status === ShiftStatus.CREATED ? "ประกาศหาพนักงาน" : "ประกาศหาพนักงานด่วน";
                       color = shift.status === ShiftStatus.CREATED ? "bg-google-blue hover:bg-blue-700" : "bg-google-red-dark hover:bg-google-red-dark shadow-lg shadow-red-100";
                   }

                   return (
                      <ShiftCard 
                        key={shift.id} 
                        shift={shift} 
                        isManager={true}
                        onAction={action}
                        actionLabel={label}
                        actionColor={color}
                        onCancel={handleCancelShiftAction}
                        onEdit={handleEditShift}
                        onBroadcast={handleSingleBroadcast}
                      />
                   );
                })
              )}
            </div>
          )}
        </div>
      </main>

      {/* --- MODAL: CREATE SHIFT (REVAMPED UI) --- */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setEditingShift(null);
        }}
        title={editingShift ? "แก้ไขตารางงาน" : "สร้างตารางงานใหม่"}
        footer={
          <M3Button 
            onClick={handleCreateShiftSubmit}
            loading={isCreating}
            disabled={!calculatedStats.isValidRange}
            className="w-full py-6 text-xl shadow-xl shadow-slate-500/10 bg-google-navy-dark hover:bg-google-navy-dark"
            icon={editingShift ? <Check className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
          >
            {editingShift ? "บันทึกการแก้ไข" : `สร้างงานทั้งหมด ${calculatedStats.daysCount * newShift.num_slots} กะ`}
          </M3Button>
        }
      >
        <div className="space-y-6 pb-4">
          
{/* --- Date Carousel Section --- */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-5 px-1">
              <h3 className="font-bold text-lg text-gray-900">
                {startDate ? format(startDate, 'MMMM yyyy') : format(new Date(), 'MMMM yyyy')}
              </h3>
            </div>

            <div className="flex overflow-x-auto gap-3 pb-2 px-1 snap-x" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <style>{`div::-webkit-scrollbar { display: none; }`}</style>
              
              {carouselDays.map((day) => {
                const isSelectedStart = startDate && isSameDay(day, startDate);
                const isSelectedEnd = endDate && isSameDay(day, endDate);
                // เช็คว่ากดเริ่มและจบใน "วันเดียวกัน" หรือไม่
                const isSingleDayRange = isSelectedStart && isSelectedEnd; 
                const isInRange = startDate && endDate && isWithinInterval(day, { start: startDate, end: endDate });
                
                return (
                  <button
                    key={day.toString()}
                    type="button"
                    onClick={() => {
                      if (!startDate || (startDate && endDate)) {
                        setStartDate(day);
                        setEndDate(null);
                      } else if (day < startDate) {
                        setStartDate(day);
                        setEndDate(null);
                      } else {
                        setEndDate(day);
                      }
                    }}
                    className="flex flex-col items-center min-w-[64px] snap-start shrink-0 relative"
                  >
                    {/* เส้นเชื่อมตรงกลางเมื่อเลือกเป็นช่วงวัน */}
                    {isInRange && !isSelectedStart && !isSelectedEnd && (
                      <div className="absolute top-7 left-[-16px] w-[96px] h-1 bg-gray-300 -z-10"></div>
                    )}
                    
                    <div 
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold border transition-all duration-300 z-10
                        ${isSingleDayRange
                          // กรณี 1: เลือกวันเดียวจบ -> ไล่สีจากน้ำเงินไปส้มแดง (บอกว่ามีทั้ง Start และ End)
                          ? 'bg-gradient-to-br from-google-blue to-google-red text-white border-transparent shadow-lg shadow-blue-200'
                          : isSelectedStart 
                            // กรณี 2: วันเริ่มต้น -> สีน้ำเงิน
                            ? 'bg-google-blue text-white border-google-blue shadow-md shadow-blue-200' 
                            : isSelectedEnd
                              // กรณี 3: วันสิ้นสุด -> สีส้มแดง
                              ? 'bg-google-red text-white border-google-red shadow-md shadow-red-200' 
                              : isInRange 
                                // กรณี 4: วันที่อยู่ตรงกลาง -> พื้นหลังสีเทาเข้ม
                                ? 'bg-gray-200 text-gray-900 border-gray-300 shadow-inner' 
                                // กรณี 5: วันปกติ
                                : 'bg-white text-gray-800 border-gray-200 hover:border-google-blue' 
                        }`}
                    >
                      {format(day, 'd')}
                    </div>
                    
                    <span className={`text-[11px] font-bold mt-2 uppercase tracking-wider transition-colors
                        ${isSingleDayRange ? 'text-google-blue' : isSelectedStart ? 'text-google-blue' : isSelectedEnd ? 'text-google-red' : isInRange ? 'text-gray-800' : 'text-gray-400'}
                    `}>
                      {format(day, 'EEE')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* --- Time Selection Section --- */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                เวลาเริ่มงาน (Start Time)
              </label>
              <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
                {timeSlots.map(time => (
                  <button
                    key={`start-${time}`}
                    type="button"
                    onClick={() => {
                      setNewShift({...newShift, start_time: time});
                      if (time >= newShift.end_time) {
                        const nextHourIndex = timeSlots.indexOf(time) + 2; 
                        if (nextHourIndex < timeSlots.length) {
                          setNewShift(prev => ({...prev, start_time: time, end_time: timeSlots[nextHourIndex]}));
                        }
                      }
                    }}
                    className={`py-2.5 px-2 rounded-xl border text-sm font-bold text-center transition-all
                      ${newShift.start_time === time 
                        ? 'border-google-blue bg-blue-50 text-google-blue shadow-sm' 
                        : 'border-gray-200 bg-white text-gray-700 hover:border-google-blue hover:bg-gray-50'
                      }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                เวลาเลิกงาน (End Time)
              </label>
              <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
                {timeSlots
                  .filter(t => t > newShift.start_time)
                  .map(time => (
                  <button
                    key={`end-${time}`}
                    type="button"
                    onClick={() => setNewShift({...newShift, end_time: time})}
                    className={`py-2.5 px-2 rounded-xl border text-sm font-bold text-center transition-all
                      ${newShift.end_time === time 
                        ? 'border-google-red bg-red-50 text-google-red shadow-sm' 
                        : 'border-gray-200 bg-white text-gray-700 hover:border-google-red hover:bg-gray-50'
                      }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Additional Settings */}
          <div className="grid grid-cols-2 gap-4 px-2">
            <CustomSelect 
              label="ตำแหน่งงาน"
              value={newShift.role_required}
              onChange={val => setNewShift({...newShift, role_required: val})}
              options={['WH Office', 'IT Staff', 'MHE Officer', 'Delivery', 'Maintenance']}
              className="rounded-2xl bg-gray-50 border-gray-200"
            />
            
            <div className="relative bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2 transition-all focus-within:ring-2 focus-within:ring-google-blue focus-within:border-google-blue">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight mb-0.5">จำนวนพนักงาน</label>
              <input 
                type="number"
                min="1"
                max="50"
                value={newShift.num_slots}
                onChange={e => setNewShift({...newShift, num_slots: parseInt(e.target.value) || 1})}
                className="block w-full bg-transparent outline-none text-sm font-bold text-gray-900"
              />
            </div>

            <div className="col-span-2 relative bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2 transition-all focus-within:ring-2 focus-within:ring-google-blue focus-within:border-google-blue">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight mb-0.5">ค่าแรงฐาน (บาท/ชั่วโมง)</label>
              <input 
                type="number"
                value={newShift.base_pay_rate}
                onChange={e => setNewShift({...newShift, base_pay_rate: Number(e.target.value)})}
                className="block w-full bg-transparent outline-none text-lg font-black text-gray-900"
                required
              />
            </div>

            <div className="space-y-3 col-span-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Surge Multiplier</label>
                <span className={`text-xs font-bold ${newShift.multiplier > 1 ? 'text-google-red' : 'text-gray-400'}`}>
                  {newShift.multiplier > 1 ? `Surge Active: ${Number(newShift.multiplier.toFixed(2))}x` : 'Normal Rate'}
                </span>
              </div>
              <M3ButtonGroup 
                options={['1', '1.25', '1.5', '1.75']}
                value={String(newShift.multiplier)}
                onChange={(val) => setNewShift({...newShift, multiplier: Number(val)})}
              />
              
              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${newShift.multiplier > 1 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Wallet className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-gray-600">ค่าแรงสุทธิที่จะประกาศ</span>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-black ${newShift.multiplier > 1 ? 'text-google-red-dark' : 'text-google-blue'}`}>
                    ฿{calculatedStats.currentPayRate?.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-gray-400 ml-1">/ชม.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Box */}
          <div className="bg-gray-900 rounded-3xl p-6 text-white mx-2 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-google-blue/10 rounded-full -mr-16 -mt-16"></div>
            <div className="flex justify-between items-center relative z-10">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">สรุปรายการ</p>
                <p className="text-sm font-medium">{calculatedStats.daysCount} วัน x {newShift.num_slots} คน</p>
                <p className="text-xs text-gray-500">{calculatedStats.hours} ชม./วัน</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-google-blue uppercase tracking-widest">ยอดจ่ายรวม</p>
                <p className="text-2xl font-black text-google-blue">฿{calculatedStats.totalPay?.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* --- MODAL: SUMMARY BEFORE BROADCAST --- */}
      <Modal
        isOpen={summaryModalOpen}
        onClose={() => setSummaryModalOpen(false)}
        title="สรุปรายการที่จะสร้าง"
        footer={
          // เพิ่ม items-center เพื่อให้ปุ่มจัดเรียงตรงกลางกันพอดี
          <div className="flex w-full gap-3 items-center">
            
            {/* 1. ปุ่มแก้ไข (กว้าง 35%) */}
            <div className="w-[35%]">
              <M3Button 
                variant="tonal"
                onClick={() => setSummaryModalOpen(false)}
                // เพิ่ม rounded-full และ flex เพื่อจัดไอคอนกับข้อความ
                className="w-full py-4 h-full rounded-full flex items-center justify-center"
                icon={<Pencil className="w-4 h-4 mr-2" />}
              >
                แก้ไข
              </M3Button>
            </div>
            
            {/* 2. ปุ่มยืนยัน (กว้าง 65%) */}
            <div className="w-[65%]">
              <M3SplitButton 
                label="ยืนยันการสร้าง"
                onClick={handleConfirmCreate}
                // (ถ้าลบ menuItems ใน M3SplitButton ไปแล้วตรงนี้ก็ไม่ต้องใส่ครับ)
              />
            </div>

          </div>
        }
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">ตำแหน่ง</p>
                <p className="font-bold text-google-navy-dark">{newShift.role_required}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">จำนวน</p>
                <p className="font-bold text-google-navy-dark">{newShift.num_slots} คน / วัน</p>
              </div>
              <div className="col-span-2 border-t border-blue-100 pt-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">ช่วงวันที่</p>
                <p className="font-bold text-google-navy-dark">
                  {startDate && format(startDate, 'd MMM')} - {endDate && format(endDate, 'd MMM yyyy')} 
                  <span className="ml-2 text-xs font-medium text-google-navy-dark">({calculatedStats.daysCount} วัน)</span>
                </p>
              </div>
              <div className="col-span-2 border-t border-blue-100 pt-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">เวลาทำงาน</p>
                <p className="font-bold text-google-navy-dark">{newShift.start_time} - {newShift.end_time} ({calculatedStats.hours} ชม.)</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-2xl p-4 text-white">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-400">ค่าแรงสุทธิ</span>
              <span className="font-bold text-google-blue">฿{calculatedStats.currentPayRate?.toLocaleString()} /ชม.</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-800">
              <span className="text-sm font-bold">ยอดจ่ายรวมทั้งสิ้น</span>
              <span className="text-xl font-black text-white">฿{calculatedStats.totalPay?.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-start gap-3 px-1">
            <Info className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-gray-500 leading-relaxed">
              เมื่อกดยืนยัน ระบบจะบันทึกตารางงานลงในระบบทันที คุณสามารถกด "แจ้งเตือน" ที่หน้าหลักเพื่อส่ง Broadcast ให้พนักงานในภายหลังได้
            </p>
          </div>
        </div>
      </Modal>

      {/* --- MODAL: REPLACEMENT / BIDDING MANAGEMENT --- */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedShift?.status === ShiftStatus.BIDDING ? "จัดการงานว่าง" : "หาพนักงานมาแทนด่วน"}
        footer={
          <div className="flex w-full gap-3">
            <M3Button 
              variant="text"
              onClick={() => setModalOpen(false)}
              className="flex-1"
            >
              ยกเลิก
            </M3Button>
            {selectedShift?.status === ShiftStatus.CREATED && (
                <M3Button 
                    onClick={() => {
                        handleSingleBroadcast(selectedShift);
                        setModalOpen(false);
                    }}
                    className="flex-1 bg-google-blue hover:bg-blue-700 shadow-lg shadow-blue-100"
                    icon={<Megaphone className="w-4 h-4" />}
                >
                    Broadcast ทันที
                </M3Button>
            )}
            {(selectedShift?.status === ShiftStatus.GHOSTED || selectedShift?.status === ShiftStatus.BIDDING) && (
                <M3Button 
                    onClick={confirmReplacement}
                    className="flex-1 bg-google-red hover:bg-red-700 shadow-lg shadow-red-100"
                >
                    ยืนยัน Surge (1.5x)
                </M3Button>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          {selectedShift?.status === ShiftStatus.GHOSTED ? (
            <div className="bg-red-50 p-3 rounded-2xl border border-red-100 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                <h4 className="font-bold text-red-800 text-sm">พนักงานไม่มาทำงาน!</h4>
                <p className="text-xs text-red-700 mt-1 leading-relaxed">
                    การประกาศหาพนักงานด่วนจะส่งแจ้งเตือนไปยังพนักงานทุกคนทันที โดยเพิ่มค่าแรงเป็น 1.5 เท่า
                </p>
                </div>
            </div>
          ) : selectedShift?.status === ShiftStatus.CREATED ? (
            <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100 flex items-start gap-3">
                <Info className="w-5 h-5 text-google-blue shrink-0 mt-0.5" />
                <div>
                <h4 className="font-bold text-google-blue text-sm">ตารางงานที่บันทึกแล้ว</h4>
                <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                    ตารางงานนี้พร้อมสำหรับการประกาศ (Broadcast) คุณสามารถกดปุ่ม "Broadcast ทันที" เพื่อส่งแจ้งเตือนให้พนักงานทุกคน
                </p>
                </div>
            </div>
          ) : (
            <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100 flex items-start gap-3">
                <Info className="w-5 h-5 text-google-blue shrink-0 mt-0.5" />
                <div>
                <h4 className="font-bold text-google-blue text-sm">งานว่าง (Bidding)</h4>
                <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                    งานนี้ยังไม่มีพนักงานรับ คุณสามารถกดปุ่ม "แจ้งเตือน" ที่หน้าหลักเพื่อส่ง Broadcast ให้พนักงานทุกคนได้
                </p>
                </div>
            </div>
          )}
          
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
             <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                   <p className="text-gray-400 font-bold uppercase text-[9px] tracking-widest mb-1">ตำแหน่ง</p>
                   <p className="font-bold text-gray-900 truncate">{selectedShift?.role_required}</p>
                </div>
                <div className="text-right">
                   <p className="text-gray-400 font-bold uppercase text-[9px] tracking-widest mb-1">เรทปกติ</p>
                   <p className="font-medium text-gray-400">฿{selectedShift?.base_pay_rate?.toLocaleString()}/ชม.</p>
                </div>
                <div className="col-span-2 border-t border-gray-200 pt-3 mt-1 flex justify-between items-center">
                   <span className="font-black text-gray-900">เรทปัจจุบัน:</span>
                   <span className={`font-black text-xl ${selectedShift?.current_pay_rate! > selectedShift?.base_pay_rate! ? 'text-red-600' : 'text-google-navy-dark'}`}>
                    ฿{selectedShift?.current_pay_rate?.toLocaleString()}/ชม.
                   </span>
                </div>
             </div>
          </div>
        </div>
      </Modal>

      
    </div>
  );
};