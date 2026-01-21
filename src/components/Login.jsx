import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, Mail, Lock, LogIn, AlertCircle } from 'lucide-react';

export default function Login({ onSwitchToSignUp }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      console.log("מתחיל תהליך התחברות...");
      
      // 1. התחברות ראשונית
      const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      console.log("משתמש התחבר בהצלחה, בודק ארגון...");

      // 2. משיכת נתוני הפרופיל
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // 3. בדיקת סטטוס הארגון
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('is_approved, created_at, trial_days')
        .eq('id', profile.organization_id)
        .single();

      if (orgError) throw orgError;

      // חישוב ימים
      const signupDate = new Date(org.created_at);
      const now = new Date();
      const diffTime = Math.abs(now - signupDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const allowedTrialDays = org.trial_days || 30;

      console.log(`ימים שעברו: ${diffDays}, ימים מותרים: ${allowedTrialDays}, מאושר: ${org.is_approved}`);

      // --- לוגיקת החסימה המתוקנת ---
      if (org.is_approved === false && diffDays > allowedTrialDays) {
        console.log("חסימה הופעלה! מציג הודעה וממתין לפני ניתוק...");
        
        // הצגת ההודעה
        setErrorMessage('תקופת הנסיון הסתיימה. אנא פנה למנהל המערכת בטלפון 0533153305');
        
        // עצירת הספינר כדי שיראו את ההודעה
        setLoading(false);

        // השהייה של 5 שניות לפני שמבצעים ניתוק בפועל
        // זה נותן למשתמש זמן לקרוא את ההודעה לפני שהמערכת מעיפה אותו
        setTimeout(async () => {
          console.log("מבצע ניתוק כעת...");
          await supabase.auth.signOut();
          // אופציונלי: לרענן את הדף כדי לוודא שהסטייט מתאפס לגמרי
          // window.location.reload(); 
        }, 5000);
        
        // חשוב: Return כדי שהפונקציה לא תמשיך למטה
        return;
      }

      console.log("הכל תקין, מעביר לדף הבית...");
      // כאן ה-AuthContext יזהה שהמשתמש מחובר ויעביר אותו דף
      
    } catch (error) {
      console.error("שגיאה בתהליך:", error.message);
      setErrorMessage('שגיאה: ' + error.message);
      setLoading(false); // במקרה של שגיאה רגילה, עוצרים מיד
    } 
    // הסרנו את ה-finally הגורף כדי לשלוט ידנית ב-loading במקרה של חסימה
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
          {/* תצוגת הודעת השגיאה המעוצבת */}
          {errorMessage && (
            <div className="bg-red-50 border-r-4 border-red-500 p-4 rounded-lg flex items-start gap-3 animate-pulse">
              <AlertCircle className="text-red-500 shrink-0" size={20} />
              <p className="text-red-800 text-sm font-semibold leading-relaxed">
                {errorMessage}
              </p>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">אימייל</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
              <input 
                type="email" required 
                className="w-full p-3 pl-10 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500 text-right"
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
                className="w-full p-3 pl-10 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500 text-right"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            disabled={loading} 
            className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-700 transition-all flex justify-center shadow-lg shadow-blue-200 disabled:bg-blue-400"
          >
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