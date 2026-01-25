import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // פונקציית יציאה יזומה
  const forceLogout = async () => {
    try {
        await supabase.auth.signOut();
    } catch (e) { console.error(e); }
    localStorage.clear(); // מחיקה מוחלטת
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  const fetchProfile = async (userId) => {
    console.log("🔍 Fetching profile for:", userId);
    
    try {
      const queryPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      // תיקון: הארכת זמן ההמתנה מ-4 ל-15 שניות (קריטי למובייל)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("DB_TIMEOUT")), 15000)
      );

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
      
      if (error) throw error;

      if (data) {
        console.log("✅ Profile loaded:", data.full_name);
        setProfile(data);
        return true;
      } else {
        console.warn("⚠️ User has no profile.");
        // ביטלתי את הניתוק האוטומטי כאן כדי למנוע לופים של יציאה
        return false; 
      }

    } catch (err) {
      console.error("❌ Profile Fetch Error:", err.message);
      // תיקון קריטי: לא לנתק את המשתמש אם יש בעיית אינטרנט רגעית!
      // במקום forceLogout, אנחנו רק מפסיקים את הטעינה
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;

    const handleSession = async (session) => {
        if (session?.user) {
            setUser(session.user); // קודם כל נשמור את המשתמש כדי שלא ירצד
            if (user?.id !== session.user.id) {
                await fetchProfile(session.user.id);
            }
        } else {
            setUser(null);
            setProfile(null);
        }
        if (mounted) setLoading(false);
    };

    // בדיקה ראשונית
    supabase.auth.getSession().then(({ data: { session } }) => {
        handleSession(session);
    });

    // האזנה לשינויים
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        handleSession(session);
    });

    return () => {
        mounted = false;
        subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, orgId: profile?.organization_id, loading, forceLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);