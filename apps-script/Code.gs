// === Backend ของ Influ to Star บน Google Apps Script ===
// วางไฟล์นี้ใน Extensions > Apps Script ของ Google Sheet (สคริปต์จะผูกกับชีตที่เปิดอยู่โดยอัตโนมัติ
// ผ่าน SpreadsheetApp.getActiveSpreadsheet() ไม่ต้องใส่ Spreadsheet ID เอง)
// ต้องมี 2 แท็บในชีต: "Applicants" (มีแถวหัวตาราง) และ "Settings" (คอลัมน์ key | value)
// ต้องตั้งค่า Script Properties > ADMIN_PASSCODE ก่อน deploy จริง (ไม่งั้นจะ fallback เป็น "0000")
// Deploy เป็น Web app: Execute as "Me", Who has access "Anyone"

const APPLICANTS_SHEET = "Applicants";
const SETTINGS_SHEET = "Settings";
const JSON_FIELDS = new Set(["address", "socials"]);

function getSheet_(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error("ไม่พบแท็บ '" + name + "' ในชีต");
  return sheet;
}

function checkPasscode_(passcode) {
  const real = PropertiesService.getScriptProperties().getProperty("ADMIN_PASSCODE") || "0000";
  return String(passcode || "") === real;
}

function requirePasscode_(passcode) {
  if (!checkPasscode_(passcode)) throw new Error("รหัสผ่านไม่ถูกต้อง");
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function errorResponse_(err) {
  return jsonResponse_({ error: String((err && err.message) || err) });
}

function parseCell_(key, raw) {
  if (JSON_FIELDS.has(key) && typeof raw === "string" && raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      return raw;
    }
  }
  return raw;
}

// ---------- Applicants ----------
function readApplicants_() {
  const sheet = getSheet_(APPLICANTS_SHEET);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values
    .slice(1)
    .filter((row) => row[0] !== "")
    .map((row) => {
      const obj = {};
      headers.forEach((key, i) => (obj[key] = parseCell_(key, row[i])));
      return obj;
    });
}

function findApplicantRow_(sheet, headers, id) {
  const values = sheet.getDataRange().getValues();
  const idCol = headers.indexOf("id");
  for (let r = 1; r < values.length; r++) {
    if (values[r][idCol] === id) return { rowNum: r + 1, values: values[r] };
  }
  return null;
}

function applicantToRow_(headers, applicant) {
  return headers.map((key) => {
    const v = applicant[key];
    if (v === undefined || v === null) return "";
    return JSON_FIELDS.has(key) ? JSON.stringify(v) : v;
  });
}

function createApplicant_(applicant) {
  const sheet = getSheet_(APPLICANTS_SHEET);
  const headers = sheet.getDataRange().getValues()[0];
  sheet.appendRow(applicantToRow_(headers, applicant));
  return applicant;
}

function updateApplicant_(id, patch) {
  const sheet = getSheet_(APPLICANTS_SHEET);
  const headers = sheet.getDataRange().getValues()[0];
  const found = findApplicantRow_(sheet, headers, id);
  if (!found) throw new Error("ไม่พบผู้สมัคร " + id);
  const current = {};
  headers.forEach((key, i) => (current[key] = parseCell_(key, found.values[i])));
  const merged = Object.assign({}, current, patch);
  sheet.getRange(found.rowNum, 1, 1, headers.length).setValues([applicantToRow_(headers, merged)]);
  return merged;
}

function deleteApplicant_(id) {
  const sheet = getSheet_(APPLICANTS_SHEET);
  const headers = sheet.getDataRange().getValues()[0];
  const found = findApplicantRow_(sheet, headers, id);
  if (!found) throw new Error("ไม่พบผู้สมัคร " + id);
  sheet.deleteRow(found.rowNum);
  return { deleted: true };
}

// ---------- Settings (key | value ต่อแถว) ----------
function readSettings_() {
  const sheet = getSheet_(SETTINGS_SHEET);
  const values = sheet.getDataRange().getValues();
  const settings = {};
  for (let r = 1; r < values.length; r++) {
    const key = values[r][0];
    if (!key) continue;
    const raw = values[r][1];
    if (typeof raw === "string" && (raw.startsWith("[") || raw.startsWith("{"))) {
      try {
        settings[key] = JSON.parse(raw);
        continue;
      } catch (e) {
        // ไม่ใช่ JSON จริง ใช้ raw ต่อไป
      }
    }
    settings[key] = raw;
  }
  delete settings.adminPasscode;
  return settings;
}

function updateSettings_(patch) {
  const sheet = getSheet_(SETTINGS_SHEET);
  const values = sheet.getDataRange().getValues();
  const keyToRow = {};
  for (let r = 1; r < values.length; r++) {
    if (values[r][0]) keyToRow[values[r][0]] = r + 1;
  }
  Object.keys(patch).forEach((key) => {
    const raw = typeof patch[key] === "object" ? JSON.stringify(patch[key]) : patch[key];
    if (keyToRow[key]) {
      sheet.getRange(keyToRow[key], 2).setValue(raw);
    } else {
      sheet.appendRow([key, raw]);
      keyToRow[key] = sheet.getLastRow();
    }
  });
  return readSettings_();
}

