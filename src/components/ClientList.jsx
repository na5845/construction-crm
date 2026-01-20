import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import CalendarWidget from './CalendarWidget';
import Settings from './Settings';
import ClientManager from './ClientManager';
import UserProfileModal from './UserProfileModal';
import TaskList from './TaskList';
import Inventory from './Inventory'; // ייבוא מסך המלאי

import { 
  User, MapPin, ArrowRight, Plus, Calendar, Settings as SettingsIcon,
  Briefcase, Clock, Hammer, Menu, X, Home, CheckSquare, Trash2, 
  FileText, FileSignature, CheckCheck, List, LogOut, Check,
  Package, AlertTriangle // אייקונים חדשים
} from 'lucide-react';

export default function ClientList({ clients, onAddClick, onRefresh }) {
  const { orgId, profile } = useAuth();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState('home'); 
  const [activeTab, setActiveTab] = useState('in_progress'); 
  const [selectedClient, setSelectedClient] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]); 
  const [logoUrl, setLogoUrl] = useState(null);
  const [lowStockCount, setLowStockCount] = useState(0); // סטייט לחוסרים
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]); 
  
  const [newTaskData, setNewTaskData] = useState({ 
      text: '', 
      time: '09:00', 
      date: new Date().toISOString().split('T')[0],
      assignedTo: [] 
  });

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    if (!orgId) return;

    const fetchData = async () => {
      // 1. פרויקטים
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select('*, clients!inner(id, full_name, status)')
        .eq('organization_id', orgId)
        .not('start_date', 'is', null);

      if (!error && projectsData) {
          setProjects(projectsData);
          const localDate = new Date();
          const todayStr = localDate.getFullYear() + '-' + String(localDate.getMonth() + 1).padStart(2, '0') + '-' + String(localDate.getDate()).padStart(2, '0');
          const updates = projectsData.map(async (project) => {
            if (project.clients.status === 'signed' && project.start_date <= todayStr) {
               const { error: updateError } = await supabase.from('clients').update({ status: 'in_progress' }).eq('id', project.client_id);
               if (!updateError) return true;
            }
            return false;
          });
          if (updates.length > 0) {
            const results = await Promise.all(updates);
            if (results.some(r => r === true) && onRefresh) onRefresh();
          }
      }

      // 2. עובדים
      const { data: teamData } = await supabase.from('profiles').select('id, full_name, color').eq('organization_id', orgId);
      if (teamData) setTeamMembers(teamData);

      // 3. בדיקת מלאי (עבור ההתראה בדף הבית)
      const { data: inventoryData } = await supabase.from('inventory_items').select('quantity, min_quantity').eq('organization_id', orgId);
      if (inventoryData) {
        const count = inventoryData.filter(item => item.quantity <= item.min_quantity).length;
        setLowStockCount(count);
      }
    };

    fetchData();
    fetchTasks();
    fetchLogo();
  }, [onRefresh, orgId]);

  const fetchLogo = async () => {
    if (!orgId) return;
    const { data } = await supabase.from('user_settings').select('logo_url').eq('organization_id', orgId).maybeSingle();
    if (data?.logo_url) setLogoUrl(data.logo_url);
  };

  const fetchTasks = async () => {
    if (!orgId) return;
    const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('organization_id', orgId)
        .order('due_date', { ascending: true });
    if (data) setTasks(data);
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!orgId) return;

    const { error } = await supabase.from('tasks').insert([{
      organization_id: orgId,
      text: newTaskData.text,
      time: newTaskData.time,
      due_date: newTaskData.date,
      assigned_to: newTaskData.assignedTo,
      is_completed: false
    }]);

    if (!error) {
      setIsTaskModalOpen(false);
      setNewTaskData({ text: '', time: '09:00', date: new Date().toISOString().split('T')[0], assignedTo: [] });
      fetchTasks();
    }
  };

  const toggleAssignee = (memberId) => {
      setNewTaskData(prev => {
          const isSelected = prev.assignedTo.includes(memberId);
          if (isSelected) {
              return { ...prev, assignedTo: prev.assignedTo.filter(id => id !== memberId) };
          } else {
              return { ...prev, assignedTo: [...prev.assignedTo, memberId] };
          }
      });
  };

  const toggleTask = async (task) => {
    const updatedTasks = tasks.map(t => t.id === task.id ? { ...t, is_completed: !t.is_completed } : t);
    setTasks(updatedTasks);
    await supabase.from('tasks').update({ is_completed: !task.is_completed }).eq('id', task.id);
  };

  const deleteTask = async (id) => {
     if(!confirm('למחוק את המשימה?')) return;
     await supabase.from('tasks').delete().eq('id', id);
     fetchTasks();
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      localStorage.clear();
      window.location.reload();
  };

  const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) return 'בוקר טוב';
      if (hour >= 12 && hour < 18) return 'צהריים טובים';
      if (hour >= 18 && hour < 22) return 'ערב טוב';
      return 'לילה טוב';
  };

  const filteredClients = clients.filter(c => (c.status || 'proposal') === activeTab);
  const activeProjects = clients.filter(c => c.status === 'in_progress');

  const menuItems = [
    { id: 'home', label: 'דף הבית', icon: Home },
    { id: 'projects', label: 'פרויקטים', icon: Briefcase },
    { id: 'tasks', label: 'משימות', icon: CheckSquare },
    { id: 'calendar', label: 'לוח שנה', icon: Calendar },
    { id: 'inventory', label: 'ניהול מלאי', icon: Package },
    { id: 'settings', label: 'הגדרות', icon: SettingsIcon },
  ];

  const projectTabs = [
      { id: 'proposal', label: 'הצעות מחיר', icon: FileText, count: clients.filter(c => (c.status || 'proposal') === 'proposal').length },
      { id: 'signed', label: 'נסגר/חתום', icon: FileSignature, count: clients.filter(c => c.status === 'signed').length },
      { id: 'in_progress', label: 'בעבודה', icon: Hammer, count: clients.filter(c => c.status === 'in_progress').length },
      { id: 'completed', label: 'הסתיים', icon: CheckCheck, count: clients.filter(c => c.status === 'completed').length },
  ];

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysTasks = tasks.filter(t => t.due_date === todayStr);

  if (selectedClient) {
      return ( <ClientManager client={selectedClient} onBack={() => setSelectedClient(null)} onNavigateGlobal={(viewId) => { setSelectedClient(null); setCurrentView(viewId); }} /> );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen relative bg-gray-50 overflow-hidden flex flex-col">
      <UserProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />

      {/* Modal Task */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-in fade-in">
          <form onSubmit={handleAddTask} className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
            <h3 className="font-bold text-lg mb-4 text-gray-800">משימה חדשה</h3>
            <div className="space-y-3">
              <div><label className="text-xs text-gray-500 font-medium">מה צריך לעשות?</label><input required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none" value={newTaskData.text} onChange={e => setNewTaskData({...newTaskData, text: e.target.value})} /></div>
              <div className="flex gap-2"><div className="flex-1"><label className="text-xs text-gray-500 font-medium">תאריך</label><input type="date" required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" value={newTaskData.date} onChange={e => setNewTaskData({...newTaskData, date: e.target.value})} /></div><div className="w-1/3"><label className="text-xs text-gray-500 font-medium">שעה</label><input type="time" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" value={newTaskData.time} onChange={e => setNewTaskData({...newTaskData, time: e.target.value})} /></div></div>
              
              <div>
                  <label className="text-xs text-gray-500 font-medium mb-2 block">שיוך לצוות (לחץ לבחירה)</label>
                  <div className="flex flex-wrap gap-3">
                      {teamMembers.map(member => {
                          const isSelected = newTaskData.assignedTo.includes(member.id);
                          return (
                              <button 
                                key={member.id} 
                                type="button"
                                onClick={() => toggleAssignee(member.id)}
                                className={`relative flex flex-col items-center gap-1 transition-all ${isSelected ? 'scale-110' : 'opacity-60 grayscale'}`}
                              >
                                  <div 
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 ${isSelected ? 'border-gray-800 shadow-md' : 'border-transparent'}`}
                                    style={{ backgroundColor: member.color || '#999' }}
                                  >
                                      {member.full_name.charAt(0)}
                                      {isSelected && <div className="absolute -top-1 -right-1 bg-white rounded-full text-emerald-600 shadow-sm"><Check size={14}/></div>}
                                  </div>
                                  <span className="text-[10px] font-bold text-gray-600">{member.full_name.split(' ')[0]}</span>
                              </button>
                          );
                      })}
                  </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6"><button type="button" onClick={() => setIsTaskModalOpen(false)} className="flex-1 p-3 rounded-xl bg-gray-100 text-gray-600 font-bold">ביטול</button><button type="submit" className="flex-1 p-3 rounded-xl bg-slate-900 text-white font-bold">שמור</button></div>
          </form>
        </div>
      )}

      {/* Sidebar */}
      {isMenuOpen && <div className="fixed inset-0 bg-black/50 z-40 fade-in" onClick={() => setIsMenuOpen(false)}></div>}
      <div className={`fixed top-0 right-0 h-full w-64 bg-white shadow-2xl z-50 transform transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-5 bg-slate-900 text-white flex justify-between items-center"><span className="font-bold text-lg">תפריט</span><button onClick={() => setIsMenuOpen(false)}><X size={20}/></button></div>
        <div className="p-3 space-y-2">{menuItems.map(item => (<button key={item.id} onClick={() => { setCurrentView(item.id); setIsMenuOpen(false); }} className={`w-full flex items-center gap-4 p-4 rounded-xl ${currentView === item.id ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-600'}`}><item.icon size={22} /> {item.label}</button>))}</div>
      </div>

      {/* Header */}
      <div className="bg-white p-4 shadow-sm flex items-center justify-between sticky top-0 z-20">
        <button onClick={() => setIsMenuOpen(true)} className="p-2 bg-gray-50 rounded-xl"><Menu size={24} /></button>
        <h1 className="font-bold text-lg text-slate-800">
          {currentView === 'home' && 'הקבלן שלי'}
          {currentView === 'projects' && 'ניהול פרויקטים'}
          {currentView === 'tasks' && 'משימות וצוות'}
          {currentView === 'calendar' && 'לוח שנה'}
          {currentView === 'inventory' && 'ניהול מלאי'}
          {currentView === 'settings' && 'הגדרות'}
        </h1>
        <div className="relative">
            <button onClick={() => setShowUserMenu(!showUserMenu)} className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-md border-2 border-white active:scale-95 transition-transform overflow-hidden">{profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="User" /> : (profile?.full_name ? profile.full_name.charAt(0) : <User size={20}/>)}</button>
            {showUserMenu && (<><div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)}></div><div className="absolute top-12 left-0 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-20 animate-in fade-in zoom-in-95 overflow-hidden"><div className="p-4 bg-gray-50 border-b border-gray-100"><p className="font-bold text-gray-800 truncate">{profile?.full_name || 'אורח'}</p><p className="text-xs text-gray-500 truncate">{profile?.role === 'owner' ? 'בעלים' : profile?.role === 'admin' ? 'מנהל מערכת' : 'עובד'}</p></div><div className="p-2"><button onClick={() => { setShowUserMenu(false); setShowProfileModal(true); }} className="w-full text-right flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-gray-700 text-sm"><User size={16} className="text-blue-500"/> ערוך פרופיל</button><button onClick={handleLogout} className="w-full text-right flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 text-red-600 text-sm"><LogOut size={16}/> התנתק</button></div></div></>)}
        </div>
      </div>

      <div className="flex-1 pb-24">
        {currentView === 'home' && (
          <div className="animate-in fade-in zoom-in duration-300">
            <div className="bg-white pb-8 px-6 rounded-b-[40px] shadow-sm mb-6 text-center pt-2">
              {logoUrl ? <div className="w-24 h-24 mx-auto mb-4 rounded-full shadow-xl overflow-hidden border-4 border-white bg-white"><img src={logoUrl} alt="לוגו חברה" className="w-full h-full object-cover" /></div> : <div className="w-24 h-24 bg-slate-900 rounded-full mx-auto mb-4 flex items-center justify-center shadow-xl shadow-blue-100 border-4 border-white"><Hammer size={40} className="text-white" /></div>}
              <h2 className="text-3xl font-black text-slate-800">{getGreeting()}!</h2>
            </div>
            
            <div className="px-5 space-y-6">

                {/* --- 1. התראת מלאי (מעוצבת ככרטיס) --- */}
                {lowStockCount > 0 && (
                  <div onClick={() => setCurrentView('inventory')} className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-red-100 transition-colors shadow-sm group active:scale-95">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 shrink-0 shadow-sm border border-white">
                          <AlertTriangle size={24} />
                      </div>
                      <div className="flex-1">
                          <h3 className="font-bold text-red-800 text-lg">התראת מלאי!</h3>
                          <p className="text-red-600 text-xs font-medium">{lowStockCount} מוצרים עומדים להיגמר</p>
                      </div>
                      <div className="bg-white p-2 rounded-full group-hover:bg-red-200 transition-colors shadow-sm">
                        <ArrowRight size={20} className="text-red-400 rotate-180 group-hover:text-red-600" />
                      </div>
                  </div>
                )}
                
                {/* --- 2. פרויקטים (ללא שינוי) --- */}
                <div>
                    <div className="flex justify-between items-center mb-3"><h3 className="font-bold text-gray-800 flex items-center gap-2"><Hammer size={20} className="text-blue-500" /> פרויקטים בביצוע</h3><button onClick={onAddClick} className="text-blue-600 text-sm font-bold bg-blue-50 px-3 py-1 rounded-full">+ הוסף</button></div>
                    <div className="space-y-3">{activeProjects.length === 0 ? <div className="text-center py-6 bg-white rounded-2xl border border-dashed border-gray-200"><p className="text-gray-400 text-sm">אין פרויקטים פעילים כרגע</p></div> : activeProjects.map(client => (<div key={client.id} onClick={() => setSelectedClient(client)} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 cursor-pointer active:scale-95 transition-all"><div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">{client.full_name.charAt(0)}</div><div className="flex-1"><p className="font-bold text-gray-800">{client.full_name}</p><div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5"><MapPin size={10} /> {client.address || 'ללא כתובת'}</div></div><ArrowRight size={18} className="text-gray-300 rotate-180" /></div>))}</div>
                </div>

                {/* --- 3. משימות (בעיצוב זהה לפרויקטים) --- */}
                <div>
                    <div className="flex justify-between items-center mb-3"><h3 className="font-bold text-gray-800 flex items-center gap-2"><CheckSquare size={20} className="text-emerald-500" /> תזכורות להיום</h3><button onClick={() => setIsTaskModalOpen(true)} className="text-emerald-600 text-sm font-bold bg-emerald-50 px-3 py-1 rounded-full">+ הוסף</button></div>
                    <div className="space-y-3">
                        {todaysTasks.map(task => (
                        <div key={task.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 transition-all active:scale-98">
                            <button onClick={() => toggleTask(task)} className={`p-1.5 rounded-full transition-colors shrink-0 ${task.is_completed ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}><CheckSquare size={20} /></button>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-bold truncate ${task.is_completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{task.text}</p>
                                <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1">
                                    <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded"><Clock size={10} />{task.time}</span>
                                    {task.assigned_to && task.assigned_to.length > 0 && (
                                        <div className="flex -space-x-1 mr-1">
                                            {task.assigned_to.map(assigneeId => {
                                                const member = teamMembers.find(m => m.id === assigneeId);
                                                if (!member) return null;
                                                return (
                                                    <div key={assigneeId} className="w-3.5 h-3.5 rounded-full border border-white" style={{ backgroundColor: member.color || '#999' }} title={member.full_name}></div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-400 hover:bg-red-50 p-2 rounded-full transition-colors"><Trash2 size={18} /></button>
                        </div>
                        ))}
                        {todaysTasks.length === 0 && <p className="text-center text-gray-400 text-xs py-4 bg-white rounded-2xl border border-dashed border-gray-200">אין משימות להיום</p>}
                    </div>
                </div>
            </div>
          </div>
        )}

        {currentView === 'projects' && (
          <div className="flex flex-col h-full animate-in slide-in-from-left-4 duration-300"><div className="bg-white sticky top-0 z-10 border-b border-gray-100 shadow-sm py-2"><div className="overflow-x-auto no-scrollbar"><div className="flex justify-center min-w-full gap-2 px-2">{projectTabs.map(tab => { const Icon = tab.icon; const isActive = activeTab === tab.id; return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center justify-center min-w-[75px] py-2 px-3 rounded-xl transition-all duration-200 relative ${isActive ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-gray-400 hover:bg-gray-50'}`}><Icon size={20} className={`mb-1 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} strokeWidth={2.5} /><span className="text-[10px] font-bold whitespace-nowrap">{tab.label}</span><div className={`absolute top-1 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-400'}`}>{tab.count}</div></button>); })}</div></div></div><div className="p-4 space-y-3 pb-24 min-h-[50vh]">{filteredClients.length === 0 ? <div className="text-center text-gray-400 py-10 flex flex-col items-center"><div className="bg-gray-50 p-6 rounded-full mb-4"><Briefcase size={32} className="opacity-30"/></div><p>אין לקוחות בסטטוס זה</p></div> : filteredClients.map(client => (<div key={client.id} onClick={() => setSelectedClient(client)} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 active:scale-95 transition-all flex justify-between items-center cursor-pointer group"><div className="flex gap-4 items-center"><div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${activeTab === 'in_progress' ? 'bg-emerald-50 text-emerald-600' : activeTab === 'signed' ? 'bg-purple-50 text-purple-600' : activeTab === 'completed' ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-600'}`}>{client.full_name.charAt(0)}</div><div><h3 className="font-bold text-gray-800">{client.full_name}</h3><div className="flex items-center gap-1 text-gray-400 text-xs"><MapPin size={12} /> {client.address || 'ללא כתובת'}</div></div></div><div className="bg-gray-50 p-2 rounded-full group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors"><ArrowRight size={18} className="text-gray-300 rotate-180 group-hover:text-blue-600" /></div></div>))}</div><button onClick={onAddClick} className="fixed bottom-6 left-6 bg-slate-900 text-white p-4 rounded-full shadow-xl hover:bg-slate-800 transition-all z-30"><Plus size={24} /></button></div>
        )}

        {currentView === 'tasks' && (
            <TaskList 
                tasks={tasks} 
                teamMembers={teamMembers}
                onToggle={toggleTask}
                onDelete={(id) => deleteTask(id)}
                onAddClick={() => setIsTaskModalOpen(true)}
            />
        )}

        {currentView === 'calendar' && <div className="px-4"><CalendarWidget tasks={tasks} projects={projects} teamMembers={teamMembers} /></div>}
        
        {currentView === 'inventory' && <Inventory />} 

        {currentView === 'settings' && <Settings />}
      </div>
    </div>
  );
}