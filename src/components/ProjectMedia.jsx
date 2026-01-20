import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Camera, Image as ImageIcon, Trash2, Loader2, X, Play, Download } from 'lucide-react';

export default function ProjectMedia({ clientId, folderType }) {
  const [mediaItems, setMediaItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // ניהול המודאל
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [videoLoading, setVideoLoading] = useState(false); // סטייט לטעינת הוידאו הספציפי
  
  const videoRef = useRef(null);
  const storagePath = `${clientId}/${folderType}`;

  useEffect(() => {
    fetchMedia();
  }, [clientId, folderType]);

  // אפקט חכם לניגון וידאו
  useEffect(() => {
      if (selectedMedia && isVideo(selectedMedia)) {
          setVideoLoading(true); // מתחילים לטעון
          
          if (videoRef.current) {
              // איפוס הנגן
              videoRef.current.load();
              
              // ניסיון ניגון
              const playPromise = videoRef.current.play();
              if (playPromise !== undefined) {
                  playPromise
                    .then(() => {
                        // הניגון הצליח
                    })
                    .catch(error => {
                        console.log("Auto-play prevented:", error);
                        // אם נכשל (בגלל סאונד), ננסה להשתיק ולנגן שוב
                        if (videoRef.current) {
                            videoRef.current.muted = true;
                            videoRef.current.play();
                        }
                    });
              }
          }
      }
  }, [selectedMedia]);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from('project-files')
        .list(storagePath, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) throw error;

      const items = data.map(file => {
        const { data: { publicUrl } } = supabase.storage
          .from('project-files')
          .getPublicUrl(`${storagePath}/${file.name}`);
        
        return {
          name: file.name,
          url: publicUrl,
          id: file.id,
          type: file.metadata?.mimetype || (file.name.match(/\.(mp4|mov|webm|avi)$/i) ? 'video' : 'image')
        };
      });

      setMediaItems(items);
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${storagePath}/${fileName}`;

      const { error } = await supabase.storage.from('project-files').upload(filePath, file);
      if (error) throw error;
      await fetchMedia();

    } catch (error) {
      alert('שגיאה: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (e, fileName) => {
    e.stopPropagation(); 
    if (!confirm('האם למחוק קובץ זה?')) return;

    try {
      const { error } = await supabase.storage.from('project-files').remove([`${storagePath}/${fileName}`]);
      if (error) throw error;
      setMediaItems(prev => prev.filter(item => item.name !== fileName));
      if (selectedMedia?.name === fileName) setSelectedMedia(null);
    } catch (error) {
      alert('שגיאה במחיקה');
    }
  };

  const isVideo = (item) => {
      if (!item) return false;
      return item.type?.includes('video') || item.name?.match(/\.(mp4|mov|webm|avi|mkv)$/i);
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="p-4 pb-24">
      
      {/* כפתורי העלאה */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-2xl bg-white cursor-pointer hover:bg-gray-50 active:scale-95 transition-all">
            {uploading ? <Loader2 className="animate-spin text-blue-500 mb-1" /> : <ImageIcon className="text-blue-500 mb-1" />}
            <span className="text-xs font-bold text-gray-500">מהגלריה</span>
            <input type="file" accept="image/*,video/*" onChange={handleUpload} className="hidden" />
        </label>

        <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-2xl bg-white cursor-pointer hover:bg-gray-50 active:scale-95 transition-all">
            {uploading ? <Loader2 className="animate-spin text-emerald-500 mb-1" /> : <Camera className="text-emerald-500 mb-1" />}
            <span className="text-xs font-bold text-gray-500">צלם עכשיו</span>
            <input type="file" accept="image/*,video/*" capture="environment" onChange={handleUpload} className="hidden" />
        </label>
      </div>

      {/* גריד */}
      {mediaItems.length === 0 ? (
        <div className="text-center text-gray-400 py-10">
            <ImageIcon className="mx-auto mb-2 opacity-20" size={48} />
            <p>אין עדיין תמונות או סרטונים</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {mediaItems.map((item) => (
            <div 
                key={item.id} 
                onClick={() => setSelectedMedia(item)} 
                className="relative group bg-black rounded-lg overflow-hidden shadow-sm aspect-square cursor-pointer"
            >
              {isVideo(item) ? (
                  <div className="w-full h-full relative">
                      <video src={item.url} className="w-full h-full object-cover opacity-80" muted playsInline />
                      <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-black/30 p-2 rounded-full backdrop-blur-sm">
                            <Play size={16} className="text-white fill-white" />
                          </div>
                      </div>
                  </div>
              ) : (
                  <img src={item.url} alt="מדיה" className="w-full h-full object-cover" loading="lazy" />
              )}
              <button 
                onClick={(e) => handleDelete(e, item.name)}
                className="absolute top-1 left-1 bg-black/50 p-1.5 rounded-full text-white/80 hover:text-red-400 z-10"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* --- מודאל תצוגה מלאה --- */}
      {selectedMedia && (
          <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center animate-in fade-in duration-200" onClick={() => setSelectedMedia(null)}>
              
              {/* סרגל עליון במודאל */}
              <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/50 to-transparent">
                  <button className="p-2 bg-white/10 rounded-full text-white backdrop-blur-md" onClick={() => setSelectedMedia(null)}>
                      <X size={24} />
                  </button>
                  <a 
                    href={selectedMedia.url} 
                    download 
                    target="_blank" 
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 bg-white/10 rounded-full text-white backdrop-blur-md flex items-center gap-2 text-xs font-bold px-3"
                  >
                      <Download size={16} /> שמור
                  </a>
              </div>

              <div className="w-full h-full flex items-center justify-center p-2 relative" onClick={(e) => e.stopPropagation()}>
                  {isVideo(selectedMedia) ? (
                      <>
                        {videoLoading && (
                            <div className="absolute inset-0 flex items-center justify-center text-white">
                                <Loader2 className="animate-spin" size={40} />
                            </div>
                        )}
                        <video 
                            ref={videoRef}
                            key={selectedMedia.id} // חובה כדי שהנגן יתאפס
                            src={selectedMedia.url} 
                            className="max-w-full max-h-[85vh] rounded-lg shadow-2xl bg-black" 
                            controls 
                            autoPlay 
                            muted // חובה ל-AutoPlay במובייל!
                            playsInline // חובה לאייפון!
                            onLoadedData={() => setVideoLoading(false)} // מעלים ספינר כשהוידאו מוכן
                            onWaiting={() => setVideoLoading(true)}
                            onPlaying={() => setVideoLoading(false)}
                        />
                      </>
                  ) : (
                      <img 
                        src={selectedMedia.url} 
                        alt="תצוגה מלאה" 
                        className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" 
                      />
                  )}
              </div>
          </div>
      )}

    </div>
  );
}