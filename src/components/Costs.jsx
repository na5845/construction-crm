import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Trash2, TrendingDown, Loader2, User, Wallet, Briefcase } from 'lucide-react';

export default function Costs({ clientId }) {
  const { orgId } = useAuth();
  
  const [costs, setCosts] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  
  const [newCost, setNewCost] = useState({ title: '', amount: '', payerId: 'client' });

  useEffect(() => {
    if (orgId) fetchData();
  }, [clientId, orgId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: costsData } = await supabase
        .from('project_costs')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });
      if (costsData) setCosts(costsData);

      const { data: teamData } = await supabase
        .from('profiles')
        .select('id, full_name, color')
        .eq('organization_id', orgId);
      if (teamData) setTeamMembers(teamData);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addCost = async (e) => {
    e.preventDefault();
    if (!newCost.title || !newCost.amount) return;
    
    setAdding(true);
    try {
        const { data, error } = await supabase.from('project_costs').insert([{
            client_id: clientId,
            title: newCost.title,
            amount: parseFloat(newCost.amount),
            payer_id: newCost.payerId
        }]).select().single();

        if (error) throw error;
        
        setCosts([...costs, data]);
        setNewCost({ title: '', amount: '', payerId: 'client' });
    } catch (error) {
        alert('שגיאה בהוספה: ' + error.message);
    } finally {
        setAdding(false);
    }
  };

  const deleteCost = async (id) => {
      if(!confirm('למחוק הוצאה זו?')) return;
      const { error } = await supabase.from('project_costs').delete().eq('id', id);
      if(!error) {
          setCosts(costs.filter(c => c.id !== id));
      }
  };

  const total = costs.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  
  const paidByClient = costs
    .filter(c => c.payer_id === 'client' || !c.payer_id)
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const paidByTeam = total - paidByClient;

  const getPayerInfo = (id) => {
      if (id === 'client' || !id) return { name: 'הלקוח', color: '#000', isClient: true };
      const member = teamMembers.find(m => m.id === id);
      return member ? { name: member.full_name, color: member.color, isClient: false } : { name: 'לא ידוע', color: '#999', isClient: false };
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-500"/></div>;

  return (
    <div className="p-4 space-y-4 pb-24 animate-in slide-in-from-bottom-4">
      
      {/* כרטיס סיכום */}
      <div className="bg-purple-100 text-purple-900 p-6 rounded-2xl shadow-sm flex justify-between items-center">
          <div>
              <p className="text-purple-700 text-sm mb-1 font-medium">סה"כ פרויקט</p>
              <h2 className="text-3xl font-black">₪ {total.toLocaleString()}</h2>
          </div>
          <div className="bg-purple-200 p-3 rounded-full text-purple-700"><TrendingDown size={24}/></div>
      </div>

      {/* פירוט מי שילם */}
      <div className="flex gap-3">
          <div className="flex-1 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-xs text-gray-500 font-bold mb-1 flex items-center gap-1"><User size={12}/> על חשבון הלקוח</p>
              <p className="text-lg font-bold text-gray-800">₪ {paidByClient.toLocaleString()}</p>
          </div>
          <div className="flex-1 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-xs text-gray-500 font-bold mb-1 flex items-center gap-1"><Wallet size={12}/> החזרי צוות</p>
              <p className="text-lg font-bold text-red-600">₪ {paidByTeam.toLocaleString()}</p>
          </div>
      </div>

      {/* טופס הוספה - כאן התיקון העיקרי לשדות */}
      <form onSubmit={addCost} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
          <div className="flex gap-2">
            {/* שם ההוצאה מקבל את כל המקום הפנוי (flex-1) */}
            <input 
                type="text" placeholder="שם ההוצאה" required
                className="flex-1 bg-gray-50 border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 min-w-0"
                value={newCost.title} onChange={e => setNewCost({...newCost, title: e.target.value})}
            />
            {/* הסכום מקבל רוחב קבוע וקטן יותר (w-28) */}
            <input 
                type="number" placeholder="סכום" required
                className="w-28 bg-gray-50 border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                value={newCost.amount} onChange={e => setNewCost({...newCost, amount: e.target.value})}
            />
          </div>
          
          <div className="flex gap-2">
              <select 
                className="flex-[2] bg-gray-50 border-none rounded-xl p-3 text-sm outline-none cursor-pointer font-medium text-gray-700"
                value={newCost.payerId}
                onChange={e => setNewCost({...newCost, payerId: e.target.value})}
              >
                  <option value="client">💳 הלקוח שילם</option>
                  {teamMembers.map(member => (
                      <option key={member.id} value={member.id}>👤 {member.full_name}</option>
                  ))}
              </select>

              <button disabled={adding} type="submit" className="flex-1 bg-slate-900 text-white p-3 rounded-xl font-bold text-sm shadow-md hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                  {adding ? <Loader2 className="animate-spin" size={18}/> : <><Plus size={18}/> הוסף</>}
              </button>
          </div>
      </form>

      {/* רשימת הוצאות - תיקון הגלישה */}
      <div className="space-y-2">
          {costs.length === 0 && <div className="text-center py-8 text-gray-300 text-sm">אין הוצאות רשומות</div>}
          
          {costs.map(cost => {
              const payer = getPayerInfo(cost.payer_id);
              return (
                  <div key={cost.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center group gap-2">
                      
                      {/* צד ימין: אייקון וטקסט (גמיש) */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0`} 
                               style={{ backgroundColor: payer.isClient ? '#1e293b' : payer.color }}>
                              {payer.isClient ? <Briefcase size={16}/> : payer.name.charAt(0)}
                          </div>
                          
                          <div className="overflow-hidden min-w-0 flex-1">
                              <p className="font-bold text-gray-800 truncate block w-full">{cost.title}</p>
                              <p className="text-[10px] text-gray-400 truncate block w-full">
                                  {payer.isClient ? 'שולם ע"י הלקוח' : `שולם ע"י ${payer.name}`}
                              </p>
                          </div>
                      </div>
                      
                      {/* צד שמאל: מחיר ומחיקה (קבוע) */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="font-bold text-sm text-slate-700 whitespace-nowrap">₪{Number(cost.amount).toLocaleString()}</span>
                          <button onClick={() => deleteCost(cost.id)} className="text-gray-300 hover:text-red-500 p-2"><Trash2 size={16} /></button>
                      </div>
                  </div>
              );
          })}
      </div>
    </div>
  );
}