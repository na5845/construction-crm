import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Save, Calendar, FileText, Loader2, X, Eye, Split, Trash2, AlertTriangle, ArrowRight, Copy, Scissors, AlertOctagon, Banknote } from 'lucide-react';
import CalendarWidget from './CalendarWidget'; 

export default function JobDetails({ clientId }) {
  const { orgId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // נתוני הטופס - הוספנו את price
  const [formData, setFormData] = useState({
    description: '',
    price: '', // <-- החדש
    startDate: '',
    endDate: '',
    startDate2: '', 
    endDate2: ''    
  });

  const [isSplit, setIsSplit] = useState(false); 
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const [scheduleData, setScheduleData] = useState({ tasks: [], projects: [], teamMembers: [] });
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // --- ניהול קונפליקטים ---
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictingProjects, setConflictingProjects] = useState([]);
  const [conflictType, setConflictType] = useState(null); 

  useEffect(() => {
    fetchJobDetails();
  }, [clientId]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFormData({
          description: data.description || '',
          price: data.price || '', // טעינת המחיר
          startDate: data.start_date || '',
          endDate: data.end_date || '',
          startDate2: data.start_date_2 || '',
          endDate2: data.end_date_2 || ''
        });
        if (data.start_date_2) setIsSplit(true);
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- פונקציות עזר לתאריכים ---
  const isWorkDay = (date) => { const day = date.getDay(); return day !== 5 && day !== 6; };
  const addWorkDays = (startDate, daysToAdd) => { let currentDate = new Date(startDate); let addedDays = 0; if (daysToAdd <= 0) return currentDate; while (addedDays < daysToAdd) { currentDate.setDate(currentDate.getDate() + 1); if (isWorkDay(currentDate)) addedDays++; } return currentDate; };
  const subtractWorkDays = (startDate, daysToSubtract) => { let currentDate = new Date(startDate); let subtractedDays = 0; while (subtractedDays < daysToSubtract) { currentDate.setDate(currentDate.getDate() - 1); if (isWorkDay(currentDate)) subtractedDays++; } return currentDate; };
  const getWorkDaysDuration = (start, end) => { let count = 0; let cur = new Date(start); const finish = new Date(end); if (cur > finish) return 0; while (cur <= finish) { if (isWorkDay(cur)) count++; cur.setDate(cur.getDate() + 1); } return count; };

  // --- לוח שנה ---
  const openAvailabilityCalendar = async () => {
      setIsCalendarOpen(true);
      document.body.style.overflow = 'hidden';
      setLoadingSchedule(true);
      try {
          const { data: teamData } = await supabase.from('profiles').select('id, full_name, color').eq('organization_id', orgId);
          const { data: tasks } = await supabase.from('tasks').select('*').eq('organization_id', orgId);
          const { data: projects } = await supabase.from('projects').select('*, clients!inner(full_name, status)').eq('organization_id', orgId).not('start_date', 'is', null);
          setScheduleData({ tasks: tasks || [], projects: projects || [], teamMembers: teamData || [] });
      } catch (error) { console.error(error); } 
      finally { setLoadingSchedule(false); }
  };

  const closeCalendar = () => { setIsCalendarOpen(false); document.body.style.overflow = 'unset'; };

  // --- שמירה ---
  const handlePreSave = async () => {
      if (!formData.startDate || !formData.endDate) { executeSave(); return; }
      setSaving(true);
      try {
          const { data: overlaps } = await supabase.from('projects').select('*, clients(full_name)').eq('organization_id', orgId).neq('client_id', clientId).not('start_date', 'is', null).or(`and(start_date.lte.${formData.endDate},end_date.gte.${formData.startDate})`);
          if (overlaps && overlaps.length > 0) {
              setConflictingProjects(overlaps);
              const newStart = new Date(formData.startDate); const newEnd = new Date(formData.endDate); const conflictStart = new Date(overlaps[0].start_date); const conflictEnd = new Date(overlaps[0].end_date);
              if (newStart > conflictStart && newEnd < conflictEnd) { setConflictType('split'); } else { setConflictType('shift'); }
              setConflictModalOpen(true); setSaving(false);
          } else { executeSave(); }
      } catch (err) { alert('שגיאה בבדיקת זמינות'); setSaving(false); }
  };

  const executeSave = async () => {
    setSaving(true);
    setConflictModalOpen(false);
    try {
      const projectData = {
          client_id: clientId,
          organization_id: orgId,
          description: formData.description,
          price: formData.price || 0, // שמירת המחיר
          start_date: formData.startDate || null,
          end_date: formData.endDate || null,
          start_date_2: isSplit ? (formData.startDate2 || null) : null,
          end_date_2: isSplit ? (formData.endDate2 || null) : null
      };

      const { error } = await supabase.from('projects').upsert(projectData, { onConflict: 'client_id' });
      if (error) throw error;

      // עדכון סטטוס אוטומטי אם התאריך הוא היום
      const today = new Date(); today.setHours(0,0,0,0);
      let shouldBeInProgress = false;
      if (formData.startDate && new Date(formData.startDate) <= today) shouldBeInProgress = true;
      if (isSplit && formData.startDate2 && new Date(formData.startDate2) <= today) shouldBeInProgress = true;
      if (shouldBeInProgress) await supabase.from('clients').update({ status: 'in_progress' }).eq('id', clientId);

      alert('הנתונים נשמרו בהצלחה! ✅');
    } catch (error) { alert('שגיאה: ' + error.message); } 
    finally { setSaving(false); }
  };

  // --- טיפול בקונפליקטים (דחיפה/פיצול) ---
  const handleShiftConflict = async () => { /* ... אותו קוד כמו קודם ... */ setSaving(true); setConflictModalOpen(false); try { const newStart = new Date(formData.startDate); const newEnd = new Date(formData.endDate); const shiftDays = getWorkDaysDuration(newStart, newEnd); const { data: futureProjects } = await supabase.from('projects').select('*').eq('organization_id', orgId).gte('start_date', formData.startDate).neq('client_id', clientId); const updates = futureProjects.map(p => { const pStart = new Date(p.start_date); const pEnd = new Date(p.end_date); const originalDuration = getWorkDaysDuration(pStart, pEnd); const newPStart = addWorkDays(pStart, shiftDays); const newPEnd = addWorkDays(newPStart, Math.max(0, originalDuration - 1)); return { client_id: p.client_id, description: p.description, start_date: newPStart.toISOString().split('T')[0], end_date: newPEnd.toISOString().split('T')[0], start_date_2: p.start_date_2 ? addWorkDays(new Date(p.start_date_2), shiftDays).toISOString().split('T')[0] : null, end_date_2: p.end_date_2 ? addWorkDays(new Date(p.end_date_2), shiftDays).toISOString().split('T')[0] : null }; }); if (updates.length > 0) await supabase.from('projects').upsert(updates, { onConflict: 'client_id' }); await executeSave(); alert(`הלוח עודכן! הפרויקטים הוזזו קדימה.`); } catch (error) { alert('שגיאה: ' + error.message); setSaving(false); } };
  const handleSplitVictim = async () => { /* ... אותו קוד כמו קודם ... */ setSaving(true); setConflictModalOpen(false); try { const victim = conflictingProjects[0]; const newStart = new Date(formData.startDate); const newEnd = new Date(formData.endDate); const victimPart1End = subtractWorkDays(newStart, 1); const victimPart2Start = addWorkDays(newEnd, 1); const totalOriginalDays = getWorkDaysDuration(new Date(victim.start_date), new Date(victim.end_date)); const daysDoneInPart1 = getWorkDaysDuration(new Date(victim.start_date), victimPart1End); const remainingDays = totalOriginalDays - daysDoneInPart1; const victimPart2End = addWorkDays(victimPart2Start, Math.max(0, remainingDays - 1)); const victimUpdate = { client_id: victim.client_id, description: victim.description, start_date: victim.start_date, end_date: victimPart1End.toISOString().split('T')[0], start_date_2: victimPart2Start.toISOString().split('T')[0], end_date_2: victimPart2End.toISOString().split('T')[0] }; await supabase.from('projects').upsert(victimUpdate, { onConflict: 'client_id' }); await executeSave(); alert(`הפרויקט של ${victim.clients.full_name} פוצל לשניים בהצלחה!`); } catch (error) { alert('שגיאה בפיצול: ' + error.message); setSaving(false); } };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="p-4 space-y-4 pb-24 animate-in slide-in-from-bottom-4 relative">
      
      {/* מודאל קונפליקט */}
      {conflictModalOpen && (
          <div className="fixed inset-0 z-[110] max-w-md mx-auto flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConflictModalOpen(false)}></div>
              <div className="bg-white w-full rounded-3xl shadow-2xl overflow-hidden relative z-10 animate-in zoom-in-95">
                  <div className="bg-red-50 p-6 text-center border-b border-red-100">
                      <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm"><AlertTriangle size={32} /></div>
                      <h3 className="text-xl font-black text-gray-800 mb-2">יש כבר פרויקט!</h3>
                      <p className="text-sm text-gray-600">התאריכים חופפים לפרויקט של <span className="font-bold">{conflictingProjects[0]?.clients?.full_name}</span>.</p>
                  </div>
                  <div className="p-4 space-y-3">
                      {conflictType === 'split' && <button onClick={handleSplitVictim} className="w-full flex items-center justify-between p-4 bg-white border-2 border-purple-100 hover:border-purple-500 hover:bg-purple-50 rounded-2xl group transition-all"><div className="text-right"><span className="block font-bold text-gray-800">פצל את הפרויקט הקיים</span><span className="text-xs text-gray-500">הוא יזוז ל"מועד ב'" אוטומטית</span></div><Scissors className="text-purple-300 group-hover:text-purple-600" /></button>}
                      {conflictType === 'shift' && <button onClick={handleShiftConflict} className="w-full flex items-center justify-between p-4 bg-white border-2 border-emerald-100 hover:border-emerald-500 hover:bg-emerald-50 rounded-2xl group transition-all"><div className="text-right"><span className="block font-bold text-gray-800">דחיפת הלוח</span><span className="text-xs text-gray-500">הזז הכל קדימה</span></div><ArrowRight className="text-emerald-300 group-hover:text-emerald-600" /></button>}
                      <button onClick={executeSave} className="w-full flex items-center justify-between p-3 bg-white border border-gray-100 hover:border-gray-300 rounded-xl group transition-all opacity-80"><div className="text-right"><span className="block font-bold text-gray-600 text-sm">התעלם (שמור במקביל)</span><span className="text-xs text-gray-400">שני הפרויקטים יהיו באותם ימים</span></div><Copy size={16} className="text-gray-300 group-hover:text-gray-500" /></button>
                  </div>
                  <div className="p-3 bg-gray-50 text-center"><button onClick={() => setConflictModalOpen(false)} className="text-gray-400 font-bold text-sm hover:text-gray-600">ביטול</button></div>
              </div>
          </div>
      )}

      {/* חלון זמינות */}
      {isCalendarOpen && (
          <div className="fixed inset-0 z-[100] max-w-md mx-auto flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeCalendar}></div>
              <div className="bg-white w-full rounded-3xl shadow-2xl flex flex-col overflow-hidden relative z-10" style={{ maxHeight: '85vh' }}>
                  <div className="bg-slate-900 p-4 text-white flex justify-between items-center shrink-0"><span className="font-bold flex items-center gap-2"><Calendar size={18} /> בדיקת זמינות</span><button onClick={closeCalendar} className="bg-white/20 p-2 rounded-full hover:bg-white/30"><X size={20} /></button></div>
                  <div className="flex-1 overflow-y-auto p-2 bg-gray-50">
                      {loadingSchedule ? <Loader2 className="animate-spin mx-auto mt-10" /> : <CalendarWidget tasks={scheduleData.tasks} projects={scheduleData.projects} teamMembers={scheduleData.teamMembers} />}
                      <div className="p-3 mt-2 bg-blue-50 text-blue-800 text-xs rounded-xl flex gap-2 mx-2"><AlertOctagon size={16} className="shrink-0"/><p>היומן מציג את כל הפרויקטים והמשימות של הצוות כדי למנוע התנגשויות.</p></div>
                  </div>
                  <div className="p-4 bg-white border-t text-center shrink-0"><button onClick={closeCalendar} className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl">חזור לשיבוץ תאריך</button></div>
              </div>
          </div>
      )}

      {/* --- כרטיס תיאור ומחיר --- */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><FileText className="text-blue-600" size={20} /> פרטי העבודה</h3>
        
        {/* תיאור */}
        <div className="mb-4">
            <label className="text-xs font-bold text-gray-500 mb-1 block">תיאור העבודה</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="פרט כאן מה צריך לבצע..." className="w-full h-24 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none resize-none focus:border-blue-500 text-sm" />
        </div>

        {/* מחיר העבודה - התוספת החדשה */}
        <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">מחיר העבודה (לא כולל מע"מ)</label>
            <div className="relative">
                <input 
                    type="number" 
                    value={formData.price} 
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })} 
                    placeholder="0" 
                    className="w-full p-3 pl-10 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-bold text-gray-800" 
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400 font-bold">₪</span>
                </div>
            </div>
        </div>
      </div>

      {/* תאריכים */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2"><Calendar className="text-blue-600" size={20} /> לוחות זמנים</h3>
            <button onClick={openAvailabilityCalendar} className="text-xs bg-blue-50 text-blue-600 px-3 py-2 rounded-full font-bold flex gap-1.5 border border-blue-100 shadow-sm"><Eye size={14} /> בדוק יומן</button>
        </div>
        
        {/* מועד א' */}
        <div className="mb-4">
            {isSplit && <div className="text-sm font-bold text-gray-400 mb-2 flex items-center gap-2"><span className="bg-blue-100 text-blue-600 w-5 h-5 flex items-center justify-center rounded-full text-xs">1</span>מועד עבודה ראשון</div>}
            <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-gray-500 mb-1 block">התחלה</label><input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500" /></div>
            <div><label className="text-xs font-bold text-gray-500 mb-1 block">סיום</label><input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500" /></div>
            </div>
        </div>

        {/* מועד ב' */}
        {!isSplit ? (
            <button onClick={() => setIsSplit(true)} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 font-bold hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"><Split size={18} />+ פיצול ידני (מועד ב')</button>
        ) : (
            <div className="animate-in slide-in-from-top-2 pt-4 border-t border-gray-100 mt-4">
                <div className="flex justify-between items-center mb-2"><div className="text-sm font-bold text-gray-400 flex items-center gap-2"><span className="bg-purple-100 text-purple-600 w-5 h-5 flex items-center justify-center rounded-full text-xs">2</span>מועד עבודה שני</div><button onClick={() => setIsSplit(false)} className="text-red-400 hover:bg-red-50 p-1.5 rounded-lg transition-colors"><Trash2 size={16} /></button></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold text-gray-500 mb-1 block">התחלה (חלק ב')</label><input type="date" value={formData.startDate2} onChange={(e) => setFormData({ ...formData, startDate2: e.target.value })} className="w-full p-3 bg-gray-50 border border-purple-100 focus:border-purple-500 rounded-xl outline-none" /></div>
                    <div><label className="text-xs font-bold text-gray-500 mb-1 block">סיום (חלק ב')</label><input type="date" value={formData.endDate2} onChange={(e) => setFormData({ ...formData, endDate2: e.target.value })} className="w-full p-3 bg-gray-50 border border-purple-100 focus:border-purple-500 rounded-xl outline-none" /></div>
                </div>
            </div>
        )}
      </div>

      <button onClick={handlePreSave} disabled={saving} className="w-full bg-slate-900 text-white p-4 rounded-xl font-bold text-lg shadow-lg shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2">
        {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />} שמור שינויים
      </button>
    </div>
  );
}