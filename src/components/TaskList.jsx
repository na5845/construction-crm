import { useState } from 'react';
import { CheckSquare, Trash2, Filter, Clock, Calendar as CalIcon, Plus, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function TaskList({ tasks, teamMembers, onToggle, onDelete, onAddClick }) {
  const { user, profile } = useAuth();
  const [filterUser, setFilterUser] = useState('all'); 

  const isManager = ['admin', 'owner'].includes(profile?.role);

  const filteredTasks = tasks.filter(task => {
    const assignees = task.assigned_to || [];

    if (isManager) {
        if (filterUser === 'all') return true;
        if (filterUser === 'unassigned') return assignees.length === 0;
        return assignees.includes(filterUser);
    }

    return assignees.includes(user.id) || assignees.length === 0;
  });

  return (
    <div className="flex flex-col h-full relative animate-in fade-in">
      
      {/* כותרת ופילטרים */}
      <div className="bg-white p-4 shadow-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <CheckSquare className="text-emerald-500" /> כל המשימות
            </h2>
            <span className="text-xs font-bold bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full">
                {filteredTasks.length} פתוחות
            </span>
        </div>

        {isManager && (
            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                <Filter size={16} className="text-gray-400" />
                <select 
                    value={filterUser} 
                    onChange={(e) => setFilterUser(e.target.value)}
                    className="bg-transparent text-sm font-bold text-slate-700 outline-none w-full cursor-pointer"
                >
                    <option value="all">כל המשימות (כולם)</option>
                    <option value="unassigned">-- ללא שיוך --</option>
                    {teamMembers.map(member => (
                        <option key={member.id} value={member.id}>{member.full_name}</option>
                    ))}
                </select>
            </div>
        )}
      </div>

      {/* רשימת המשימות */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {filteredTasks.length === 0 ? (
            <div className="text-center py-10 opacity-50 flex flex-col items-center">
                <div className="bg-gray-100 p-4 rounded-full mb-3">
                    <CheckSquare size={32} className="text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">אין משימות להצגה</p>
            </div>
        ) : (
            filteredTasks.map(task => (
                <div key={task.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 group transition-all hover:shadow-md">
                    <div className="flex items-start gap-3">
                        <button 
                            onClick={() => onToggle(task)} 
                            className={`mt-1 p-1 rounded-full transition-colors shrink-0 ${task.is_completed ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}
                        >
                            <CheckSquare size={20} />
                        </button>

                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${task.is_completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                {task.text}
                            </p>
                            
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                                    <CalIcon size={10} /> {new Date(task.due_date).toLocaleDateString('he-IL')}
                                    <span className="mx-1 text-gray-300">|</span>
                                    <Clock size={10} /> {task.time}
                                </span>

                                {/* --- שינוי כאן: הצגת שם מלא בתוך תגית --- */}
                                {task.assigned_to && task.assigned_to.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                        {task.assigned_to.map(assigneeId => {
                                            const member = teamMembers.find(m => m.id === assigneeId);
                                            if (!member) return null;
                                            return (
                                                <div 
                                                    key={assigneeId}
                                                    className="px-2 py-0.5 rounded-full border border-white text-[10px] font-bold text-white shadow-sm whitespace-nowrap"
                                                    style={{ backgroundColor: member.color || '#999' }}
                                                >
                                                    {member.full_name} {/* הוסר ה-charAt(0) */}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <span className="text-[10px] text-gray-400 italic flex items-center gap-1">
                                        <AlertCircle size={10}/> ללא שיוך
                                    </span>
                                )}
                            </div>
                        </div>

                        <button onClick={() => onDelete(task.id)} className="text-gray-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            ))
        )}
      </div>

      <button 
        onClick={onAddClick} 
        className="fixed bottom-6 left-6 bg-slate-900 text-white p-4 rounded-full shadow-xl hover:bg-slate-800 transition-all z-30 active:scale-90"
      >
        <Plus size={24} />
      </button>
    </div>
  );
}