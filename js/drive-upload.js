// อัปโหลดวีดีโอแนะนำตัวขึ้น Google Drive โดยตรงจากฝั่งเบราว์เซอร์ (OAuth2 ผ่าน Google Identity Services)
// ต้องตั้งค่า "Google OAuth Client ID" ในหน้า Settings ก่อนจึงจะใช้งานได้จริง
// ถ้ายังไม่ตั้งค่า ระบบจะ fallback ไปเป็นการดาวน์โหลดไฟล์ (เปลี่ยนชื่อตาม ID) ให้ผู้ดูแลอัปโหลดเข้า Drive เอง
const DriveUpload = (() => {
  let tokenClient = null;
  let gsiLoaded = false;
  let cachedToken = null; // { clientId, accessToken, expiresAt } — avoids a repeat consent popup within one page session

  function loadGsiScript() {
    return new Promise((resolve, reject) => {
      if (gsiLoaded) return resolve();
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = () => {
        gsiLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error("โหลด Google Identity Services ไม่สำเร็จ (ตรวจสอบอินเทอร์เน็ต)"));
      document.head.appendChild(script);
    });
  }

  async function getAccessToken(clientId) {
    if (cachedToken && cachedToken.clientId === clientId && Date.now() < cachedToken.expiresAt) {
      return cachedToken.accessToken;
    }
    await loadGsiScript();
    return new Promise((resolve, reject) => {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: window.APP_CONFIG.DRIVE_SCOPE,
        callback: (resp) => {
          if (resp && resp.access_token) {
            cachedToken = {
              clientId,
              accessToken: resp.access_token,
              expiresAt: Date.now() + (Number(resp.expires_in || 3600) - 60) * 1000,
            };
            resolve(resp.access_token);
          } else {
            reject(new Error("ไม่ได้รับสิทธิ์เข้าถึง Google Drive"));
          }
        },
        error_callback: (err) => reject(new Error(err.message || "การขอสิทธิ์ Google Drive ถูกยกเลิก")),
      });
      tokenClient.requestAccessToken();
    });
  }

  // อัปโหลดไฟล์ขึ้น Google Drive ด้วย multipart request
  // คืนค่า { id, webViewLink } เมื่อสำเร็จ
  async function uploadFile({ file, filename, folderId, clientId }) {
    if (!clientId) {
      throw new Error("NO_CLIENT_ID");
    }
    const accessToken = await getAccessToken(clientId);

    const metadata = {
      name: filename,
      parents: folderId ? [folderId] : undefined,
    };

    const boundary = "influtostar-" + Math.random().toString(36).slice(2);
    const fileBuffer = await file.arrayBuffer();

    const metaPart =
      `--${boundary}\r\n` +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      "\r\n";
    const filePartHeader =
      `--${boundary}\r\n` + `Content-Type: ${file.type || "video/mp4"}\r\n\r\n`;
    const closing = `\r\n--${boundary}--`;

    const encoder = new TextEncoder();
    const body = new Blob([
      encoder.encode(metaPart),
      encoder.encode(filePartHeader),
      fileBuffer,
      encoder.encode(closing),
    ]);

    const res = await fetch(
      window.APP_CONFIG.DRIVE_UPLOAD_URL + "&fields=id,webViewLink",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error("อัปโหลดขึ้น Google Drive ไม่สำเร็จ: " + text);
    }
    return res.json();
  }

  // fallback: ดาวน์โหลดไฟล์วีดีโอที่เปลี่ยนชื่อแล้ว เพื่อให้ผู้ดูแลนำไปอัปโหลดเข้า Drive folder เอง
  function downloadRenamedFile(file, filename) {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  return { uploadFile, downloadRenamedFile };
})();
