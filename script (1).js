/* =====================================================
   المؤشر: ماوس + لمس (عشان الموبايل يتحرك كمان)
   ===================================================== */
const ptr = { x: -9999, y: -9999 };
let lastTouch = 0;
let clearTimer;

const setPtr = (x, y) => { ptr.x = x; ptr.y = y; };
const clearPtr = () => { ptr.x = ptr.y = -9999; };

window.addEventListener("mousemove", (e) => {
  if (Date.now() - lastTouch < 800) return; // تجاهل ماوس وهمي بعد اللمس
  setPtr(e.clientX, e.clientY);
});
document.addEventListener("mouseleave", clearPtr);

function touchSet(e) {
  lastTouch = Date.now();
  clearTimeout(clearTimer);
  const t = e.touches[0];
  if (t) setPtr(t.clientX, t.clientY);
}
function touchEnd() {
  lastTouch = Date.now();
  clearTimer = setTimeout(clearPtr, 600);
}
window.addEventListener("touchstart", touchSet, { passive: true });
window.addEventListener("touchmove", touchSet, { passive: true });
window.addEventListener("touchend", touchEnd, { passive: true });
window.addEventListener("touchcancel", touchEnd, { passive: true });

const lerp = (a, b, t) => a + (b - a) * t;
const inside = (r, x, y) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;

/* =====================================================
   العناصر
   ===================================================== */
const dock = document.getElementById("dock");
const dockItems = [...document.querySelectorAll(".dock-item")];

const heroCard = document.getElementById("heroCard");
const nameR = document.getElementById("nameRight");
const nameL = document.getElementById("nameLeft");
const person = document.getElementById("person");
const contactName = document.getElementById("contactName");

/* الأسماء الكبيرة: بتجري ناحية المؤشر لما يقرّب */
const NAME_RADIUS = 700;
const nameStates = [nameR, nameL, contactName].map((el) => ({
  el, hero: el !== contactName,
  mx: 0, my: 0, ms: 1, px: 0, py: 0,
}));
const personState = { x: 0, y: 0 };

/* أي عنصر المؤشر يقرّب منه يتحرك ناحيته */
const MOVERS = [
  ...document.querySelectorAll(
    ".tags span, .tools-body h3, .card, .icon3d, .skill-list li, .social, .contact-sub, .hero-pill, .folder, .big-text .w, .chip, .copy"
  ),
].map((el) => ({ el, x: 0, y: 0, s: 1 }));

/* ميل أيقونات الكروت 3D */
const tiltCards = [...document.querySelectorAll(".card.tilt")].map((card) => ({
  card, icon: card.querySelector(".icon3d"), on: false,
}));

/* صفحة "ليه نضيع وقت؟" */
const why = document.getElementById("why");
const whyWords = [...why.querySelectorAll(".ww")].map((el, i) => ({ el, i, x: 0, y: 0, s: 1, r: 0 }));
const cv = document.getElementById("whyCanvas");
const ctx = cv.getContext("2d");
let whyVisible = false;
let dots = [];

function sizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  cv.width = why.clientWidth * dpr;
  cv.height = why.clientHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  dots = Array.from({ length: 110 }, () => ({
    x: Math.random() * why.clientWidth,
    y: Math.random() * why.clientHeight,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    r: 1.5 + Math.random() * 3,
  }));
}
sizeCanvas();
window.addEventListener("resize", sizeCanvas);

/* =====================================================
   حلقة التحريك الواحدة
   ===================================================== */
function updateDock() {
  const dr = dock.getBoundingClientRect();
  const near = ptr.y < dr.bottom + 40;
  dockItems.forEach((item) => {
    const r = item.getBoundingClientRect();
    const d = Math.abs(ptr.x - (r.left + r.width / 2));
    const target = near ? Math.max(1, 1.9 - d / 70) : 1;
    item._s = lerp(item._s || 1, target, 0.25);
    item.style.transform = `scale(${item._s.toFixed(3)})`;
  });
}

