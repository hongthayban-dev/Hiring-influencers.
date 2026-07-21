// ตั้งค่ากลางของระบบ Influ to Star
// API_BASE คือ URL ของ Google Apps Script Web App (ดู apps-script/Code.gs) — ได้จากขั้นตอน Deploy > New deployment > Web app
// เป็นค่า public ไม่ใช่ความลับ (ความปลอดภัยมาจากรหัสผ่านที่เช็คฝั่ง server ไม่ใช่การซ่อน URL นี้)
window.APP_CONFIG = {
  API_BASE: "https://script.google.com/macros/s/AKfycbyG2rAgeM8pfhkX_oh2ipt4BIWtO_y90b4CuJBE3fbq8EikyEkYTHwRv9FvZkUJnQAe/exec",
  DRIVE_UPLOAD_URL: "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
  DRIVE_SCOPE: "https://www.googleapis.com/auth/drive.file",
  YOUTUBE_API_URL: "https://www.googleapis.com/youtube/v3/channels",
};
