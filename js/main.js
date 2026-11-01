/* =========================================================
   Magomed — le site se construit tout seul
   Des « agents » (flèches de couleur) construisent chaque élément visible,
   chaque fois d'une façon un peu différente : frappe au clavier (avec fautes
   corrigées), copier-coller, texte provisoire effacé, image glissée ou scannée,
   bloc qui tombe ou s'ouvre, élément mal placé puis réaligné…
   Le visiteur fait défiler lui-même : chaque partie se construit quand elle arrive à l'écran.
   GSAP + ScrollTrigger + SplitText (dossier js/)
   ========================================================= */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger && window.SplitText);
  var loader = document.querySelector(".loader");
  var BUILD_SPEED = 1.2;   // vitesse de construction (1 = normal, plus grand = plus rapide)

  /* ---------- Menu mobile ---------- */
  var burger = document.querySelector(".nav__burger");
  var menu = document.querySelector(".menu");
  var onMenuToggle = null;   // branché plus bas : les agents construisent le menu à son ouverture
  function setMenu(open) {
    if (open === root.classList.contains("menu-open")) return;
    root.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    menu.setAttribute("aria-hidden", String(!open));
    document.body.style.overflow = open ? "hidden" : "";
    if (onMenuToggle) onMenuToggle(open);
  }
  burger.addEventListener("click", function () { setMenu(!root.classList.contains("menu-open")); });
  menu.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

  /* ---------- Comparateur avant / après ---------- */
  var slider = document.querySelector(".slider");
  var range = slider && slider.querySelector(".slider__range");
  function setPos(v) { slider.style.setProperty("--pos", v + "%"); }
  if (range) range.addEventListener("input", function () { setPos(range.value); });

  /* ---------- Navigation : fond au défilement ---------- */
  var nav = document.querySelector(".nav");
  function onScroll() { nav.classList.toggle("is-scrolled", window.scrollY > 40); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Sans GSAP ou avec « réduire les animations » : site statique, tout est visible.
  if (!hasGsap || reduceMotion) {
    if (loader) loader.remove();
    return;
  }

  gsap.registerPlugin(ScrollTrigger, SplitText);
  // La construction commence toujours en haut de la page (sans défilement animé)
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  function jumpTo(y) { root.style.scrollBehavior = "auto"; window.scrollTo(0, y); }
  jumpTo(0);

  var COLORS = ["#86e3d8", "#f6a6c8", "#ffc49b", "#a8c5ff", "#d2f59e", "#f3f1ee", "#ff8a80", "#c9a8ff"];
  var ARROW = '<svg viewBox="0 0 16 16"><path d="M15.5 8 L1 1 L4.6 8 L1 15 Z"/></svg>';
  var KEYS = "azertyuiopqsdfghjklmwxcvbn";

  function mk(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }
  function rectOf(el) {
    var b = el.getBoundingClientRect();
    return { x: b.left + window.scrollX, y: b.top + window.scrollY, w: b.width, h: b.height };
  }
  function inView(r, margin) { return r.y + r.h > window.scrollY - margin && r.y < window.scrollY + window.innerHeight + margin; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pickOne(list) { return list[Math.floor(Math.random() * list.length)]; }
  function pickWeighted(pairs) {
    var sum = 0; pairs.forEach(function (p) { sum += p[1]; });
    var r = Math.random() * sum;
    for (var i = 0; i < pairs.length; i++) { r -= pairs[i][1]; if (r <= 0) return pairs[i][0]; }
    return pairs[0][0];
  }
  function pause(s) { return gsap.to({}, { duration: s }); }
  function hasOwnTransform(el) { return getComputedStyle(el).transform !== "none"; }
  function clippedAncestor(el) {
    for (var p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      var o = getComputedStyle(p).overflow;
      if (o.indexOf("hidden") > -1 || o.indexOf("clip") > -1) return true;
    }
    return false;
  }

  /* =========================================================
     Effets de défilement classiques
     ========================================================= */
  function scrollEffects() {
    gsap.to(".progress", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });

    // Bandeau d'outils infini, accéléré par la vitesse de défilement
    var track = document.querySelector(".marquee__track");
    var row = track.querySelector(".marquee__row");
    var clone = row.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    track.appendChild(clone);
    var loop = gsap.to(track, { xPercent: -50, ease: "none", duration: 30, repeat: -1 });
    loop.totalTime(loop.duration() * 100);
    ScrollTrigger.create({
      trigger: ".marquee", start: "top bottom", end: "bottom top",
      onUpdate: function (self) {
        var boost = 1 + Math.min(Math.abs(self.getVelocity()) / 250, 6);
        gsap.to(loop, { timeScale: self.direction * boost, duration: 0.15, overwrite: true });
        gsap.to(loop, { timeScale: self.direction, duration: 1.2, delay: 0.15, ease: "power2.out" });
      }
    });

    // Frise du parcours : la ligne rouge se dessine
    gsap.to(".timeline__line span", {
      scaleY: 1, ease: "none",
      scrollTrigger: { trigger: ".timeline", start: "top 70%", end: "bottom 60%", scrub: true }
    });

    // Lien actif dans le menu
    document.querySelectorAll(".nav__links a").forEach(function (a) {
      var section = document.querySelector(a.getAttribute("href"));
      if (!section) return;
      ScrollTrigger.create({
        trigger: section, start: "top 50%", end: "bottom 50%",
        onToggle: function (self) { a.classList.toggle("is-active", self.isActive); }
      });
    });
  }

  function sweepSlider() {
    var o = { v: 88 };
    gsap.to(o, {
      keyframes: [{ v: 18, duration: 1.1 }, { v: 50, duration: 0.9 }], ease: "power3.inOut", delay: 0.2,
      onUpdate: function () { setPos(o.v); range.value = o.v; }
    });
  }

  /* =========================================================
     1. Analyse de la page : deux nuées de flèches qui tournent
     ========================================================= */
  function createSwarm(canvas, count) {
    var ctx = canvas.getContext("2d");
    var flocks = [{ a: 0, r: 120, s: 0.02 }, { a: Math.PI, r: 120, s: 0.02 }];
    var pts = [];
    for (var i = 0; i < count; i++) {
      var f = flocks[i % 2];
      pts.push({ f: f, off: rand(-0.45, 0.45), dr: rand(-28, 28), wob: rand(0, 6.28), c: COLORS[i % COLORS.length], x: 0, y: 0, ang: 0 });
    }
    var w = 0, h = 0, raf = 0, running = true;
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function arrow(p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang);
      ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-6, -6); ctx.lineTo(-2.5, 0); ctx.lineTo(-6, 6); ctx.closePath();
      ctx.fillStyle = p.c; ctx.globalAlpha = 0.95; ctx.fill(); ctx.restore();
    }
    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      var cx = w / 2, cy = h / 2;
      flocks.forEach(function (f) { f.a += f.s; });
      pts.forEach(function (p) {
        p.wob += 0.05;
        var a = p.f.a + p.off, r = p.f.r + p.dr + Math.sin(p.wob) * 8;
        var nx = cx + Math.cos(a) * r * 1.25, ny = cy + Math.sin(a) * r * 0.7;
        p.ang = Math.atan2(ny - p.y, nx - p.x);
        p.x = nx; p.y = ny;
        arrow(p);
      });
      raf = requestAnimationFrame(frame);
    }
    resize(); window.addEventListener("resize", resize);
    raf = requestAnimationFrame(frame);
    return {
      positions: function () { return pts.map(function (p) { return { x: p.x, y: p.y, rot: p.ang * 180 / Math.PI, c: p.c }; }); },
      stop: function () { running = false; cancelAnimationFrame(raf); ctx.clearRect(0, 0, w, h); window.removeEventListener("resize", resize); }
    };
  }

  /* =========================================================
     2. Le chantier : agents, cadres, repères, règles
     ========================================================= */
  var overlay = mk("div", "build");
  overlay.setAttribute("aria-hidden", "true");
  document.body.appendChild(overlay);
  var rulers = [mk("div", "ruler ruler--top"), mk("div", "ruler ruler--left")];
  rulers.forEach(function (r) { document.body.appendChild(r); });

  var layers = Array.prototype.map.call(document.querySelectorAll("[data-b]"), function (el, i) {
    var order = i;
    if (el.closest(".nav")) order += 1000;                 // la navigation est posée en dernier
    if (el.matches(".hero__word")) order += 14;            // le grand mot arrive après les textes
    return { el: el, type: el.getAttribute("data-b"), i: order, state: "pending" };
  });
  var byEl = new Map(layers.map(function (L) { return [L.el, L]; }));
  var heroLayers = layers.filter(function (L) { return L.el.closest(".hero, .nav"); });
  layers.forEach(function (L) { L.el.classList.add("L"); });

  var total = layers.length, doneCount = 0;
  var queue = [], agents = [], MAX_AGENTS = 30, START_AGENTS = 18;
  var heroDone = false, finished = false, skipped = false;
  var startTime = 0, nextStart = 0, redGuide = null, lastVariant = "";

  /* ---------- Agents ---------- */
  var anchors = [0, 1, 2, 3].map(function () { return { x: 0, y: 0 }; });
  function moveAnchors() {
    anchors.forEach(function (an) {
      an.x = window.scrollX + rand(80, window.innerWidth - 80);
      an.y = window.scrollY + rand(110, window.innerHeight - 160);
    });
  }
  setInterval(moveAnchors, 2600);

  function spawnAgent(x, y, color, rot) {
    var a = { el: mk("div", "agent"), x: x, y: y, rot: rot || 0, busy: false, tw: null, g: agents.length % 4 };
    a.el.innerHTML = ARROW;
    a.el.style.setProperty("--c", color || COLORS[agents.length % COLORS.length]);
    a.set = function () { a.el.style.transform = "translate(" + a.x + "px," + a.y + "px) rotate(" + a.rot + "deg)"; };
    a.step = function (nx, ny) {
      var dx = nx - a.x, dy = ny - a.y;
      if (dx * dx + dy * dy > 0.4) {
        var t = Math.atan2(dy, dx) * 180 / Math.PI;
        a.rot += (((t - a.rot + 540) % 360) - 180) * 0.3;
      }
      a.x = nx; a.y = ny; a.set();
    };
    overlay.appendChild(a.el);
    a.set();
    agents.push(a);
    return a;
  }
  function spawnFromEdge() {
    var side = Math.floor(rand(0, 4));
    var x = window.scrollX + (side === 1 ? window.innerWidth + 20 : side === 3 ? -20 : rand(0, window.innerWidth));
    var y = window.scrollY + (side === 0 ? -20 : side === 2 ? window.innerHeight + 20 : rand(0, window.innerHeight));
    return spawnAgent(x, y);
  }
  function freeAgent(allowRing) {
    for (var k = 0; k < agents.length; k++) {
      var a = agents[k];
      if (a.busy || (a.ring && !allowRing)) continue;
      a.ring = false; a.orbit = false;          // un agent du cercle final peut venir aider (menu)
      return a;
    }
    return null;
  }
  // Trajet courbe (comme une vraie main sur une souris)
  function moveAgent(a, x, y, dur, ease) {
    if (a.tw) a.tw.kill();
    var x0 = a.x, y0 = a.y, dx = x - x0, dy = y - y0, dist = Math.sqrt(dx * dx + dy * dy);
    var bend = dist > 80 ? rand(-0.25, 0.25) * dist : 0;
    var cx = x0 + dx / 2 - (dy / (dist || 1)) * bend, cy = y0 + dy / 2 + (dx / (dist || 1)) * bend;
    var p = { t: 0 };
    a.tw = gsap.to(p, {
      t: 1, duration: dur, ease: ease || "power2.inOut",
      onUpdate: function () {
        var t = p.t, u = 1 - t;
        a.step(u * u * x0 + 2 * u * t * cx + t * t * x, u * u * y0 + 2 * u * t * cy + t * t * y);
      }
    });
    return a.tw;
  }
  function wander(a) {
    if (a.busy || a.ring || skipped) return;
    var an = anchors[a.g];
    moveAgent(a, an.x + rand(-90, 90), an.y + rand(-70, 70), rand(1.6, 3), "sine.inOut")
      .eventCallback("onComplete", function () { wander(a); });
  }
  // Un deuxième agent vient aider sur les grands blocs
  function assist(r) {
    var h = freeAgent();
    if (!h) return;
    h.busy = true;
    moveAgent(h, r.x + rand(0.1, 0.9) * r.w, r.y + r.h, rand(0.5, 0.7))
      .eventCallback("onComplete", function () {
        moveAgent(h, r.x + rand(0, 1) * r.w, r.y + rand(0, 1) * r.h, 0.6, "sine.inOut")
          .eventCallback("onComplete", function () { release(h); });
      });
  }

  /* ---------- Repères, guides, cadres, sélections, touches ---------- */
  function marker(x, y, life) {
    var m = mk("div", "mk");
    overlay.appendChild(m);
    gsap.set(m, { x: x, y: y });
    gsap.fromTo(m, { scale: 0, rotation: -90 }, { scale: 1, rotation: 0, duration: 0.25 });
    gsap.to(m, { opacity: 0, duration: 0.4, delay: life || 1, onComplete: function () { m.remove(); } });
  }
  function guideH(y, life, cls) {
    var g = mk("div", "gl" + (cls ? " " + cls : ""));
    g.style.top = y + "px";
    overlay.appendChild(g);
    gsap.fromTo(g, { scaleX: 0, transformOrigin: Math.random() < 0.5 ? "left" : "right" }, { scaleX: 1, duration: 0.5, ease: "power2.out" });
    gsap.to(g, { opacity: 0, duration: 0.5, delay: life || 1, onComplete: function () { g.remove(); } });
  }
  function guideV(x, y1, y2, cls, life) {
    var g = mk("div", "gl gl--v" + (cls ? " " + cls : ""));
    g.style.left = x + "px"; g.style.top = y1 + "px"; g.style.height = (y2 - y1) + "px";
    overlay.appendChild(g);
    gsap.fromTo(g, { scaleY: 0, transformOrigin: "top" }, { scaleY: 1, duration: 0.6, ease: "power2.out" });
    if (life) gsap.to(g, { opacity: 0, duration: 0.5, delay: life, onComplete: function () { g.remove(); } });
    return g;
  }
  function wireframe(r, red) {
    var w = mk("div", "wf" + (red ? " wf--red" : ""));
    w.innerHTML = '<i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i><span class="wf__size">' +
      Math.round(r.w) + " × " + Math.round(r.h) + "</span>";
    w.style.left = r.x + "px"; w.style.top = r.y + "px"; w.style.width = r.w + "px"; w.style.height = r.h + "px";
    overlay.appendChild(w);
    return w;
  }
  function fadeOut(node, delay) {
    gsap.to(node, { opacity: 0, duration: 0.3, delay: delay || 0.1, onComplete: function () { node.remove(); } });
  }
  function selRect(r, life) {
    var s = mk("div", "sel");
    s.style.left = r.x + "px"; s.style.top = r.y + "px"; s.style.width = r.w + "px"; s.style.height = r.h + "px";
    overlay.appendChild(s);
    gsap.fromTo(s, { opacity: 0 }, { opacity: 1, duration: 0.12 });
    fadeOut(s, life || 0.6);
  }
  function badge(a, text) {
    var b = mk("div", "kbd");
    b.textContent = text;
    overlay.appendChild(b);
    gsap.set(b, { x: a.x + 12, y: a.y + 12 });
    gsap.fromTo(b, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.18, ease: "back.out(2)" });
    fadeOut(b, 0.75);
  }
  var rulerTimer = 0;
  function setRulers(on) {
    clearTimeout(rulerTimer);
    if (on) rulers.forEach(function (r) { r.classList.add("on"); });
    else rulerTimer = setTimeout(function () { rulers.forEach(function (r) { r.classList.remove("on"); }); }, 700);
  }

  /* =========================================================
     Les différentes façons de construire un élément
     ========================================================= */

  // ----- Texte : frappe au clavier, avec variantes -----
  //  "type"    lettre par lettre, rythme irrégulier
  //  "typo"    fautes de frappe soulignées en rouge, puis effacées et corrigées
  //  "rewrite" texte provisoire (« Lorem ipsum »…) tapé, sélectionné, supprimé, puis le vrai texte
  //  "paste"   tout le texte collé d'un coup (Ctrl V) et sélectionné
  //  "words"   mot par mot
  function wrongLetters(chars, k) {
    var next = "";
    for (var j = k + 1; j < Math.min(chars.length, k + 4); j++) next += chars[j].textContent;
    var letters = next.replace(/[^A-Za-zÀ-ÿ]/g, "");
    if (letters.length >= 2 && Math.random() < 0.55) return letters[1] + letters[0] + (letters[2] || "");
    var out = "", m = Math.floor(rand(2, 5));
    for (var q = 0; q < m; q++) out += KEYS[Math.floor(Math.random() * KEYS.length)];
    return out;
  }

  function typeText(L, a, mode) {
    var el = L.el;
    var split = SplitText.create(el, { type: "words,chars" });
    L.split = split;
    var chars = split.chars, n = Math.max(chars.length, 1);
    gsap.set(chars, { opacity: 0 });
    el.classList.remove("L");
    var caret = mk("div", "caret");
    overlay.appendChild(caret);
    L.caret = caret;
    if (a.tw) a.tw.kill();

    function placeRect(b) {
      var x = b.right + window.scrollX + 1, y = b.top + window.scrollY, h = b.height || 16;
      caret.style.transform = "translate(" + x + "px," + y + "px)";
      caret.style.height = h + "px";
      a.step(x + 9, y + h + 7);
    }
    function place(node) { placeRect(node.getBoundingClientRect()); }
    function placeAfter(node, fallback) {
      var b = node.getBoundingClientRect();
      if (!b.width && fallback) b = fallback.getBoundingClientRect();
      placeRect(b);
    }

    var tl = gsap.timeline({ onComplete: function () { caret.remove(); L.caret = null; if (L.split) { L.split.revert(); L.split = null; } } });
    var t = 0;
    var each = Math.min(0.045, 1.4 / n);

    if (mode === "paste") {
      tl.call(function () { badge(a, "Ctrl V"); }, null, 0.05);
      tl.set(chars, { opacity: 1 }, 0.3);
      tl.call(function () { place(chars[n - 1]); selRect(rectOf(el), 0.6); }, null, 0.3);
      tl.to({}, { duration: 0.9 }, 0.3);
      return tl;
    }

    if (mode === "words") {
      var words = split.words, gap = Math.min(0.16, 1.8 / Math.max(words.length, 1));
      words.forEach(function (w) {
        t += gap * rand(0.7, 1.4);
        var cs = Array.prototype.slice.call(w.children);
        tl.set(cs.length ? cs : w, { opacity: 1 }, t);
        tl.call(place, [cs[cs.length - 1] || w], t);
      });
      tl.to({}, { duration: 0.25 }, t);
      return tl;
    }

    if (mode === "rewrite") {
      // Texte provisoire tapé puis effacé
      var ghost = mk("span", "ghost");
      var draft = pickOne(["Lorem ipsum", "Texte ici…", "Titre", "À compléter"]);
      tl.call(function () { chars[0].parentNode.insertBefore(ghost, chars[0]); }, null, 0);
      for (var g = 0; g < draft.length; g++) {
        t += 0.06 * rand(0.7, 1.4);
        tl.call(function (s) { ghost.textContent = s; placeAfter(ghost, chars[0]); }, [draft.slice(0, g + 1)], t);
      }
      t += 0.4;
      tl.call(function () { selRect(rectOf(ghost), 0.35); badge(a, "Suppr"); }, null, t);
      t += 0.45;
      tl.call(function () { ghost.remove(); placeRect(chars[0].getBoundingClientRect()); }, null, t);
      t += 0.2;
    }

    // Fautes de frappe : 1 ou 2 endroits où l'agent se trompe puis corrige
    var typos = {};
    if (mode === "typo" && n > 6) {
      var count = n > 80 ? 2 : 1;
      for (var c = 0, tries = 0; c < count && tries < 20; tries++) {
        var k = Math.floor(rand(2, Math.min(n - 3, 70)));
        if (!typos[k] && /[A-Za-zÀ-ÿ]/.test(chars[k].textContent)) { typos[k] = wrongLetters(chars, k); c++; }
      }
    }

    for (var i = 0; i < n; i++) {
      t += each * rand(0.6, 1.5);
      tl.set(chars[i], { opacity: 1 }, t);
      tl.call(place, [chars[i]], t);
      if (typos[i]) t = addTypo(tl, t, chars[i], typos[i]);
    }
    tl.to({}, { duration: 0.25 }, t);
    return tl;

    function addTypo(tl, t, after, wrong) {
      var bad = mk("span", "typo");
      tl.call(function () { after.parentNode.insertBefore(bad, after.nextSibling); }, null, t);
      for (var j = 0; j < wrong.length; j++) {
        t += 0.07 * rand(0.8, 1.3);
        tl.call(function (s) { bad.textContent = s; placeAfter(bad, after); }, [wrong.slice(0, j + 1)], t);
      }
      t += 0.2;
      tl.call(function () { bad.classList.add("typo--bad"); }, null, t);
      t += 0.4;
      if (Math.random() < 0.65) {
        // effacée lettre par lettre
        tl.call(function () { badge(a, "⌫"); }, null, t);
        for (var d = wrong.length - 1; d >= 0; d--) {
          t += 0.06;
          tl.call(function (s) { bad.textContent = s; placeAfter(bad, after); }, [wrong.slice(0, d)], t);
        }
      } else {
        // sélectionnée puis supprimée d'un coup
        tl.call(function () { selRect(rectOf(bad), 0.3); badge(a, "Suppr"); }, null, t);
        t += 0.35;
        tl.call(function () { bad.textContent = ""; placeAfter(bad, after); }, null, t);
      }
      t += 0.12;
      tl.call(function () { bad.remove(); }, null, t);
      return t;
    }
  }

  // ----- Image -----
  //  "ph"   bloc gris-bleu avec icône, puis la photo apparaît dedans
  //  "scan" la photo se révèle de haut en bas derrière une ligne de scan
  //  "drag" l'image est glissée depuis le bord de l'écran et déposée
  function revealImage(L, a, mode, r) {
    var el = L.el;
    if (mode === "scan") {
      var cover = mk("div", "cover");
      cover.style.left = r.x + "px"; cover.style.top = r.y + "px"; cover.style.width = r.w + "px"; cover.style.height = r.h + "px";
      var line = mk("div", "scanline");
      line.style.left = r.x + "px"; line.style.top = r.y + "px"; line.style.width = r.w + "px";
      overlay.appendChild(cover); overlay.appendChild(line);
      if (a.tw) a.tw.kill();
      var o = { p: 0 };
      var tl = gsap.timeline({ onComplete: function () { cover.remove(); line.remove(); } });
      tl.from(cover, { opacity: 0, duration: 0.25 });
      tl.add(function () { el.classList.remove("L"); });   // la photo n'apparaît que sous le cache
      tl.to(o, {
        p: 1, duration: 1.3, ease: "power1.inOut", delay: 0.35,
        onUpdate: function () {
          cover.style.clipPath = "inset(" + (o.p * 100) + "% 0 0 0)";
          var y = r.y + o.p * r.h;
          line.style.transform = "translateY(" + (o.p * r.h) + "px)";
          a.step(r.x + r.w * (0.5 + 0.4 * Math.sin(o.p * 9)), y + 6);
        }
      });
      tl.to(line, { opacity: 0, duration: 0.25 });
      return tl;
    }

    if (mode === "drag") {
      el.classList.remove("L");
      L.moved = true;
      var fromLeft = Math.random() < 0.5;
      var vx = window.scrollX + (fromLeft ? -40 : window.innerWidth + 40);
      var vy = window.scrollY + rand(0.25, 0.75) * window.innerHeight;
      var cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      gsap.set(el, { x: vx - cx, y: vy - cy, scale: 0.3, rotation: rand(-12, 12), opacity: 0.9, transformOrigin: "50% 50%" });
      var tl2 = gsap.timeline({ onComplete: function () { gsap.set(el, { clearProps: "transform,opacity" }); L.moved = false; } });
      // (les trajets de l'agent sont lancés au bon moment, depuis sa position réelle)
      tl2.add(function () { moveAgent(a, vx, vy, 0.6); }, 0);
      tl2.add(function () { badge(a, "Glisser"); moveAgent(a, cx + rand(-20, 20), cy + rand(-20, 20), 1, "power3.inOut"); }, 0.6);
      tl2.to(el, { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, duration: 1, ease: "power3.inOut" }, 0.6);
      tl2.to(el, { scale: 1.025, duration: 0.12, yoyo: true, repeat: 1 }, 1.6);
      tl2.add(function () { marker(r.x, r.y, 0.6); marker(r.x + r.w, r.y + r.h, 0.6); }, 1.85);
      return tl2;
    }

    el.classList.add("ph");
    el.classList.remove("L");
    var kids = Array.prototype.filter.call(el.children, function (k) { return k.tagName !== "INPUT"; });
    var tl3 = gsap.timeline({
      onComplete: function () { el.classList.remove("ph-out"); gsap.set(kids, { clearProps: "opacity" }); gsap.set(el, { clearProps: "opacity" }); }
    });
    tl3.from(el, { opacity: 0, duration: 0.3 });
    tl3.to(kids, { opacity: 1, duration: 0.9, ease: "power1.out", stagger: 0.04 }, "+=0.5");
    tl3.add(function () { el.classList.add("ph-out"); el.classList.remove("ph"); });
    tl3.to({}, { duration: 0.6 });
    return tl3;
  }

  // ----- Bloc -----
  function revealBlock(L, mode) {
    var el = L.el;
    el.classList.remove("L");
    var full = "inset(0% 0% 0% 0%)";
    if (mode === "wipeV") return gsap.fromTo(el, { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: full, duration: 0.65, ease: "power2.inOut", clearProps: "clipPath" });
    if (mode === "corner") return gsap.fromTo(el, { clipPath: "inset(0% 100% 100% 0%)" }, { clipPath: full, duration: 0.75, ease: "power2.inOut", clearProps: "clipPath" });
    if (mode === "center") return gsap.fromTo(el, { clipPath: "inset(50% 50% 50% 50%)" }, { clipPath: full, duration: 0.7, ease: "power3.out", clearProps: "clipPath" });
    if (mode === "drop") return gsap.fromTo(el, { y: -70, opacity: 0 }, { y: 0, opacity: 1, duration: 0.85, ease: "bounce.out", clearProps: "transform,opacity" });
    if (mode === "pop") return gsap.fromTo(el, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.75, ease: "back.out(2.2)", clearProps: "transform,opacity" });
    return gsap.fromTo(el, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: full, duration: 0.6, ease: "power2.inOut", clearProps: "clipPath" });
  }

  // ----- Grand mot rouge : lettres posées une par une, dans le désordre -----
  function revealWord(L) {
    var span = L.el.querySelector("span");
    var split = SplitText.create(span, { type: "chars", tag: "span", charsClass: "char" });
    L.split = split;
    span.classList.add("is-split");
    gsap.set(split.chars, { opacity: 0 });
    L.el.classList.remove("L");
    var order = split.chars.slice().sort(function () { return Math.random() - 0.5; });
    var tl = gsap.timeline({
      onComplete: function () { if (L.split) { L.split.revert(); L.split = null; } span.classList.remove("is-split"); }
    });
    order.forEach(function (c, k) {
      var at = k * 0.16;
      tl.add(function () {
        var r = rectOf(c), w = wireframe(r, true);
        w.querySelector(".wf__size").remove();
        fadeOut(w, 0.35);
      }, at);
      tl.fromTo(c, { opacity: 0, yPercent: pickOne([14, -14, 0]), scale: pickOne([1.12, 0.85]) },
        { opacity: 1, yPercent: 0, scale: 1, duration: 0.5, ease: "power3.out" }, at);
    });
    return tl;
  }

  /* ---------- Choix d'une façon de construire (jamais deux fois de suite la même) ---------- */
  // Éléments « de la même famille » placés avant lui dans une liste (le plus proche d'abord)
  function cls(el) { return el.className.replace(/\bL\b|is-active/g, "").trim(); }
  function prevSameKind(L) {
    var out = [];
    if (L.el.querySelector("[data-b]")) return out;
    for (var p = L.el.previousElementSibling; p; p = p.previousElementSibling) {
      var S = byEl.get(p);
      if (S && S.type === L.type && p.tagName === L.el.tagName && cls(p) === cls(L.el) && !p.querySelector("[data-b]")) out.push(S);
    }
    return out;
  }
  // Copie possible depuis n'importe quel élément déjà terminé de la liste (pas seulement le précédent)
  function copySource(L) {
    var sibs = prevSameKind(L);
    for (var k = 0; k < sibs.length; k++) {
      if (sibs[k].state === "done" && inView(rectOf(sibs[k].el), 0)) return sibs[k].el;
    }
    return null;
  }
  // Un élément qui veut copier attend seulement qu'UN élément de sa liste soit fini :
  // ensuite toutes les copies se font en même temps (plus de longue file d'attente)
  function waitsForSource(L) {
    if (L.wantCopy === undefined) L.wantCopy = prevSameKind(L).length > 0 && Math.random() < 0.35;
    if (!L.wantCopy) return false;
    var sibs = prevSameKind(L);
    if (sibs.some(function (S) { return S.state === "done"; })) return false;
    return sibs.some(function (S) { return S.state === "queued" || S.state === "building"; });
  }
  function chooseVariant(L, src) {
    if (L.type === "w") return "word";
    if (src && (L.wantCopy || Math.random() < 0.2)) return "copy";
    var v, el = L.el, n = el.textContent.trim().length;
    for (var tries = 0; tries < 3; tries++) {
      if (L.type === "t") {
        // grands titres : souvent tapés en petit puis agrandis
        var big = parseFloat(getComputedStyle(el).fontSize) >= 36 && !hasOwnTransform(el);
        v = pickWeighted([["type", 4], ["typo", n > 6 ? 3 : 0], ["rewrite", n < 70 ? 1.6 : 0], ["paste", 1.2], ["words", n > 40 ? 1.6 : 0], ["grow", big ? 6 : 0]]);
      } else if (L.type === "i") {
        v = pickWeighted([["ph", 3], ["scan", 3], ["drag", hasOwnTransform(el) || clippedAncestor(el) ? 0 : 3]]);
      } else {
        var movable = !hasOwnTransform(el);
        v = pickWeighted([["wipe", 3], ["wipeV", 2], ["corner", 2], ["center", 1.5], ["drop", movable ? 2 : 0], ["pop", movable ? 1.5 : 0]]);
      }
      if (v !== lastVariant) break;
    }
    lastVariant = v;
    return v;
  }

  /* ---------- Construction d'un élément ---------- */
  async function run(L, anim) { L.cur = anim; await anim; return !skipped && !L.abort; }

  async function buildLayer(L, a) {
    L.state = "building";
    var r = rectOf(L.el);
    if (skipped || r.w < 2 || r.h < 2) { instant(L); release(a); return; }
    // Passé trop vite (défilement rapide, clic dans le menu) : il attendra qu'on revienne le regarder
    if (!inView(r, 60)) { backToPending(L); release(a); return; }
    var src = copySource(L);
    var variant = chooseVariant(L, src);
    if (variant === "copy") await buildByCopy(L, a, src);
    else await buildStandard(L, a, r, variant);
    if (skipped || L.abort) instant(L); else finish(L);
    release(a);
  }

  async function buildStandard(L, a, r, variant) {
    var el = L.el;
    // « grow » : le texte est d'abord tapé en petit, puis agrandi à sa vraie taille
    var grow = variant === "grow";
    var s = grow ? rand(0.32, 0.45) : 1;
    var fw = r.w * s, fh = r.h * s;
    // 1. l'agent part d'un coin (ou du centre) et trace le cadre jusqu'au coin opposé
    var origin = grow ? [0, 0] : pickOne([[0, 0], [0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0.5]]);
    var ox = origin[0], oy = origin[1];
    if (!await run(L, moveAgent(a, r.x + ox * fw + rand(-4, 4), r.y + oy * fh + rand(-4, 4), rand(0.55, 0.85)))) return;
    marker(r.x + ox * fw, r.y + oy * fh);
    if (Math.random() < 0.3) guideH(r.y + r.h);
    if (Math.random() < 0.2) guideV(r.x, r.y - 40, r.y + r.h + 40, "", 0.9);
    var red = L.type === "w" || (L.type === "b" && Math.random() < 0.35);
    var wf = wireframe(r, red);
    if (grow) wf.querySelector(".wf__size").textContent = Math.round(fw) + " × " + Math.round(fh);
    gsap.set(wf, { left: r.x + ox * fw, top: r.y + oy * fh, width: 0, height: 0 });
    if (r.w * r.h > 120000 && !grow) assist(r);
    var tx = ox === 0.5 ? 1 : 1 - ox, ty = oy === 0.5 ? 1 : 1 - oy;
    var draw = gsap.timeline();
    draw.to(wf, { left: r.x, top: r.y, width: fw, height: fh, duration: 0.5, ease: "power2.out" });
    draw.add(moveAgent(a, r.x + tx * fw, r.y + ty * fh, 0.5, "power2.out"), 0);
    draw.add(function () { marker(r.x + tx * fw, r.y + ty * fh); });
    if (!await run(L, draw)) { wf.remove(); return; }
    if (grow) { L.moved = true; gsap.set(el, { scale: s, transformOrigin: "0% 0%" }); }

    // 2. parfois l'élément arrive un peu de travers, puis il est réaligné
    var nudge = (L.type === "b" ? variant !== "drop" && variant !== "pop" : L.type === "i" && variant === "ph") &&
      !hasOwnTransform(el) && Math.random() < 0.22;
    var ndx = 0, ndy = 0;
    if (nudge) {
      ndx = pickOne([-1, 1]) * rand(18, 38); ndy = pickOne([-1, 1]) * rand(10, 26);
      L.moved = true;
      gsap.set(el, { x: ndx, y: ndy });
    }

    // 3. le contenu apparaît
    var anim = L.type === "t" ? typeText(L, a, grow ? "type" : variant)
      : L.type === "i" ? revealImage(L, a, variant, r)
      : L.type === "w" ? revealWord(L)
      : revealBlock(L, variant);
    if (!await run(L, anim)) { wf.remove(); return; }

    // 4. agrandissement : l'agent attrape la poignée en bas à droite et étire le texte
    if (grow) {
      if (!await run(L, moveAgent(a, r.x + fw, r.y + fh, 0.35))) { wf.remove(); return; }
      if (a.tw) a.tw.kill();
      var fs = parseFloat(getComputedStyle(el).fontSize);
      var chip = mk("div", "kbd");
      overlay.appendChild(chip);
      var sizeTag = wf.querySelector(".wf__size");
      var o = { k: s };
      var stretch = gsap.to(o, {
        k: 1, duration: 1.1, ease: "power3.inOut",
        onUpdate: function () {
          gsap.set(el, { scale: o.k });
          var w = r.w * o.k, h = r.h * o.k;
          wf.style.width = w + "px"; wf.style.height = h + "px";
          if (sizeTag) sizeTag.textContent = Math.round(w) + " × " + Math.round(h);
          a.step(r.x + w, r.y + h);
          chip.textContent = "Taille " + Math.round(fs * o.k) + " px";
          gsap.set(chip, { x: r.x + w + 12, y: r.y + h + 12 });
        }
      });
      if (!await run(L, stretch)) { chip.remove(); wf.remove(); return; }
      fadeOut(chip, 0.5);
      gsap.set(el, { clearProps: "transform" });
      L.moved = false;
    }

    if (nudge) {
      if (!await run(L, moveAgent(a, r.x + r.w / 2 + ndx, r.y + r.h / 2 + ndy, 0.45))) { wf.remove(); return; }
      badge(a, "Déplacer");
      var back = gsap.timeline();
      back.to(el, { x: 0, y: 0, duration: 0.55, ease: "power3.out" });
      back.add(moveAgent(a, r.x + r.w / 2, r.y + r.h / 2, 0.55, "power3.out"), 0);
      if (!await run(L, back)) { wf.remove(); return; }
      gsap.set(el, { clearProps: "transform" });
      L.moved = false;
      // guides d'alignement roses (comme dans un logiciel de design)
      guideV(r.x, r.y - 60, r.y + r.h + 60, "gl--snap", 0.5);
      guideH(r.y, 0.5, "gl--snap");
    }
    fadeOut(wf, 0.15);
  }

  // Copier-coller : l'agent copie l'élément précédent, le colle, puis remplace le texte
  async function buildByCopy(L, a, src) {
    var el = L.el, rs = rectOf(src);
    if (!await run(L, moveAgent(a, rs.x + rs.w * rand(0.3, 0.7), rs.y + rs.h * 0.5, rand(0.45, 0.65)))) return;
    selRect(rs, 0.45);
    badge(a, "Ctrl C");
    if (!await run(L, pause(0.3))) return;

    L.orig = el.innerHTML;
    el.innerHTML = src.innerHTML;
    el.classList.remove("L");
    var rd = rectOf(el);
    L.moved = true;
    gsap.set(el, { x: rs.x - rd.x, y: rs.y - rd.y, opacity: 0.55 });
    var drag = gsap.timeline();
    drag.to(el, { x: 0, y: 0, opacity: 1, duration: 0.55, ease: "power3.inOut" });
    drag.add(moveAgent(a, rd.x + rd.w * 0.5, rd.y + rd.h * 0.5, 0.55, "power3.inOut"), 0);
    if (!await run(L, drag)) return;
    gsap.set(el, { clearProps: "transform,opacity" });
    L.moved = false;
    badge(a, "Ctrl V");
    var wf = wireframe(rd, false);
    if (!await run(L, pause(0.2))) { wf.remove(); return; }

    // le texte copié est sélectionné, effacé, et le bon texte est tapé
    selRect(rd, 0.25);
    if (!await run(L, pause(0.25))) { wf.remove(); return; }
    el.innerHTML = L.orig;
    L.orig = null;
    if (!await run(L, typeText(L, a, Math.random() < 0.2 ? "typo" : "type"))) { wf.remove(); return; }
    fadeOut(wf, 0.15);
  }

  function instant(L) {
    if (L.split) { L.split.revert(); L.split = null; }
    if (L.caret) { L.caret.remove(); L.caret = null; }
    if (L.orig != null) { L.el.innerHTML = L.orig; L.orig = null; }
    if (L.moved) { gsap.set(L.el, { clearProps: "transform,opacity" }); L.moved = false; }
    gsap.set(L.el, { clearProps: "clipPath" });
    L.el.classList.remove("L", "ph");
    finish(L);
  }

  function finish(L) {
    if (L.state === "done") return;
    L.state = "done";
    L.el.classList.remove("L");
    if (L.menu) return;                       // le menu mobile ne compte pas dans la page
    doneCount++;
    if (L.el === slider && !skipped) sweepSlider();
    if (doneCount >= total) finale();
  }

  // L'élément n'est plus à l'écran : il reste à construire, on le surveille à nouveau
  function backToPending(L) {
    L.state = "pending";
    io.unobserve(L.el);
    io.observe(L.el);
  }

  function release(a) {
    a.busy = false;
    wander(a);
    pump();
  }

  function pump() {
    var now = performance.now();
    while (queue.length) {
      var idx = -1;
      for (var q = 0; q < queue.length; q++) { if (!waitsForSource(queue[q])) { idx = q; break; } }
      if (idx < 0) break;                     // tout ce qui reste attend d'être copié
      // déjà sorti de l'écran avant qu'un agent soit libre : on ne le construit pas maintenant
      var rq = rectOf(queue[idx].el);
      if (!queue[idx].menu && rq.w >= 2 && !inView(rq, 60)) { backToPending(queue.splice(idx, 1)[0]); continue; }
      var a = freeAgent() || freeAgent(true);
      if (!a) {
        if (agents.length < MAX_AGENTS && queue.length > 3) a = spawnFromEdge();
        else break;
      }
      var L = queue.splice(idx, 1)[0];
      a.busy = true;
      var delay = Math.max(0, nextStart - now);
      nextStart = Math.max(now, nextStart) + 120;
      (function (L, a) { gsap.delayedCall(delay / 1000, function () { buildLayer(L, a); }); })(L, a);
    }
    setRulers(queue.length > 0 || agents.some(function (x) { return x.busy; }));
  }

  // Seule la partie que l'on regarde est construite
  var navigating = false;   // vrai pendant le trajet d'un lien du menu : on ne construit rien en passant
  var io = new IntersectionObserver(function (entries) {
    if (navigating) return;
    var added = false;
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var L = byEl.get(e.target);
      io.unobserve(e.target);
      if (L && L.state === "pending") { L.state = "queued"; queue.push(L); added = true; }
    });
    if (added) { queue.sort(function (x, y) { return x.i - y.i; }); pump(); }
  }, { rootMargin: "0px 0px -5% 0px" });

  // Liens internes (menu, boutons, logo) : on glisse jusqu'à la section,
  // et seule la zone d'arrivée est construite
  document.addEventListener("click", function (e) {
    var link = e.target.closest && e.target.closest('a[href^="#"]');
    if (!link || e.defaultPrevented) return;
    var id = link.getAttribute("href");
    var target = id === "#top" ? document.body : id.length > 1 && document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    setMenu(false);
    var top = id === "#top" ? 0 : rectOf(target).y;
    navigating = true;
    if (history.pushState) history.pushState(null, "", id === "#top" ? location.pathname : id);
    window.scrollTo({ top: top, behavior: "smooth" });
    // attendre la fin du glissement, puis regarder ce qui est à l'écran
    var last = -1, still = 0, t0 = performance.now();
    (function check() {
      var y = window.scrollY;
      if (Math.abs(y - last) < 1) still++; else { still = 0; last = y; }
      if (still >= 5 || performance.now() - t0 > 3000) {
        navigating = false;
        layers.forEach(function (L) { if (L.state === "pending") { io.unobserve(L.el); io.observe(L.el); } });
      } else setTimeout(check, 60);
    })();
  });

  /* ---------- Menu mobile : construit par les agents à la première ouverture seulement ---------- */
  var menuEls = Array.prototype.slice.call(menu.querySelectorAll(".menu__links a, .menu__foot > *"));
  var menuLive = [], menuBuilt = false;
  onMenuToggle = function (open) {
    // fermeture : ce qui était en cours est terminé d'un coup
    menuLive.forEach(function (L) {
      L.abort = true;
      var k = queue.indexOf(L);
      if (k > -1) queue.splice(k, 1);
      if (L.cur) L.cur.progress(1);
      if (L.state !== "done") instant(L);
    });
    menuLive = [];
    if (!open || !startTime || menuBuilt) return;   // déjà construit une fois : il reste affiché tel quel
    menuBuilt = true;
    var batch = menuLive = menuEls.map(function (el, k) {
      var L = { el: el, type: "t", i: -100 + k, state: "queued", menu: true, wantCopy: false };
      byEl.set(el, L);
      el.classList.add("L");
      return L;
    });
    // on laisse le panneau s'ouvrir, puis les agents arrivent
    gsap.delayedCall(0.3, function () {
      if (batch !== menuLive) return;
      batch.forEach(function (L) { queue.push(L); });
      queue.sort(function (x, y) { return x.i - y.i; });
      nextStart = 0;
      pump();
    });
  };

  // Le premier écran est terminé dès que les agents n'ont plus rien à faire : la ligne guide rouge s'efface
  gsap.ticker.add(function () {
    if (heroDone || !startTime) return;
    var busy = queue.length > 0 || agents.some(function (x) { return x.busy; });
    if (!busy && performance.now() - startTime > 1200) onHeroDone();
  });

  function onHeroDone() {
    heroDone = true;
    if (redGuide) gsap.to(redGuide, { opacity: 0, duration: 0.6, onComplete: function () { redGuide.remove(); } });
  }

  /* ---------- Fin : les agents tournent autour du bouton « M'envoyer un e-mail » ---------- */
  function finale() {
    if (finished) return;
    finished = true;
    setRulers(false);

    var r = rectOf(document.querySelector(".round-link"));
    // Ovale qui entoure le bouton (assez haut pour ne pas être tout plat)
    var cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    var rx = Math.min(r.w / 2 + 40, cx - window.scrollX - 10, window.scrollX + window.innerWidth - cx - 10);
    rx = Math.max(rx, r.w / 2 + 6);                       // reste dans l'écran sur téléphone
    var ry = Math.max(r.h / 2 + 34, 70);
    agents.forEach(function (a, k) {
      a.ring = true;
      a.ang = k / agents.length * Math.PI * 2;
      moveAgent(a, cx + Math.cos(a.ang) * rx, cy + Math.sin(a.ang) * ry, rand(1.2, 1.9))
        .eventCallback("onComplete", function () { a.orbit = true; });
    });
    gsap.ticker.add(function () {
      agents.forEach(function (a) {
        if (!a.orbit) return;
        a.ang += 0.005;
        a.step(cx + Math.cos(a.ang) * rx, cy + Math.sin(a.ang) * ry);
      });
    });
  }

  /* =========================================================
     3. Démarrage
     ========================================================= */
  scrollEffects();
  gsap.globalTimeline.timeScale(BUILD_SPEED);
  var swarm = createSwarm(document.querySelector(".loader__swarm"), START_AGENTS);
  var t0 = performance.now();
  var pageLoaded = document.readyState === "complete";
  window.addEventListener("load", function () { pageLoaded = true; });

  function waitThenBuild() {
    var elapsed = performance.now() - t0;
    if ((pageLoaded && elapsed > 1500) || elapsed > 6000) document.fonts.ready.then(beginBuild);
    else setTimeout(waitThenBuild, 100);
  }
  waitThenBuild();

  function beginBuild() {
    jumpTo(0);
    startTime = performance.now();
    moveAnchors();

    // Les flèches de l'analyse deviennent les agents
    swarm.positions().forEach(function (p) { spawnAgent(p.x, p.y, p.c, p.rot); });
    swarm.stop();
    gsap.to(loader, { opacity: 0, duration: 0.6, onComplete: function () { loader.remove(); } });
    agents.forEach(function (a, k) { gsap.delayedCall(k * 0.02, function () { if (!a.busy) wander(a); }); });

    // Éléments invisibles (ex. menu mobile sur ordinateur) : rien à construire
    layers.forEach(function (L) {
      var r = L.el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) { L.state = "queued"; instant(L); }
    });

    // Plan de travail : repères « + », règles, ligne guide rouge
    setRulers(true);
    heroLayers.forEach(function (L) {
      if (L.state === "done") return;
      var r = rectOf(L.el);
      marker(r.x, r.y, rand(1.2, 2));
      if (Math.random() < 0.5) marker(r.x + r.w, r.y + r.h, rand(1.2, 2));
    });
    var hl = document.querySelector(".hero__left"), hero = document.querySelector(".hero");
    var hr = rectOf(hero);
    redGuide = guideV(rectOf(hl).x - 1, hr.y, hr.y + hr.h, "gl--red");
    guideH(rectOf(document.querySelector(".hero__name")).y, 1.6);
    guideH(rectOf(document.querySelector(".hero__text")).y, 1.8);

    // Arrivée depuis un ancien lien (#parcours…) : on va directement à la section
    var target = location.hash.length > 1 && document.querySelector(location.hash);
    if (target) jumpTo(rectOf(target).y);
    root.style.scrollBehavior = "";   // le visiteur fait défiler lui-même (liens du menu en douceur)

    layers.forEach(function (L) { if (L.state === "pending") io.observe(L.el); });  }
})();
