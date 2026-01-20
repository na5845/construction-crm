import React from 'react';

export function StatusBadge({ status }) {
  // מילון תרגום ועיצוב
  const statusConfig = {
    'proposal': { label: 'הצעת מחיר', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    'signed': { label: 'נסגר / חתום', className: 'bg-purple-100 text-purple-700 border-purple-200' },
    'in_progress': { label: 'בעבודה', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    'completed': { label: 'הסתיים', className: 'bg-gray-100 text-gray-600 border-gray-200' }
  };

  // ברירת מחדל אם הסטטוס לא מוכר
  const config = statusConfig[status] || statusConfig['proposal'];

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${config.className}`}>
      {config.label}
    </span>
  );
}