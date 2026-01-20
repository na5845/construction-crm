import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Users, UserPlus, Trash2, Loader2, Shield, Briefcase, Plus, Crown, Palette } from 'lucide-react';

export default function TeamManagement() {
  const { orgId, user, profile } = useAuth();
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('worker'); 
  const [selectedColor, setSelectedColor] = useState('#3b82f6'); // ברירת מחדל: כחול

  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);

  const isOwner = profile?.role === 'owner';

  useEffect(() => {
    if (orgId) fetchData();
  }, [orgId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: teamData } = await supabase.from('profiles').select('*').eq('organization_id', orgId).order('role');
      if (teamData) setMembers(teamData);

      const { data: inviteData } = await supabase.from('organization_invites').select('*').eq('organization_id', orgId);
      if (inviteData) setInvites(inviteData);

    } catch (error) {
      console.error("Error fetching team:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!newEmail) return;

    try {
      setInviting(true);
      const { error } = await supabase.from('organization_invites').insert([{
        organization_id: orgId,
        email: newEmail.toLowerCase(),
        role: newRole,
        color: selectedColor // שמירת הצבע שנבחר בפיקר
      }]);

      if (error) throw error;
      alert('ההזמנה נשלחה!');
      setNewEmail('');
      setNewRole('worker');
      setSelectedColor('#3b82f6'); // איפוס לכחול
      fetchData();
    } catch (error) {
      alert('שגיאה: ' + error.message);
    } finally {
      setInviting(false);
    }
  };

  const removeMember = async (memberToDelete) => {
      if (memberToDelete.id === user.id) return alert('לא ניתן למחוק את עצמך.');
      if (memberToDelete.role === 'owner') return alert('לא ניתן למחוק את הבעלים!');
      if (memberToDelete.role === 'admin' && !isOwner) return alert('רק בעלים יכול למחוק מנהל.');

      if(!confirm(`האם למחוק את ${memberToDelete.full_name}?`)) return;
      
      try {
          const { error } = await supabase.rpc('delete_user_completely', { target_user_id: memberToDelete.id });
          if (error) throw error;
          alert('המשתמש נמחק בהצלחה.');
          fetchData();
      } catch (error) { alert('שגיאה במחיקה: ' + error.message); }
  };

  const deleteInvite = async (id) => {
      await supabase.from('organization_invites').delete().eq('id', id);
      fetchData();
  };

  const changeRole = async (memberId, newRole) => {
      if (!isOwner) return;
      if (!confirm('האם לשנות את תפקיד המשתמש?')) return;
      try {
          const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', memberId);
          if (error) throw error;
          fetchData();
      } catch (error) { alert('שגיאה: ' + error.message); }
  };

  // פונקציה לעדכון צבע לעובד קיים
  const changeMemberColor = async (memberId, color) => {
      try {
          await supabase.from('profiles').update({ color }).eq('id', memberId);
          setMembers(members.map(m => m.id === memberId ? { ...m, color } : m));
      } catch (e) { console.error(e); }
  };

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-blue-500"/></div>;

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2">
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
              <UserPlus size={20} className="text-blue-600" /> הוספת איש צוות
          </h3>
          <p className="text-sm text-gray-500 mb-4">הכנס אימייל, בחר תפקיד וצבע מזהה.</p>
          
          <form onSubmit={handleInvite} className="flex flex-col gap-4">
              <div className="flex gap-2">
                 <input type="email" required placeholder="email@worker.com" className="flex-[2] bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none text-left focus:border-blue-500" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                 <select value={newRole} onChange={e => setNewRole(e.target.value)} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none cursor-pointer focus:border-blue-500">
                      <option value="worker">עובד</option>
                      <option value="admin">מנהל</option>
                  </select>
              </div>

              {/* --- כאן השינוי: בוחר צבעים במקום כפתורים --- */}
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-sm font-bold text-gray-600 flex items-center gap-2">
                      <Palette size={16}/> בחר צבע ללוח השנה:
                  </span>
                  
                  <div className="relative w-10 h-10 rounded-full border-2 border-white shadow-md cursor-pointer hover:scale-105 transition-transform overflow-hidden">
                      {/* תצוגת הצבע הנבחר */}
                      <div 
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: selectedColor }}
                      >
                      </div>
                      
                      {/* ה-Input האמיתי מוסתר מעל */}
                      <input 
                        type="color" 
                        value={selectedColor}
                        onChange={(e) => setSelectedColor(e.target.value)}
                        className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                        title="בחר צבע"
                      />
                  </div>
                  <span className="text-xs text-gray-400">(לחץ על העיגול לשינוי)</span>
              </div>

              <button disabled={inviting} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-md flex items-center justify-center gap-2">
                  {inviting ? <Loader2 className="animate-spin" size={20}/> : <><Plus size={20}/> שלח הזמנה</>}
              </button>
          </form>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Users size={20} className="text-blue-600" /> חברי הצוות</h3>
          <div className="space-y-3">
              {members.map(member => (
                  <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 gap-3">
                      <div className="flex items-center gap-3">
                          {/* אינדיקטור צבע (לחיצה משנה צבע - גם כאן זה אותו טריק) */}
                          <div className="relative group hover:scale-105 transition-transform">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm border-2 border-white" style={{ backgroundColor: member.color || '#ccc' }}>
                                  {member.role === 'owner' ? <Crown size={18}/> : member.role === 'admin' ? <Shield size={16}/> : <Briefcase size={18}/>}
                              </div>
                              {/* קומבינה לשינוי צבע מהיר */}
                              <input type="color" value={member.color || '#000000'} onChange={(e) => changeMemberColor(member.id, e.target.value)} className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer" title="שנה צבע לעובד זה" />
                          </div>
                          
                          <div>
                              <p className="font-bold text-gray-800 text-sm">{member.full_name}</p>
                              {isOwner && member.id !== user.id ? (
                                  <select value={member.role} onChange={(e) => changeRole(member.id, e.target.value)} className="text-xs bg-white border border-gray-300 rounded px-1 py-0.5 outline-none cursor-pointer mt-1">
                                      <option value="worker">עובד</option>
                                      <option value="admin">מנהל</option>
                                  </select>
                              ) : (
                                  <p className="text-xs text-gray-500 capitalize">{member.role === 'owner' ? 'בעלים' : member.role === 'admin' ? 'מנהל' : 'עובד'}</p>
                              )}
                          </div>
                      </div>
                      
                      {member.id !== user.id && member.role !== 'owner' && (
                          <button onClick={() => removeMember(member)} className="text-gray-300 hover:text-red-500 p-2"><Trash2 size={16} /></button>
                      )}
                  </div>
              ))}
          </div>

          {invites.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">ממתינים</h4>
                <div className="space-y-2">
                {invites.map(invite => (
                    <div key={invite.id} className="flex items-center justify-between p-3 bg-yellow-50/50 rounded-xl border border-yellow-100 border-dashed">
                            <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full shadow-sm border border-white" style={{ backgroundColor: invite.color }}></div>
                            <span className="text-sm text-gray-600 font-medium">{invite.email}</span>
                            </div>
                            <button onClick={() => deleteInvite(invite.id)} className="text-gray-400 hover:text-red-500 text-xs">ביטול</button>
                    </div>
                ))}
                </div>
            </div>
          )}
      </div>
    </div>
  );
}