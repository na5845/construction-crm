import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './contexts/AuthContext';
import ClientList from './components/ClientList';
import AddClient from './components/AddClient';
import Login from './components/Login';
import SignUp from './components/SignUp';
import { Loader2, LogOut, AlertTriangle } from 'lucide-react';

export default function App() {
  const { user, loading, orgId } = useAuth();
  
  // הדפסת מצב האפליקציה לקונסולה לצורך דיבוג
  console.log("📱 App Render -> Loading:", loading, "| User:", user?.email, "| OrgId:", orgId);

  const [authView, setAuthView] = useState('login');
  const [view, setView] = useState('list'); 
  const [clients, setClients] = useState([]);

  useEffect(() => {
    if (user && orgId) {
      const fetchClients = async () => {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('organization_id', orgId) // סינון לפי ארגון
          .order('created_at', { ascending: false });
        
        if (error) console.error("Error fetching clients:", error);
        setClients(data || []);
      };
      fetchClients();
    }
  }, [user, orgId]);

  // פונקציית יציאה חירום (למקרה שהמערכת נתקעת)
  const handleLogout = async () => {
      console.log("Manual logout triggered");
      await supabase.auth.signOut();
      localStorage.clear(); // ניקוי מקומי נוסף ליתר ביטחון
      window.location.reload();
  };

  // 1. מסך טעינה
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
            <Loader2 className="animate-spin text-blue-600 mx-auto mb-2" size={40} />
            <p className="text-gray-400 text-sm">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  // 2. מסך התחברות (אם אין משתמש)
  if (!user) {
    return authView === 'login' ? 
      <Login onSwitchToSignUp={() => setAuthView('signup')} /> : 
      <SignUp onSwitchToLogin={() => setAuthView('login')} />;
  }

  // 3. מסך שגיאה (אם יש משתמש אבל אין ארגון - מונע את הספינר האינסופי)
  if (!orgId) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">החשבון לא מוגדר כראוי</h2>
            <p className="text-gray-500 mt-2 text-sm">
                המשתמש זוהה, אך לא נמצא ארגון מקושר בפרופיל.
            </p>
            
            <div className="mt-6 space-y-3">
                <button 
                  onClick={() => window.location.reload()} 
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                >
                  נסה לרענן
                </button>
                
                <button 
                  onClick={handleLogout} 
                  className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut size={18} />
                  התנתק והירשם מחדש
                </button>
            </div>
        </div>
      </div>
    );
  }

  // 4. האפליקציה הראשית (הכל תקין)
  return (
    <div className="min-h-screen bg-gray-50 text-right" dir="rtl">
      {view === 'list' && (
        <ClientList 
          clients={clients}
          onSelect={() => setView('client-view')} 
          onAddClick={() => setView('add-client')}
          onRefresh={() => window.location.reload()} 
        />
      )}
      {view === 'add-client' && (
        <AddClient onBack={() => setView('list')} onSaveSuccess={() => setView('list')} />
      )}
    </div>
  );
}