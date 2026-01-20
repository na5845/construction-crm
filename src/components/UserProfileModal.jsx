import { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { X, User, Save, Loader2, Shield, Briefcase, Camera, Trash2, Crown } from 'lucide-react';

export default function UserProfileModal({ isOpen, onClose }) {
  const { user, profile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileSelect = async (e) => {
    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `avatars/${user.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('project-files').upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('project-files').getPublicUrl(fileName);
      setAvatarUrl(publicUrl);

    } catch (error) {
      alert('שגיאה בהעלאת תמונה: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ full_name: fullName, avatar_url: avatarUrl }).eq('id', user.id);
      if (error) throw error;
      alert('הפרופיל עודכן בהצלחה!');
      window.location.reload(); 
    } catch (error) {
      alert('שגיאה: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSelfDelete = async () => {
      if (profile?.role === 'owner') {
          alert('בעלים לא יכול למחוק את עצמו מכאן. עליך למחוק את הארגון כולו דרך מסך ההגדרות.');
          return;
      }
      
      if (!confirm('⚠️ אזהרה חמורה!\n\nהאם אתה בטוח שברצונך למחוק את החשבון שלך?\nפעולה זו תמחק אותך מהמערכת לצמיתות ולא תוכל להיכנס יותר.')) return;

      try {
          const { error } = await supabase.rpc('delete_user_completely', { target_user_id: user.id });
          if (error) throw error;
          
          alert('החשבון נמחק בהצלחה.');
          await supabase.auth.signOut();
          localStorage.clear();
          window.location.reload();
      } catch (error) {
          alert('שגיאה במחיקה: ' + error.message);
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        
        {/* כותרת */}
        <div className="bg-slate-900 p-4 flex justify-between items-center text-white shrink-0">
          <h3 className="font-bold flex items-center gap-2"><User size={20} /> הפרופיל שלי</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
        </div>

        {/* תוכן - עם גלילה אם צריך */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* תמונת פרופיל */}
          <div className="flex justify-center">
             <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-24 h-24 rounded-full border-4 border-gray-100 overflow-hidden shadow-inner bg-gray-50 flex items-center justify-center">
                    {uploading ? <Loader2 className="animate-spin text-blue-500" /> : avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <User size={40} className="text-gray-300" />}
                </div>
                <div className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg border-2 border-white group-hover:bg-blue-700 transition-colors"><Camera size={14} /></div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect}/>
             </div>
          </div>

          {/* תצוגת תפקיד */}
          <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${profile?.role === 'owner' ? 'bg-yellow-500' : profile?.role === 'admin' ? 'bg-slate-800' : 'bg-blue-600'}`}>
                {profile?.role === 'owner' ? <Crown size={18}/> : profile?.role === 'admin' ? <Shield size={16}/> : <Briefcase size={18}/>}
            </div>
            <div>
                <p className="text-sm font-bold text-gray-800">
                    {profile?.role === 'owner' ? 'בעלים (Owner)' : profile?.role === 'admin' ? 'מנהל מערכת' : 'עובד צוות'}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">שם מלא</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:border-blue-500 transition-all" placeholder="השם שלך"/>
            </div>

            <button disabled={saving || uploading} className="w-full bg-slate-900 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
              {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />} שמור שינויים
            </button>
          </form>

          {/* כפתור מחיקת חשבון (רק אם לא בעלים) */}
          {profile?.role !== 'owner' && (
              <div className="pt-4 border-t border-gray-100 text-center">
                  <button onClick={handleSelfDelete} className="text-red-500 text-xs font-bold flex items-center justify-center gap-1 mx-auto hover:bg-red-50 px-3 py-2 rounded-lg transition-colors">
                      <Trash2 size={14} /> מחיקת החשבון שלי לצמיתות
                  </button>
              </div>
          )}
        </div>
      </div>
    </div>
  );
}