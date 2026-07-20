// ส่งอีเมลแจ้งเตือนผู้สมัครผ่าน EmailJS (ไม่ต้องมี backend)
// ต้องตั้งค่า Service ID / Template ID / Public Key ในหน้า Settings ก่อน
// Template ที่ต้องสร้างใน EmailJS ควรมี placeholder: {{to_email}} {{to_name}} {{applicant_id}} {{contract_text}} {{platform_name}}
const EmailNotify = (() => {
  let sdkLoaded = false;

  function loadSdk() {
    return new Promise((resolve, reject) => {
      if (sdkLoaded || window.emailjs) return resolve();
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
      script.onload = () => {
        sdkLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error("โหลด EmailJS SDK ไม่สำเร็จ (ตรวจสอบอินเทอร์เน็ต)"));
      document.head.appendChild(script);
    });
  }

  async function sendConfirmation({ settings, applicant }) {
    const { emailjsServiceId, emailjsTemplateId, emailjsPublicKey } = settings;
    if (!emailjsServiceId || !emailjsTemplateId || !emailjsPublicKey) {
      return { sent: false, reason: "NOT_CONFIGURED" };
    }
    await loadSdk();
    emailjs.init({ publicKey: emailjsPublicKey });
    await emailjs.send(emailjsServiceId, emailjsTemplateId, {
      to_email: applicant.email,
      to_name: `${applicant.prefix} ${applicant.firstName} ${applicant.lastName}`,
      applicant_id: applicant.id,
      platform_name: settings.platformName || "MOMOTARO",
      contract_title: settings.contractTitle || "",
      contract_text: settings.contractText || "",
    });
    return { sent: true };
  }

  return { sendConfirmation };
})();
