/**
 * NOCTIS — Main Scrollytelling Engine & Interactions
 * Vanilla JavaScript, Canvas Frame Scrubbing, Custom Cursor, Lineup Accordion
 */

(function () {
  'use strict';

  const cfg = window.NOCTIS_CONFIG;
  if (!cfg) {
    console.error('NOCTIS configuration not found.');
    return;
  }

  // Feature queries
  const isFinePointer = window.matchMedia('(pointer: fine)').matches;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Global State
  const state = {
    isMobile: window.innerWidth < 768,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    heroLoaded: false,
    heroImages: [],
    heroLoadedFlags: [],
    dismantleImages: [],
    dismantleLoadedFlags: [],
    heroCurrentFrame: 0,
    heroTargetFrame: 0,
    dismantleCurrentFrame: 0,
    dismantleTargetFrame: 0,
    heroProgress: 0,
    dismantleProgress: 0,
    activeLineupIndex: 0,
    lastScrollY: window.scrollY,
    mouseX: window.innerWidth / 2,
    mouseY: window.innerHeight / 2,
    cursorX: window.innerWidth / 2,
    cursorY: window.innerHeight / 2,
    cursorLabel: 'VIEW',
    cursorHovering: false,
    cursorDown: false
  };

  // DOM Elements
  const preloader = document.getElementById('preloader');
  const preloaderLine = document.getElementById('preloader-line');
  const preloaderCounter = document.getElementById('preloader-counter');
  const mainNav = document.getElementById('main-nav');

  const heroWrapper = document.getElementById('hero-wrapper');
  const heroStage = document.getElementById('hero-stage');
  const heroCanvas = document.getElementById('hero-canvas');
  const heroCtx = heroCanvas.getContext('2d');
  const heroProgress = document.getElementById('hero-progress');
  const hudChapter = document.getElementById('hud-chapter');
  const hudSpeed = document.getElementById('hud-speed');
  const hudDistance = document.getElementById('hud-distance');

  const statementSection = document.getElementById('statement-section');
  const statementTextEl = document.getElementById('statement-text');

  const dismantleWrapper = document.getElementById('dismantle-wrapper');
  const dismantleStage = document.getElementById('dismantle-stage');
  const dismantleCanvas = document.getElementById('dismantle-canvas');
  const dismantleCtx = dismantleCanvas.getContext('2d');
  const dismantleProgress = document.getElementById('dismantle-progress');
  const dismantleCalloutsContainer = document.getElementById('dismantle-callouts-container');

  const lineupSection = document.getElementById('lineup');
  const lineupAccordion = document.getElementById('lineup-accordion');

  const cursorContainer = document.getElementById('cursor-container');
  const cursorLabel = document.getElementById('cursor-label');

  // ==========================================================================
  // 1. FILM GRAIN OVERLAY (Fixed 3-4% Opacity, Random Shifting Tile)
  // ==========================================================================
  function initFilmGrain() {
    const grainCanvas = document.getElementById('film-grain');
    if (!grainCanvas) return;
    const ctx = grainCanvas.getContext('2d');
    const tileSize = 256;

    // Offscreen noise tile
    const offscreen = document.createElement('canvas');
    offscreen.width = tileSize;
    offscreen.height = tileSize;
    const offCtx = offscreen.getContext('2d');
    const imgData = offCtx.createImageData(tileSize, tileSize);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
    offCtx.putImageData(imgData, 0, 0);

    function resizeGrain() {
      grainCanvas.width = window.innerWidth;
      grainCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeGrain);
    resizeGrain();

    // Shift tile randomly ~8 times per second (125ms)
    setInterval(() => {
      ctx.clearRect(0, 0, grainCanvas.width, grainCanvas.height);
      const pattern = ctx.createPattern(offscreen, 'repeat');
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.save();
        ctx.translate((Math.random() * tileSize) | 0, (Math.random() * tileSize) | 0);
        ctx.fillRect(-tileSize, -tileSize, grainCanvas.width + tileSize * 2, grainCanvas.height + tileSize * 2);
        ctx.restore();
      }
    }, 125);
  }

  // ==========================================================================
  // 2. CUSTOM HEADLIGHT CURSOR (Desktop Only)
  // ==========================================================================
  function initCursor() {
    if (!isFinePointer || prefersReducedMotion || !cursorContainer) {
      document.body.classList.remove('custom-cursor-enabled');
      if (cursorContainer) cursorContainer.style.display = 'none';
      return;
    }

    window.addEventListener('mousemove', (e) => {
      state.mouseX = e.clientX;
      state.mouseY = e.clientY;
    });

    window.addEventListener('mousedown', () => {
      cursorContainer.classList.add('is-down');
      setTimeout(() => {
        cursorContainer.classList.remove('is-down');
      }, 120);
    });

    // Delegated hover detection for links, buttons, and lineup slides
    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('a, button, [data-cursor], .lineup-slide');
      if (target) {
        cursorContainer.classList.add('is-hovering');
        state.cursorHovering = true;

        if (target.classList.contains('lineup-slide')) {
          const isOpen = target.classList.contains('is-open');
          cursorLabel.textContent = isOpen ? 'CONFIGURE' : 'OPEN';
        } else {
          cursorLabel.textContent = target.getAttribute('data-cursor') || 'VIEW';
        }
      }
    });

    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest('a, button, [data-cursor], .lineup-slide');
      if (target) {
        cursorContainer.classList.remove('is-hovering');
        state.cursorHovering = false;
      }
    });
  }

  function updateCursorAnimation() {
    if (!isFinePointer || prefersReducedMotion || !cursorContainer) return;

    // Smooth lerp 0.18
    state.cursorX += (state.mouseX - state.cursorX) * 0.18;
    state.cursorY += (state.mouseY - state.cursorY) * 0.18;

    cursorContainer.style.transform = `translate3d(${state.cursorX.toFixed(2)}px, ${state.cursorY.toFixed(2)}px, 0)`;
  }

  // ==========================================================================
  // 3. FRAME ASSET LOADING & PRELOADER
  // ==========================================================================
  function getFrameUrl(type, index) {
    const isMob = state.isMobile;
    const base = type === 'hero'
      ? (isMob ? cfg.hero.mobilePath : cfg.hero.desktopPath)
      : (isMob ? cfg.dismantle.mobilePath : cfg.dismantle.desktopPath);
    const num = String(index).padStart(4, '0');
    return `${base}${num}.webp`;
  }

  function loadSingleFrame(imagesArray, flagsArray, type, index) {
    return new Promise((resolve) => {
      if (imagesArray[index]) {
        resolve(imagesArray[index]);
        return;
      }
      const img = new Image();
      img.onload = () => {
        if (img.decode) {
          img.decode()
            .catch(() => {})
            .finally(() => {
              imagesArray[index] = img;
              flagsArray[index] = true;
              resolve(img);
            });
        } else {
          imagesArray[index] = img;
          flagsArray[index] = true;
          resolve(img);
        }
      };
      img.onerror = () => {
        resolve(null);
      };
      img.src = getFrameUrl(type, index + 1);
    });
  }

  async function initPreloaderAndAssets() {
    const initialHeroCount = Math.min(cfg.hero.initialPreloadCount || 40, cfg.hero.frameCount);
    let loadedCount = 0;

    // Initialize arrays
    state.heroImages = new Array(cfg.hero.frameCount);
    state.heroLoadedFlags = new Array(cfg.hero.frameCount).fill(false);
    state.dismantleImages = new Array(cfg.dismantle.frameCount);
    state.dismantleLoadedFlags = new Array(cfg.dismantle.frameCount).fill(false);

    // Initial batch: 1 to 40
    const initialPromises = [];
    for (let i = 0; i < initialHeroCount; i++) {
      const p = loadSingleFrame(state.heroImages, state.heroLoadedFlags, 'hero', i).then(() => {
        loadedCount++;
        const pct = Math.round((loadedCount / initialHeroCount) * 100);
        if (preloaderLine) preloaderLine.style.transform = `translateX(-50%) scaleX(${pct / 100})`;
        if (preloaderCounter) preloaderCounter.textContent = `${String(pct).padStart(3, '0')}`;
      });
      initialPromises.push(p);
    }

    await Promise.all(initialPromises);

    // Exit transition
    if (preloaderLine) preloaderLine.classList.add('flash');
    setTimeout(() => {
      if (preloader) preloader.classList.add('is-hidden');
      state.heroLoaded = true;

      if (prefersReducedMotion) {
        const heroKeyframe = getNearestLoadedFrame(state.heroImages, state.heroLoadedFlags, 0);
        if (heroKeyframe) drawCanvasFrame(heroCanvas, heroCtx, heroKeyframe, 0);
        const disKeyframe = getNearestLoadedFrame(state.dismantleImages, state.dismantleLoadedFlags, 0);
        if (disKeyframe) drawCanvasFrame(dismantleCanvas, dismantleCtx, disKeyframe, 0);
      } else {
        renderHero();
        renderDismantle();
      }
    }, 180);

    // Background load remaining hero frames in batches of 8
    loadRemainingFramesBackground();
  }

  async function loadRemainingFramesBackground() {
    const initialHeroCount = Math.min(cfg.hero.initialPreloadCount || 40, cfg.hero.frameCount);
    const heroTotal = cfg.hero.frameCount;
    const batchSize = 6;

    // Load remaining hero frames
    for (let i = initialHeroCount; i < heroTotal; i += batchSize) {
      const batch = [];
      for (let j = i; j < Math.min(i + batchSize, heroTotal); j++) {
        batch.push(loadSingleFrame(state.heroImages, state.heroLoadedFlags, 'hero', j));
      }
      await Promise.all(batch);
      // Tiny yield so thread never stutters
      await new Promise((r) => setTimeout(r, 16));
    }

    // Load dismantle frames
    const dismantleTotal = cfg.dismantle.frameCount;
    for (let i = 0; i < dismantleTotal; i += batchSize) {
      const batch = [];
      for (let j = i; j < Math.min(i + batchSize, dismantleTotal); j++) {
        batch.push(loadSingleFrame(state.dismantleImages, state.dismantleLoadedFlags, 'dismantle', j));
      }
      await Promise.all(batch);
      await new Promise((r) => setTimeout(r, 16));
    }
  }

  // Nearest frame fallback
  function getNearestLoadedFrame(imagesArray, flagsArray, targetIdx) {
    if (flagsArray[targetIdx] && imagesArray[targetIdx]) {
      return imagesArray[targetIdx];
    }
    const max = imagesArray.length;
    let offset = 1;
    while (targetIdx - offset >= 0 || targetIdx + offset < max) {
      if (targetIdx - offset >= 0 && flagsArray[targetIdx - offset]) {
        return imagesArray[targetIdx - offset];
      }
      if (targetIdx + offset < max && flagsArray[targetIdx + offset]) {
        return imagesArray[targetIdx + offset];
      }
      offset++;
    }
    return imagesArray[0] || null;
  }

  // ==========================================================================
  // 4. CANVAS DRAWING LOGIC (Landscape Cover, Portrait Contain Centered)
  // ==========================================================================
  function drawCanvasFrame(canvas, ctx, img, fadeAlpha = 0) {
    if (!img) return;

    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    const w = canvas.width / state.dpr;
    const h = canvas.height / state.dpr;
    const imgW = img.naturalWidth || 1600;
    const imgH = img.naturalHeight || 900;

    // Clear with --asphalt
    ctx.fillStyle = cfg.theme.asphalt;
    ctx.fillRect(0, 0, w, h);

    let scale;
    if (w >= h) {
      // Landscape: Cover-fit
      scale = Math.max(w / imgW, h / imgH);
    } else {
      // Portrait: Contain-fit vertically centered on --asphalt so car is never cropped
      scale = Math.min(w / imgW, h / imgH);
    }

    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const drawX = (w - drawW) / 2;
    const drawY = (h - drawH) / 2;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // Hero fade-to-black over final 5%
    if (fadeAlpha > 0) {
      ctx.fillStyle = `rgba(7, 8, 10, ${Math.min(fadeAlpha, 1)})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  function resizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * state.dpr);
    canvas.height = Math.floor(rect.height * state.dpr);
    const ctx = canvas.getContext('2d');
    ctx.scale(state.dpr, state.dpr);
  }

  // ==========================================================================
  // 5. SCROLL CALCULATIONS & HUD UPDATES
  // ==========================================================================
  function calculateScrollyProgress(wrapper) {
    if (!wrapper) return 0;
    const rect = wrapper.getBoundingClientRect();
    const maxScroll = wrapper.offsetHeight - window.innerHeight;
    if (maxScroll <= 0) return 0;
    return Math.min(Math.max(-rect.top / maxScroll, 0), 1);
  }

  function updateHeroScrolly() {
    state.heroProgress = calculateScrollyProgress(heroWrapper);
    state.heroTargetFrame = Math.round(state.heroProgress * (cfg.hero.frameCount - 1));

    // Priority load frames near current scroll target
    const hTarget = state.heroTargetFrame;
    if (!state.heroLoadedFlags[hTarget]) {
      loadSingleFrame(state.heroImages, state.heroLoadedFlags, 'hero', hTarget);
      for (let offset = 1; offset <= 3; offset++) {
        if (hTarget + offset < cfg.hero.frameCount && !state.heroLoadedFlags[hTarget + offset]) {
          loadSingleFrame(state.heroImages, state.heroLoadedFlags, 'hero', hTarget + offset);
        }
        if (hTarget - offset >= 0 && !state.heroLoadedFlags[hTarget - offset]) {
          loadSingleFrame(state.heroImages, state.heroLoadedFlags, 'hero', hTarget - offset);
        }
      }
    }

    // Progress line
    if (heroProgress) {
      heroProgress.style.width = `${(state.heroProgress * 100).toFixed(2)}%`;
    }

    // HUD: Speed & Distance & Chapter
    const speed = Math.round(cfg.hero.speedRange[0] + (cfg.hero.speedRange[1] - cfg.hero.speedRange[0]) * state.heroProgress);
    const dist = (cfg.hero.distanceRange[0] + (cfg.hero.distanceRange[1] - cfg.hero.distanceRange[0]) * state.heroProgress).toFixed(1);

    if (hudSpeed) hudSpeed.textContent = String(speed).padStart(3, '0');
    if (hudDistance) hudDistance.textContent = dist;

    // Active Chapter
    let activeChIndex = '01/04';
    cfg.hero.chapters.forEach((ch, idx) => {
      const el = document.getElementById(`hero-ch-${idx + 1}`);
      const isActive = state.heroProgress >= ch.start && state.heroProgress <= ch.end;
      if (el) {
        if (isActive) {
          el.classList.add('is-active');
          activeChIndex = ch.index;
        } else {
          el.classList.remove('is-active');
        }
      }
    });

    if (hudChapter) hudChapter.textContent = activeChIndex;
  }

  function updateDismantleScrolly() {
    state.dismantleProgress = calculateScrollyProgress(dismantleWrapper);
    state.dismantleTargetFrame = Math.round(state.dismantleProgress * (cfg.dismantle.frameCount - 1));

    // Priority load frames near current dismantle target
    const dTarget = state.dismantleTargetFrame;
    if (!state.dismantleLoadedFlags[dTarget]) {
      loadSingleFrame(state.dismantleImages, state.dismantleLoadedFlags, 'dismantle', dTarget);
      for (let offset = 1; offset <= 3; offset++) {
        if (dTarget + offset < cfg.dismantle.frameCount && !state.dismantleLoadedFlags[dTarget + offset]) {
          loadSingleFrame(state.dismantleImages, state.dismantleLoadedFlags, 'dismantle', dTarget + offset);
        }
        if (dTarget - offset >= 0 && !state.dismantleLoadedFlags[dTarget - offset]) {
          loadSingleFrame(state.dismantleImages, state.dismantleLoadedFlags, 'dismantle', dTarget - offset);
        }
      }
    }

    // Progress line
    if (dismantleProgress) {
      dismantleProgress.style.width = `${(state.dismantleProgress * 100).toFixed(2)}%`;
    }

    // Callouts visibility
    cfg.dismantle.callouts.forEach((co) => {
      const el = document.getElementById(`callout-${co.id}`);
      if (el) {
        if (state.dismantleProgress >= co.start && state.dismantleProgress <= co.end) {
          el.classList.add('is-visible');
        } else {
          el.classList.remove('is-visible');
        }
      }
    });
  }

  // ==========================================================================
  // 6. SECTION 2 — STATEMENT WORD REVEAL
  // ==========================================================================
  function initStatementSection() {
    if (!statementTextEl) return;
    const words = cfg.statement.text.split(' ');
    statementTextEl.innerHTML = words
      .map((w) => `<span class="statement-word">${w} </span>`)
      .join('');
  }

  function updateStatementSection() {
    if (!statementSection || !statementTextEl) return;
    const rect = statementSection.getBoundingClientRect();
    const vh = window.innerHeight;

    // Start reveal when top enters lower 80% of screen, complete when centered
    const progress = Math.min(Math.max((vh * 0.85 - rect.top) / (vh * 0.65), 0), 1);

    const spans = statementTextEl.querySelectorAll('.statement-word');
    const count = spans.length;
    spans.forEach((span, idx) => {
      const threshold = (idx + 0.5) / count;
      if (progress >= threshold) {
        span.style.opacity = '1';
      } else {
        span.style.opacity = '0.15';
      }
    });
  }

  // ==========================================================================
  // 7. SECTION 3 — DISMANTLE CALLOUTS GENERATION
  // ==========================================================================
  function initDismantleCallouts() {
    if (!dismantleCalloutsContainer) return;
    dismantleCalloutsContainer.innerHTML = cfg.dismantle.callouts
      .map((co) => {
        return `
          <div id="callout-${co.id}" class="callout-item" data-align="${co.align || 'left'}" style="left: ${co.x}%; top: ${co.y}%;">
            <div class="callout-anchor">
              <div class="callout-dot"></div>
              <div class="callout-line"></div>
              <div class="callout-content">
                <span class="callout-code font-hud">${co.code}</span>
                <span class="callout-desc">${co.title}</span>
              </div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  // ==========================================================================
  // 8. SECTION 4 — LINEUP ACCORDION
  // ==========================================================================
  let hoverDebounceTimer = null;

  function initLineupAccordion() {
    if (!lineupAccordion) return;

    lineupAccordion.innerHTML = cfg.lineup.cars
      .map((car, idx) => {
        const isOpen = idx === state.activeLineupIndex;
        const swatchesHtml = car.swatches
          .map((c, sIdx) => {
            const activeCls = sIdx === car.activeSwatch ? 'is-active' : '';
            return `<button class="swatch-btn ${activeCls}" style="background-color: ${c};" aria-label="Color option ${sIdx + 1}" data-slide="${idx}" data-swatch="${sIdx}"></button>`;
          })
          .join('');

        return `
          <button class="lineup-slide slide-enter ${isOpen ? 'is-open' : ''}" 
                  role="tab" 
                  aria-selected="${isOpen}" 
                  aria-expanded="${isOpen}"
                  aria-label="NOCTIS Model ${car.name}"
                  data-index="${idx}"
                  tabindex="0">
            
            <!-- Closed View -->
            <div class="slide-closed-view">
              <span class="slide-num font-hud">${car.num}</span>
              <span class="slide-vertical-name font-hud">${car.name}</span>
            </div>
            <img class="slide-bg-img" src="${car.image}" alt="${car.alt}" loading="lazy">

            <!-- Open View -->
            <div class="slide-open-view">
              <div class="slide-open-header">
                <div>
                  <span class="slide-num font-hud">${car.num}</span>
                  <h3 class="slide-model-title font-display">${car.name}</h3>
                </div>
              </div>

              <!-- Shared Floor Line & Driving Animation -->
              <div class="slide-floor-line"></div>
              <div class="slide-car-stage">
                <img class="slide-car-img" src="${car.image}" alt="${car.alt}">
              </div>

              <!-- Details Footer -->
              <div class="slide-details-footer">
                <p class="slide-tagline">${car.tagline}</p>
                <div class="slide-specs-row font-hud">
                  <div class="spec-col">
                    <span class="spec-label">RANGE</span>
                    <span class="spec-val">${car.specs.range}</span>
                  </div>
                  <div class="spec-col">
                    <span class="spec-label">0–100 KM/H</span>
                    <span class="spec-val">${car.specs.accel}</span>
                  </div>
                  <div class="spec-col">
                    <span class="spec-label">POWER</span>
                    <span class="spec-val">${car.specs.power}</span>
                  </div>
                </div>

                <div class="slide-actions-row">
                  <div class="swatches-row">
                    ${swatchesHtml}
                  </div>
                  <a href="#reserve-section" class="cta-link" data-cursor="CONFIGURE">Configure →</a>
                </div>
              </div>
            </div>
          </button>
        `;
      })
      .join('');

    const slides = lineupAccordion.querySelectorAll('.lineup-slide');

    // Desktop hover with 80ms debounce
    slides.forEach((slide, idx) => {
      slide.addEventListener('mouseenter', () => {
        if (state.isMobile) return;
        clearTimeout(hoverDebounceTimer);
        hoverDebounceTimer = setTimeout(() => {
          setOpenSlide(idx);
        }, 80);
      });

      slide.addEventListener('click', (e) => {
        // If clicking on swatch or configure link, let them handle
        if (e.target.closest('.swatch-btn') || e.target.closest('.cta-link')) return;
        setOpenSlide(idx);
      });

      // Keyboard arrow navigation
      slide.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const next = (idx + 1) % slides.length;
          setOpenSlide(next);
          slides[next].focus();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = (idx - 1 + slides.length) % slides.length;
          setOpenSlide(prev);
          slides[prev].focus();
        }
      });
    });

    // Swatches click
    lineupAccordion.addEventListener('click', (e) => {
      const swatch = e.target.closest('.swatch-btn');
      if (swatch) {
        e.stopPropagation();
        const slideIdx = parseInt(swatch.dataset.slide, 10);
        const swatchIdx = parseInt(swatch.dataset.swatch, 10);
        cfg.lineup.cars[slideIdx].activeSwatch = swatchIdx;

        const parentSlide = slides[slideIdx];
        parentSlide.querySelectorAll('.swatch-btn').forEach((btn, sI) => {
          if (sI === swatchIdx) btn.classList.add('is-active');
          else btn.classList.remove('is-active');
        });
      }
    });

    // Dynamic cursor label update across open/closed slides
    lineupAccordion.addEventListener('mousemove', (e) => {
      const slide = e.target.closest('.lineup-slide');
      if (slide && state.cursorHovering && cursorLabel) {
        const isOpen = slide.classList.contains('is-open');
        cursorLabel.textContent = isOpen ? 'CONFIGURE' : 'OPEN';
      }
    });

    // Entrance observer (stagger 0.08s)
    const lineupObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            lineupAccordion.classList.add('is-entered');
            slides.forEach((s, i) => {
              s.style.transitionDelay = `${(i * 0.08).toFixed(2)}s`;
            });
            setTimeout(() => {
              slides.forEach((s) => {
                s.style.transitionDelay = '';
              });
            }, 1000);
            lineupObserver.disconnect();
          }
        });
      },
      { threshold: 0.15 }
    );
    lineupObserver.observe(lineupSection);
  }

  function setOpenSlide(index) {
    if (state.activeLineupIndex === index && !state.isMobile) return;
    state.activeLineupIndex = index;
    const slides = lineupAccordion.querySelectorAll('.lineup-slide');
    slides.forEach((slide, idx) => {
      const isOpen = idx === index;
      slide.classList.toggle('is-open', isOpen);
      slide.setAttribute('aria-selected', isOpen);
      slide.setAttribute('aria-expanded', isOpen);
    });

    if (state.cursorHovering && cursorLabel) {
      cursorLabel.textContent = 'CONFIGURE';
    }
  }

  // ==========================================================================
  // 9. NAVIGATION SCROLL BEHAVIOR
  // ==========================================================================
  function updateNavVisibility() {
    const currentY = window.scrollY;
    if (currentY > 80 && currentY > state.lastScrollY) {
      mainNav.classList.add('nav-hidden');
    } else {
      mainNav.classList.remove('nav-hidden');
    }
    state.lastScrollY = currentY;
  }

  // ==========================================================================
  // 10. ANIMATION & RENDER RAF LOOP
  // ==========================================================================
  let lastHeroRendered = -1;
  let lastDismantleRendered = -1;

  function renderHero() {
    const fadeRange = cfg.hero.fadeToBlackRange;
    let fadeAlpha = 0;
    if (state.heroProgress >= fadeRange[0]) {
      fadeAlpha = (state.heroProgress - fadeRange[0]) / (fadeRange[1] - fadeRange[0]);
    }

    const roundedFrame = Math.round(state.heroCurrentFrame);
    const img = getNearestLoadedFrame(state.heroImages, state.heroLoadedFlags, roundedFrame);
    if (img) {
      drawCanvasFrame(heroCanvas, heroCtx, img, fadeAlpha);
      lastHeroRendered = roundedFrame;
    }
  }

  function renderDismantle() {
    const roundedFrame = Math.round(state.dismantleCurrentFrame);
    const img = getNearestLoadedFrame(state.dismantleImages, state.dismantleLoadedFlags, roundedFrame);
    if (img) {
      drawCanvasFrame(dismantleCanvas, dismantleCtx, img, 0);
      lastDismantleRendered = roundedFrame;
    }
  }

  function mainRafLoop() {
    // Smooth frame lerp 0.15
    state.heroCurrentFrame += (state.heroTargetFrame - state.heroCurrentFrame) * 0.15;
    state.dismantleCurrentFrame += (state.dismantleTargetFrame - state.dismantleCurrentFrame) * 0.15;

    // Check if hero needs redraw
    const heroRounded = Math.round(state.heroCurrentFrame);
    if (heroRounded !== lastHeroRendered || state.heroProgress >= cfg.hero.fadeToBlackRange[0]) {
      renderHero();
    }

    // Check if dismantle needs redraw
    const dismantleRounded = Math.round(state.dismantleCurrentFrame);
    if (dismantleRounded !== lastDismantleRendered) {
      renderDismantle();
    }

    // Cursor position lerp
    updateCursorAnimation();

    requestAnimationFrame(mainRafLoop);
  }

  // ==========================================================================
  // 11. EVENT LISTENERS & RESIZE HANDLING
  // ==========================================================================
  function handleScroll() {
    if (prefersReducedMotion) return;
    updateHeroScrolly();
    updateDismantleScrolly();
    updateStatementSection();
    updateNavVisibility();
  }

  function handleResize() {
    state.isMobile = window.innerWidth < 768;
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);

    resizeCanvas(heroCanvas);
    resizeCanvas(dismantleCanvas);

    renderHero();
    renderDismantle();
  }

  // ==========================================================================
  // 12. INITIALIZATION ENTRY POINT
  // ==========================================================================
  window.addEventListener('DOMContentLoaded', () => {
    // 0. Apply dynamic heights from config
    if (heroWrapper && cfg.hero.height) {
      heroWrapper.style.height = cfg.hero.height;
    }
    if (dismantleWrapper && cfg.dismantle.height) {
      dismantleWrapper.style.height = cfg.dismantle.height;
    }

    // 1. Film grain
    initFilmGrain();

    // 2. Cursor
    initCursor();

    // 3. Statement section
    initStatementSection();

    // 4. Dismantle callouts
    initDismantleCallouts();

    // 5. Lineup accordion
    initLineupAccordion();

    // 6. Canvas dimensions
    resizeCanvas(heroCanvas);
    resizeCanvas(dismantleCanvas);

    // 7. Scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    // Initial position trigger
    handleScroll();

    // 8. Preloader and asset loader
    initPreloaderAndAssets();

    // 9. Start RAF loop
    requestAnimationFrame(mainRafLoop);
  });
})();
