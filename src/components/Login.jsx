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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      // ההתחברות הצליחה - ה-AuthContext יזהה את השינוי לבד ויעביר אותנו לאפליקציה
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
          <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
             <LogIn size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-800">התחברות למערכת</h1>
          <p className="text-gray-500 text-sm mt-1">ניהול פרויקטים לקבלנים</p>
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

        <div className="text-center text-sm text-gray-500 border-t pt-4">
          אין לך עדיין חשבון? <button onClick={onSwitchToSignUp} className="text-blue-600 font-bold hover:underline">הירשם כאן</button>
        </div>
      </div>
    </div>
  );
}