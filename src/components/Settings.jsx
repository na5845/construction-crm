import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext'; 
import { 
  Trash2, Plus, Upload, Loader2, Image as ImageIcon, 
  LayoutTemplate, Home, Palette, ListChecks, Check, Users, AlertOctagon
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// ייבוא הרכיב לניהול צוות
import TeamManagement from './TeamManagement';

// ייבוא Worker ל-PDF
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function Settings() {
  const { orgId, profile } = useAuth();
  
  // בדיקת הרשאות
  const isManager = ['admin', 'owner'].includes(profile?.role);
  const isOwner = profile?.role === 'owner';

  // קביעת הטאב ההתחלתי: מנהל מתחיל במיתוג, עובד מתחיל בתנאים
  const [activeTab, setActiveTab] = useState(isManager ? 'branding' : 'terms');

  // States
  const [terms, setTerms] = useState([]);
  const [newTerm, setNewTerm] = useState('');
  const [settings, setSettings] = useState({
    letterhead_url: null, logo_url: null,
    padding_top: 150, padding_bottom: 100, padding_right: 40, padding_left: 40
  });
  
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [deletingOrg, setDeletingOrg] = useState(false);

  useEffect(() => {
    if (orgId) fetchAllData();
  }, [orgId]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
        // טעינת תנאים (לכולם)
        const { data: termsData } = await supabase.from('terms_library').select('*').eq('organization_id', orgId).order('id');
        if (termsData) setTerms(termsData);

        // טעינת הגדרות מיתוג (רק למנהלים)
        if (isManager) {
            const { data: settingsData } = await supabase.from('user_settings').select('*').eq('organization_id', orgId).maybeSingle(); 
            if (settingsData) {
                setSettings({
                    letterhead_url: settingsData.letterhead_url,
                    logo_url: settingsData.logo_url,
                    padding_top: settingsData.padding_top || 150,
                    padding_bottom: settingsData.padding_bottom || 100,
                    padding_right: settingsData.padding_right || 40,
                    padding_left: settingsData.padding_left || 40
                });
            }
        }
    } catch (error) {
        console.error("Error fetching settings:", error);
    } finally {
        setLoading(false);
    }
  };

  // --- המרת PDF לתמונה ---
  const convertPdfToImage = async (file) => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height; canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
    } catch (e) {
        console.error("PDF Error:", e);
        throw new Error("נכשל בהמרת PDF.");
    }
  };

  // --- העלאת קבצים ---
  const uploadFile = async (file, type) => {
      if (file.type === 'application/pdf') file = await convertPdfToImage(file);
      const fileName = `settings/${orgId}_${type}_${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage.from('project-files').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('project-files').getPublicUrl(fileName);
      return publicUrl;
  };

  const handleUpload = async (e, type) => {
    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file) return;
      const publicUrl = await uploadFile(file, type);
      
      await supabase.from('user_settings').upsert({ organization_id: orgId, [`${type}_url`]: publicUrl }, { onConflict: 'organization_id' });
      setSettings(prev => ({ ...prev, [`${type}_url`]: publicUrl }));
    } catch (error) { alert('שגיאה: ' + error.message); } finally { setUploading(false); }
  };

  const savePaddingSettings = async () => {
      setSavingSettings(true);
      try {
        await supabase.from('user_settings').upsert({ organization_id: orgId, ...settings }, { onConflict: 'organization_id' });
        alert('הגדרות נשמרו!');
      } catch (error) { alert('שגיאה: ' + error.message); } finally { setSavingSettings(false); }
  };

  // --- תנאים ---
  const addTerm = async () => {
    if (!newTerm.trim()) return;
    try {
        const { data, error } = await supabase.from('terms_library').insert([{ content: newTerm, is_default: true, organization_id: orgId }]).select().single();
        if (error) throw error;
        if (data) { setTerms([...terms, data]); setNewTerm(''); }
    } catch (error) { alert('שגיאה בהוספת תנאי: ' + error.message); }
  };

  const deleteTerm = async (id) => {
    try {
        const { error } = await supabase.from('terms_library').delete().eq('id', id);
        if (error) throw error;
        setTerms(terms.filter(t => t.id !== id));
    } catch (error) { alert('שגיאה במחיקה'); }
  };

  // --- מחיקת ארגון ---
  const handleDeleteOrganization = async () => {
      if (!confirm("⚠️ למחוק את העסק? זה ימחק הכל לצמיתות!")) return;
      setDeletingOrg(true);
      try {
          const { error } = await supabase.from('organizations').delete().eq('id', orgId);
          if (error) throw error;
          alert('העסק נמחק.');
          await supabase.auth.signOut();
          localStorage.clear();
          window.location.reload();
      } catch (error) { alert('שגיאה: ' + error.message); setDeletingOrg(false); }
  };

  // --- בניית רשימת הטאבים דינמית ---
  const tabs = [];
  if (isManager) {
      tabs.push({ id: 'branding', label: 'מיתוג', icon: Palette });
      tabs.push({ id: 'document', label: 'הגדרות מסמך', icon: LayoutTemplate });
  }
  tabs.push({ id: 'terms', label: 'מאגר תנאים', icon: ListChecks }); // כולם רואים
  if (isManager) {
      tabs.push({ id: 'team', label: 'ניהול צוות', icon: Users });
  }

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="pb-24 animate-in fade-in bg-gray-50 min-h-screen flex flex-col">
      <div className="bg-white sticky top-0 z-10 border-b border-gray-100 shadow-sm py-2">
          <div className="flex justify-center gap-2 px-2 overflow-x-auto no-scrollbar">
              {tabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                          className={`flex flex-col items-center justify-center min-w-[80px] py-2 px-3 rounded-xl transition-all duration-200 ${isActive ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-gray-400 hover:bg-gray-50'}`}>
                          <Icon size={20} className={`mb-1 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} strokeWidth={2.5} />
                          <span className="text-[11px] font-bold whitespace-nowrap">{tab.label}</span>
                      </button>
                  );
              })}
          </div>
      </div>

      <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto w-full flex-1">
        
        {/* טאב 1: מיתוג (רק למנהלים) */}
        {isManager && activeTab === 'branding' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-2">
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><Home size={20} className="text-blue-600" /> לוגו</h3>
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center overflow-hidden border border-gray-200 shadow-inner">
                            {settings.logo_url ? <img src={settings.logo_url} className="w-full h-full object-cover" /> : <Home className="text-gray-300" size={32} />}
                        </div>
                        <label className="flex-1 flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-xl font-bold cursor-pointer hover:bg-gray-50">
                            {uploading ? <Loader2 className="animate-spin" size={18}/> : <Upload size={18} />} <span>העלה לוגו</span>
                            <input type="file" accept="image/*" onChange={e => handleUpload(e, 'logo')} className="hidden" />
                        </label>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><ImageIcon size={20} className="text-blue-600" /> בלאנק</h3>
                    {/* תצוגה מקדימה של הבלאנק */}
                    {settings.letterhead_url ? (
                        <div className="relative aspect-[210/297] w-1/3 mx-auto bg-white shadow-lg border border-gray-200 mb-4 rounded-lg overflow-hidden group">
                             <img src={settings.letterhead_url} alt="בלאנק" className="w-full h-full object-cover" />
                             <div className="absolute inset-0 bg-black/10 hidden group-hover:flex items-center justify-center">
                                <Check className="text-white drop-shadow-md" />
                             </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 p-8 rounded-xl text-center text-gray-400 text-sm mb-4 border-2 border-dashed">
                        לא הוגדר בלאנק לחוזה
                        </div>
                    )}
                    
                    <label className="flex items-center justify-center gap-2 w-full p-3 bg-slate-900 text-white rounded-xl font-bold cursor-pointer">
                        {uploading ? <Loader2 className="animate-spin" /> : <Upload size={20} />} <span>{settings.letterhead_url ? 'החלף בלאנק' : 'העלה בלאנק'}</span>
                        <input type="file" accept="image/*,application/pdf" onChange={e => handleUpload(e, 'letterhead')} className="hidden" />
                    </label>
                </div>

                {isOwner && (
                    <div className="bg-red-50 p-6 rounded-2xl border border-red-100 mt-10">
                        <h3 className="font-bold text-red-700 mb-2 flex items-center gap-2"><AlertOctagon size={20}/> אזור סכנה</h3>
                        <button onClick={handleDeleteOrganization} disabled={deletingOrg} className="w-full bg-red-600 text-white font-bold p-3 rounded-xl hover:bg-red-700">
                            {deletingOrg ? <Loader2 className="animate-spin mx-auto"/> : 'מחק את העסק לצמיתות'}
                        </button>
                    </div>
                )}
            </div>
        )}

        {/* טאב 2: הגדרות מסמך (רק למנהלים) */}
        {isManager && activeTab === 'document' && (
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in slide-in-from-bottom-2">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><LayoutTemplate size={20} className="text-blue-600" /> שוליים</h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                    {['top', 'bottom', 'right', 'left'].map(side => (
                        <div key={side}>
                            <label className="text-xs text-gray-500 font-bold block mb-1">{side}</label>
                            <input type="number" value={settings[`padding_${side}`]} onChange={e => setSettings({...settings, [`padding_${side}`]: Number(e.target.value)})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-center" />
                        </div>
                    ))}
                </div>
                <button onClick={savePaddingSettings} disabled={savingSettings} className="w-full bg-slate-900 text-white font-bold p-3 rounded-xl flex justify-center gap-2">{savingSettings ? <Loader2 className="animate-spin"/> : <Check size={20} />} <span>שמור</span></button>
            </div>
        )}

        {/* טאב 3: תנאים (פתוח לכולם) */}
        {activeTab === 'terms' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in slide-in-from-bottom-2">
                 <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><ListChecks size={20} className="text-blue-600" /> מאגר תנאים</h3>
                 <div className="flex gap-2 mb-4">
                    <input value={newTerm} onChange={(e) => setNewTerm(e.target.value)} placeholder="תנאי חדש..." className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 outline-none"/>
                    <button onClick={addTerm} className="bg-slate-900 text-white p-3 rounded-xl"><Plus size={20} /></button>
                </div>
                <div className="space-y-2">{terms.map(t => (
                    <div key={t.id} className="flex justify-between items-start bg-white p-3 rounded-xl border border-gray-100">
                        <p className="text-sm text-gray-700">{t.content}</p>
                        <button onClick={() => deleteTerm(t.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                ))}</div>
            </div>
        )}

        {/* טאב 4: ניהול צוות (רק למנהלים) */}
        {isManager && activeTab === 'team' && <TeamManagement />}
      </div>
    </div>
  );
}