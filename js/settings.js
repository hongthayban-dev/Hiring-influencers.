// ตรรกะหน้า Settings: จัดการสัญญา, ข้อมูลตัวเลือกในฟอร์ม, การเชื่อมต่อระบบภายนอก, รายชื่อผู้สมัคร
(() => {
  const $ = (sel) => document.querySelector(sel);
  let settings = null;

  function toast(message, type = "") {
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    document.getElementById("toastWrap").appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  async function save(patch, successMsg) {
    try {
      settings = await Api.updateSettings(patch);
      toast(successMsg || "บันทึกสำเร็จ", "success");
    } catch (err) {
      toast(err.message, "error");
    }
  }

  function fillGeneralForm() {
    $("#platformName").value = settings.platformName || "";
    $("#projectName").value = settings.projectName || "";
    $("#adminPasscode").value = settings.adminPasscode || "";
    $("#nextId").value = settings.nextId || 1;
    $("#contractTitle").value = settings.contractTitle || "";
    $("#contractText").value = settings.contractText || "";
    $("#driveFolderId").value = settings.driveFolderId || "";
  }

  function renderPrefixes() {
    const wrap = $("#prefixList");
    wrap.innerHTML = "";
    settings.prefixes.forEach((p, i) => {
      const chip = document.createElement("span");
      chip.className = "tag-chip";
      chip.innerHTML = `${p} <button type="button" data-i="${i}">✕</button>`;
      wrap.appendChild(chip);
    });
    wrap.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const i = parseInt(btn.dataset.i, 10);
        const prefixes = settings.prefixes.filter((_, idx) => idx !== i);
        await save({ prefixes }, "ลบคำนำหน้าแล้ว");
        renderPrefixes();
      });
    });
  }

  function renderSocialTable() {
    const tbody = $("#socialTable tbody");
    tbody.innerHTML = "";
    settings.socialPlatforms.forEach((p, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.id}</td>
        <td><input type="text" data-field="label" data-i="${i}" value="${p.label}" style="padding:6px 10px;"></td>
        <td><input type="color" data-field="color" data-i="${i}" value="${p.color}" style="padding:2px;max-width:60px;"></td>
        <td><button type="button" class="btn btn-sm btn-danger" data-remove="${i}">ลบ</button></td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll("input").forEach((input) => {
      input.addEventListener("change", async () => {
        const i = parseInt(input.dataset.i, 10);
        const field = input.dataset.field;
        const socialPlatforms = settings.socialPlatforms.map((p, idx) =>
          idx === i ? { ...p, [field]: input.value } : p
        );
        await save({ socialPlatforms }, "อัปเดตช่องทางแล้ว");
      });
    });

    tbody.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const i = parseInt(btn.dataset.remove, 10);
        const socialPlatforms = settings.socialPlatforms.filter((_, idx) => idx !== i);
        await save({ socialPlatforms }, "ลบช่องทางแล้ว");
        renderSocialTable();
      });
    });
  }

  async function loadApplicants() {
    const tbody = $("#applicantTable tbody");
    tbody.innerHTML = `<tr><td colspan="6">กำลังโหลด...</td></tr>`;
    try {
      const list = await Api.listApplicants();
      $("#applicantCount").textContent = `ทั้งหมด ${list.length} รายการ`;
      tbody.innerHTML = "";
      if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="6">ยังไม่มีผู้สมัคร</td></tr>`;
        return;
      }
      list
        .slice()
        .reverse()
        .forEach((a) => {
          const tr = document.createElement("tr");
          const created = a.createdAt ? new Date(a.createdAt).toLocaleString("th-TH") : "-";
          tr.innerHTML = `
            <td>${a.id}</td>
            <td>${a.prefix || ""}${a.firstName || ""} ${a.lastName || ""}</td>
            <td>${a.phone || "-"}</td>
            <td>${a.status || "-"}</td>
            <td>${created}</td>
            <td style="display:flex;gap:8px;">
              <a class="btn btn-sm btn-outline" href="search.html?id=${encodeURIComponent(a.id)}" target="_blank">ดู</a>
              <button type="button" class="btn btn-sm btn-danger" data-del="${a.id}">ลบ</button>
            </td>
          `;
          tbody.appendChild(tr);
        });

      tbody.querySelectorAll("[data-del]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (!confirm("ยืนยันลบใบสมัครนี้? การลบไม่สามารถย้อนกลับได้")) return;
          try {
            await Api.deleteApplicant(btn.dataset.del);
            toast("ลบใบสมัครแล้ว", "success");
            loadApplicants();
          } catch (err) {
            toast(err.message, "error");
          }
        });
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6">${err.message}</td></tr>`;
    }
  }

  function wireButtons() {
    $("#saveGeneral").addEventListener("click", () =>
      save(
        {
          platformName: $("#platformName").value.trim(),
          projectName: $("#projectName").value.trim(),
          adminPasscode: $("#adminPasscode").value.trim() || "0000",
          nextId: parseInt($("#nextId").value, 10) || 1,
        },
        "บันทึกข้อมูลทั่วไปแล้ว"
      )
    );

    $("#saveContract").addEventListener("click", () =>
      save(
        {
          contractTitle: $("#contractTitle").value.trim(),
          contractText: $("#contractText").value,
        },
        "บันทึกข้อความสัญญาแล้ว"
      )
    );

    $("#saveDrive").addEventListener("click", () =>
      save({ driveFolderId: $("#driveFolderId").value.trim() }, "บันทึก Drive Folder ID แล้ว")
    );

    $("#addPrefix").addEventListener("click", async () => {
      const val = $("#newPrefix").value.trim();
      if (!val) return;
      await save({ prefixes: [...settings.prefixes, val] }, "เพิ่มคำนำหน้าแล้ว");
      $("#newPrefix").value = "";
      renderPrefixes();
    });

    $("#addSocial").addEventListener("click", async () => {
      const id = $("#newSocialId").value.trim().toLowerCase();
      const label = $("#newSocialLabel").value.trim();
      const color = $("#newSocialColor").value;
      if (!id || !label) return toast("กรุณากรอกรหัสและชื่อที่แสดง", "error");
      if (settings.socialPlatforms.some((p) => p.id === id)) {
        return toast("มีรหัสช่องทางนี้อยู่แล้ว", "error");
      }
      await save(
        { socialPlatforms: [...settings.socialPlatforms, { id, label, color, icon: id }] },
        "เพิ่มช่องทางแล้ว"
      );
      $("#newSocialId").value = "";
      $("#newSocialLabel").value = "";
      renderSocialTable();
    });

    $("#refreshApplicants").addEventListener("click", loadApplicants);
  }

  async function init() {
    try {
      settings = await Api.getSettings();
    } catch (err) {
      toast(err.message, "error");
      return;
    }
    AdminGate.init(settings, () => {
      fillGeneralForm();
      renderPrefixes();
      renderSocialTable();
      wireButtons();
      loadApplicants();
    });
  }

  init();
})();
