// เอฟเฟกต์ confetti เล็ก ๆ แบบ self-contained ไม่ต้องพึ่ง library ภายนอก
function fireConfetti(originEl) {
  const colors = ["#FF2E9F", "#FFD400", "#00E0C6", "#7C3AED", "#FF7A1A", "#2E6BFF"];
  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "9999";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.scale(dpr, dpr);

  let originX = innerWidth / 2;
  let originY = innerHeight / 2;
  if (originEl) {
    const r = originEl.getBoundingClientRect();
    originX = r.left + r.width / 2;
    originY = r.top + r.height / 2;
  }

  const pieces = Array.from({ length: 120 }, () => ({
    x: originX,
    y: originY,
    vx: (Math.random() - 0.5) * 14,
    vy: Math.random() * -14 - 4,
    size: Math.random() * 8 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.3,
    shape: Math.random() > 0.5 ? "rect" : "circle",
  }));

  let frame = 0;
  function tick() {
    frame++;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    pieces.forEach((p) => {
      p.vy += 0.35;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === "rect") {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
    if (frame < 110) {
      requestAnimationFrame(tick);
    } else {
      canvas.remove();
    }
  }
  tick();
}
