import { useState } from 'react';
import { ChevronRight, ChevronLeft, Calendar as CalIcon, List, CheckSquare, Hammer, Clock, RotateCcw, User } from 'lucide-react';

export default function CalendarWidget({ tasks, projects = [], teamMembers = [], onDateSelect }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); 

  const weekDaysShort = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
  const weekDaysLong = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  // --- פונקציות עזר ---
  const getTaskColor = (task) => {
      if (task.assigned_to && task.assigned_to.length > 0 && teamMembers.length > 0) {
          const firstMemberId = task.assigned_to[0];
          const member = teamMembers.find(m => m.id === firstMemberId);
          if (member && member.color) return member.color;
      }
      if (task.profiles && task.profiles.color) return task.profiles.color;
      return '#3b82f6'; // כחול ברירת מחדל
  };

  const getAssigneeName = (task) => {
      if (task.assigned_to && task.assigned_to.length > 0 && teamMembers.length > 0) {
          const member = teamMembers.find(m => m.id === task.assigned_to[0]);
          if (member) return member.full_name;
      }
      if (task.profiles) return task.profiles.full_name;
      return null;
  };

  const isWorkDay = (date) => { 
      const day = date.getDay(); 
      return day !== 5 && day !== 6; 
  };

  const formatDateForCompare = (date) => { 
      return date.getFullYear() + '-' + 
             String(date.getMonth() + 1).padStart(2, '0') + '-' + 
             String(date.getDate()).padStart(2, '0'); 
  };

  const getTasksForDate = (dateObj) => {
    const dateStr = formatDateForCompare(dateObj);
    return tasks.filter(t => t.due_date === dateStr && !t.is_completed);
  };

  const getProjectsForDate = (dateObj) => {
    if (!isWorkDay(dateObj)) return [];
    const dateStr = formatDateForCompare(dateObj);
    return projects.filter(p => {
        const inRange1 = p.start_date && dateStr >= p.start_date && (!p.end_date || dateStr <= p.end_date);
        const inRange2 = p.start_date_2 && dateStr >= p.start_date_2 && (!p.end_date_2 || dateStr <= p.end_date_2);
        return inRange1 || inRange2;
    });
  };

  const navigate = (direction) => { 
      const newDate = new Date(currentDate); 
      if (viewMode === 'month') { 
          newDate.setMonth(newDate.getMonth() + direction); 
          newDate.setDate(1); 
      } else { 
          newDate.setDate(newDate.getDate() + (direction * 7)); 
      } 
      setCurrentDate(newDate); 
  };

  const goToToday = () => { 
      const today = new Date(); 
      setCurrentDate(today); 
      setSelectedDate(today); 
      if (onDateSelect) onDateSelect(today); 
  };

  const getWeekTitle = () => { 
      const startOfWeek = new Date(currentDate); 
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); 
      const endOfWeek = new Date(startOfWeek); 
      endOfWeek.setDate(startOfWeek.getDate() + 6); 
      if (startOfWeek.getMonth() === endOfWeek.getMonth()) { 
          return startOfWeek.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' }); 
      } 
      const startMonth = startOfWeek.toLocaleDateString('he-IL', { month: 'short' }); 
      const endMonth = endOfWeek.toLocaleDateString('he-IL', { month: 'short' }); 
      return `${startMonth} - ${endMonth} ${endOfWeek.getFullYear()}`; 
  };

  // --- תצוגה חודשית ---
  const renderMonthView = () => {
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    
    const days = Array.from({ length: daysInMonth + firstDay }, (_, i) => {
        return i < firstDay ? null : i - firstDay + 1;
    });

    return (
      <div className="animate-in fade-in">
        <div className="grid grid-cols-7 mb-2 text-center border-b border-gray-100 pb-2">
            {weekDaysShort.map(day => (<div key={day} className="text-xs text-gray-400 font-medium">{day}</div>))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            if (!day) return <div key={index}></div>;

            const thisDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === thisDate.getMonth();
            const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth();
            const dayTasks = getTasksForDate(thisDate);
            const dayProjects = getProjectsForDate(thisDate);
            const isWeekend = !isWorkDay(thisDate);

            return (
              <button 
                key={index} 
                onClick={() => { setSelectedDate(thisDate); if (onDateSelect) onDateSelect(thisDate); }} 
                className={`
                    relative h-11 w-full rounded-xl flex flex-col items-center justify-start pt-1 text-sm font-medium transition-all 
                    ${isSelected ? 'bg-blue-600 text-white shadow-md z-10 scale-105' : isToday ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-700 hover:bg-gray-50'} 
                    ${isWeekend && !isSelected ? 'text-gray-300' : ''}
                `}
              >
                {day}
                
                <div className="flex flex-col items-center gap-0.5 mt-0.5 w-full px-1">
                  {/* פרויקטים: פסים */}
                  {dayProjects.length > 0 && (
                      <div className="flex gap-0.5 w-full justify-center">
                          {dayProjects.slice(0, 2).map((p, idx) => (
                              <div key={idx} className={`h-1 rounded-full bg-emerald-500 opacity-80 ${dayProjects.length === 1 ? 'w-4' : 'w-2'}`}></div>
                          ))}
                      </div>
                  )}
                  
                  {/* משימות: נקודות */}
                  {dayTasks.length > 0 && (
                      <div className="flex gap-0.5 justify-center flex-wrap">
                          {dayTasks.slice(0, 3).map((t, i) => (
                              <div 
                                key={i} 
                                className={`w-1.5 h-1.5 rounded-full shadow-sm ${isSelected ? 'border border-white' : ''}`}
                                style={{ backgroundColor: getTaskColor(t) }}
                              ></div>
                          ))}
                          {dayTasks.length > 3 && <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>}
                      </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // --- תצוגה שבועית (מעודכנת) ---
  const renderWeekView = () => { 
    const startOfWeek = new Date(currentDate); 
    const dayOfWeek = startOfWeek.getDay(); 
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

    const weekDays = Array.from({ length: 7 }, (_, i) => { 
        const d = new Date(startOfWeek); 
        d.setDate(d.getDate() + i); 
        return d; 
    });

    return (
      <div className="space-y-3 mt-2 animate-in slide-in-from-bottom-2 pb-4">
        {weekDays.map((date, idx) => {
          const dayTasks = getTasksForDate(date);
          const dayProjects = getProjectsForDate(date);
          const isToday = date.toDateString() === new Date().toDateString();
          const isWeekend = !isWorkDay(date);

          return (
            <div key={idx} className={`flex gap-3 p-3 rounded-xl border transition-all ${isToday ? 'bg-blue-50 border-blue-200' : 'bg-gray-50/50 border-gray-100'} ${isWeekend ? 'opacity-60 bg-gray-50' : ''}`}>
              <div className="flex flex-col items-center justify-start min-w-[50px] border-l border-gray-200 pl-3 ml-1">
                <span className={`text-xs font-bold ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>{weekDaysLong[idx]}</span>
                <span className={`text-xl font-bold ${isToday ? 'text-blue-600' : 'text-gray-800'}`}>{date.getDate()}</span>
              </div>
              
              <div className="flex-1 space-y-2">
                
                {/* --- פרויקטים (עיצוב בלוק עם ריבוע) --- */}
                {dayProjects.map(project => (
                    <div key={project.client_id} className="bg-emerald-50 p-2 rounded-lg border border-emerald-100 flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                            <Hammer size={12} />
                        </div>
                        <div className="flex-1 min-w-0">
                             <span className="text-xs font-bold text-emerald-600 block">פרויקט פעיל</span>
                             <span className="text-sm font-bold text-gray-800 truncate block -mt-0.5">{project.clients.full_name}</span>
                        </div>
                    </div>
                ))}
                
                {/* --- משימות (עיצוב כרטיס עם עיגול) --- */}
                {dayTasks.map(task => (
                    <div key={task.id} className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm flex items-center gap-2">
                        {/* העיגול הצבעוני של המשימה */}
                        <div 
                            className="w-2.5 h-2.5 rounded-full shrink-0" 
                            style={{ backgroundColor: getTaskColor(task) }}
                        ></div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-700 truncate font-medium">{task.text}</span>
                                <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{task.time}</span>
                            </div>
                            {getAssigneeName(task) && (
                                <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                    <User size={10} /> {getAssigneeName(task)}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {dayTasks.length === 0 && dayProjects.length === 0 && (
                    <div className="h-full flex items-center">
                        <span className="text-xs text-gray-300 italic">{isWeekend ? 'סוף שבוע' : 'אין פעילות מתוכננת'}</span>
                    </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const headerTitle = viewMode === 'month' 
    ? currentDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' }) 
    : getWeekTitle();

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full animate-in fade-in">
      
      {/* כותרת עליונה */}
      <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-blue-700/50 rounded-full p-1">
                  <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-blue-500 rounded-full transition-all"><ChevronRight size={18} /></button>
                  <button onClick={() => navigate(1)} className="p-1.5 hover:bg-blue-500 rounded-full transition-all"><ChevronLeft size={18} /></button>
              </div>
              <button onClick={goToToday} className="text-xs font-bold bg-blue-700/50 hover:bg-blue-500 px-2.5 py-1.5 rounded-full transition-colors flex items-center gap-1">
                  <RotateCcw size={12} />היום
              </button>
          </div>
          
          <h3 className="font-bold text-lg dir-rtl hidden sm:block">{headerTitle}</h3>
          <h3 className="font-bold text-sm dir-rtl sm:hidden truncate max-w-[100px]">{headerTitle}</h3>
          
          <div className="flex bg-blue-700/50 p-1 rounded-xl">
              <button onClick={() => setViewMode('month')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-200 hover:text-white'}`}><CalIcon size={18} /></button>
              <button onClick={() => setViewMode('week')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'week' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-200 hover:text-white'}`}><List size={18} /></button>
          </div>
      </div>

      <div className={`flex-1 p-4 ${viewMode === 'week' ? 'overflow-y-auto' : ''}`}>
        {viewMode === 'month' ? renderMonthView() : renderWeekView()}
      </div>

      {viewMode === 'month' && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 min-h-[140px]">
            <h4 className="text-sm font-bold text-gray-500 mb-3 flex items-center gap-2"><Clock size={14}/>פעילות ליום {selectedDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}</h4>
            
            {(() => {
                const dateTasks = getTasksForDate(selectedDate);
                const dateProjects = getProjectsForDate(selectedDate);
                
                if (dateTasks.length === 0 && dateProjects.length === 0) 
                    return <div className="text-center py-4 text-gray-400 text-sm">{isWorkDay(selectedDate) ? 'אין פעילות בתאריך זה' : 'סוף שבוע 🏖️'}</div>;

                return (
                    <div className="space-y-2">
                        {dateProjects.map(p => (
                            <div key={p.client_id} className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center text-white shadow-sm">
                                         <Hammer size={12} />
                                    </div>
                                    <span className="font-bold text-gray-800">{p.clients.full_name}</span>
                                </div>
                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">פרויקט</span>
                            </div>
                        ))}
                        
                        {dateTasks.map(t => (
                             <div 
                                key={t.id} 
                                className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center" 
                             >
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        {/* עיגול צבעוני למשימה */}
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getTaskColor(t) }}></div>
                                        <span className="text-sm font-medium text-gray-700">{t.text}</span>
                                    </div>
                                    {getAssigneeName(t) && (
                                        <span className="text-[10px] text-gray-400 mr-5 flex items-center gap-1">
                                            {getAssigneeName(t)}
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">{t.time}</span>
                             </div>
                        ))}
                    </div>
                );
            })()}
        </div>
      )}
    </div>
  );
}