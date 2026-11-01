export const parseDeadlineDate = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;

  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    const [y, m, d] = dateStr.trim().split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

export const getDaysRemainingInfo = (deadlineDateStr) => {
  const due = parseDeadlineDate(deadlineDateStr);
  if (!due) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const target = new Date(due);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const daysOver = Math.abs(diffDays);
    return {
      label: daysOver === 1 ? '1d overdue' : `${daysOver}d overdue`,
      days: diffDays,
      status: 'overdue',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80 font-bold',
    };
  }
  if (diffDays === 0) {
    return {
      label: 'Due Today',
      days: 0,
      status: 'today',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold ring-1 ring-amber-300/50',
    };
  }
  if (diffDays === 1) {
    return {
      label: 'Tomorrow',
      days: 1,
      status: 'tomorrow',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 font-bold',
    };
  }
  if (diffDays <= 3) {
    return {
      label: `${diffDays} days left`,
      days: diffDays,
      status: 'soon',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 font-semibold',
    };
  }
  return {
    label: `${diffDays} days left`,
    days: diffDays,
    status: 'upcoming',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/60 font-semibold',
  };
};

export const formatDeadlineDate = (dateStr) => {
  const d = parseDeadlineDate(dateStr);
  if (!d) return String(dateStr || '');
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};
