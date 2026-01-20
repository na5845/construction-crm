import { useEffect } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

export default function ImageViewer({ images, selectedIndex, onClose, onIndexChange }) {
  
  if (selectedIndex === null) return null; // אם לא נבחרה תמונה - לא מציגים כלום

  const currentImage = images[selectedIndex];

  // פונקציות דפדוף (מעגלי - מהסוף להתחלה וההפך)
  const handleNext = (e) => {
    e.stopPropagation();
    const nextIndex = (selectedIndex + 1) % images.length;
    onIndexChange(nextIndex);
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    const prevIndex = (selectedIndex - 1 + images.length) % images.length;
    onIndexChange(prevIndex);
  };

  // תמיכה במקלדת (ESC לסגירה, חצים לדפדוף)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext(e); // שים לב: בממשק עברי ימין זה "אחורה" ושמאל זה "קדימה" או ההפך תלוי איך אתה רוצה. כאן ימין = הבא.
      if (e.key === 'ArrowLeft') handlePrev(e);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex]);

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-in fade-in duration-200"
      onClick={onClose} // לחיצה על הרקע סוגרת
    >
      
      {/* כפתור סגירה */}
      <button 
        onClick={onClose}
        className="absolute top-4 left-4 p-2 bg-white/10 text-white rounded-full hover:bg-white/20 z-10"
      >
        <X size={24} />
      </button>

      {/* תמונה מרכזית */}
      <img 
        src={currentImage.file_url} 
        alt="תצוגה מלאה" 
        className="max-h-[85vh] max-w-[95vw] object-contain select-none"
        onClick={(e) => e.stopPropagation()} // לחיצה על התמונה לא סוגרת
      />

      {/* כפתורי ניווט (מופיעים רק אם יש יותר מתמונה אחת) */}
      {images.length > 1 && (
        <>
          <button 
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-white/10 text-white rounded-full hover:bg-white/20"
          >
            <ChevronRight size={32} />
          </button>

          <button 
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-3 bg-white/10 text-white rounded-full hover:bg-white/20"
          >
            <ChevronLeft size={32} />
          </button>
        </>
      )}

      {/* מונה (1/5) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
        {selectedIndex + 1} / {images.length}
      </div>
    </div>
  );
}