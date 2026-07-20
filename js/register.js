// ตรรกะฟอร์มลงทะเบียนสมัคร (multi-step wizard)
(() => {
  const TOTAL_STEPS = 6;
  let currentStep = 1;
  let settings = null;
  let appId = null;
  let photoDataUrl = null;
  let videoFile = null;
  const socialState = {}; // { tiktok: {url, followers, connected}, ... }

  const $ = (sel) => document.querySelector(sel);
  const form = $("#registerForm");

  function toast(message, type = "") {
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    document.getElementById("toastWrap").appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  function buildProgressDots() {
    const wrap = $("#wizardProgress");
    wrap.innerHTML = "";
    for (let i = 1; i <= TOTAL_STEPS; i++) {
      const dot = document.createElement("div");
      dot.className = "dot";
      dot.dataset.step = i;
      dot.textContent = i;
      wrap.appendChild(dot);
    }
  }

  function updateProgressDots() {
    document.querySelectorAll("#wizardProgress .dot").forEach((dot) => {
      const step = parseInt(dot.dataset.step, 10);
      dot.classList.remove("active", "done");
      if (step === currentStep) dot.classList.add("active");
      else if (step < currentStep) dot.classList.add("done");
    });
  }

  function showStep(step) {
    document.querySelectorAll(".wizard-step").forEach((sec) => {
      sec.style.display = parseInt(sec.dataset.step, 10) === step ? "" : "none";
    });
    $("#btnPrev").style.visibility = step === 1 ? "hidden" : "visible";
    $("#btnNext").textContent = step === TOTAL_STEPS ? "ไปหน้าสัญญา →" : "ถัดไป →";
    updateProgressDots();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---------- STEP 1: ข้อมูลส่วนตัว ----------
  function calcAge(birthDateStr) {
    const bd = new Date(birthDateStr);
    if (isNaN(bd.getTime())) return "";
    const now = new Date();
    let age = now.getFullYear() - bd.getFullYear();
    const monthDiff = now.getMonth() - bd.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < bd.getDate())) age--;
    return age;
  }

  $("#birthDate").addEventListener("change", (e) => {
    $("#age").value = calcAge(e.target.value);
  });

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => {
        img.onload = () => {
          const maxDim = 640;
          let { width, height } = img;
          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.78));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  $("#photoDropzone").addEventListener("click", () => $("#photoInput").click());
  $("#photoInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      photoDataUrl = await compressImage(file);
      $("#photoPreview").src = photoDataUrl;
      $("#photoPreview").style.display = "block";
      $("#photoPlaceholder").style.display = "none";
    } catch {
      toast("ไม่สามารถอ่านไฟล์รูปภาพได้", "error");
    }
  });

  // ---------- STEP 2: โซเชียลมีเดีย ----------
  const PLATFORM_ICON = { tiktok: "🎵", facebook: "📘", youtube: "▶️" };

  function buildSocialCards() {
    const wrap = $("#socialCardsWrap");
    wrap.innerHTML = "";
    settings.socialPlatforms.forEach((p) => {
      socialState[p.id] = { url: "", followers: "", connected: false };
      const card = document.createElement("div");
      card.className = "social-card";
      card.id = `social-card-${p.id}`;
      card.innerHTML = `
        <div class="social-icon" style="background:${p.color}">${PLATFORM_ICON[p.id] || "🔗"}</div>
        <div class="social-card-body">
          <strong>${p.label}</strong>
          <span class="connected-badge" id="badge-${p.id}" style="display:none;">✓ เชื่อมต่อแล้ว</span>
          <input type="url" id="url-${p.id}" placeholder="ลิงก์โปรไฟล์ ${p.label} ของคุณ" style="margin-top:8px;">
          <div style="display:flex;gap:10px;margin-top:8px;align-items:center;">
            <input type="number" id="followers-${p.id}" placeholder="ยอดผู้ติดตาม" style="max-width:160px;">
            <button type="button" class="btn btn-sm btn-outline" data-open="${p.id}">เปิดลิงก์ตรวจสอบ</button>
            ${p.id === "youtube" ? '<button type="button" class="btn btn-sm btn-cool" data-fetch-yt>ดึงยอดอัตโนมัติ</button>' : ""}
            <button type="button" class="btn btn-sm btn-primary" data-connect="${p.id}">บันทึกช่องทางนี้</button>
          </div>
        </div>
      `;
      wrap.appendChild(card);
    });

    wrap.querySelectorAll("[data-open]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.open;
        const url = $(`#url-${id}`).value.trim();
        if (!url) return toast("กรุณากรอกลิงก์โปรไฟล์ก่อน", "error");
        window.open(url, "_blank", "noopener");
      });
    });

    wrap.querySelectorAll("[data-connect]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.connect;
        const url = $(`#url-${id}`).value.trim();
        const followers = $(`#followers-${id}`).value;
        if (!url || followers === "") {
          return toast("กรุณากรอกลิงก์และยอดผู้ติดตามก่อนบันทึก", "error");
        }
        socialState[id] = { url, followers: Number(followers), connected: true };
        document.getElementById(`social-card-${id}`).classList.add("connected");
        document.getElementById(`badge-${id}`).style.display = "inline";
        toast(`เชื่อมต่อ ${id} สำเร็จ`, "success");
      });
    });

    const ytBtn = wrap.querySelector("[data-fetch-yt]");
    if (ytBtn) {
      ytBtn.addEventListener("click", () => fetchYoutubeSubscribers());
    }
  }

  function parseYoutubeUrl(url) {
    try {
      const u = new URL(url);
      const path = u.pathname;
      if (path.startsWith("/channel/")) return { type: "id", value: path.split("/")[2] };
      if (path.startsWith("/@")) return { type: "handle", value: path.slice(1) };
      if (path.startsWith("/c/") || path.startsWith("/user/")) {
        return { type: "handle", value: path.split("/")[2] };
      }
      return null;
    } catch {
      return null;
    }
  }

  async function fetchYoutubeSubscribers() {
    const url = $("#url-youtube").value.trim();
    if (!url) return toast("กรุณากรอกลิงก์ช่อง YouTube ก่อน", "error");
    if (!settings.youtubeApiKey) {
      return toast("ยังไม่ได้ตั้งค่า YouTube API Key ในหน้า Settings — กรุณากรอกยอดผู้ติดตามเอง", "error");
    }
    const parsed = parseYoutubeUrl(url);
    if (!parsed) return toast("รูปแบบลิงก์ YouTube ไม่ถูกต้อง กรุณากรอกยอดผู้ติดตามเอง", "error");
    const param = parsed.type === "id" ? `id=${parsed.value}` : `forHandle=${encodeURIComponent(parsed.value)}`;
    try {
      const res = await fetch(
        `${window.APP_CONFIG.YOUTUBE_API_URL}?part=statistics&${param}&key=${settings.youtubeApiKey}`
      );
      const data = await res.json();
      const stats = data.items && data.items[0] && data.items[0].statistics;
      if (!stats) throw new Error("ไม่พบข้อมูลช่อง");
      $("#followers-youtube").value = stats.subscriberCount;
      toast("ดึงยอดผู้ติดตามสำเร็จ 🎉", "success");
    } catch (err) {
      toast("ดึงยอดผู้ติดตามอัตโนมัติไม่สำเร็จ กรุณากรอกเอง", "error");
    }
  }

  // ---------- STEP 5: วีดีโอ ----------
  $("#videoDropzone").addEventListener("click", () => $("#videoInput").click());
  $("#videoInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    videoFile = file;
    $("#videoPlaceholder").style.display = "none";
    const info = $("#videoInfo");
    info.style.display = "block";
    info.textContent = `🎬 ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`;
  });

  // ---------- validation ----------
  function validateStep(step) {
    if (step === 1) {
      if (!photoDataUrl) return toast("กรุณาอัปโหลดรูปถ่าย", "error"), false;
      if (!$("#prefix").value) return toast("กรุณาเลือกคำนำหน้า", "error"), false;
      if (!$("#firstName").value.trim() || !$("#lastName").value.trim())
        return toast("กรุณากรอกชื่อ-นามสกุล", "error"), false;
      if (!$("#birthDate").value) return toast("กรุณาเลือกวันเกิด", "error"), false;
      if (!/^0[0-9]{8,9}$/.test($("#phone").value.trim()))
        return toast("รูปแบบเบอร์โทรไม่ถูกต้อง (เช่น 0812345678)", "error"), false;
      return true;
    }
    if (step === 2) {
      const anyConnected = Object.values(socialState).some((s) => s.connected);
      $("#socialError").style.display = anyConnected ? "none" : "block";
      if (!anyConnected) toast("กรุณาเชื่อมต่ออย่างน้อย 1 ช่องทางโซเชียล", "error");
      return anyConnected;
    }
    if (step === 3) {
      if (!$("#lineId").value.trim()) return toast("กรุณากรอก Line ID", "error"), false;
      if (!$("#email").checkValidity()) return toast("รูปแบบอีเมลไม่ถูกต้อง", "error"), false;
      return true;
    }
    if (step === 4) {
      if (!$("#province").value || !$("#district").value || !$("#subdistrict").value)
        return toast("กรุณาเลือกที่อยู่ให้ครบ จังหวัด/อำเภอ/ตำบล", "error"), false;
      if (!$("#addressDetail").value.trim())
        return toast("กรุณากรอกรายละเอียดที่อยู่ (บ้านเลขที่/ถนน)", "error"), false;
      return true;
    }
    if (step === 5) {
      if (!videoFile) return toast("กรุณาอัปโหลดวีดีโอแนะนำตัว", "error"), false;
      return true;
    }
    return true;
  }

  // ---------- STEP 6: review ----------
  function renderReview() {
    const socialLines = Object.entries(socialState)
      .filter(([, s]) => s.connected)
      .map(([id, s]) => `<li>${id.toUpperCase()}: ${s.followers.toLocaleString()} ผู้ติดตาม — <a href="${s.url}" target="_blank">${s.url}</a></li>`)
      .join("");
    $("#reviewSummary").innerHTML = `
      <p><strong>รหัสผู้สมัคร:</strong> ${appId}</p>
      <p><strong>ชื่อ:</strong> ${$("#prefix").value}${$("#firstName").value} ${$("#lastName").value}</p>
      <p><strong>อายุ:</strong> ${$("#age").value} ปี &nbsp; <strong>วันเกิด:</strong> ${$("#birthDate").value}</p>
      <p><strong>เบอร์โทร:</strong> ${$("#phone").value}</p>
      <p><strong>Line ID:</strong> ${$("#lineId").value} &nbsp; <strong>Email:</strong> ${$("#email").value}</p>
      <p><strong>ที่อยู่:</strong> ${$("#addressDetail").value} ตำบล${$("#subdistrict").value} อำเภอ${$("#district").value} จังหวัด${$("#province").value} ${$("#zipcode").value}</p>
      <p><strong>โซเชียลมีเดีย:</strong></p>
      <ul>${socialLines}</ul>
      <p><strong>วีดีโอแนะนำตัว:</strong> ${videoFile ? videoFile.name : "-"}</p>
    `;
  }

  // ---------- navigation ----------
  $("#btnNext").addEventListener("click", async () => {
    if (!validateStep(currentStep)) return;
    if (currentStep === TOTAL_STEPS) {
      await submitDraft();
      return;
    }
    currentStep++;
    if (currentStep === TOTAL_STEPS) renderReview();
    showStep(currentStep);
  });

  $("#btnPrev").addEventListener("click", () => {
    if (currentStep === 1) return;
    currentStep--;
    showStep(currentStep);
  });

  async function submitDraft() {
    const btn = $("#btnNext");
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> กำลังบันทึก...';
    try {
      const applicant = {
        id: appId,
        photo: photoDataUrl,
        prefix: $("#prefix").value,
        firstName: $("#firstName").value.trim(),
        lastName: $("#lastName").value.trim(),
        age: Number($("#age").value),
        birthDate: $("#birthDate").value,
        phone: $("#phone").value.trim(),
        socials: socialState,
        lineId: $("#lineId").value.trim(),
        email: $("#email").value.trim(),
        address: {
          province: $("#province").value,
          district: $("#district").value,
          subdistrict: $("#subdistrict").value,
          detail: $("#addressDetail").value.trim(),
          zipcode: $("#zipcode").value.trim(),
        },
        videoOriginalName: videoFile.name,
        videoType: videoFile.type,
      };
      await DraftStore.save({ applicant, videoFile, createdAt: new Date().toISOString() });
      window.location.href = "contract.html";
    } catch (err) {
      toast("บันทึกฉบับร่างไม่สำเร็จ: " + err.message, "error");
      btn.disabled = false;
      btn.textContent = "ไปหน้าสัญญา →";
    }
  }

  // ---------- init ----------
  async function init() {
    buildProgressDots();
    try {
      settings = await Api.getSettings();
    } catch (err) {
      toast(err.message, "error");
      settings = {
        prefixes: ["นาย", "นาง", "นางสาว"],
        socialPlatforms: [
          { id: "tiktok", label: "TikTok", color: "#000" },
          { id: "facebook", label: "Facebook", color: "#1877F2" },
          { id: "youtube", label: "YouTube", color: "#FF0033" },
        ],
      };
    }

    settings.prefixes.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      $("#prefix").appendChild(opt);
    });

    buildSocialCards();

    initLocationSelects({
      provinceEl: $("#province"),
      districtEl: $("#district"),
      subdistrictEl: $("#subdistrict"),
      zipcodeEl: $("#zipcode"),
    });

    try {
      appId = await Api.reserveNextId();
      $("#appIdDisplay").textContent = appId;
    } catch (err) {
      $("#appIdDisplay").textContent = "ไม่สามารถสร้างรหัสได้";
      toast(err.message, "error");
    }

    showStep(currentStep);
  }

  init();
})();
