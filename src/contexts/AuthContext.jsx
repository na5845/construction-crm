import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // פונקציית חירום לניקוי
  const forceLogout = async () => {
    try {
        await supabase.auth.signOut();
    } catch (e) { console.error(e); }
    localStorage.clear();
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  const fetchProfile = async (userId) => {
    console.log("🔍 Fetching profile for:", userId);
    
    try {
      // יצירת הבקשה לדאטה-בייס
      const queryPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      // יצירת טיימר של 4 שניות
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("DB_TIMEOUT")), 4000)
      );

      // תחרות: מי מסיים קודם? הבקשה או הטיימר?
      // זה מונע את המצב שהאתר נתקע לנצח
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
      
      if (error) throw error;

      if (data) {
        console.log("✅ Profile loaded:", data.full_name);
        setProfile(data);
        return true;
      } else {
        console.warn("⚠️ User has no profile. Logging out.");
        throw new Error("No Profile");
      }

    } catch (err) {
      console.error("❌ Profile Fetch Error:", err.message);
      // אם זה טיימר או שגיאה קריטית - ננתק
      await forceLogout();
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;

    // פונקציה אחת שמנהלת את הכל
    const handleSession = async (session) => {
        if (session?.user) {
            // רק אם אנחנו לא כבר טעונים עם אותו משתמש
            if (user?.id !== session.user.id) {
                const success = await fetchProfile(session.user.id);
                if (success && mounted) setUser(session.user);
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

    // האזנה לשינויים (כולל Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        handleSession(session);
    });

    return () => {
        mounted = false;
        subscription.unsubscribe();
    };
  }, []); // רוץ פעם אחת בלבד

  return (
    <AuthContext.Provider value={{ user, profile, orgId: profile?.organization_id, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);