function updateHeroAndNames() {
  const hr = heroCard.getBoundingClientRect();
  const inHero = inside(hr, ptr.x, ptr.y);
  const nx = inHero ? ((ptr.x - hr.left) / hr.width - 0.5) * 2 : 0;
  const ny = inHero ? ((ptr.y - hr.top) / hr.height - 0.5) * 2 : 0;

  nameStates.forEach((s) => {
    const r = s.el.getBoundingClientRect();
    if (r.bottom < -150 || r.top > window.innerHeight + 150) return;

    // مركز الاسم الأصلي (بدون الإزاحة الحالية) عشان الحركة ما تعملش لفّة
    const cx = r.left + r.width / 2 - (s.mx + s.px);
    const cy = r.top + r.height / 2 - (s.my + s.py);
    const dx = ptr.x - cx;
    const dy = ptr.y - cy;
    const dist = Math.hypot(dx, dy);
    const pull = Math.max(0, 1 - dist / NAME_RADIUS);

    const tmx = dx * 0.32 * pull;
    const tmy = dy * 0.4 * pull;
    const tms = 1 + pull * 0.2;
    const tpx = s.hero ? nx * -22 : 0;
    const tpy = s.hero ? ny * -12 : 0;

    s.mx = lerp(s.mx, tmx, 0.12);
    s.my = lerp(s.my, tmy, 0.12);
    s.ms = lerp(s.ms, tms, 0.12);
    s.px = lerp(s.px, tpx, 0.12);
    s.py = lerp(s.py, tpy, 0.12);

    s.el.style.setProperty("--mx", s.mx.toFixed(2) + "px");
    s.el.style.setProperty("--my", s.my.toFixed(2) + "px");
    s.el.style.setProperty("--ms", s.ms.toFixed(4));
    s.el.style.setProperty("--px", s.px.toFixed(2) + "px");
    s.el.style.setProperty("--py", s.py.toFixed(2) + "px");
    s.el.classList.toggle("near", pull > 0.35);
  });

  // الشخص: بنستخدم translate/scale (المنفصلين) عشان أنيميشن الظهور ما يلغيهمش
  const tx = inHero ? nx * 16 : 0;
  const ty = inHero ? ny * 8 : 0;
  personState.x = lerp(personState.x, tx, 0.12);
  personState.y = lerp(personState.y, ty, 0.12);
  person.style.translate = `${personState.x.toFixed(2)}px ${personState.y.toFixed(2)}px`;
  person.style.scale = inHero ? "1.02" : "1";
}

function updateMovers() {
  MOVERS.forEach((m) => {
    const r = m.el.getBoundingClientRect();
    let tx = 0, ty = 0, ts = 1;
    if (r.bottom > -200 && r.top < window.innerHeight + 200) {
      const cx = r.left + r.width / 2 - m.x;
      const cy = r.top + r.height / 2 - m.y;
      const dx = ptr.x - cx, dy = ptr.y - cy;
      const d = Math.hypot(dx, dy) || 1;
      const big = r.width > 200;
      const radius = Math.max(240, Math.min(r.width * 1.2, 420));
      const pull = Math.max(0, 1 - d / radius);
      const max = big ? 14 : 22;
      tx = (dx / d) * max * pull;
      ty = (dy / d) * max * pull;
      ts = 1 + (big ? 0.03 : 0.08) * pull;
    }
    m.x = lerp(m.x, tx, 0.16);
    m.y = lerp(m.y, ty, 0.16);
    m.s = lerp(m.s, ts, 0.16);
    m.el.style.translate = `${m.x.toFixed(2)}px ${m.y.toFixed(2)}px`;
    m.el.style.scale = m.s.toFixed(4);
  });
}

function updateTilt() {
  tiltCards.forEach((t) => {
    const r = t.card.getBoundingClientRect();
    if (inside(r, ptr.x, ptr.y)) {
      const x = (ptr.x - r.left) / r.width - 0.5;
      const y = (ptr.y - r.top) / r.height - 0.5;
      t.icon.style.transform = `perspective(500px) rotateY(${x * 40}deg) rotateX(${y * -40}deg) translateY(-8px) scale(1.05)`;
      t.on = true;
    } else if (t.on) {
      t.icon.style.transform = "";
      t.on = false;
    }
  });
}

