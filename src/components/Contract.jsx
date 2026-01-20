import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { FileSignature, CheckSquare, Square, Plus, Eraser, Loader2, Check, Printer, Save as SaveIcon, FileEdit, Banknote } from 'lucide-react';

export default function Contract({ client }) {
  const { orgId } = useAuth(); 
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [contractId, setContractId] = useState(null);
  const [contractStatus, setContractStatus] = useState('new'); 
  
  const [displayClient, setDisplayClient] = useState(client || {}); 
  // הוספנו את ה-price ל-state
  const [jobDetails, setJobDetails] = useState({ description: '', startDate: '', endDate: '', price: '' });
  const [contractTerms, setContractTerms] = useState([]); 
  
  const [customTerm, setCustomTerm] = useState(''); 
  const [saveToLibrary, setSaveToLibrary] = useState(false); 
  
  const [designSettings, setDesignSettings] = useState({
    letterheadUrl: null,
    paddingTop: 150,
    paddingBottom: 100,
    paddingRight: 40,
    paddingLeft: 40
  });

  const canvasRef = useRef(null);
  const iframeRef = useRef(null); 
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureImage, setSignatureImage] = useState(null); 

  useEffect(() => {
    if (client?.id && orgId) {
        fetchData();
    }
  }, [client.id, orgId]);

  useEffect(() => {
      if (contractStatus === 'new' && client) {
          setDisplayClient(client);
      }
  }, [client, contractStatus]);

  useEffect(() => {
    if (!loading && contractStatus !== 'signed' && canvasRef.current && !signatureImage) {
        const canvas = canvasRef.current;
        const parent = canvas.parentElement;
        if (parent) {
            const rect = parent.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = 160;
            const ctx = canvas.getContext('2d');
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#000000';
        }
    }
  }, [loading, contractStatus, signatureImage]);

  const fetchData = async () => {
    setLoading(true);
    setContractId(null);
    
    try {
        const { data: settings } = await supabase.from('user_settings').select('*').eq('organization_id', orgId).maybeSingle();
        if (settings) {
            setDesignSettings({
                letterheadUrl: settings.letterhead_url,
                paddingTop: settings.padding_top || 150,
                paddingBottom: settings.padding_bottom || 100,
                paddingRight: settings.padding_right || 40,
                paddingLeft: settings.padding_left || 40
            });
        }

        const { data: existingContract } = await supabase.from('contracts').select('*').eq('client_id', client.id).order('id', { ascending: false }).limit(1).maybeSingle();

        if (existingContract) {
            setContractId(existingContract.id);
            if (existingContract.signature_url) {
                setContractStatus('signed');
                setSignatureImage(existingContract.signature_url);
            } else {
                setContractStatus('draft');
            }

            const content = existingContract.contract_content || {};
            if (content.client_snapshot?.full_name) setDisplayClient(content.client_snapshot);
            else setDisplayClient(client);

            if (content.job_details) setJobDetails(content.job_details);

            if (content.full_terms_snapshot) {
                setContractTerms(content.full_terms_snapshot);
            } else if (content.approved_term_ids) {
                const { data: libTerms } = await supabase.from('terms_library').select('*').eq('organization_id', orgId);
                if (libTerms) {
                    setContractTerms(libTerms.map(t => ({ id: t.id, content: t.content, isSelected: content.approved_term_ids.includes(t.id) })));
                }
            }
        } else {
            setContractStatus('new');
            setDisplayClient(client);

            const { data: projectData } = await supabase.from('projects').select('*').eq('client_id', client.id).maybeSingle();
            if (projectData) {
                setJobDetails({
                    description: projectData.description || '',
                    startDate: projectData.start_date ? new Date(projectData.start_date).toLocaleDateString('he-IL') : '---',
                    endDate: projectData.end_date ? new Date(projectData.end_date).toLocaleDateString('he-IL') : '---',
                    price: projectData.price || '' // <-- שליפת המחיר
                });
            } else {
                setJobDetails({ description: "טרם הוזנו פרטי עבודה.", startDate: "---", endDate: "---", price: "" });
            }

            const { data: libTerms } = await supabase.from('terms_library').select('*').eq('organization_id', orgId).order('id');
            if (libTerms) {
                setContractTerms(libTerms.map(t => ({ id: t.id, content: t.content, isSelected: t.is_default })));
            }
        }

    } catch (err) { console.error("Error:", err); alert("שגיאה בטעינת הנתונים"); } finally { setLoading(false); }
  };

  const saveContractToDB = async (isSigning) => {
      if (!orgId) return;
      try {
          setSaving(true);
          let finalSigUrl = signatureImage;
          if (isSigning && canvasRef.current) {
              finalSigUrl = canvasRef.current.toDataURL("image/png");
              setSignatureImage(finalSigUrl);
          }

          const clientToSave = (displayClient && displayClient.full_name) ? displayClient : client;
          const contractContent = {
              client_snapshot: clientToSave, 
              job_details: jobDetails, // המחיר כבר בפנים
              full_terms_snapshot: contractTerms 
          };

          const payload = {
              client_id: client.id,
              organization_id: orgId, 
              contract_content: contractContent,
              signature_url: isSigning ? finalSigUrl : null 
          };

          let data, error;
          if (contractId) {
              const res = await supabase.from('contracts').update(payload).eq('id', contractId).select().single();
              data = res.data; error = res.error;
          } else {
              const res = await supabase.from('contracts').insert([payload]).select().single();
              data = res.data; error = res.error;
          }

          if (error) throw error;
          if (data && data.id) setContractId(data.id);

          setDisplayClient(clientToSave);

          if (isSigning) {
              await supabase.from('clients').update({ status: 'signed' }).eq('id', client.id);
              setContractStatus('signed');
              alert('החוזה נחתם בהצלחה!');
          } else {
              setContractStatus('draft');
              alert('הטיוטה נשמרה!');
          }

      } catch (error) { alert('שגיאה בשמירה: ' + error.message); } finally { setSaving(false); }
  };

  const addCustomTermLocal = async () => {
      if (!customTerm.trim()) return;
      const newTermObj = { id: `custom_${Date.now()}`, content: customTerm, isSelected: true };
      if (saveToLibrary) {
          await supabase.from('terms_library').insert([{ content: customTerm, is_default: false, organization_id: orgId }]);
      }
      setContractTerms([...contractTerms, newTermObj]);
      setCustomTerm('');
      setSaveToLibrary(false);
  };

  const toggleTerm = (id) => { if (contractStatus === 'signed') return; setContractTerms(prev => prev.map(t => t.id === id ? { ...t, isSelected: !t.isSelected } : t)); };

  // --- הדפסה (HTML Template) ---
  const handlePrint = async () => {
    let currentSig = signatureImage;
    if (contractStatus !== 'signed' && canvasRef.current && !signatureImage) {
        currentSig = canvasRef.current.toDataURL('image/png');
    }

    const printName = displayClient?.full_name || client.full_name || "";
    const printPhone = displayClient?.phone || client.phone || "";
    const printAddress = displayClient?.address || client.address || "";

    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <title>חוזה עבודה - ${printName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;700&display=swap" rel="stylesheet">
        <style>
          @page { size: A4; margin: 0; }
          body { font-family: 'Rubik', sans-serif; margin: 0; background: white; color: #1a1a1a; -webkit-print-color-adjust: exact; }
          .page-background { position: fixed; top: 0; left: 0; width: 210mm; height: 297mm; z-index: -1; background-image: url('${designSettings.letterheadUrl || ''}'); background-size: 100% 100%; background-repeat: no-repeat; }
          table { width: 100%; border-collapse: collapse; }
          thead .spacer { height: ${designSettings.paddingTop}px; }
          tfoot .spacer { height: ${designSettings.paddingBottom}px; }
          .content-cell { padding-left: ${designSettings.paddingLeft}px; padding-right: ${designSettings.paddingRight}px; }
          h1 { font-size: 32px; font-weight: 800; text-align: center; margin-bottom: 5px; }
          .order-num { text-align: center; font-size: 14px; color: #666; margin-bottom: 30px; }
          .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; font-size: 16px; }
          .detail-item { display: flex; }
          .detail-label { font-weight: 700; width: 80px; }
          h2 { font-size: 20px; font-weight: 700; border-bottom: 2px solid #eee; padding-bottom: 5px; margin-top: 30px; margin-bottom: 15px; }
          .job-desc { font-size: 16px; line-height: 1.6; white-space: pre-line; background: #fff; }
          .dates-row { display: flex; gap: 40px; margin: 20px 0; font-size: 16px; font-weight: 500; }
          .price-row { margin: 20px 0; font-size: 18px; font-weight: 700; color: #111; border: 2px solid #eee; padding: 10px; border-radius: 8px; display: inline-block; }
          .terms-list { list-style: none; padding: 0; font-size: 16px; }
          .term-item { display: flex; align-items: start; gap: 10px; margin-bottom: 10px; page-break-inside: avoid; }
          .bullet { color: #000; font-weight: bold; font-size: 20px; line-height: 1; }
          .signature-section { margin-top: 50px; page-break-inside: avoid; }
          .sig-row { display: flex; justify-content: space-between; margin-top: 20px; gap: 40px; }
          .sig-box { flex: 1; text-align: center; }
          .sig-line { border-bottom: 1px solid #000; height: 80px; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 5px; }
          .sig-img { max-height: 70px; max-width: 100%; object-fit: contain; }
        </style>
      </head>
      <body>
        <div class="page-background"></div>
        <table>
          <thead><tr><td><div class="spacer"></div></td></tr></thead>
          <tbody>
            <tr>
              <td class="content-cell">
                <h1>הסכם עבודה</h1>
                <div class="order-num">מספר הזמנה: ${client.id.slice(0, 6)}</div>
                <div class="details-grid">
                  <div class="detail-item"><span class="detail-label">לכבוד:</span> <span>${printName}</span></div>
                  <div class="detail-item"><span class="detail-label">תאריך:</span> <span>${new Date().toLocaleDateString('he-IL')}</span></div>
                  <div class="detail-item"><span class="detail-label">טלפון:</span> <span>${printPhone}</span></div>
                  <div class="detail-item"><span class="detail-label">כתובת:</span> <span>${printAddress}</span></div>
                </div>
                <h2>מהות העבודה</h2>
                <div class="job-desc">${jobDetails?.description}</div>
                
                <div class="dates-row">
                   <div><strong>תאריך התחלה:</strong> ${jobDetails?.startDate}</div>
                   <div><strong>תאריך סיום:</strong> ${jobDetails?.endDate}</div>
                </div>

                ${jobDetails.price ? `
                <div class="price-row">
                    תמורה מוסכמת: ₪${jobDetails.price} (לפני מע"מ)
                </div>` : ''}

                <h2>תנאי העסקה</h2>
                <ul class="terms-list">
                  ${contractTerms.filter(t => t.isSelected).map(t => `
                    <li class="term-item"><span class="bullet">•</span><span>${t.content}</span></li>
                  `).join('')}
                </ul>
                <div class="signature-section">
                  <div>בחתימתי אני מאשר את ביצוע העבודה ואת התנאים הנ"ל.</div>
                  <div class="sig-row">
                     <div class="sig-box">
                        <div class="sig-line">${currentSig ? `<img src="${currentSig}" class="sig-img" />` : ''}</div>
                        <div>${printName}</div>
                     </div>
                     <div class="sig-box" style="flex: 0 0 150px;">
                        <div class="sig-line"><span>${new Date().toLocaleDateString('he-IL')}</span></div>
                        <div>תאריך</div>
                     </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot><tr><td><div class="spacer"></div></td></tr></tfoot>
        </table>
        <script>
            const bgUrl = '${designSettings.letterheadUrl || ''}';
            function doPrint() { setTimeout(() => { window.focus(); window.print(); }, 100); }
            if (bgUrl) { const img = new Image(); img.src = bgUrl; img.onload = doPrint; img.onerror = doPrint; } else { doPrint(); }
        </script>
      </body>
      </html>
    `;

    const iframe = iframeRef.current;
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(printContent);
    doc.close();
  };

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x, y };
  };

  const startDrawing = (e) => { if (contractStatus === 'signed') return; setIsDrawing(true); const { x, y } = getCoordinates(e); const ctx = canvasRef.current.getContext('2d'); ctx.beginPath(); ctx.moveTo(x, y); };
  const draw = (e) => { if (!isDrawing || contractStatus === 'signed') return; const { x, y } = getCoordinates(e); const ctx = canvasRef.current.getContext('2d'); ctx.lineTo(x, y); ctx.stroke(); };
  const stopDrawing = () => { setIsDrawing(false); canvasRef.current?.getContext('2d')?.closePath(); };
  const clearCanvas = () => { const canvas = canvasRef.current; const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); setSignatureImage(null); };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500"/></div>;

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-32 animate-in slide-in-from-bottom-4 relative">
      <iframe ref={iframeRef} style={{ display: 'none' }} title="Print Frame" />

      <div className="p-4 space-y-4 overflow-y-auto">
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm text-center">
          <h2 className="text-xl font-bold">{contractStatus === 'signed' ? 'הסכם עבודה (חתום)' : contractStatus === 'draft' ? 'הסכם עבודה (טיוטה)' : 'הסכם עבודה חדש'}</h2>
          <p className="text-white/70 text-sm mt-1">מספר הזמנה: {client.id.slice(0, 8)}</p>
        </div>

        {/* פרטי לקוח ועבודה */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-3">
            <h3 className="font-bold text-gray-800 border-b pb-2">פרטי ההתקשרות:</h3>
            <div className="text-sm space-y-1">
                <div><span className="font-bold">לקוח:</span> {displayClient.full_name || client.full_name}</div>
                <div><span className="font-bold">טלפון:</span> {displayClient.phone || client.phone}</div>
                <div><span className="font-bold">כתובת:</span> {displayClient.address || client.address}</div>
            </div>
            <div className="pt-2">
                <span className="font-bold text-sm block mb-1">תיאור עבודה:</span>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg whitespace-pre-line">{jobDetails.description}</p>
            </div>
            
            <div className="flex gap-4 text-xs font-bold text-gray-500">
                <span>התחלה: {jobDetails.startDate}</span>
                <span>סיום: {jobDetails.endDate}</span>
            </div>

            {/* --- הצגת המחיר החדש --- */}
            {jobDetails.price && (
                <div className="pt-2 mt-2 border-t border-dashed border-gray-100 flex items-center gap-2 text-emerald-700 font-bold">
                    <Banknote size={18} />
                    <span>מחיר עבודה: ₪{jobDetails.price} (לפני מע"מ)</span>
                </div>
            )}
        </div>

        {/* תנאים */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><CheckSquare size={18} className="text-blue-600"/> בחירת סעיפים לחוזה</h3>
          <div className="space-y-3">
            {contractTerms.map(term => (
                <div key={term.id} onClick={() => toggleTerm(term.id)} className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${contractStatus !== 'signed' ? 'cursor-pointer hover:bg-gray-50' : ''} ${term.isSelected ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-transparent'}`}>
                  <div className={`mt-0.5 shrink-0 ${term.isSelected ? 'text-blue-600' : 'text-gray-300'}`}>{term.isSelected ? <CheckSquare size={20} /> : <Square size={20} />}</div>
                  <p className={`text-sm ${term.isSelected ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>{term.content}</p>
                </div>
            ))}
          </div>
          {contractStatus !== 'signed' && (<div className="mt-4 pt-4 border-t border-gray-100"><div className="flex flex-col gap-2"><label className="text-xs text-gray-500">הוספת תנאי מיוחד לחוזה זה:</label><div className="flex gap-2"><input value={customTerm} onChange={e => setCustomTerm(e.target.value)} placeholder="הקלד תנאי..." className="flex-1 bg-gray-50 border p-2 rounded-lg text-sm outline-none"/><button onClick={addCustomTermLocal} className="bg-slate-900 text-white p-2 rounded-lg"><Plus size={18}/></button></div><div className="flex items-center gap-2 mt-2"><input type="checkbox" checked={saveToLibrary} onChange={e => setSaveToLibrary(e.target.checked)} id="saveLib" /><label htmlFor="saveLib" className="text-xs text-gray-500">שמור גם למאגר הכללי</label></div></div></div>)}
        </div>

        {/* חתימה */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><FileSignature size={18} className="text-blue-600"/> חתימה</h3>
          <div className={`border-2 border-dashed rounded-xl bg-gray-50 overflow-hidden relative ${contractStatus === 'signed' ? 'border-emerald-400 bg-emerald-50' : 'border-gray-300'}`} style={{ height: '160px' }}>
            {contractStatus !== 'signed' && !signatureImage ? (<canvas ref={canvasRef} className="w-full h-full cursor-crosshair touch-none" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />) : (<div className="w-full h-full flex items-center justify-center relative"><img src={signatureImage} alt="חתימה" className="max-h-full max-w-full object-contain" />{contractStatus === 'signed' && <div className="absolute top-2 right-2 bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><Check size={12}/> חתום</div>}</div>)}
            {contractStatus !== 'signed' && !signatureImage && (<button onClick={clearCanvas} className="absolute top-2 left-2 p-1.5 bg-white/80 backdrop-blur shadow-sm text-gray-500 rounded-lg hover:text-red-500 text-xs flex items-center gap-1"><Eraser size={14} /> נקה</button>)}
            {contractStatus === 'draft' && signatureImage && (<button onClick={() => setSignatureImage(null)} className="absolute top-2 left-2 p-1.5 bg-white shadow text-red-500 rounded text-xs border">נקה חתימה</button>)}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg z-50 flex gap-3 max-w-md mx-auto">
        <button onClick={handlePrint} className="flex-1 bg-gray-100 p-3 rounded-xl font-bold flex justify-center gap-2 text-gray-800 hover:bg-gray-200"><Printer size={20}/></button>
        {contractStatus !== 'signed' ? (<><button onClick={() => saveContractToDB(false)} disabled={saving} className="flex-1 bg-blue-50 text-blue-700 p-3 rounded-xl font-bold flex justify-center gap-2 hover:bg-blue-100">{saving ? <Loader2 className="animate-spin"/> : <FileEdit size={20}/>} טיוטה</button><button onClick={() => saveContractToDB(true)} disabled={saving} className="flex-[2] bg-slate-900 text-white p-3 rounded-xl font-bold flex justify-center gap-2 shadow-lg shadow-slate-200">{saving ? <Loader2 className="animate-spin"/> : <SaveIcon size={20}/>} חתום</button></>) : (<div className="flex-[2] bg-emerald-100 text-emerald-700 p-3 rounded-xl font-bold flex justify-center gap-2 items-center"><Check size={20}/> החוזה סגור וחתום</div>)}
      </div>
    </div>
  );
}