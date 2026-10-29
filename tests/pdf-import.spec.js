import { test, expect } from '@playwright/test';

// Self-contained PDF fixture: two portrait pages and one rotated page, with
// unembedded Helvetica text to also exercise the locally bundled font assets.
function samplePdf(pageCount = 3) {
    const objects = [null, '<< /Type /Catalog /Pages 2 0 R >>', ''];
    const kids = [];
    for (let i = 0; i < pageCount; i++) {
        const pageId = objects.length;
        kids.push(`${pageId} 0 R`);
        objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 400] ${i === 2 ? '/Rotate 90' : ''} /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${pageId + 1} 0 R >>`);
        const stream = `1 0 0 rg 20 20 80 60 re f BT /F1 24 Tf 20 300 Td (Page ${i + 1}) Tj ET`;
        objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    }
    objects[2] = `<< /Type /Pages /Count ${pageCount} /Kids [${kids.join(' ')}] >>`;
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (let i = 1; i < objects.length; i++) {
        offsets.push(Buffer.byteLength(pdf));
        pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xref = Buffer.byteLength(pdf);
    pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    pdf += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
    pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return Buffer.from(pdf);
}
const pdfFile = (name = 'sample.pdf', count = 3) => ({ name, mimeType: 'application/pdf', buffer: samplePdf(count) });
const imageOptions = page => page.locator('#imageSelect optgroup').first().locator('option');

async function startPdf(page, file = pdfFile(), input = '#loadImageInput') {
    await page.locator(input).setInputFiles(file);
    await expect(page.locator('#pdfImportForm')).toBeVisible();
}
async function finishPdf(page, pages = '') {
    await page.locator('#pdfPagesInput').fill(pages);
    await page.getByRole('button', { name: 'Import pages', exact: true }).click();
    await expect(page.locator('#pdfImportDialog')).not.toBeVisible();
    await expect(page.locator('#loadImageInput')).toBeEnabled();
}
test.beforeEach(async ({ page }) => { await page.goto('./'); });

test('imports all pages locally, preserves markers per page, and exports PNG', async ({ page }, testInfo) => {
    const errors = [];
    const failedResponses = [];
    const requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) failedResponses.push(response.url()); });
    page.on('request', request => requests.push(request.url()));
    await startPdf(page);
    await expect(page.locator('#pdfImportDescription')).toContainText('3 pages');
    await page.screenshot({ path: testInfo.outputPath('pdf-dialog.png') });
    await finishPdf(page);
    await expect(imageOptions(page)).toHaveText(['1. sample_page_1.png', '2. sample_page_2.png', '3. sample_page_3.png']);
    await expect(page.locator('#dimensions-display')).toHaveText('600 x 800 px');
    await page.screenshot({ path: testInfo.outputPath('imported-page.png') });
    await page.locator('#modeABtn').click();
    await page.locator('#imageCanvas').click({ position: { x: 600, y: 350 } });
    await expect(page.locator('#undoBtn')).toBeEnabled();
    await page.locator('#nextImageBtn').click();
    await expect(page.locator('#undoBtn')).toBeDisabled();
    await page.locator('#prevImageBtn').click();
    await expect(page.locator('#undoBtn')).toBeEnabled();
    const downloaded = page.waitForEvent('download');
    await page.locator('#saveImageBtn').click();
    expect((await downloaded).suggestedFilename()).toBe('sample_page_1_numbered.png');
    const canvasColors = await page.locator('#imageCanvas').evaluate(canvas => {
        const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        let red = 0, white = 0;
        for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i] > 220 && pixels[i + 1] < 40 && pixels[i + 2] < 40) red++;
            if (pixels[i] > 245 && pixels[i + 1] > 245 && pixels[i + 2] > 245) white++;
        }
        return { red, white };
    });
    expect(canvasColors.red).toBeGreaterThan(100);
    expect(canvasColors.white).toBeGreaterThan(10000);
    expect(errors).toEqual([]);
    expect(failedResponses).toEqual([]);
    expect(requests.every(url => url.startsWith('http://127.0.0.1:4173/') || url.startsWith('blob:'))).toBe(true);
    const basePath = new URL(testInfo.project.use.baseURL).pathname;
    expect(requests.some(url => url.includes(`${basePath}pdfjs/standard_fonts/`))).toBe(true);
});

test('validates page ranges and imports only requested rotated pages at chosen quality', async ({ page }) => {
    await startPdf(page);
    await page.locator('#pdfPagesInput').fill('4');
    await page.getByRole('button', { name: 'Import pages', exact: true }).click();
    await expect(page.locator('#pdfImportError')).toContainText('between 1 and 3');
    await page.locator('#pdfResolutionSelect').selectOption('3');
    await finishPdf(page, '3, 1, 3');
    await expect(imageOptions(page)).toHaveCount(2);
    await expect(page.locator('#dimensions-display')).toHaveText('900 x 1200 px');
    await page.locator('#nextImageBtn').click();
    await expect(page.locator('#dimensions-display')).toHaveText('1200 x 900 px');
    await expect(page.locator('#filename-display')).toHaveText('sample_page_3.png');
});

test('cancels with Escape while marker mode is active, keeping existing images', async ({ page }) => {
    await startPdf(page);
    await finishPdf(page, '1');
    await page.locator('#modeABtn').click();
    await startPdf(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('#pdfImportDialog')).not.toBeVisible();
    await expect(page.locator('#loadImageInput')).toBeEnabled();
    await expect(imageOptions(page)).toHaveCount(1);
    await expect(page.locator('#statusBar')).toContainText('cancelled');
});

test('inserts PDF pages after the current image', async ({ page }) => {
    await startPdf(page);
    await finishPdf(page);
    await startPdf(page, pdfFile('insert.pdf'), '#insertImageInput');
    await finishPdf(page, '2');
    await expect(imageOptions(page)).toHaveText(['1. sample_page_1.png', '2. insert_page_2.png', '3. sample_page_2.png', '4. sample_page_3.png']);
    await expect(page.locator('#filename-display')).toHaveText('insert_page_2.png');
});

test('accepts dropped PDFs with missing MIME types', async ({ page }) => {
    await page.locator('#canvasDropArea').evaluate((area, bytes) => {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(new File([new Uint8Array(bytes)], 'dropped.PDF'));
        area.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
    }, [...samplePdf()]);
    await expect(page.locator('#pdfImportForm')).toBeVisible();
    await finishPdf(page, '2');
    await expect(page.locator('#filename-display')).toHaveText('dropped_page_2.png');
});

test('reports invalid PDFs while continuing a mixed import and preserves JPEG export', async ({ page }) => {
    const jpeg = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 100;
        canvas.getContext('2d').fillRect(0, 0, 100, 100);
        return canvas.toDataURL('image/jpeg').split(',')[1];
    });
    await page.locator('#loadImageInput').setInputFiles([
        { name: 'bad.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not a PDF') },
        { name: 'photo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(jpeg, 'base64') },
    ]);
    await expect(page.locator('#loadImageInput')).toBeEnabled();
    await expect(page.locator('#filename-display')).toHaveText('photo.jpg');
    await expect(page.locator('#statusBar')).toContainText('damaged or invalid');
    await expect(page.locator('#statusBar')).toHaveClass(/error/);
    const download = page.waitForEvent('download');
    await page.locator('#saveImageBtn').click();
    expect((await download).suggestedFilename()).toBe('photo_numbered.jpg');
});

test('cancel during conversion discards partial pages and permits another import', async ({ page }) => {
    await startPdf(page, pdfFile('long.pdf', 40));
    await page.getByRole('button', { name: 'Import pages', exact: true }).click();
    await expect(page.locator('#pdfImportStatus')).toContainText('Converting page');
    await page.locator('#pdfImportCancelBtn').click();
    await expect(page.locator('#pdfImportDialog')).not.toBeVisible();
    await expect(page.locator('#loadImageInput')).toBeEnabled();
    await expect(page.locator('#filename-display')).toHaveText('No file loaded');
    await startPdf(page);
    await finishPdf(page, '1');
    await expect(imageOptions(page)).toHaveCount(1);
});