// ---------- ออกรหัสผู้สมัครถัดไปแบบกันชนกัน ----------
function reserveNextId_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_(SETTINGS_SHEET);
    const values = sheet.getDataRange().getValues();
    let row = -1;
    let n = 1;
    for (let r = 1; r < values.length; r++) {
      if (values[r][0] === "nextId") {
        row = r + 1;
        n = Number(values[r][1]) || 1;
        break;
      }
    }
    const code = "ID-" + String(n).padStart(4, "0");
    if (row === -1) sheet.appendRow(["nextId", n + 1]);
    else sheet.getRange(row, 2).setValue(n + 1);
    return code;
  } finally {
    lock.releaseLock();
  }
}

// ---------- HTTP handlers ----------
function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === "getSettings") return jsonResponse_(readSettings_());
    if (action === "reserveNextId") return jsonResponse_({ id: reserveNextId_() });
    if (action === "verifyPasscode") return jsonResponse_({ ok: checkPasscode_(e.parameter.passcode) });
    if (action === "listApplicants") {
      requirePasscode_(e.parameter.passcode);
      return jsonResponse_(readApplicants_());
    }
    if (action === "getApplicantByCode") {
      requirePasscode_(e.parameter.passcode);
      const found = readApplicants_().filter((a) => a.id === e.parameter.id);
      return jsonResponse_(found.length ? found[0] : null);
    }
    return errorResponse_("ไม่รู้จัก action นี้");
  } catch (err) {
    return errorResponse_(err);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const payload = body.payload || {};
    if (action === "createApplicant") return jsonResponse_(createApplicant_(payload));
    if (action === "updateApplicant") {
      requirePasscode_(body.passcode);
      return jsonResponse_(updateApplicant_(payload.id, payload.patch));
    }
    if (action === "deleteApplicant") {
      requirePasscode_(body.passcode);
      return jsonResponse_(deleteApplicant_(payload.id));
    }
    if (action === "updateSettings") {
      requirePasscode_(body.passcode);
      return jsonResponse_(updateSettings_(payload));
    }
    return errorResponse_("ไม่รู้จัก action นี้");
  } catch (err) {
    return errorResponse_(err);
  }
}

// ---------- ทดสอบด้วยมือ ----------
// ในหน้า Apps Script: เลือกฟังก์ชัน "testCreateApplicant" จาก dropdown ข้างปุ่ม Run แล้วกด Run ▶
// ไม่ต้อง deploy ก่อนก็ทดสอบได้ — เช็คว่ามีแถวใหม่ขึ้นในแท็บ Applicants เป็น 1 แถวถูกต้อง
// (เขียนทับ id เดิมได้ ถ้ารันซ้ำจะได้แถวใหม่เพิ่มทุกครั้ง ลบทิ้งเองได้หลังทดสอบเสร็จ)
function testCreateApplicant() {
  const sample = {
    id: "ID-TEST",
    prefix: "นาย",
    firstName: "ทดสอบ",
    lastName: "ระบบ",
    age: 25,
    birthDate: "2001-01-01",
    phone: "0800000000",
    lineId: "test_line",
    email: "test@example.com",
    address: { province: "กรุงเทพมหานคร", district: "บางรัก", subdistrict: "สีลม", detail: "123 ถ.สีลม", zipcode: "10500" },
    socials: { tiktok: { url: "", followers: "", connected: false }, facebook: { url: "https://facebook.com/test", followers: 1000, connected: true }, youtube: { url: "", followers: "", connected: false } },
    photo: "",
    videoFilename: "ID-TEST.mp4",
    videoType: "video/mp4",
    videoOriginalName: "test.mp4",
    videoStatus: "pending_manual_upload",
    videoDriveLink: null,
    videoDriveId: null,
    photoDriveLink: null,
    photoDriveId: null,
    contractAccepted: true,
    contractAcceptedAt: new Date().toISOString(),
    status: "รอการติดต่อกลับ",
    createdAt: new Date().toISOString(),
  };
  const result = createApplicant_(sample);
  Logger.log(JSON.stringify(result, null, 2));
}

// ทดสอบอ่าน settings กลับมา (ต้องกรอกแท็บ Settings ไว้ก่อน) — Run > testReadSettings แล้วดูผลที่ View > Logs
function testReadSettings() {
  Logger.log(JSON.stringify(readSettings_(), null, 2));
}

// วินิจฉัยปัญหา createApplicant ไม่ขึ้นแถว — Run > testDiagnose แล้วดูผลที่ View > Logs
// จะบอก URL/ชื่อของสเปรดชีตที่สคริปต์นี้ผูกอยู่จริง (เทียบกับ URL ที่คุณเปิดดูอยู่),
// รายชื่อแท็บทั้งหมดที่มี, และจำนวนแถว/หัวตารางปัจจุบันของแท็บ Applicants
function testDiagnose() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log("Spreadsheet name: " + ss.getName());
  Logger.log("Spreadsheet URL: " + ss.getUrl());
  Logger.log("แท็บทั้งหมดที่มี: " + ss.getSheets().map((s) => s.getName()).join(", "));

  const sheet = getSheet_(APPLICANTS_SHEET);
  const values = sheet.getDataRange().getValues();
  Logger.log("Applicants sheet ชื่อจริง: " + sheet.getName());
  Logger.log("Applicants จำนวนแถวทั้งหมด (รวมหัวตาราง): " + values.length);
  Logger.log("Applicants หัวตาราง (แถว 1): " + JSON.stringify(values[0]));
  if (values.length > 1) Logger.log("แถวที่ 2: " + JSON.stringify(values[1]));

  Logger.log("ลอง appendRow ทดสอบตรงๆ...");
  sheet.appendRow(["DIAG-" + new Date().getTime()]);
  const after = sheet.getDataRange().getValues();
  Logger.log("จำนวนแถวหลัง appendRow: " + after.length);
}
