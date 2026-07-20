// ตรรกะหน้าสัญญา: โหลดฉบับร่าง, แสดงสัญญา, บังคับเลื่อนอ่านจนสุด, บันทึกข้อมูลจริงเมื่อกดยอมรับ
(() => {
  const $ = (sel) => document.querySelector(sel);
  let draft = null;
  let settings = null;

  function toast(message, type = "") {
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    document.getElementById("toastWrap").appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  async function init() {
    try {
      draft = await DraftStore.load();
    } catch {
      draft = null;
    }
    if (!draft) {
      $("#loadingView").style.display = "none";
      $("#noDraftView").style.display = "block";
      return;
    }

    try {
      settings = await Api.getSettings();
    } catch (err) {
      toast(err.message, "error");
      $("#loadingView").style.display = "none";
      $("#noDraftView").style.display = "block";
      return;
    }

    $("#contractTitle").textContent = settings.contractTitle || "สัญญาเข้าร่วม";
    $("#contractText").textContent = settings.contractText || "";

    $("#loadingView").style.display = "none";
    $("#contractView").style.display = "block";

    const box = $("#contractText");
    box.addEventListener("scroll", () => {
      if (box.scrollTop + box.clientHeight >= box.scrollHeight - 12) {
        $("#acceptCheckbox").disabled = false;
        $("#scrollHint").style.display = "none";
      }
    });
    // ถ้าเนื้อหาสั้นจนไม่ต้องเลื่อน ให้เปิดใช้งานได้ทันที
    if (box.scrollHeight <= box.clientHeight + 4) {
      $("#acceptCheckbox").disabled = false;
      $("#scrollHint").style.display = "none";
    }

    $("#acceptCheckbox").addEventListener("change", (e) => {
      $("#btnAccept").disabled = !e.target.checked;
    });

    $("#btnAccept").addEventListener("click", finalizeSubmission);
  }

  async function finalizeSubmission() {
    const btn = $("#btnAccept");
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> กำลังบันทึกข้อมูล...';

    const { applicant, videoFile } = draft;
    const ext = (applicant.videoOriginalName.split(".").pop() || "mp4").toLowerCase();
    const videoFilename = `${applicant.id}.${ext}`;

    let videoStatus = "pending_manual_upload";
    let videoDriveLink = null;
    let videoDriveId = null;

    if (settings.driveClientId) {
      try {
        const result = await DriveUpload.uploadFile({
          file: videoFile,
          filename: videoFilename,
          folderId: settings.driveFolderId,
          clientId: settings.driveClientId,
        });
        videoStatus = "uploaded";
        videoDriveLink = result.webViewLink;
        videoDriveId = result.id;
      } catch (err) {
        toast("อัปโหลดวีดีโอขึ้น Drive อัตโนมัติไม่สำเร็จ ระบบจะดาวน์โหลดไฟล์ให้อัปโหลดเอง", "error");
        DriveUpload.downloadRenamedFile(videoFile, videoFilename);
      }
    } else {
      DriveUpload.downloadRenamedFile(videoFile, videoFilename);
    }

    const record = {
      ...applicant,
      videoFilename,
      videoStatus,
      videoDriveLink,
      videoDriveId,
      contractAccepted: true,
      contractAcceptedAt: new Date().toISOString(),
      status: "รอการติดต่อกลับ",
      createdAt: new Date().toISOString(),
    };

    let saved;
    try {
      saved = await Api.createApplicant(record);
    } catch (err) {
      toast("บันทึกข้อมูลไม่สำเร็จ: " + err.message, "error");
      btn.disabled = false;
      btn.textContent = "ยอมรับและบันทึกข้อมูล ✅";
      return;
    }

    let emailResult = { sent: false, reason: "ERROR" };
    try {
      emailResult = await EmailNotify.sendConfirmation({ settings, applicant: saved });
    } catch (err) {
      emailResult = { sent: false, reason: err.message };
    }

    await DraftStore.clear();

    $("#contractView").style.display = "none";
    $("#successView").style.display = "block";
    $("#successId").textContent = saved.id;
    $("#emailStatus").textContent = emailResult.sent
      ? "📧 ส่งอีเมลยืนยันการรับใบสมัครไปที่ " + saved.email + " แล้ว"
      : "⚠️ ยังไม่ได้ส่งอีเมลยืนยันอัตโนมัติ (ยังไม่ได้ตั้งค่า EmailJS ในหน้า Settings) — กรุณาติดต่อผู้สมัครโดยตรง";
    $("#videoStatus").textContent =
      videoStatus === "uploaded"
        ? "🎬 อัปโหลดวีดีโอขึ้น Google Drive สำเร็จแล้ว"
        : "🎬 ระบบดาวน์โหลดไฟล์วีดีโอ (เปลี่ยนชื่อเป็น " + videoFilename + ") ให้ผู้ดูแลนำไปอัปโหลดขึ้น Google Drive โฟลเดอร์ที่กำหนดไว้ด้วยตนเอง";
  }

  init();
})();