function updateWhy(time) {
  if (!whyVisible) return;
  const box = why.getBoundingClientRect();
  const px = ptr.x - box.left;
  const py = ptr.y - box.top;

  // الكلمات
  whyWords.forEach((w) => {
    const r = w.el.getBoundingClientRect();
    const cx = r.left - box.left + r.width / 2 - w.x;
    const cy = r.top - box.top + r.height / 2 - w.y;
    const dx = px - cx, dy = py - cy;
    const d = Math.hypot(dx, dy) || 1;
    const pull = Math.max(0, 1 - d / 520);

    // حركة تنفّس هادية دايماً (عشان تتحرك حتى من غير ماوس)
    const idleX = Math.sin(time / 900 + w.i * 1.7) * 7;
    const idleY = Math.cos(time / 1100 + w.i * 1.3) * 7;

    const tx = dx * 0.35 * pull + idleX;
    const ty = dy * 0.35 * pull + idleY;
    const ts = 1 + pull * 0.3;
    const tr = (dx / 60) * pull;

    w.x = lerp(w.x, tx, 0.14);
    w.y = lerp(w.y, ty, 0.14);
    w.s = lerp(w.s, ts, 0.14);
    w.r = lerp(w.r, tr, 0.14);

    w.el.style.translate = `${w.x.toFixed(1)}px ${w.y.toFixed(1)}px`;
    w.el.style.scale = w.s.toFixed(3);
    w.el.style.rotate = `${w.r.toFixed(2)}deg`;
    w.el.classList.toggle("hot", pull > 0.45);
  });

  // النقط
  ctx.clearRect(0, 0, cv.width, cv.height);
  dots.forEach((p) => {
    const dx = p.x - px, dy = p.y - py;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 140) {
      const f = (1 - d / 140) * 4;
      p.vx += (dx / d) * f * 0.2;
      p.vy += (dy / d) * f * 0.2;
    }
    p.vx *= 0.96; p.vy *= 0.96;
    p.x += p.vx + (Math.random() - 0.5) * 0.15;
    p.y += p.vy + (Math.random() - 0.5) * 0.15;
    if (p.x < 0) p.x = why.clientWidth;
    if (p.x > why.clientWidth) p.x = 0;
    if (p.y < 0) p.y = why.clientHeight;
    if (p.y > why.clientHeight) p.y = 0;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = d < 140 ? "rgba(255,77,46,.7)" : "rgba(0,0,0,.22)";
    ctx.fill();
  });
}

function loop(time) {
  updateDock();
  updateHeroAndNames();
  updateMovers();
  updateTilt();
  updateWhy(time);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* =====================================================
   النص الكبير: الكلمات تتلوّن مع السكرول
   ===================================================== */
const words = [...document.querySelectorAll("#bigText .w")];
const intro = document.getElementById("intro");

function paintWords() {
  const r = intro.getBoundingClientRect();
  const vh = window.innerHeight;
  const progress = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height * 0.7)));
  const count = Math.round(progress * words.length);
  words.forEach((w, i) => w.classList.toggle("on", i < count));
}
window.addEventListener("scroll", paintWords, { passive: true });
paintWords();

/* =====================================================
   قائمة المجالات: تظهر واحدة واحدة
   ===================================================== */
const list = document.getElementById("skillList");
const lis = [...list.querySelectorAll("li")];

function showSkills() {
  lis.forEach((li, i) => setTimeout(() => li.classList.add("show"), i * 160));
}
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((en) => en.isIntersecting)) { showSkills(); io.disconnect(); }
    },
    { threshold: 0.2 }
  );
  io.observe(list);
} else {
  showSkills();
}

list.addEventListener("mouseover", () => list.classList.add("hovering"));
list.addEventListener("mouseleave", () => list.classList.remove("hovering"));

/* =====================================================
   صفحة "ليه نضيع وقت؟": ظهور عند الوصول لها
   ===================================================== */
if ("IntersectionObserver" in window) {
  new IntersectionObserver(
    (en) => {
      whyVisible = en[0].isIntersecting;
      if (whyVisible) why.classList.add("in");
    },
    { threshold: 0.1 }
  ).observe(why);
} else {
  whyVisible = true;
  why.classList.add("in");
}

/* =====================================================
   فولدر المشاريع: يفتح نافذة سودة فيها المشاريع
   ===================================================== */
const modal = document.getElementById("projectsModal");
const closeBtn = document.getElementById("modalClose");

function openModal()  { modal.classList.add("open");    modal.setAttribute("aria-hidden", "false"); }
function closeModal() { modal.classList.remove("open"); modal.setAttribute("aria-hidden", "true"); }

document.querySelector('.folder[data-open="projects"]').addEventListener("click", openModal);
closeBtn.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

/* موبايل: الفولدر يفتح بالضغط */
document.querySelectorAll(".folder").forEach((f) => {
  f.addEventListener("click", () => {
    if (!window.matchMedia("(hover: none)").matches) return;
    const open = f.classList.toggle("open");
    f.querySelector(".f-front").style.transform = open ? "rotateX(-28deg)" : "";
    f.querySelector(".f-paper").style.transform = open ? "translateY(-62px) rotate(-1.5deg)" : "";
  });
});
