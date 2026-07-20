// สคริปต์สำหรับหน้า index.html: reveal animation, counter, confetti บนปุ่มสมัคร
document.addEventListener("DOMContentLoaded", () => {
  // reveal on scroll
  const revealEls = document.querySelectorAll(".reveal");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  revealEls.forEach((el) => io.observe(el));

  // animated counters
  document.querySelectorAll("[data-count-to]").forEach((el) => {
    const target = parseInt(el.dataset.countTo, 10);
    let started = false;
    const counterIo = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !started) {
          started = true;
          const duration = 1400;
          const start = performance.now();
          function step(now) {
            const progress = Math.min((now - start) / duration, 1);
            el.textContent = Math.floor(progress * target).toLocaleString("th-TH");
            if (progress < 1) requestAnimationFrame(step);
            else el.textContent = target.toLocaleString("th-TH") + (el.dataset.suffix || "");
          }
          requestAnimationFrame(step);
        }
      });
    });
    counterIo.observe(el);
  });

  // confetti on CTA buttons
  document.querySelectorAll("[data-confetti]").forEach((btn) => {
    btn.addEventListener("click", () => fireConfetti(btn));
  });

  // sticky CTA visibility after hero
  const stickyCta = document.querySelector(".sticky-cta");
  const hero = document.querySelector(".hero");
  if (stickyCta && hero) {
    const heroIo = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        stickyCta.style.display = entry.isIntersecting ? "none" : "block";
      });
    });
    heroIo.observe(hero);
  }
});
