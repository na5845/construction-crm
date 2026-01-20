import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, Briefcase, User, Mail, Lock, Building2, UserPlus, ArrowRight } from 'lucide-react';

export default function SignUp({ onSwitchToLogin }) {
  const [loading, setLoading] = useState(false);
  const [checkingInvite, setCheckingInvite] = useState(false);
  const [inviteFound, setInviteFound] = useState(null);
  const [showChoiceModal, setShowChoiceModal] = useState(false);

  const [formData, setFormData] = useState({ fullName: '', businessName: '', email: '', password: '' });

  const handleInitialSubmit = async (e) => {
    e.preventDefault();
    setCheckingInvite(true);
    try {
      const { data: orgName, error } = await supabase.rpc('check_user_invite', { lookup_email: formData.email });
      if (error) throw error;

      if (orgName) {
        setInviteFound(orgName);
        setShowChoiceModal(true);
      } else {
        await performSignUp({ joinExisting: false });
      }
    } catch (error) {
      console.error(error);
      await performSignUp({ joinExisting: false });
    } finally {
      setCheckingInvite(false);
    }
  };

  const performSignUp = async ({ joinExisting }) => {
    setLoading(true);
    setShowChoiceModal(false);
    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            business_name: joinExisting ? null : formData.businessName,
            join_existing: joinExisting 
          }
        }
      });
      if (error) throw error;
      alert('הרשמה בוצעה! אנא אשר את המייל.');
      if (onSwitchToLogin) onSwitchToLogin();
    } catch (error) {
      alert('שגיאה: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 relative">
      {showChoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-900 p-6 text-white text-center">
              <UserPlus size={40} className="mx-auto mb-3 text-blue-400" />
              <h2 className="text-xl font-bold">נמצאה הזמנה קיימת!</h2>
              <p className="text-slate-300 text-sm mt-1">הוזמנת לצוות של:</p>
              <div className="mt-2 bg-white/10 py-2 px-4 rounded-lg font-bold text-lg text-yellow-300">{inviteFound}</div>
            </div>
            <div className="p-6 space-y-4">
              <button onClick={() => performSignUp({ joinExisting: true })} className="w-full bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center justify-between group hover:bg-blue-100 transition-all">
                <div className="flex items-center gap-3">
                   <div className="bg-blue-500 text-white p-2 rounded-lg"><UserPlus size={20}/></div>
                   <div className="text-right"><span className="block font-bold text-gray-800">הצטרף לצוות</span><span className="text-xs text-gray-500">אני עובד/ת כאן</span></div>
                </div>
                <ArrowRight className="text-gray-300 group-hover:text-blue-500 rotate-180"/>
              </button>
              <button onClick={() => performSignUp({ joinExisting: false })} className="w-full bg-white border border-gray-200 p-4 rounded-xl flex items-center justify-between group hover:bg-gray-50 transition-all">
                <div className="flex items-center gap-3">
                   <div className="bg-gray-200 text-gray-600 p-2 rounded-lg"><Building2 size={20}/></div>
                   <div className="text-right"><span className="block font-bold text-gray-800">פתח חדש</span><span className="text-xs text-gray-500">אני רוצה חשבון נפרד</span></div>
                </div>
                <ArrowRight className="text-gray-300 group-hover:text-gray-600 rotate-180"/>
              </button>
            </div>
            <div className="bg-gray-50 p-3 text-center border-t border-gray-100"><button onClick={() => setShowChoiceModal(false)} className="text-xs font-bold text-gray-400 hover:text-gray-600">ביטול</button></div>
          </div>
        </div>
      )}

      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md space-y-6">
        <div className="text-center"><h1 className="text-2xl font-black text-slate-800">הרשמה למערכת</h1><p className="text-gray-500 text-sm mt-1">פתח חשבון ונהל את העסק</p></div>
        <form onSubmit={handleInitialSubmit} className="space-y-4">
          <div><label className="text-xs font-bold text-gray-500 mb-1 block">שם מלא</label><div className="relative"><User className="absolute right-3 top-3 text-gray-400" size={18} /><input type="text" required className="w-full p-3 pr-10 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} /></div></div>
          <div><label className="text-xs font-bold text-gray-500 mb-1 block">שם העסק</label><div className="relative"><Briefcase className="absolute right-3 top-3 text-gray-400" size={18} /><input type="text" required className="w-full p-3 pr-10 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500" value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} /></div></div>
          <div><label className="text-xs font-bold text-gray-500 mb-1 block">אימייל</label><div className="relative"><Mail className="absolute right-3 top-3 text-gray-400" size={18} /><input type="email" required className="w-full p-3 pr-10 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div></div>
          <div><label className="text-xs font-bold text-gray-500 mb-1 block">סיסמה</label><div className="relative"><Lock className="absolute right-3 top-3 text-gray-400" size={18} /><input type="password" required minLength={6} className="w-full p-3 pr-10 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /></div></div>
          <button disabled={loading || checkingInvite} className="w-full bg-slate-900 text-white p-4 rounded-xl font-bold hover:bg-slate-800 transition-all flex justify-center">{loading || checkingInvite ? <Loader2 className="animate-spin" /> : 'צור חשבון'}</button>
        </form>
        <div className="text-center text-sm text-gray-500">כבר יש לך חשבון? <button onClick={onSwitchToLogin} className="text-blue-600 font-bold underline">התחבר כאן</button></div>
      </div>
    </div>
  );
}