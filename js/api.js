// ชั้นเชื่อมต่อ API กับ backend Google Apps Script (ดู apps-script/Code.gs) ที่อ่าน/เขียน Google Sheet
// Apps Script Web App คืนค่าเป็น HTTP 200 เสมอ ต้องเช็ค field "error" ในตัว response แทนการเช็ค res.ok
const Api = (() => {
  const base = () => window.APP_CONFIG.API_BASE;

  function unwrap(data) {
    if (data && data.error) throw new Error(data.error);
    return data;
  }

  async function requestGet(action, params = {}) {
    const qs = new URLSearchParams({ action, ...params });
    let res;
    try {
      res = await fetch(base() + "?" + qs.toString());
    } catch (err) {
      throw new Error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ข้อมูลได้ กรุณาตรวจสอบอินเทอร์เน็ตหรือค่า API_BASE ในไฟล์ js/config.js");
    }
    return unwrap(await res.json());
  }

  async function requestPost(action, payload, passcode) {
    let res;
    try {
      res = await fetch(base(), {
        method: "POST",
        // ใช้ text/plain แทน application/json เพื่อเลี่ยง CORS preflight ที่ Apps Script Web App จัดการไม่ได้
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action, payload, passcode }),
      });
    } catch (err) {
      throw new Error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ข้อมูลได้ กรุณาตรวจสอบอินเทอร์เน็ตหรือค่า API_BASE ในไฟล์ js/config.js");
    }
    return unwrap(await res.json());
  }

  return {
    getSettings: () => requestGet("getSettings"),
    updateSettings: (patch, passcode) => requestPost("updateSettings", patch, passcode),

    listApplicants: (passcode) => requestGet("listApplicants", { passcode }),
    getApplicantByCode: (code, passcode) => requestGet("getApplicantByCode", { id: code, passcode }),
    createApplicant: (applicant) => requestPost("createApplicant", applicant),
    updateApplicant: (id, patch, passcode) => requestPost("updateApplicant", { id, patch }, passcode),
    deleteApplicant: (id, passcode) => requestPost("deleteApplicant", { id }, passcode),

    verifyPasscode: (passcode) => requestGet("verifyPasscode", { passcode }),

    // จองเลข ID ถัดไปแบบเรียงเลข เช่น ID-0001 (กันชนกันฝั่ง server ด้วย LockService)
    async reserveNextId() {
      const result = await requestGet("reserveNextId");
      return result.id;
    },
  };
})();
