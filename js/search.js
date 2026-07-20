// หน้าค้นหาผู้สมัคร: gate ด้วยรหัสผ่าน, ค้นหาด้วย ID, แสดงใบสมัคร A4 พร้อม QR code วีดีโอ
(() => {
  const $ = (sel) => document.querySelector(sel);

  function toast(message, type = "") {
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    document.getElementById("toastWrap").appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  async function checkGate() {
    AdminGate.init(unlockApp);
  }

  async function unlockApp() {
    populateSuggestions();
    $("#btnSearch").addEventListener("click", doSearch);
    $("#searchInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSearch();
    });
    const idFromUrl = new URLSearchParams(location.search).get("id");
    if (idFromUrl) {
      $("#searchInput").value = idFromUrl;
      doSearch();
    }
  }

  async function populateSuggestions() {
    try {
      const list = await Api.listApplicants(AdminGate.getPasscode());
      const dl = $("#idSuggestions");
      list.forEach((a) => {
        const opt = document.createElement("option");
        opt.value = a.id;
        opt.label = `${a.prefix}${a.firstName} ${a.lastName}`;
        dl.appendChild(opt);
      });
    } catch {
      /* เงียบไว้ ไม่กระทบการค้นหา */
    }
  }

  function socialRows(socials) {
    if (!socials) return "<p>-</p>";
    const rows = Object.entries(socials)
      .filter(([, s]) => s && s.connected)
      .map(
        ([id, s]) =>
          `<div class="a4-field"><div class="label">${id.toUpperCase()}</div><div class="value">${Number(s.followers).toLocaleString()} ผู้ติดตาม — <a href="${s.url}" target="_blank">${s.url}</a></div></div>`
      );
    return rows.join("") || "<p>-</p>";
  }

  function renderApplicant(a) {
    const videoLink = a.videoDriveLink || "";
    const qrTargetId = "qrcode-" + a.id.replace(/[^a-zA-Z0-9]/g, "");

    $("#printArea").innerHTML = `
      <div class="a4-sheet" id="a4-${a.id}">
        <div class="a4-header">
          <div>
            <div class="sticker teal" style="margin-bottom:8px;">MOMOTARO — ใบสมัคร Influencer</div>
            <h2 style="margin:0;">${a.prefix}${a.firstName} ${a.lastName}</h2>
            <p style="margin:4px 0 0;color:var(--ink-soft);">รหัสผู้สมัคร: <strong>${a.id}</strong></p>
          </div>
          <div>
            <img class="a4-photo" src="${a.photo || ""}" alt="รูปถ่าย">
            ${a.photoDriveLink ? `<p style="margin:4px 0 0;text-align:center;"><a href="${a.photoDriveLink}" target="_blank">ดูรูปเต็ม</a></p>` : ""}
          </div>
        </div>

        <div class="a4-grid">
          <div class="a4-field"><div class="label">อายุ</div><div class="value">${a.age} ปี</div></div>
          <div class="a4-field"><div class="label">วันเกิด</div><div class="value">${a.birthDate}</div></div>
          <div class="a4-field"><div class="label">เบอร์โทร</div><div class="value">${a.phone}</div></div>
          <div class="a4-field"><div class="label">Line ID</div><div class="value">${a.lineId}</div></div>
          <div class="a4-field"><div class="label">Email</div><div class="value">${a.email}</div></div>
          <div class="a4-field"><div class="label">สถานะ</div><div class="value">${a.status || "-"}</div></div>
          <div class="a4-field" style="grid-column:1/-1;"><div class="label">ที่อยู่</div><div class="value">${a.address.detail} ตำบล${a.address.subdistrict} อำเภอ${a.address.district} จังหวัด${a.address.province} ${a.address.zipcode}</div></div>
        </div>

        <div class="a4-field" style="margin-bottom:16px;"><div class="label">ช่องทางโซเชียลมีเดีย</div></div>
        <div class="a4-grid">${socialRows(a.socials)}</div>

        <div class="a4-qr-block">
          <div id="${qrTargetId}"></div>
          <div>
            <div class="label" style="font-size:12px;font-weight:700;color:var(--ink-soft);">วีดีโอแนะนำตัว</div>
            ${
              videoLink
                ? `<p style="margin:6px 0;">สแกน QR หรือ <a href="${videoLink}" target="_blank">คลิกที่นี่</a> เพื่อดูวีดีโอ</p>`
                : `<p style="margin:6px 0;">ไฟล์: ${a.videoFilename || "-"} (${a.videoStatus === "pending_manual_upload" ? "รอผู้ดูแลอัปโหลดขึ้น Drive" : "ไม่มีลิงก์"})</p>`
            }
          </div>
        </div>
      </div>
    `;

    if (videoLink && window.QRCode) {
      new QRCode(document.getElementById(qrTargetId), {
        text: videoLink,
        width: 110,
        height: 110,
      });
    }

    $("#printControls").style.display = "block";
  }

  async function doSearch() {
    const code = $("#searchInput").value.trim();
    if (!code) return toast("กรุณากรอกรหัสผู้สมัคร", "error");
    $("#searchStatus").textContent = "กำลังค้นหา...";
    try {
      const applicant = await Api.getApplicantByCode(code, AdminGate.getPasscode());
      if (!applicant) {
        $("#searchStatus").textContent = `ไม่พบผู้สมัครรหัส "${code}"`;
        $("#printArea").innerHTML = "";
        $("#printControls").style.display = "none";
        return;
      }
      $("#searchStatus").textContent = "";
      renderApplicant(applicant);
    } catch (err) {
      $("#searchStatus").textContent = err.message;
    }
  }

  $("#btnPrint").addEventListener("click", () => window.print());

  checkGate();
})();
