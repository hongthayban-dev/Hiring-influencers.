// Gate รหัสผ่านสำหรับหน้าผู้ดูแล (search.html, settings.html)
// รหัสผ่านที่กรอกจะถูกตรวจสอบจริงฝั่ง server (apps-script/Code.gs) ทุกครั้งที่เรียก action ที่ต้องใช้สิทธิ์
// เก็บรหัสผ่านไว้ใน sessionStorage เพื่อแนบไปกับ request อื่นที่ต้องใช้สิทธิ์ต่อ ไม่ต้องกรอกซ้ำในเซสชันเดียวกัน
const AdminGate = (() => {
  const SESSION_KEY = "influToStar_adminPasscode";
  const $ = (sel) => document.querySelector(sel);

  function getPasscode() {
    return sessionStorage.getItem(SESSION_KEY) || "";
  }

  async function init(onUnlocked) {
    if (getPasscode()) {
      $("#gateView").style.display = "none";
      $("#appView").style.display = "block";
      onUnlocked();
      return;
    }
    $("#gateSubmit").addEventListener("click", async () => {
      const val = $("#gatePasscode").value;
      const btn = $("#gateSubmit");
      btn.disabled = true;
      try {
        const result = await Api.verifyPasscode(val);
        if (result.ok) {
          sessionStorage.setItem(SESSION_KEY, val);
          $("#gateView").style.display = "none";
          $("#appView").style.display = "block";
          onUnlocked();
        } else {
          $("#gateError").style.display = "block";
        }
      } catch {
        $("#gateError").style.display = "block";
      } finally {
        btn.disabled = false;
      }
    });
    $("#gatePasscode").addEventListener("keydown", (e) => {
      if (e.key === "Enter") $("#gateSubmit").click();
    });
  }

  return { init, getPasscode };
})();
