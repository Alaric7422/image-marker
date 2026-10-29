import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { parsePdfPages } from './pdf-pages.js';

GlobalWorkerOptions.workerSrc = workerUrl;

function canvasToImage(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (!blob) return reject(new Error('Could not convert the PDF page to an image.'));
            const url = URL.createObjectURL(blob);
            const image = new Image();
            image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
            image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not load the converted page.')); };
            image.src = url;
        }, 'image/png');
    });
}

// Keep conversion sequential: only one temporary full-size canvas is allocated.
export async function importPdf(file) {
    const dialog = document.getElementById('pdfImportDialog');
    const form = document.getElementById('pdfImportForm');
    const description = document.getElementById('pdfImportDescription');
    const pagesInput = document.getElementById('pdfPagesInput');
    const resolution = document.getElementById('pdfResolutionSelect');
    const error = document.getElementById('pdfImportError');
    const progress = document.getElementById('pdfImportProgress');
    const status = document.getElementById('pdfImportStatus');
    const cancelButton = document.getElementById('pdfImportCancelBtn');
    const previousFocus = document.activeElement;
    let cancelled = false;
    let loadingTask;
    let renderTask;
    let resolveOptions;
    let destroyPromise;
    const destroy = () => destroyPromise ??= loadingTask?.destroy();
    const cancel = event => {
        event.preventDefault();
        cancelled = true;
        resolveOptions?.(null);
        renderTask?.cancel();
        // Consume destruction errors here; the finally block awaits cleanup too.
        destroy()?.catch(() => {});
        status.textContent = 'Cancelling PDF import…';
    };
    dialog.addEventListener('cancel', cancel);
    cancelButton.addEventListener('click', cancel);
    form.hidden = true;
    progress.hidden = false;
    progress.removeAttribute('value');
    status.textContent = 'Opening PDF…';
    description.textContent = file.name;
    error.textContent = '';
    pagesInput.value = '';
    dialog.showModal();
    try {
        const data = new Uint8Array(await file.arrayBuffer());
        if (cancelled) return null;
        const assetUrl = new URL(`${import.meta.env.BASE_URL}pdfjs/`, window.location.href).href;
        loadingTask = getDocument({
            data,
            cMapUrl: `${assetUrl}cmaps/`,
            cMapPacked: true,
            standardFontDataUrl: `${assetUrl}standard_fonts/`,
            useSystemFonts: false,
            wasmUrl: `${assetUrl}wasm/`,
            iccUrl: `${assetUrl}iccs/`,
        });
        const pdf = await loadingTask.promise;
        if (cancelled) return null;
        description.textContent = `${file.name} · ${pdf.numPages} page${pdf.numPages === 1 ? '' : 's'}`;
        form.hidden = false;
        progress.hidden = true;
        status.textContent = 'Choose pages and image quality.';
        pagesInput.focus();
        const options = await new Promise(resolve => {
            resolveOptions = resolve;
            form.onsubmit = event => {
                event.preventDefault();
                try {
                    const pages = parsePdfPages(pagesInput.value, pdf.numPages);
                    resolve({ pages, scale: Number(resolution.value) });
                } catch (err) {
                    error.textContent = err.message;
                    pagesInput.focus();
                }
            };
        });
        resolveOptions = null;
        if (!options || cancelled) return null;
        form.hidden = true;
        progress.hidden = false;
        progress.max = options.pages.length;
        progress.value = 0;
        const images = [];
        for (const pageNumber of options.pages) {
            if (cancelled) return null;
            status.textContent = `Converting page ${pageNumber} (${images.length + 1}/${options.pages.length})…`;
            const page = await pdf.getPage(pageNumber);
            const canvas = document.createElement('canvas');
            try {
                const base = page.getViewport({ scale: 1 });
                const scale = Math.min(options.scale, 3840 / Math.max(base.width, base.height));
                const viewport = page.getViewport({ scale });
                canvas.width = Math.max(1, Math.ceil(viewport.width));
                canvas.height = Math.max(1, Math.ceil(viewport.height));
                renderTask = page.render({ canvasContext: canvas.getContext('2d'), viewport, background: '#ffffff' });
                await renderTask.promise;
                renderTask = null;
                const image = await canvasToImage(canvas);
                if (cancelled) return null;
                const baseName = file.name.replace(/\.pdf$/i, '');
                images.push({ name: `${baseName}_page_${pageNumber}.png`, image, mimeType: 'image/png' });
                progress.value = images.length;
            } finally {
                canvas.width = canvas.height = 0;
                page.cleanup();
            }
        }
        return images;
    } catch (err) {
        if (cancelled) return null;
        if (err.name === 'PasswordException') {
            throw new Error('This PDF requires a password. Open an unlocked copy to import it.');
        }
        if (err.name === 'InvalidPDFException') throw new Error('The PDF is damaged or invalid.');
        throw err;
    } finally {
        form.onsubmit = null;
        dialog.removeEventListener('cancel', cancel);
        cancelButton.removeEventListener('click', cancel);
        await destroy()?.catch(() => {});
        dialog.close();
        previousFocus?.focus();
    }
}
