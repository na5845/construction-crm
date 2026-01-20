import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { 
  Package, Plus, Trash2, AlertTriangle, ShoppingCart, 
  ArrowUp, ArrowDown, Loader2, Edit, FileText, X, 
  Printer, Save, Check, Calculator, Search, List
} from 'lucide-react';

export default function Inventory() {
  const { orgId } = useAuth();
  
  // --- States ---
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // ניהול טאבים וחיפוש
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'reports'
  const [searchQuery, setSearchQuery] = useState('');

  // מודאלים
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null); 
  const [stockUpdateItem, setStockUpdateItem] = useState(null); 
  
  // טופס הוספה/עריכה
  const [formData, setFormData] = useState({
    name: '', supplier: '', quantity: '', min_quantity: '5', unit: 'יח\''
  });

  // טופס עדכון מלאי מהיר
  const [stockAmount, setStockAmount] = useState('');
  
  // פילטר דוחות
  const [reportFilter, setReportFilter] = useState('supplier');

  useEffect(() => {
    if (orgId) fetchInventory();
  }, [orgId]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('organization_id', orgId)
        .order('name');
      
      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- סינון לפי חיפוש ---
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.supplier && item.supplier.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // --- שמירה (הוספה או עריכה) ---
  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      const payload = {
        organization_id: orgId,
        name: formData.name,
        supplier: formData.supplier,
        quantity: parseInt(formData.quantity) || 0,
        min_quantity: parseInt(formData.min_quantity) || 0,
        unit: formData.unit
      };

      if (editingItem) {
        const { error } = await supabase.from('inventory_items').update(payload).eq('id', editingItem.id);
        if (error) throw error;
        setItems(items.map(i => i.id === editingItem.id ? { ...i, ...payload } : i));
        alert('המוצר עודכן בהצלחה');
      } else {
        const { data, error } = await supabase.from('inventory_items').insert([payload]).select().single();
        if (error) throw error;
        setItems([...items, data]);
        alert('המוצר נוסף בהצלחה');
      }
      closeForms();
    } catch (error) {
      alert('שגיאה: ' + error.message);
    }
  };

  // --- מחיקה ---
  const deleteItem = async (id) => {
    if (!confirm('למחוק פריט זה מהמלאי?')) return;
    try {
        await supabase.from('inventory_items').delete().eq('id', id);
        setItems(items.filter(i => i.id !== id));
    } catch (error) {
        alert('שגיאה במחיקה');
    }
  };

  // --- עדכון מלאי חכם ---
  const handleStockUpdate = async (action) => {
      if (!stockUpdateItem || !stockAmount) return;
      const amount = parseInt(stockAmount);
      let newQuantity = stockUpdateItem.quantity;

      if (action === 'add') newQuantity += amount;
      if (action === 'subtract') newQuantity = Math.max(0, newQuantity - amount);
      if (action === 'set') newQuantity = Math.max(0, amount);

      try {
          await supabase.from('inventory_items').update({ quantity: newQuantity }).eq('id', stockUpdateItem.id);
          setItems(items.map(i => i.id === stockUpdateItem.id ? { ...i, quantity: newQuantity } : i));
          setStockUpdateItem(null);
          setStockAmount('');
      } catch (error) {
          alert('שגיאה בעדכון מלאי');
      }
  };

  // --- ניהול טפסים ---
  const openEdit = (item) => {
      setEditingItem(item);
      setFormData({
          name: item.name,
          supplier: item.supplier || '',
          quantity: item.quantity,
          min_quantity: item.min_quantity,
          unit: item.unit
      });
      setShowAddForm(true);
  };

  const closeForms = () => {
      setShowAddForm(false);
      setEditingItem(null);
      setFormData({ name: '', supplier: '', quantity: '', min_quantity: '5', unit: 'יח\'' });
  };

  // --- חישובים לדוחות ---
  const groupedBySupplier = useMemo(() => {
      const groups = {};
      items.forEach(item => {
          const sup = item.supplier || 'ללא ספק';
          if (!groups[sup]) groups[sup] = [];
          groups[sup].push(item);
      });
      return groups;
  }, [items]);

  const lowStockItems = items.filter(i => i.quantity <= i.min_quantity);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-24 animate-in fade-in relative">
      
      {/* --- אזור עליון: טאבים --- */}
      <div className="bg-white pt-2 shadow-sm sticky top-0 z-20">
        
        {/* טאבים בעיצוב התואם לשאר המערכת (כפתורים מרובעים עם פינות עגולות) */}
        <div className="flex justify-center gap-4 border-b border-gray-100 pb-2 mb-2">
             <button 
                onClick={() => setActiveTab('list')}
                className={`flex flex-col items-center justify-center min-w-[90px] py-2 px-3 rounded-xl transition-all duration-200 ${
                    activeTab === 'list' 
                    ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                    : 'text-gray-400 hover:bg-gray-50'
                }`}
             >
                 <List size={20} className={`mb-1 ${activeTab === 'list' ? 'text-blue-600' : 'text-gray-400'}`} strokeWidth={activeTab === 'list' ? 2.5 : 2}/>
                 <span className="text-[11px] font-bold">רשימת מלאי</span>
             </button>

             <button 
                onClick={() => setActiveTab('reports')}
                className={`flex flex-col items-center justify-center min-w-[90px] py-2 px-3 rounded-xl transition-all duration-200 ${
                    activeTab === 'reports' 
                    ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                    : 'text-gray-400 hover:bg-gray-50'
                }`}
             >
                 <FileText size={20} className={`mb-1 ${activeTab === 'reports' ? 'text-blue-600' : 'text-gray-400'}`} strokeWidth={activeTab === 'reports' ? 2.5 : 2}/>
                 <span className="text-[11px] font-bold">דוחות</span>
             </button>
        </div>

        {/* שורת חיפוש והוספה - מופיעה רק בטאב הרשימה (חלק מההדר כדי שיהיה דביק) */}
        {activeTab === 'list' && (
            <div className="flex gap-2 px-4 pb-3">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text"
                        placeholder="חפש מוצר או ספק..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pr-10 pl-4 text-sm outline-none focus:border-blue-500 transition-all focus:bg-white"
                    />
                </div>
                <button 
                    onClick={() => { closeForms(); setShowAddForm(true); }} 
                    className="bg-slate-900 text-white w-10 h-10 rounded-xl shadow-md hover:bg-slate-800 flex items-center justify-center active:scale-95 transition-transform"
                >
                    <Plus size={22} />
                </button>
            </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* תוכן הטאבים                          */}
      {/* ========================================================= */}

      {/* --- טאב 1: רשימת מלאי --- */}
      {activeTab === 'list' && (
          <div className="p-4 space-y-3 overflow-y-auto">
              
              {/* התראת חוסרים */}
              {lowStockItems.length > 0 && (
                <div 
                    className="bg-red-50 border border-red-100 p-3 rounded-xl flex items-center gap-3 mb-2 cursor-pointer active:scale-95 transition-transform" 
                    onClick={() => { setActiveTab('reports'); setReportFilter('low_stock'); }}
                >
                    <div className="bg-red-100 p-2 rounded-full text-red-600"><AlertTriangle size={20} /></div>
                    <div>
                        <span className="font-bold text-red-700 text-sm block">התראת מלאי!</span>
                        <span className="text-red-600 text-xs">{lowStockItems.length} מוצרים חסרים במלאי - לחץ לדוח</span>
                    </div>
                </div>
              )}

              {/* רשימת הכרטיסים */}
              {filteredItems.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                      <Package size={48} className="mx-auto mb-3 opacity-20"/>
                      <p>{searchQuery ? 'לא נמצאו תוצאות' : 'המלאי ריק כרגע'}</p>
                  </div>
              ) : (
                  filteredItems.map(item => {
                      const isLow = item.quantity <= item.min_quantity;
                      return (
                          <div key={item.id} className={`bg-white p-4 rounded-2xl shadow-sm border transition-all ${isLow ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-100'}`}>
                              
                              <div className="flex justify-between items-start mb-3">
                                  <div>
                                      <h3 className="font-bold text-gray-800 text-lg">{item.name}</h3>
                                      {item.supplier && (
                                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                              <ShoppingCart size={12}/> {item.supplier}
                                          </p>
                                      )}
                                  </div>
                                  
                                  {/* כפתור עריכה */}
                                  <button 
                                      onClick={() => openEdit(item)} 
                                      className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                  >
                                      <Edit size={16}/>
                                  </button>
                              </div>

                              {/* כפתור עדכון כמות */}
                              <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                                  <button 
                                    onClick={() => setStockUpdateItem(item)} 
                                    className="w-full text-center active:scale-95 transition-transform py-2"
                                  >
                                      <div className="flex items-center justify-center gap-2 mb-1">
                                          <Calculator size={16} className="text-gray-400"/>
                                          <span className="text-xs text-gray-500">לחץ לעדכון כמות</span>
                                      </div>
                                      <div className={`text-3xl font-black flex items-center justify-center gap-2 ${isLow ? 'text-red-600' : 'text-slate-800'}`}>
                                          {item.quantity} 
                                          <span className="text-sm font-medium text-gray-500">{item.unit}</span>
                                      </div>
                                  </button>
                              </div>
                          </div>
                      );
                  })
              )}
          </div>
      )}

      {/* --- טאב 2: דוחות --- */}
      {activeTab === 'reports' && (
          <div className="flex flex-col h-full bg-white">
              {/* פילטרים פנימיים לדוח */}
              <div className="p-4 bg-gray-50 border-b flex gap-2 overflow-x-auto no-scrollbar">
                  <button onClick={() => setReportFilter('supplier')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${reportFilter === 'supplier' ? 'bg-slate-800 text-white' : 'bg-white border text-gray-600'}`}>לפי סוכן</button>
                  <button onClick={() => setReportFilter('low_stock')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${reportFilter === 'low_stock' ? 'bg-red-500 text-white' : 'bg-white border text-gray-600'}`}>חוסרים להזמנה</button>
                  <button onClick={() => setReportFilter('all')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${reportFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-white border text-gray-600'}`}>כל המלאי</button>
                  <button onClick={() => window.print()} className="mr-auto p-2 bg-blue-50 text-blue-600 rounded-xl"><Printer size={18}/></button>
              </div>

              {/* תוכן הדוח */}
              <div className="flex-1 overflow-y-auto p-4 printable-content">
                  <div className="text-center mb-6 hidden print:block">
                      <h1 className="text-2xl font-bold">דוח מלאי</h1>
                      <p className="text-sm">{new Date().toLocaleDateString()}</p>
                  </div>

                  {/* דוח לפי ספקים */}
                  {reportFilter === 'supplier' && Object.entries(groupedBySupplier).map(([supplier, supItems]) => (
                      <div key={supplier} className="mb-6 border border-gray-200 rounded-xl overflow-hidden break-inside-avoid">
                          <div className="bg-gray-100 p-3 font-bold text-gray-700 flex justify-between">
                              <span>{supplier}</span>
                              <span className="text-xs bg-white px-2 py-0.5 rounded text-gray-500 border">{supItems.length} פריטים</span>
                          </div>
                          <table className="w-full text-sm">
                              <thead className="bg-gray-50 text-gray-500 text-xs border-b">
                                  <tr><th className="p-2 text-right">מוצר</th><th className="p-2 text-center">כמות</th><th className="p-2 text-center">סטטוס</th></tr>
                              </thead>
                              <tbody>
                                  {supItems.map(i => (
                                      <tr key={i.id} className="border-b last:border-0">
                                          <td className="p-2">{i.name}</td>
                                          <td className="p-2 text-center font-bold">{i.quantity} {i.unit}</td>
                                          <td className="p-2 text-center">{i.quantity <= i.min_quantity ? <span className="text-red-500 font-bold text-xs">להזמין</span> : <Check size={14} className="mx-auto text-green-500"/>}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  ))}

                  {/* דוח חוסרים */}
                  {reportFilter === 'low_stock' && (
                      <div className="border border-red-200 rounded-xl overflow-hidden">
                          <div className="bg-red-50 p-3 font-bold text-red-700 flex items-center gap-2"><AlertTriangle size={18}/> רשימת חוסרים להזמנה דחופה</div>
                          <table className="w-full text-sm">
                              <thead className="bg-white text-gray-500 text-xs border-b">
                                  <tr><th className="p-2 text-right">מוצר</th><th className="p-2 text-right">ספק</th><th className="p-2 text-center">נוכחי</th><th className="p-2 text-center">מינימום</th></tr>
                              </thead>
                              <tbody>
                                  {lowStockItems.map(i => (
                                      <tr key={i.id} className="border-b last:border-0 hover:bg-red-50/30">
                                          <td className="p-2 font-medium">{i.name}</td>
                                          <td className="p-2 text-gray-500">{i.supplier || '-'}</td>
                                          <td className="p-2 text-center font-bold text-red-600">{i.quantity}</td>
                                          <td className="p-2 text-center text-gray-400">{i.min_quantity}</td>
                                      </tr>
                                  ))}
                                  {lowStockItems.length === 0 && <tr><td colSpan="4" className="p-6 text-center text-gray-400">המלאי תקין, אין חוסרים 🎉</td></tr>}
                              </tbody>
                          </table>
                      </div>
                  )}

                  {/* דוח כללי */}
                  {reportFilter === 'all' && (
                       <table className="w-full text-sm border rounded-xl overflow-hidden">
                           <thead className="bg-slate-900 text-white text-xs">
                               <tr><th className="p-3 text-right">מוצר</th><th className="p-3 text-right">ספק</th><th className="p-3 text-center">כמות</th></tr>
                           </thead>
                           <tbody>
                               {items.map((i, idx) => (
                                   <tr key={i.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                       <td className="p-3 font-medium">{i.name}</td>
                                       <td className="p-3 text-gray-500">{i.supplier}</td>
                                       <td className="p-3 text-center font-bold">{i.quantity} {i.unit}</td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                  )}
              </div>
          </div>
      )}

      {/* --- מודאל הוספה / עריכה (חלון קופץ) --- */}
      {showAddForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl animate-in slide-in-from-bottom-4">
                  <h3 className="font-bold text-lg mb-4 text-gray-800">{editingItem ? 'עריכת פרטי מוצר' : 'הוספת מוצר חדש'}</h3>
                  <form onSubmit={handleSaveItem} className="space-y-4">
                      <div><label className="text-xs font-bold text-gray-500">שם המוצר</label><input required className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 outline-none focus:border-blue-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="למשל: מלט לבן" /></div>
                      <div><label className="text-xs font-bold text-gray-500">שם ספק / סוכן</label><input className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 outline-none focus:border-blue-500" value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} placeholder="למשל: אלוני קרמיקה" /></div>
                      
                      <div className="grid grid-cols-2 gap-3">
                          <div><label className="text-xs font-bold text-gray-500">כמות נוכחית</label><input type="number" required className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 outline-none font-bold" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} /></div>
                          <div><label className="text-xs font-bold text-gray-500">יחידת מידה</label><select className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 outline-none" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}><option>יח'</option><option>ק"ג</option><option>מטר</option><option>ארגז</option><option>שק</option><option>ליטר</option></select></div>
                      </div>
                      <div><label className="text-xs font-bold text-gray-500">התראה כשמגיע למינימום של:</label><input type="number" required className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 outline-none" value={formData.min_quantity} onChange={e => setFormData({...formData, min_quantity: e.target.value})} /></div>
                      
                      <div className="flex gap-2 mt-4">
                          <button type="button" onClick={closeForms} className="flex-1 bg-gray-100 text-gray-600 font-bold p-3 rounded-xl">ביטול</button>
                          <button type="submit" className="flex-[2] bg-slate-900 text-white font-bold p-3 rounded-xl flex items-center justify-center gap-2"><Save size={18}/> שמור</button>
                      </div>
                      {editingItem && <button type="button" onClick={() => { deleteItem(editingItem.id); closeForms(); }} className="w-full mt-2 text-red-500 text-xs font-bold py-2 flex items-center justify-center gap-1"><Trash2 size={14}/> מחק מוצר זה</button>}
                  </form>
              </div>
          </div>
      )}

      {/* --- מודאל עדכון מלאי מהיר --- */}
      {stockUpdateItem && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
             <div className="bg-white w-full max-w-xs rounded-2xl p-5 shadow-2xl relative">
                <button onClick={() => setStockUpdateItem(null)} className="absolute top-3 left-3 bg-gray-100 p-1 rounded-full"><X size={16}/></button>
                <div className="text-center mb-4">
                    <h3 className="font-bold text-gray-800 text-lg">{stockUpdateItem.name}</h3>
                    <p className="text-gray-500 text-sm">כמות נוכחית: <span className="font-bold">{stockUpdateItem.quantity}</span></p>
                </div>
                
                <input 
                    type="number" autoFocus 
                    placeholder="כמות לשינוי..." 
                    className="w-full p-4 text-center text-2xl font-bold bg-gray-50 rounded-xl border-2 border-blue-100 outline-none focus:border-blue-500 mb-4"
                    value={stockAmount} onChange={e => setStockAmount(e.target.value)}
                />

                <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleStockUpdate('add')} className="bg-green-100 text-green-700 p-3 rounded-xl font-bold hover:bg-green-200 transition-colors flex items-center justify-center gap-2"><Plus size={18}/> הוסף</button>
                        <button onClick={() => handleStockUpdate('subtract')} className="bg-red-100 text-red-700 p-3 rounded-xl font-bold hover:bg-red-200 transition-colors flex items-center justify-center gap-2"><ArrowDown size={18}/> הורד</button>
                    </div>
                    <button onClick={() => handleStockUpdate('set')} className="w-full bg-gray-100 text-gray-600 p-3 rounded-xl font-bold text-sm hover:bg-gray-200">קבע כמות סופית (ספירת מלאי)</button>
                </div>
             </div>
          </div>
      )}

      {/* CSS להדפסה */}
      <style>{`
        @media print {
            body * { visibility: hidden; }
            .printable-content, .printable-content * { visibility: visible; }
            .printable-content { position: absolute; left: 0; top: 0; width: 100%; }
            button { display: none !important; }
        }
      `}</style>
    </div>
  );
}