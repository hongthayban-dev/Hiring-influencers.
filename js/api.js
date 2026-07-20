// ชั้นเชื่อมต่อ API กับ json-server (db.json)
// ถ้า json-server ไม่ได้เปิดอยู่ ฟังก์ชันเหล่านี้จะ throw error ที่มีข้อความอ่านง่ายให้ผู้ใช้ทราบ
const Api = (() => {
  const base = () => window.APP_CONFIG.API_BASE;

  async function request(path, options = {}) {
    let res;
    try {
      res = await fetch(base() + path, {
        headers: { "Content-Type": "application/json" },
        ...options,
      });
    } catch (err) {
      throw new Error(
        "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ข้อมูลได้ กรุณาตรวจสอบว่าได้เปิด json-server ไว้ (npm run server) แล้วหรือยัง"
      );
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ (${res.status}) ${text}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  return {
    getSettings: () => request("/settings"),
    updateSettings: (patch) =>
      request("/settings", { method: "PATCH", body: JSON.stringify(patch) }),

    listApplicants: () => request("/applicants"),
    getApplicantByCode: async (code) => {
      const list = await request(
        `/applicants?id=${encodeURIComponent(code)}`
      );
      return list && list.length ? list[0] : null;
    },
    createApplicant: (applicant) =>
      request("/applicants", { method: "POST", body: JSON.stringify(applicant) }),
    updateApplicant: (dbId, patch) =>
      request(`/applicants/${dbId}`, { method: "PATCH", body: JSON.stringify(patch) }),
    deleteApplicant: (dbId) =>
      request(`/applicants/${dbId}`, { method: "DELETE" }),

    // จองเลข ID ถัดไปแบบเรียงเลข เช่น ID-0001
    async reserveNextId() {
      const settings = await request("/settings");
      const n = settings.nextId || 1;
      const code = "ID-" + String(n).padStart(4, "0");
      await request("/settings", {
        method: "PATCH",
        body: JSON.stringify({ nextId: n + 1 }),
      });
      return code;
    },
  };
})();
