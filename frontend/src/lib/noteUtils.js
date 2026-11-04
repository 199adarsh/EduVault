export const isLinkNote = (note) => {
    if (!note) return false;
    const raw = (note.fileUrl || note.sourceUrl || '').trim();
    if (!raw) return (note.category || '').toLowerCase() === 'link';
    const hasDocExt = raw.match(/\.(pdf|docx?|pptx?|xlsx?|txt|zip)(\?.*)?$/i);
    if (hasDocExt) return false;
    return raw.startsWith('http') || raw.includes('/') || (note.category || '').toLowerCase() === 'link';
};

export const getNoteBadge = (note) => {
    if (isLinkNote(note)) return 'LINK';
    const raw = note.fileUrl || '';
    const parts = raw.split('.');
    if (parts.length > 1) {
        const ext = parts.pop().split(/[?#]/)[0].toUpperCase();
        if (ext.length <= 5) return ext;
    }
    return 'PDF';
};

export const cleanSubjectName = (str) => {
    if (!str) return '';
    return String(str)
        .toLowerCase()
        .replace(/\([a-z0-9\s_-]+\)/gi, '')
        .replace(/^[0-9]{1,2}[a-z]{2,6}[0-9]{2,4}[a-z]?\s*/gi, '')
        .replace(/[0-9]{2}[a-z]{2,6}[0-9]{3,4}[a-z]?/gi, '')
        .replace(/\b(ai\s*&\s*ds|ai\s+and\s+ds|aids)\b/gi, 'artificial intelligence and data science')
        .replace(/\b(laboratory|practical)\b/gi, 'lab')
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

export const isSubjectNameMatch = (nameA, nameB) => {
    if (!nameA || !nameB) return false;
    const ca = cleanSubjectName(nameA);
    const cb = cleanSubjectName(nameB);
    if (!ca || !cb) return false;

    const isLabA = /\b(lab)\b/.test(ca);
    const isLabB = /\b(lab)\b/.test(cb);
    if (isLabA !== isLabB) return false;
    return ca === cb || ca.includes(cb) || cb.includes(ca);
};

export const getCleanTitle = (title) => {
    if (!title) return 'Study Material';
    if (title.includes('/') && !title.includes(' ')) {
        const last = title.split('/').filter(Boolean).pop();
        if (last) return last;
    }
    return title.replace(/\.pdf$/i, '').trim();
};
