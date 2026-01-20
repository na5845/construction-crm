import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Trash2, CheckCircle, Target, Loader2 } from 'lucide-react';

export default function Targets({ clientId }) {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTarget, setNewTarget] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchTargets();
  }, [clientId]);

  const fetchTargets = async () => {
    try {
      const { data, error } = await supabase
        .from('project_targets')
        .select('*')
        .eq('client_id', clientId)
        .order('id', { ascending: true }); // שומר על הסדר לפי סדר הוספה

      if (error) throw error;
      setTargets(data || []);
    } catch (error) {
      console.error('Error fetching targets:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTarget = async (e) => {
    e.preventDefault();
    if (!newTarget.trim()) return;
    
    setAdding(true);
    try {
        const { data, error } = await supabase.from('project_targets').insert([{
            client_id: clientId,
            text: newTarget,
            is_completed: false
        }]).select().single();

        if (error) throw error;
        
        setTargets([...targets, data]);
        setNewTarget('');
    } catch (error) {
        alert('שגיאה בהוספה');
    } finally {
        setAdding(false);
    }
  };

  const toggleTarget = async (item) => {
      // עדכון מקומי מהיר
      const updatedTargets = targets.map(t => t.id === item.id ? { ...t, is_completed: !t.is_completed } : t);
      setTargets(updatedTargets);

      // עדכון בשרת
      await supabase.from('project_targets').update({ is_completed: !item.is_completed }).eq('id', item.id);
  };

  const deleteTarget = async (id) => {
      if(!confirm('למחוק יעד זה?')) return;
      await supabase.from('project_targets').delete().eq('id', id);
      setTargets(targets.filter(t => t.id !== id));
  };

  const completedCount = targets.filter(t => t.is_completed).length;
  const progress = targets.length > 0 ? Math.round((completedCount / targets.length) * 100) : 0;

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-500"/></div>;

  return (
    <div className="p-4 space-y-6 pb-24 animate-in slide-in-from-bottom-4">
      
      {/* כרטיס התקדמות */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">התקדמות ביעדים</h2>
            <div className="text-4xl font-black text-slate-800 mb-1">{progress}%</div>
            <p className="text-sm text-gray-400">הושלמו {completedCount} מתוך {targets.length} משימות</p>
          </div>
          
          {/* Progress Bar Background */}
          <div className="absolute bottom-0 left-0 h-1.5 bg-gray-100 w-full">
              <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
          </div>
      </div>

      {/* טופס הוספה */}
      <form onSubmit={addTarget} className="flex gap-2">
          <input 
            type="text" 
            placeholder="הוסף יעד חדש (למשל: סיום ריצוף)" 
            className="flex-1 bg-white border border-gray-200 rounded-xl p-4 shadow-sm outline-none focus:border-blue-500 transition-colors"
            value={newTarget}
            onChange={e => setNewTarget(e.target.value)}
          />
          <button disabled={adding} type="submit" className="bg-slate-900 text-white p-4 rounded-xl shadow-lg hover:bg-slate-800 transition-all">
              {adding ? <Loader2 className="animate-spin" /> : <Plus />}
          </button>
      </form>

      {/* רשימת יעדים */}
      <div className="space-y-3">
          {targets.length === 0 && (
              <div className="text-center py-10 text-gray-400">
                  <Target size={40} className="mx-auto mb-2 opacity-20"/>
                  <p>אין יעדים מוגדרים לפרויקט זה</p>
              </div>
          )}

          {targets.map(target => (
              <div key={target.id} className={`flex items-center p-4 rounded-xl border transition-all duration-300 ${target.is_completed ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-gray-100 shadow-sm'}`}>
                  
                  <button onClick={() => toggleTarget(target)} className={`p-1 rounded-full mr-3 transition-colors ${target.is_completed ? 'text-emerald-500' : 'text-gray-300 hover:text-blue-500'}`}>
                      <CheckCircle size={28} className={target.is_completed ? "fill-emerald-500 text-white" : ""} />
                  </button>
                  
                  <span className={`flex-1 font-medium text-lg ${target.is_completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                      {target.text}
                  </span>

                  <button onClick={() => deleteTarget(target.id)} className="text-gray-300 hover:text-red-500 p-2 opacity-50 hover:opacity-100 transition-all">
                      <Trash2 size={18} />
                  </button>
              </div>
          ))}
      </div>
    </div>
  );
}