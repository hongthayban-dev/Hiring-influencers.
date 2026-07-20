// Gate รหัสผ่านแบบง่ายสำหรับหน้าผู้ดูแล (search.html, settings.html)
// หมายเหตุ: เป็นการกันเผลอเปิดดูข้อมูลเฉย ๆ ไม่ใช่ระบบความปลอดภัยจริง
// เพราะทำงานฝั่ง client ทั้งหมด ผู้ที่เปิด view-source สามารถข้ามได้
const AdminGate = (() => {
  const SESSION_KEY = "influToStar_adminUnlocked";
  const $ = (sel) => document.querySelector(sel);

  async function init(settings, onUnlocked) {
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      $("#gateView").style.display = "none";
      $("#appView").style.display = "block";
      onUnlocked();
      return;
    }
    $("#gateSubmit").addEventListener("click", () => {
      const val = $("#gatePasscode").value;
      if (val === (settings.adminPasscode || "0000")) {
        sessionStorage.setItem(SESSION_KEY, "1");
        $("#gateView").style.display = "none";
        $("#appView").style.display = "block";
        onUnlocked();
      } else {
        $("#gateError").style.display = "block";
      }
    });
    $("#gatePasscode").addEventListener("keydown", (e) => {
      if (e.key === "Enter") $("#gateSubmit").click();
    });
  }

  return { init };
})();
