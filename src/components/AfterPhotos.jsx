import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Image, Loader2, CheckCircle2 } from 'lucide-react';
import ImageViewer from './ImageViewer'; // <-- ייבוא חדש

export default function AfterPhotos({ clientId }) {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  // סטייט לניהול הגלריה
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);

  useEffect(() => {
    fetchPhotos();
  }, [clientId]);

  const fetchPhotos = async () => {
    const { data } = await supabase
      .from('project_files')
      .select('*')
      .eq('client_id', clientId)
      .eq('category', 'after') // מביא רק תמונות "אחרי"
      .order('uploaded_at', { ascending: false });

    if (data) setPhotos(data);
  };

  const handleUpload = async (event) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${clientId}/after_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('project_files')
        .insert([{ 
            client_id: clientId, 
            file_url: publicUrl, 
            file_type: 'image',
            category: 'after' // מסמן שזו תמונה "אחרי"
        }]);

      if (dbError) throw dbError;
      fetchPhotos();

    } catch (error) {
      alert('שגיאה: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      
      <label className="relative bg-white border-2 border-dashed border-emerald-200 rounded-2xl p-6 flex flex-col items-center justify-center text-emerald-600 cursor-pointer hover:bg-emerald-50 transition-colors active:scale-95">
        {uploading ? (
          <Loader2 size={24} className="animate-spin mb-2" />
        ) : (
          <div className="bg-emerald-100 p-3 rounded-full mb-2">
            <CheckCircle2 size={24} />
          </div>
        )}
        <span className="font-bold text-sm">
          {uploading ? 'מעלה תמונה...' : 'צלם תמונת סיום'}
        </span>
        <span className="text-xs text-emerald-400 mt-1">תיעוד המסירה ללקוח</span>
        
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleUpload} 
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        {photos.map((photo, index) => (
          <div 
            key={photo.id} 
            className="relative aspect-square rounded-xl overflow-hidden shadow-sm border border-gray-100 group bg-gray-100 cursor-pointer"
            onClick={() => setSelectedPhotoIndex(index)} // <-- פתיחת הגלריה
          >
            <img 
              src={photo.file_url} 
              alt="אחרי" 
              className="w-full h-full object-cover transition-transform group-hover:scale-105" 
            />
          </div>
        ))}
      </div>

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