import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Image, Loader2, Trash2, Plus } from 'lucide-react';
import ImageViewer from './ImageViewer'; // <-- ייבוא חדש

export default function BeforePhotos({ clientId }) {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  // סטייט לניהול הגלריה
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);

  // 1. טעינת התמונות כשהמסך עולה
  useEffect(() => {
    fetchPhotos();
  }, [clientId]);

  const fetchPhotos = async () => {
    const { data, error } = await supabase
      .from('project_files')
      .select('*')
      .eq('client_id', clientId)
      .eq('category', 'before') // מביא רק תמונות "לפני"
      .order('uploaded_at', { ascending: false });

    if (data) setPhotos(data);
  };

  // 2. פונקציית ההעלאה
  const handleUpload = async (event) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file) return;

      // יצירת שם ייחודי לקובץ
      const fileExt = file.name.split('.').pop();
      const fileName = `${clientId}/before_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // א. העלאה ל-Storage
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // ב. קבלת הקישור הציבורי
      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath);

      // ג. שמירת הרשומה בטבלה
      const { error: dbError } = await supabase
        .from('project_files')
        .insert([
          { 
            client_id: clientId, 
            file_url: publicUrl, 
            file_type: 'image',
            category: 'before' // מסמן שזו תמונה "לפני"
          }
        ]);

      if (dbError) throw dbError;

      // רענון הרשימה
      fetchPhotos();

    } catch (error) {
      alert('שגיאה בהעלאה: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // פונקציית מחיקה (אופציונלי - הוספתי שיהיה מוכן)
  const handleDelete = async (photoId, fileUrl) => {
    if(!confirm('למחוק תמונה זו?')) return;
    
    // מחיקה מהטבלה
    await supabase.from('project_files').delete().eq('id', photoId);
    
    // הערה: מחיקה מה-Storage דורשת חילוץ ה-Path מה-URL, נשאיר כרגע פשוט
    fetchPhotos();
  };

  return (
    <div className="p-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      
      {/* כפתור העלאה חכם */}
      <label className="relative bg-white border-2 border-dashed border-blue-200 rounded-2xl p-6 flex flex-col items-center justify-center text-blue-600 cursor-pointer hover:bg-blue-50 transition-colors active:scale-95">
        {uploading ? (
          <Loader2 size={24} className="animate-spin mb-2" />
        ) : (
          <div className="bg-blue-100 p-3 rounded-full mb-2">
            <Image size={24} />
          </div>
        )}
        <span className="font-bold text-sm">
          {uploading ? 'מעלה תמונה...' : 'צלם או בחר תמונה'}
        </span>
        <span className="text-xs text-blue-400 mt-1">תמונות "לפני" השיפוץ</span>
        
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleUpload} 
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </label>

      {/* גריד תמונות */}
      <div className="grid grid-cols-2 gap-3">
        {photos.map((photo, index) => (
          <div 
            key={photo.id} 
            className="relative aspect-square rounded-xl overflow-hidden shadow-sm border border-gray-100 group bg-gray-100 cursor-pointer"
            onClick={() => setSelectedPhotoIndex(index)} // <-- פתיחת הגלריה
          >
            <img 
              src={photo.file_url} 
              alt="לפני" 
              className="w-full h-full object-cover transition-transform group-hover:scale-105" 
            />
            
            {/* כפתור מחיקה - מופיע רק כשמרחפים (במחשב) או לוחצים ארוך */}
            <button 
               onClick={(e) => {
                 e.stopPropagation();
                 handleDelete(photo.id, photo.file_url);
               }}
               className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      
      {photos.length === 0 && !uploading && (
        <p className="text-center text-gray-400 text-sm mt-4">אין עדיין תמונות</p>
      )}

      {/* הרכיב המציג את התמונות במסך מלא */}
      <ImageViewer 
        images={photos}
        selectedIndex={selectedPhotoIndex}
        onClose={() => setSelectedPhotoIndex(null)}
        onIndexChange={setSelectedPhotoIndex}
      />
    </div>
  );
}