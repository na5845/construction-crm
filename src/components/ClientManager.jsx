import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { 
  User, Hammer, Image, Camera, FileText, FileSignature, Target, 
  ArrowRight, Phone, MapPin, Menu, X, ChevronLeft, TrendingDown,
  Home, Calendar, Settings as SettingsIcon, Briefcase, CheckSquare, 
  CheckCircle, Package // <--- הוספת האייקון כאן
} from 'lucide-react';
import { StatusBadge } from './ui'; 
import JobDetails from './JobDetails';
import ProjectMedia from './ProjectMedia'; 
import Contract from './Contract'; 
import Costs from './Costs';
import Blueprints from './Blueprints'; 
import Targets from './Targets';       

// --- רכיב פרטי לקוח ---
const ClientDetails = ({ client, onFinish }) => (
  <div className="p-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
    
    {/* כרטיס ראשי */}
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1 h-full bg-blue-600"></div>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-1 font-bold">לקוח</h3>
          <div className="font-bold text-2xl text-gray-800">{client.full_name}</div>
        </div>
        <div className="bg-blue-50 p-3 rounded-full text-blue-600">
          <User size={24} />
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-xl">
          <Phone size={20} className="text-blue-500" />
          <span className="text-base font-medium">{client.phone || 'לא הוזן טלפון'}</span>
        </div>
        <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-xl">
          <MapPin size={20} className="text-blue-500" />
          <span className="text-base font-medium">{client.address || 'לא הוזנה כתובת'}</span>
        </div>
      </div>
    </div>

    {/* כרטיס סטטוס */}
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
      <span className="text-gray-600 font-bold">סטטוס פרויקט</span>
      <StatusBadge status={client.status} />
    </div>

    {/* כפתור סיום פרויקט */}
    {client.status === 'in_progress' && (
        <button 
            onClick={onFinish}
            className="w-full mt-4 bg-emerald-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
            <CheckCircle /> סיים פרויקט
        </button>
    )}
  </div>
);

export default function ClientManager({ client, onBack, onNavigateGlobal }) {
  const [activeTab, setActiveTab] = useState('details');
  const [isGlobalMenuOpen, setIsGlobalMenuOpen] = useState(false); 

  // טאבים פנימיים ללקוח
  const clientTabs = [
    { id: 'details', label: 'ראשי', icon: User },
    { id: 'job', label: 'יומן עבודה', icon: Hammer },
    { id: 'contract', label: 'חוזה', icon: FileSignature },
    { id: 'photos', label: 'לפני', icon: Image },
    { id: 'blueprints', label: 'שרטוטים', icon: FileText },
    { id: 'costs', label: 'עלויות', icon: TrendingDown },
    { id: 'targets', label: 'יעדים', icon: Target },
    { id: 'after_photos', label: 'סיום', icon: Camera },
  ];

  // תפריט ראשי גלובלי (מעודכן עם מלאי)
  const globalMenuItems = [
    { id: 'home', label: 'דף הבית', icon: Home },
    { id: 'projects', label: 'פרויקטים', icon: Briefcase },
    { id: 'tasks', label: 'משימות', icon: CheckSquare },
    { id: 'calendar', label: 'לוח שנה', icon: Calendar },
    { id: 'inventory', label: 'ניהול מלאי', icon: Package }, // <--- הוספתי את זה
    { id: 'settings', label: 'הגדרות', icon: SettingsIcon },
  ];

  const handleGlobalNavigation = (viewId) => {
      setIsGlobalMenuOpen(false);
      // אם הפונקציה קיימת (היא מגיעה מ-ClientList), נשתמש בה כדי להחליף מסך
      if (onNavigateGlobal) {
          onNavigateGlobal(viewId);
      } else {
          // Fallback: חזרה אחורה אם אין ניווט גלובלי (נדיר)
          onBack();
      }
  };

  const handleFinishProject = async () => {
    if(!confirm('לסיים את הפרויקט?')) return;
    try {
        const todayStr = new Date().toISOString().split('T')[0];
        await supabase.from('clients').update({ status: 'completed' }).eq('id', client.id);
        await supabase.from('projects').update({ end_date: todayStr }).eq('client_id', client.id);
        alert('הפרויקט הסתיים בהצלחה! 🎉');
        onBack();
    } catch (error) { alert('שגיאה בעדכון'); }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-[#F8F9FA] relative overflow-hidden">
      
      {/* Sidebar */}
      {isGlobalMenuOpen && <div className="fixed inset-0 bg-black/60 z-40 fade-in backdrop-blur-sm" onClick={() => setIsGlobalMenuOpen(false)}></div>}
      <div className={`fixed top-0 right-0 h-full w-72 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isGlobalMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-900 text-white"><span className="font-bold text-xl">תפריט ראשי</span><button onClick={() => setIsGlobalMenuOpen(false)}><X size={20} /></button></div>
        <div className="p-4 space-y-2">{globalMenuItems.map(item => (<button key={item.id} onClick={() => handleGlobalNavigation(item.id)} className="w-full flex items-center gap-4 p-4 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-all font-medium"><item.icon size={22} /><span>{item.label}</span><ChevronLeft size={16} className="mr-auto text-gray-300" /></button>))}</div>
      </div>

      {/* Header */}
      <div className="bg-white shadow-sm z-20 sticky top-0">
          <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsGlobalMenuOpen(true)} className="p-2.5 bg-gray-50 text-slate-700 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100"><Menu size={24} /></button>
              <h2 className="font-bold text-lg text-slate-800 truncate max-w-[150px]">{client.full_name}</h2>
            </div>
            
            <button onClick={onBack} className="p-2.5 bg-gray-50 text-slate-500 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100"><ArrowRight size={22} className="rotate-180" /></button>
          </div>

          <div className="flex overflow-x-auto pb-0 px-2 no-scrollbar border-b border-gray-100 bg-white">
              <div className="flex gap-2 p-2 min-w-full">
                  {clientTabs.map(tab => { const Icon = tab.icon; const isActive = activeTab === tab.id; return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center justify-center min-w-[70px] py-2 px-1 rounded-xl transition-all duration-200 ${isActive ? 'bg-blue-50 text-blue-600 scale-105' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}><Icon size={20} className={`mb-1 ${isActive ? 'fill-current' : ''}`} strokeWidth={isActive ? 2.5 : 2} /><span className="text-[10px] font-bold whitespace-nowrap">{tab.label}</span>{isActive && <div className="h-1 w-4 bg-blue-600 rounded-full mt-1"></div>}</button>); })}
              </div>
          </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-[#F8F9FA] pb-6">
        
        {activeTab === 'details' && <ClientDetails client={client} onFinish={handleFinishProject} />}

        {/* שאר הטאבים */}
        {activeTab === 'job' && <JobDetails clientId={client.id} />}
        {activeTab === 'contract' && <Contract client={client} />}
        {activeTab === 'photos' && <ProjectMedia clientId={client.id} folderType="before" />}
        {activeTab === 'blueprints' && <Blueprints clientId={client.id} />}
        {activeTab === 'costs' && <Costs clientId={client.id} />}
        {activeTab === 'targets' && <Targets clientId={client.id} />}
        {activeTab === 'after_photos' && <ProjectMedia clientId={client.id} folderType="after" />}
      </div>

    </div>
  );
}