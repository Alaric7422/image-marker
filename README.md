# Image Marker

เว็บแอปสำหรับใส่หมายเลขบนภาพ รองรับภาพหลายไฟล์และการนำเข้า PDF เป็นภาพแยกหน้า

## เริ่มใช้งาน

ใช้ Node.js 22.13 ขึ้นไป หรือ Node.js 24 ขึ้นไป

```sh
npm ci
npm run dev
```

## นำเข้า PDF

1. กด **Open / PDF** หรือลากไฟล์ PDF มาวางบนพื้นที่ภาพ สามารถเลือกผสมกับไฟล์ภาพได้
2. เลือกหน้าที่ต้องการ เช่น `1-3, 5` หรือเว้นว่างเพื่อนำเข้าทุกหน้า
3. เลือกความคมชัดแล้วกด **Import pages**
4. สลับหน้า ใส่หมายเลข และบันทึกเป็น PNG ได้เหมือนภาพทั่วไป

เมนูในรายการภาพมีคำสั่ง **Insert** สำหรับแทรกภาพหรือหน้า PDF ต่อจากภาพปัจจุบัน

- แปลงไฟล์ภายในเบราว์เซอร์ ใช้ PDF.js และไฟล์ฟอนต์/ตัวถอดรหัสที่มาพร้อมแอป ไม่มีการอัปโหลดเอกสาร
- แต่ละหน้ามีหมายเลขและประวัติ Undo/Redo ของตัวเอง เรียงตามลำดับหน้าในเอกสาร
- ยกเลิกได้ด้วย **Cancel PDF** หรือ Escape หน้าที่แปลงค้างอยู่ของ PDF นั้นจะไม่ถูกเพิ่ม
- คุณภาพ 96, 144 หรือ 216 DPI โดยจำกัดด้านยาวไม่เกิน 3840 px ต่อหน้า; Save/Copy ยังใช้ขีดจำกัดเดิม 1920 px
- PDF ที่ต้องใช้รหัสผ่านต้องปลดล็อกก่อนนำเข้า หากไฟล์ใดเสีย แอปจะแจ้งข้อผิดพลาดและยังนำเข้าไฟล์อื่นได้
- สำหรับ PDF ขนาดใหญ่ ควรเลือกเฉพาะช่วงหน้าที่ต้องการเพื่อลดการใช้หน่วยความจำ

## ตรวจสอบและ build

```sh
npm test
npx playwright install chromium
npm run test:e2e
npx tsc --noEmit
npm run build
npm run preview
```

ตั้ง `PLAYWRIGHT_CHANNEL=msedge` เพื่อทดสอบด้วย Microsoft Edge ที่ติดตั้งอยู่ หรือ `TEST_PRODUCTION=1` เพื่อทดสอบ build ผ่าน preview (ต้อง build ก่อน)

## GitHub Pages

แอปนี้ใช้บน GitHub Pages ได้ รวมถึงการนำเข้า PDF เพราะประมวลผลในเบราว์เซอร์ทั้งหมด

1. Commit และ push ไฟล์โปรเจกต์ รวมถึง `package-lock.json` และ `.github/workflows/deploy-pages.yml` ขึ้น branch `main`
2. ใน repository เปิด **Settings → Pages → Build and deployment → Source** แล้วเลือก **GitHub Actions**
3. เปิดแท็บ **Actions → Deploy to GitHub Pages → Run workflow** สำหรับการเผยแพร่ครั้งแรก หลังจากนั้นจะ deploy เมื่อ push เข้า `main`
4. เมื่อ workflow สำเร็จ เปิด URL ที่แสดงใน deployment สำหรับ repository ปัจจุบันคาดว่าจะเป็น `https://alaric7422.github.io/image-marker/`

Workflow จะ build ไปยัง `dist` และตั้ง base path จากการตั้งค่า Pages อัตโนมัติ เพื่อให้ไฟล์ JavaScript, PDF worker, ฟอนต์ และตัวถอดรหัสโหลดถูกที่ รองรับทั้ง project Pages และ custom domain โดยไม่ต้องใช้ API key

ทดลอง build สำหรับ URL `/image-marker/` บนเครื่อง:

```sh
npm run build:pages
npm run preview:pages
```

เปิด `http://localhost:4173/image-marker/` หากเปลี่ยนชื่อ repository ให้เปลี่ยน path ในสองคำสั่งนี้ตามชื่อใหม่

ทดสอบด้วย Playwright หลัง build โดยตั้ง `TEST_PRODUCTION=1` และ `TEST_BASE_PATH=/image-marker/` แล้วรัน `npm run test:e2e`

อ้างอิง: [Vite: GitHub Pages](https://vite.dev/guide/static-deploy#github-pages), [GitHub: การใช้ workflow สำหรับ Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
