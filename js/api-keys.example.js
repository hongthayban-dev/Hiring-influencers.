// เทมเพลตไฟล์ API Keys — คัดลอกไฟล์นี้เป็น js/api-keys.js แล้วกรอกค่าจริงของคุณ
// js/api-keys.js จะไม่ถูก commit ขึ้น git (ดู .gitignore) เพื่อกันคีย์จริงหลุดขึ้น repo
window.APP_KEYS = {
  // Google Cloud Console > APIs & Services > Credentials > OAuth client ID (Web application)
  // ต้องเพิ่มโดเมนที่เปิดเว็บนี้ใน Authorized JavaScript origins ด้วย
  driveClientId: "", // เช่น "xxxxxxxx.apps.googleusercontent.com"

  // Google Cloud Console > เปิดใช้งาน YouTube Data API v3 > สร้าง API key
  youtubeApiKey: "",

  // emailjs.com > Email Services / Email Templates / Account > General
  emailjsServiceId: "",
  emailjsTemplateId: "",
  emailjsPublicKey: "",
};
