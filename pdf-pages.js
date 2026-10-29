// Page numbers are deduplicated and sorted to retain the PDF's document order.
export function parsePdfPages(value, totalPages) {
    if (!value.trim()) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = new Set();
    for (const part of value.split(',')) {
        const match = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
        if (!match) throw new Error('Enter page numbers or ranges, for example: 1-3, 5.');
        const start = Number(match[1]);
        const end = Number(match[2] ?? match[1]);
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || end < start || end > totalPages) {
            throw new Error(`Choose pages between 1 and ${totalPages}, with ranges in ascending order.`);
        }
        for (let page = start; page <= end; page++) pages.add(page);
    }
    return [...pages].sort((a, b) => a - b);
}
