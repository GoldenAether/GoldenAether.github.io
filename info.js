(() => {
  const canvas = document.createElement("canvas");
  canvas.id = "galaxy-canvas";
  Object.assign(canvas.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    zIndex: "-1000",
    pointerEvents: "none",
    backgroundColor: "#000",
  });
  document.body.prepend(canvas);

  const ctx = canvas.getContext("2d");
  let w, h;
  const starCount = 150; // reduced from 250 for performance
  let stars = [];

  const random = (min, max) => Math.random() * (max - min) + min;

  function createStars() {
    stars = [];
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: random(0, w),
        y: random(0, h),
        radius: random(0.3, 1.2),
        alpha: random(0.1, 0.8),
        vx: random(-0.1, 0.1),
        vy: random(-0.1, 0.1),
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: random(0.001, 0.003),
      });
    }
  }

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * devicePixelRatio;
    canvas.height = h * devicePixelRatio;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(devicePixelRatio, devicePixelRatio);
    createStars();
  }

  function updateStars() {
    const now = performance.now();
    for (const star of stars) {
      star.alpha += star.twinkleSpeed * Math.sin(now * 0.005 + star.twinklePhase);
      star.alpha = Math.min(Math.max(star.alpha, 0.1), 0.8);

      star.x += star.vx;
      star.y += star.vy;

      if (star.x < 0 || star.x > w) star.vx *= -1;
      if (star.y < 0 || star.y > h) star.vy *= -1;
    }
  }

  function drawNebula() {
    const gradient = ctx.createRadialGradient(w * 0.3, h * 0.7, 100, w * 0.5, h * 0.3, 700);
    const time = performance.now() * 0.0001;
    const hueShift = (Math.sin(time) + 1) * 180;

    gradient.addColorStop(0, `hsla(${hueShift}, 80%, 30%, 0.15)`);
    gradient.addColorStop(0.5, `hsla(${(hueShift + 60) % 360}, 70%, 20%, 0.12)`);
    gradient.addColorStop(1, `hsla(${(hueShift + 120) % 360}, 50%, 10%, 0.08)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  function drawStars() {
    ctx.clearRect(0, 0, w, h);
    drawNebula();

    for (const star of stars) {
      const grd = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.radius * 5);
      grd.addColorStop(0, `rgba(255, 255, 255, ${star.alpha})`);
      grd.addColorStop(0.4, `rgba(255, 255, 255, ${star.alpha * 0.3})`);
      grd.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function animate() {
    updateStars();
    drawStars();
    requestAnimationFrame(animate);
  }

  window.addEventListener("resize", resize);
  resize();
  animate();
})();
