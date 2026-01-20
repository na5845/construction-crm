import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { 
  FileText, Upload, PenTool, Eraser, Loader2, Trash2, X, Check, Minus, 
  ArrowUpRight, ArrowLeftRight, Type, RotateCw, Maximize, 
  AlignRight, AlignCenter, AlignLeft, Bold, Plus as PlusIcon, Minus as MinusIcon, Edit 
} from 'lucide-react';
import ImageViewer from './ImageViewer';

export default function Blueprints({ clientId }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  // --- סטייטים לציור ---
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(3);
  const [drawingTool, setDrawingTool] = useState('pen'); 
  const [sketchTitle, setSketchTitle] = useState(""); 
  
  // תמונה לעריכה + הקובץ המקורי (לצורך דריסה)
  const [bgImage, setBgImage] = useState(null); 
  const [editingFile, setEditingFile] = useState(null); // <-- התוספת לזיהוי עריכה

  const canvasRef = useRef(null);
  const containerRef = useRef(null); 
  
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 }); 
  const [snapshot, setSnapshot] = useState(null); 
  
  const [textObject, setTextObject] = useState(null); 
  const [textAction, setTextAction] = useState(null); 
  const [actionStart, setActionStart] = useState({ x: 0, y: 0 }); 

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null); 
  
  const imageFiles = files.filter(f => f.file_type === 'image' || f.file_type === 'sketch');

  useEffect(() => {
    fetchFiles();
  }, [clientId]);

  // אתחול קנבס
  useEffect(() => {
    if (isDrawing && canvasRef.current && containerRef.current) {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (bgImage) {
            const scale = Math.min(canvas.width / bgImage.width, canvas.height / bgImage.height);
            const x = (canvas.width / 2) - (bgImage.width / 2) * scale;
            const y = (canvas.height / 2) - (bgImage.height / 2) * scale;
            
            ctx.drawImage(bgImage, x, y, bgImage.width * scale, bgImage.height * scale);
        }
    }
  }, [isDrawing, bgImage]);

  const fetchFiles = async () => {
    const { data } = await supabase.from('project_files').select('*').eq('client_id', clientId).eq('category', 'blueprint').order('uploaded_at', { ascending: false });
    if (data) setFiles(data);
  };

  const handleEditFile = (file, e) => {
      e.stopPropagation(); 
      
      if (file.file_type === 'document') {
          alert('לא ניתן לערוך קבצי PDF');
          return;
      }

      setUploading(true); 

      const img = new Image();
      img.src = file.file_url;
      img.crossOrigin = "Anonymous"; 
      
      img.onload = () => {
          setEditingFile(file); // <-- שמירת הקובץ המקורי בזיכרון
          setBgImage(img);
          setSketchTitle(file.file_name); // מציג את השם המקורי
          setIsDrawing(true);
          setUploading(false);
      };

      img.onerror = () => {
          alert("שגיאה בטעינת התמונה לעריכה");
          setUploading(false);
      };
  };

  const handleFileUpload = async (event) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file) return;

      const isImage = file.type.startsWith('image/');
      const fileType = isImage ? 'image' : 'document';
      const fileExt = file.name.split('.').pop();
      const fileName = `${clientId}/blueprint_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('project-files').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('project-files').getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('project_files').insert([{ 
          client_id: clientId, 
          file_url: publicUrl, 
          file_type: fileType, 
          category: 'blueprint',
          file_name: file.name
      }]);

      if (dbError) throw dbError;
      fetchFiles();
    } catch (error) { alert('שגיאה: ' + error.message); } finally { setUploading(false); }
  };

  const getGlobalCoordinates = (event) => {
      const clientX = event.touches && event.touches.length > 0 ? event.touches[0].clientX : event.clientX;
      const clientY = event.touches && event.touches.length > 0 ? event.touches[0].clientY : event.clientY;
      return { x: clientX, y: clientY };
  };

  const getCanvasCoordinates = (event) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const global = getGlobalCoordinates(event);
    return { 
        x: global.x - rect.left, 
        y: global.y - rect.top 
    };
  };

  const handlePointerDown = (e) => {
    if (textObject) return;

    const { x, y } = getCanvasCoordinates(e);

    if (drawingTool === 'text') {
        if(e.cancelable) e.preventDefault();
        setTextObject({
            x, y,
            text: '',
            width: 200,
            height: 50,
            rotation: 0,
            fontSize: brushSize * 4 + 14,
            textAlign: 'right', 
            isBold: false,
            color: brushColor
        });
        return;
    }

    if(e.cancelable) e.preventDefault();
    setIsDrawingActive(true);
    setStartPos({ x, y });

    const ctx = canvasRef.current.getContext('2d');
    setSnapshot(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;

    if (drawingTool === 'eraser') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#ffffff'; 
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = brushColor;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handlePointerMove = (e) => {
    if (textObject && textAction) {
        if(e.cancelable) e.preventDefault();
        const global = getGlobalCoordinates(e);
        const dx = global.x - actionStart.x;
        const dy = global.y - actionStart.y;

        if (textAction === 'drag') {
            setTextObject(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
            setActionStart(global); 
        } 
        else if (textAction === 'resize') {
            setTextObject(prev => ({ ...prev, width: Math.max(50, prev.width + dx) }));
            setActionStart(global);
        }
        else if (textAction === 'rotate') {
            const rect = containerRef.current.getBoundingClientRect();
            const centerX = rect.left + textObject.x + textObject.width / 2;
            const centerY = rect.top + textObject.y + textObject.height / 2;
            const angle = Math.atan2(global.y - centerY, global.x - centerX);
            const degrees = angle * (180 / Math.PI) + 90;
            setTextObject(prev => ({ ...prev, rotation: degrees }));
        }
        return;
    }

    if (!isDrawingActive || drawingTool === 'text') return;
    if(e.cancelable) e.preventDefault();

    const { x, y } = getCanvasCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');

    if (drawingTool === 'pen' || drawingTool === 'eraser') {
        ctx.lineTo(x, y);
        ctx.stroke();
    } else {
        if (snapshot) ctx.putImageData(snapshot, 0, 0);
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(x, y);
        ctx.stroke();

        if (drawingTool === 'arrow') drawArrowHead(ctx, startPos.x, startPos.y, x, y);
        else if (drawingTool === 'double_arrow') {
            drawArrowHead(ctx, startPos.x, startPos.y, x, y);
            drawArrowHead(ctx, x, y, startPos.x, startPos.y);
        }
    }
  };

  const handlePointerUp = () => {
    if (textAction) setTextAction(null);
    if (isDrawingActive) {
        setIsDrawingActive(false);
        canvasRef.current?.getContext('2d')?.closePath();
    }
  };

  const drawArrowHead = (ctx, fromX, fromY, toX, toY) => {
      const headLength = brushSize * 3 + 10; 
      const angle = Math.atan2(toY - fromY, toX - fromX);
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(toX, toY);
      ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
  };

  const burnTextToCanvas = () => {
      if (!textObject || !textObject.text.trim()) {
          setTextObject(null);
          return;
      }

      const ctx = canvasRef.current.getContext('2d');
      ctx.save(); 
      
      const centerX = textObject.x + textObject.width / 2;
      const centerY = textObject.y + textObject.height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate(textObject.rotation * Math.PI / 180);
      ctx.translate(-centerX, -centerY);

      ctx.font = `${textObject.isBold ? 'bold' : 'normal'} ${textObject.fontSize}px Arial`;
      ctx.fillStyle = textObject.color;
      ctx.textBaseline = 'top';
      
      let x = textObject.x;
      if (textObject.textAlign === 'center') {
          x = textObject.x + textObject.width / 2;
          ctx.textAlign = 'center';
      } else if (textObject.textAlign === 'left') {
          x = textObject.x;
          ctx.textAlign = 'left';
      } else {
          x = textObject.x + textObject.width;
          ctx.textAlign = 'right';
      }

      const words = textObject.text.split(' ');
      let line = '';
      let y = textObject.y;
      const lineHeight = textObject.fontSize * 1.2;

      for(let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > textObject.width && n > 0) {
          ctx.fillText(line, x, y);
          line = words[n] + ' ';
          y += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, y);

      ctx.restore(); 
      setTextObject(null); 
  };

  const startTextAction = (e, action) => {
      e.stopPropagation(); 
      if(e.cancelable) e.preventDefault();
      setTextAction(action);
      setActionStart(getGlobalCoordinates(e));
  };

  const updateTextProp = (prop, value) => {
      setTextObject(prev => ({ ...prev, [prop]: value }));
  };

  const clearCanvasAll = () => {
    if(!confirm("לנקות את כל הלוח?")) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height); 
    
    if (bgImage) {
        const scale = Math.min(canvas.width / bgImage.width, canvas.height / bgImage.height);
        const x = (canvas.width / 2) - (bgImage.width / 2) * scale;
        const y = (canvas.height / 2) - (bgImage.height / 2) * scale;
        ctx.drawImage(bgImage, x, y, bgImage.width * scale, bgImage.height * scale);
    }

    setTextObject(null);
  };

  const drawGridOnCanvas = (ctx, w, h) => {
      ctx.beginPath();
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      const step = 20;
      for (let x = 0; x <= w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      for (let y = 0; y <= h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
      ctx.stroke();
  };

  const handleSaveDrawing = async () => {
    if (textObject) burnTextToCanvas(); 
    if (!sketchTitle.trim()) { alert("אנא הכנס שם לסקיצה"); return; }

    setTimeout(async () => {
        try {
          setUploading(true);
          const canvas = canvasRef.current;
          
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const tCtx = tempCanvas.getContext('2d');

          // רקע לבן
          tCtx.fillStyle = '#ffffff';
          tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          
          // אם זו לא עריכת תמונה, נצייר רשת
          if (!bgImage) {
              drawGridOnCanvas(tCtx, tempCanvas.width, tempCanvas.height);
          }

          tCtx.drawImage(canvas, 0, 0);

          const blob = await new Promise(resolve => tempCanvas.toBlob(resolve, 'image/png'));
          
          // שם קובץ חדש (כדי לעקוף מטמון דפדפן)
          const fileName = `${clientId}/sketch_${Date.now()}.png`;
          
          // העלאת הקובץ החדש
          const { error: uploadError } = await supabase.storage.from('project-files').upload(fileName, blob);
          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage.from('project-files').getPublicUrl(fileName);
          const finalName = sketchTitle || 'סקיצה ללא שם';

          if (editingFile) {
              // --- מצב עריכה: עדכון הרשומה הקיימת ---
              const { error: updateError } = await supabase
                  .from('project_files')
                  .update({
                      file_url: publicUrl,
                      file_name: finalName,
                      uploaded_at: new Date().toISOString() // עדכון זמן
                  })
                  .eq('id', editingFile.id);

              if (updateError) throw updateError;
              
              // אופציונלי: כאן ניתן למחוק את הקובץ הישן מהסטורג' כדי לחסוך מקום
          } else {
              // --- מצב חדש: יצירת רשומה חדשה ---
              const { error: insertError } = await supabase.from('project_files').insert([{ 
                  client_id: clientId, 
                  file_url: publicUrl, 
                  file_type: 'sketch',
                  category: 'blueprint',
                  file_name: finalName
              }]);
              if (insertError) throw insertError;
          }

          handleCloseDrawing();
          fetchFiles();
        } catch (error) { alert('שגיאה בשמירה: ' + error.message); } finally { setUploading(false); }
    }, 100);
  };

  const handleCloseDrawing = () => {
      setIsDrawing(false);
      setBgImage(null);
      setEditingFile(null); // איפוס הקובץ הנערך
      setSketchTitle("");
      setTextObject(null);
  };

  const handleDelete = async (id) => {
    if(!confirm('למחוק את הקובץ?')) return;
    await supabase.from('project_files').delete().eq('id', id);
    fetchFiles();
  };

  const handleFileClick = (file) => {
    if (file.file_type === 'image' || file.file_type === 'sketch') {
      const index = imageFiles.findIndex(img => img.id === file.id);
      setSelectedPhotoIndex(index);
    } else {
      setPdfUrl(file.file_url);
    }
  };

  return (
    <div className="p-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      
      {!isDrawing && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button 
              onClick={() => { 
                  handleCloseDrawing();
                  setIsDrawing(true); 
              }}
              className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-200 flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <div className="bg-white/20 p-2 rounded-full"><PenTool size={24} /></div>
              <span className="font-bold text-sm">סקיצה חדשה</span>
            </button>

            <label className="bg-white text-gray-700 border border-gray-200 p-4 rounded-2xl shadow-sm flex flex-col items-center gap-2 active:scale-95 transition-transform cursor-pointer">
              <div className="bg-gray-100 p-2 rounded-full">{uploading ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} className="text-gray-600"/>}</div>
              <span className="font-bold text-sm">{uploading ? 'מעלה...' : 'העלה PDF או תמונה'}</span>
              <input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} disabled={uploading} className="hidden" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {files.map((file) => (
              <div key={file.id} className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 group relative cursor-pointer" onClick={() => handleFileClick(file)}>
                <div className="aspect-[4/3] bg-gray-100 rounded-lg mb-2 overflow-hidden flex items-center justify-center relative">
                  {file.file_type === 'document' ? (
                    <div className="flex flex-col items-center justify-center text-gray-400"><FileText size={32} /><span className="text-[10px] mt-1 font-bold">PDF</span></div>
                  ) : (<img src={file.file_url} alt={file.file_name} className="w-full h-full object-cover" />)}
                  
                  {/* כפתורי פעולות */}
                  <div className="absolute top-2 right-2 flex gap-1">
                       <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                        className="bg-white/90 p-1.5 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </button>
                      
                      {(file.file_type === 'image' || file.file_type === 'sketch') && (
                          <button 
                            onClick={(e) => handleEditFile(file, e)}
                            className="bg-white/90 p-1.5 rounded-full text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10 hover:bg-blue-50"
                          >
                            <Edit size={16} />
                          </button>
                      )}
                  </div>

                </div>
                <div className="px-1"><h4 className="font-bold text-xs text-gray-800 truncate">{file.file_name || 'קובץ ללא שם'}</h4><p className="text-[10px] text-gray-500">{new Date(file.created_at).toLocaleDateString()}</p></div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* --- מסך ציור --- */}
      {isDrawing && (
        <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col">
          {/* Header */}
          <div className="bg-white p-3 shadow-sm flex justify-between items-center gap-3 px-4 shrink-0">
            <button onClick={handleCloseDrawing} className="p-2 bg-gray-100 rounded-full text-gray-600 shrink-0"><X size={20} /></button>
            <input type="text" value={sketchTitle} onChange={(e) => setSketchTitle(e.target.value)} placeholder="שם הסקיצה (חובה)..." className="flex-1 bg-gray-50 border-none rounded-lg px-3 py-2 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none text-right" />
            <button onClick={handleSaveDrawing} disabled={uploading} className="p-2 bg-blue-600 rounded-full text-white shadow-lg shadow-blue-200 shrink-0">{uploading ? <Loader2 size={20} className="animate-spin"/> : <Check size={20} />}</button>
          </div>

          <div 
            className="flex-1 overflow-hidden relative touch-none bg-white" 
            ref={containerRef}
            style={!bgImage ? {
                backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                backgroundPosition: '-1px -1px'
            } : {}}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          >
            <canvas ref={canvasRef} className="absolute inset-0 z-10 block pointer-events-none" />
            
            {/* טקסט צף לעריכה */}
            {textObject && (
                <div
                    style={{
                        position: 'absolute',
                        left: textObject.x,
                        top: textObject.y,
                        width: textObject.width,
                        transform: `rotate(${textObject.rotation}deg)`,
                        transformOrigin: 'center center',
                        zIndex: 50,
                    }}
                    onMouseDown={(e) => startTextAction(e, 'drag')}
                    onTouchStart={(e) => startTextAction(e, 'drag')}
                >
                    <div className="relative border-2 border-blue-500 bg-white/50 backdrop-blur-sm" style={{ cursor: 'move' }}>
                        <textarea
                            autoFocus
                            value={textObject.text}
                            onChange={(e) => setTextObject({ ...textObject, text: e.target.value })}
                            style={{
                                width: '100%',
                                minHeight: '40px',
                                fontSize: `${textObject.fontSize}px`,
                                color: textObject.color,
                                fontWeight: textObject.isBold ? 'bold' : 'normal',
                                textAlign: textObject.textAlign,
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                resize: 'none',
                                fontFamily: 'Arial',
                                direction: 'rtl',
                                overflow: 'hidden',
                                padding: '5px'
                            }}
                            placeholder="הקלד כאן..."
                            ref={(el) => { if (el) { el.style.height = '0px'; el.style.height = el.scrollHeight + 'px'; } }}
                        />
                        <div onMouseDown={(e) => startTextAction(e, 'rotate')} onTouchStart={(e) => startTextAction(e, 'rotate')} className="absolute -top-8 left-1/2 -translate-x-1/2 w-8 h-8 bg-white border border-blue-500 rounded-full flex items-center justify-center cursor-pointer shadow-sm z-50"><RotateCw size={14} className="text-blue-600" /></div>
                        <div onMouseDown={(e) => startTextAction(e, 'resize')} onTouchStart={(e) => startTextAction(e, 'resize')} className="absolute -bottom-3 -left-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center cursor-ew-resize shadow-sm z-50"><Maximize size={12} className="text-white rotate-90" /></div>
                    </div>

                    <div className="absolute top-full right-0 mt-2 bg-slate-900 rounded-lg shadow-xl p-2 flex items-center gap-1 z-[100] min-w-[200px]" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                        <div className="flex items-center bg-slate-800 rounded mr-2"><button onClick={() => updateTextProp('fontSize', Math.max(10, textObject.fontSize - 2))} className="p-1.5 text-white hover:bg-slate-700 rounded-r"><MinusIcon size={14}/></button><span className="text-xs text-white px-1 w-6 text-center">{textObject.fontSize}</span><button onClick={() => updateTextProp('fontSize', textObject.fontSize + 2)} className="p-1.5 text-white hover:bg-slate-700 rounded-l"><PlusIcon size={14}/></button></div>
                        <button onClick={() => updateTextProp('isBold', !textObject.isBold)} className={`p-1.5 rounded ${textObject.isBold ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-800'}`}><Bold size={16}/></button>
                        <div className="w-px h-4 bg-slate-700 mx-1"></div>
                        <button onClick={() => updateTextProp('textAlign', 'right')} className={`p-1.5 rounded ${textObject.textAlign === 'right' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-800'}`}><AlignRight size={16}/></button>
                        <button onClick={() => updateTextProp('textAlign', 'center')} className={`p-1.5 rounded ${textObject.textAlign === 'center' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-800'}`}><AlignCenter size={16}/></button>
                        <button onClick={() => updateTextProp('textAlign', 'left')} className={`p-1.5 rounded ${textObject.textAlign === 'left' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-800'}`}><AlignLeft size={16}/></button>
                        <div className="w-px h-4 bg-slate-700 mx-1"></div>
                        <button onClick={burnTextToCanvas} className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600 mx-1"><Check size={16}/></button>
                        <button onClick={() => setTextObject(null)} className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600"><X size={16}/></button>
                    </div>
                </div>
            )}
          </div>

          <div className="bg-white p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex flex-col gap-3 shrink-0">
             <div className="flex justify-center gap-2 border-b border-gray-100 pb-3 overflow-x-auto no-scrollbar">
                <button onClick={() => setDrawingTool('pen')} className={`p-2 rounded-lg flex flex-col items-center gap-1 min-w-[50px] transition-colors ${drawingTool === 'pen' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-500'}`}><PenTool size={20} /> <span className="text-[10px]">עט</span></button>
                <button onClick={() => setDrawingTool('eraser')} className={`p-2 rounded-lg flex flex-col items-center gap-1 min-w-[50px] transition-colors ${drawingTool === 'eraser' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-500'}`}><Eraser size={20} /> <span className="text-[10px]">מחק</span></button>
                <button onClick={() => setDrawingTool('line')} className={`p-2 rounded-lg flex flex-col items-center gap-1 min-w-[50px] transition-colors ${drawingTool === 'line' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-500'}`}><Minus size={20} className="-rotate-45" /> <span className="text-[10px]">קו</span></button>
                <button onClick={() => setDrawingTool('arrow')} className={`p-2 rounded-lg flex flex-col items-center gap-1 min-w-[50px] transition-colors ${drawingTool === 'arrow' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-500'}`}><ArrowUpRight size={20} /> <span className="text-[10px]">חץ</span></button>
                <button onClick={() => setDrawingTool('double_arrow')} className={`p-2 rounded-lg flex flex-col items-center gap-1 min-w-[50px] transition-colors ${drawingTool === 'double_arrow' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-500'}`}><ArrowLeftRight size={20} /> <span className="text-[10px]">מידה</span></button>
                <button onClick={() => setDrawingTool('text')} className={`p-2 rounded-lg flex flex-col items-center gap-1 min-w-[50px] transition-colors ${drawingTool === 'text' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-500'}`}><Type size={20} /> <span className="text-[10px]">טקסט</span></button>
             </div>
             <div className="flex justify-between items-center mt-1">
                <div className="flex items-center gap-3">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200 shadow-sm"><input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer" /></div>
                    <div className="flex items-center gap-2"><input type="range" min="1" max="15" step="1" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" /><span className="text-xs font-bold text-gray-500 w-4">{brushSize}</span></div>
                </div>
                <button onClick={clearCanvasAll} className="text-xs text-red-500 font-bold bg-red-50 px-3 py-2 rounded-lg hover:bg-red-100 flex items-center gap-1"><Trash2 size={16} /> נקה הכל</button>
             </div>
          </div>
        </div>
      )}

      <ImageViewer images={imageFiles} selectedIndex={selectedPhotoIndex} onClose={() => setSelectedPhotoIndex(null)} onIndexChange={setSelectedPhotoIndex} />
      {pdfUrl && (<div className="fixed inset-0 z-[60] bg-black/80 flex flex-col animate-in fade-in duration-200"><div className="bg-white p-3 flex justify-between items-center"><span className="font-bold text-gray-800">צפייה במסמך</span><button onClick={() => setPdfUrl(null)} className="p-2 bg-gray-100 rounded-full"><X size={20} /></button></div><div className="flex-1 bg-gray-200 relative"><iframe src={pdfUrl} className="w-full h-full border-none" title="PDF Viewer" /></div></div>)}
    </div>
  );
}