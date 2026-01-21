import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, Mail, Lock, LogIn } from 'lucide-react';

export default function Login({ onSwitchToSignUp }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. התחברות ראשונית
      const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // 2. משיכת נתוני הפרופיל כדי לדעת לאיזה ארגון המשתמש שייך
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // 3. בדיקת סטטוס הארגון וימי הניסיון המוגדרים
      // שינוי: הוספנו את trial_days לשליפה
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('is_approved, created_at, trial_days') 
        .eq('id', profile.organization_id)
        .single();

      if (orgError) throw orgError;

      const signupDate = new Date(org.created_at);
      const now = new Date();
      const diffTime = Math.abs(now - signupDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // הגדרת ימי הניסיון: אם לא הוגדר ב-DB, ברירת המחדל היא 30 יום (או 0 אם תרצה)
      const allowedTrialDays = org.trial_days || 30;

      // לוגיקת החסימה: אם לא מאושר ידנית ועבר מספר הימים המוגדר
      if (!org.is_approved && diffDays > allowedTrialDays) {
        await supabase.auth.signOut(); // ניתוק המשתמש
        // שינוי: הודעה מעודכנת עם מספר הטלפון
        alert('תקופת הנסיון הסתיים אנא פנה למנהל המערכת בטלפון 0533153305');
        setLoading(false);
        return;
      }

      // אם הכל תקין, ה-AuthContext יזהה את ה-Session ויעביר לדף הבית
    } catch (error) {
      alert('שגיאה בהתחברות: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogIn className="text-blue-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">ברוך הבא</h1>
          <p className="text-gray-500 mt-2">התחבר למערכת ניהול הפרויקטים</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">אימייל</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
              <input 
                type="email" required 
                className="w-full p-3 pl-10 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">סיסמה</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
              <input 
                type="password" required 
                className="w-full p-3 pl-10 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button disabled={loading} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-700 transition-all flex justify-center shadow-lg shadow-blue-200">
            {loading ? <Loader2 className="animate-spin" /> : 'התחבר'}
          </button>
        </form>

        <div className="text-center pt-4 border-t">
          <button 
            onClick={onSwitchToSignUp}
            className="text-blue-600 font-medium hover:underline"
          >
            אין לך חשבון? הירשם עכשיו
          </button>
        </div>
      </div>
    </div>
  );
}