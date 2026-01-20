import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext'; // ייבוא הקונטקסט של האימות
import { User, Phone, MapPin, Mail, Save, ArrowRight, Loader2 } from 'lucide-react';

export default function AddClient({ onBack, onSaveSuccess }) {
  const { orgId } = useAuth(); // שליפת ה-ID של הארגון של המשתמש המחובר
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    email: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // בדיקת תקינות בסיסית
    if (!formData.fullName.trim()) {
        alert('חובה להזין שם לקוח');
        return;
    }

    // וודוא שקיים מזהה ארגון לפני השמירה
    if (!orgId) {
        alert('שגיאה: לא נמצא מזהה ארגון המקושר לחשבון שלך. נסה להתחבר מחדש.');
        return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('clients')
        .insert([
          { 
            organization_id: orgId, // שיוך הלקוח לארגון הספציפי של הקבלן
            full_name: formData.fullName,
            phone: formData.phone,
            address: formData.address,
            email: formData.email,
            created_at: new Date(),
            status: 'proposal' // כל לקוח חדש מתחיל כהצעת מחיר
          }
        ]);

      if (error) throw error;

      // קריאה לפונקציית ההצלחה (רענון רשימה וחזרה לדף הבית)
      if (onSaveSuccess) onSaveSuccess();

    } catch (error) {
      console.error('Error adding client:', error);
      alert('שגיאה בהוספת לקוח: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col animate-in slide-in-from-left-4 duration-300">
      
      {/* סרגל עליון */}
      <div className="bg-white p-4 shadow-sm flex items-center gap-4 sticky top-0 z-10">
        <button onClick={onBack} className="p-2 bg-gray-50 rounded-xl hover:bg-gray-100 text-gray-600">
            <ArrowRight size={24} className="rotate-180" />
        </button>
        <h1 className="font-bold text-xl text-slate-800">הוספת לקוח חדש</h1>
      </div>

      <div className="p-6 flex-1 max-w-md mx-auto w-full">
        <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* כרטיס הזנת פרטים */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                
                <div>
                    <label className="text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-2">
                        <User size={16} className="text-blue-500" />
                        שם מלא <span className="text-red-500">*</span>
                    </label>
                    <input 
                        type="text" 
                        required
                        value={formData.fullName}
                        onChange={e => setFormData({...formData, fullName: e.target.value})}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-all"
                        placeholder="ישראל ישראלי"
                    />
                </div>

                <div>
                    <label className="text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-2">
                        <Phone size={16} className="text-blue-500" />
                        טלפון
                    </label>
                    <input 
                        type="tel" 
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-all"
                        placeholder="050-0000000"
                    />
                </div>

                <div>
                    <label className="text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-2">
                        <MapPin size={16} className="text-blue-500" />
                        כתובת
                    </label>
                    <input 
                        type="text" 
                        value={formData.address}
                        onChange={e => setFormData({...formData, address: e.target.value})}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-all"
                        placeholder="רחוב, עיר"
                    />
                </div>

                <div>
                    <label className="text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-2">
                        <Mail size={16} className="text-blue-500" />
                        אימייל (אופציונלי)
                    </label>
                    <input 
                        type="email" 
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-all"
                        placeholder="example@mail.com"
                    />
                </div>

            </div>

            {/* כפתורי שמירה וביטול */}
            <div className="flex gap-3 pt-4">
                <button 
                    type="button" 
                    onClick={onBack}
                    className="flex-1 p-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
                >
                    ביטול
                </button>
                <button 
                    type="submit" 
                    disabled={loading}
                    className="flex-[2] p-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                    שמור לקוח
                </button>
            </div>

        </form>
      </div>
    </div>
  );
}