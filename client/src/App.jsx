import { useEffect, useState, useRef, useCallback } from 'react'
import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { Suspense } from 'react';
import DragonModel from './components/DragonModel';
import './App.css'

const API       = import.meta.env.VITE_API_URL;
// ✅ Fixed: admin panel URL from env var instead of ../components/admin.jsx (a file path, not a URL)
const ADMIN_URL = import.meta.env.VITE_ADMIN_URL || "http://localhost:5174";

const today = new Date().getFullYear();

/* ══════════════════════════════════════════════════════════════
  FOUNDERS — hardcoded, never changes
══════════════════════════════════════════════════════════════ */
const FOUNDERS = [
  {
    role: 'Founder',
    ign: 'IDC Gullit',
    name: 'Krishanu Banerjee',
    image: './founder.jpg',
    icon: '👑',
  },
  {
    role: 'Co-Founder',
    ign: 'IDC Adrish',
    name: 'Adrish Saha',
    image: './co-founder1.jpeg',
    icon: '🔥',
  },
  {
    role: 'Co-Founder',
    ign: 'IDC Atri',
    name: 'Atri Guha',
    image: './co-founder2.jpeg',
    icon: '🔥',
  },
  {
    role: 'Owner',
    ign: 'NOOB PRO MAX',
    name: 'Pritam Das',
    image: './owner.jpg',
    icon: '⚔️',
  },
  {
    role: 'Co-Owner',
    ign: 'LYNX',
    name: 'MAYUKH PAL',
    image: './co-owner1.jpg',
    icon: '🛡️',
  },
  {
    role: 'Co-Owner',
    ign: 'KONKRETE',
    name: 'PRIYABRATA KONAR',
    image: './co-owner2.jpg',
    icon: '🛡️',
  },
];

/* ══════════════════════════════════════════════════════════════
  DRAGON WAYPOINTS
══════════════════════════════════════════════════════════════ */
const WAYPOINTS = [
  { id: 'top_center',    position: [0, -1.0, -7.5], animation: 'flying', transitAnimation: 'flying', stayDuration: 1800, speed: 1 },
  { id: 'right_side',    position: [4.5, -1.8, 0.8], animation: 'flying', transitAnimation: 'flying', stayDuration: 1200, speed: 1 },
  { id: 'bottom_center', position: [0, -3, 2.8],    animation: 'flying', transitAnimation: 'flying', stayDuration: 1200, speed: 1 },
  { id: 'left_side',     position: [-4.5, -1.8, 0.8], animation: 'flying', transitAnimation: 'flying', stayDuration: 1200, speed: 1 },
];

/* ══════════════════════════════════════════════════════════════
  DRAGON SEQUENCER HOOK
══════════════════════════════════════════════════════════════ */
function useDragonSequence() {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState('staying');
  const idxRef   = useRef(0);
  const phaseRef = useRef('staying');
  const timer    = useRef(null);

  const goStay = useCallback((i) => {
    const wi = ((i % WAYPOINTS.length) + WAYPOINTS.length) % WAYPOINTS.length;
    idxRef.current   = wi;
    phaseRef.current = 'staying';
    setIdx(wi);
    setPhase('staying');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      phaseRef.current = 'transit';
      setPhase('transit');
    }, WAYPOINTS[wi].stayDuration);
  }, []);

  useEffect(() => {
    goStay(0);
    return () => clearTimeout(timer.current);
  }, [goStay]);

  const onReached = useCallback(() => {
    if (phaseRef.current !== 'transit') return;
    goStay(idxRef.current + 1);
  }, [goStay]);

  const nextIdx  = (idx + 1) % WAYPOINTS.length;
  const isStaying = phase === 'staying';
  const active   = isStaying ? WAYPOINTS[idx] : WAYPOINTS[nextIdx];

  return {
    targetPosition: active.position,
    animation: isStaying ? WAYPOINTS[idx].animation : WAYPOINTS[nextIdx].transitAnimation,
    speed: active.speed,
    onReached,
  };
}

/* ══════════════════════════════════════════════════════════════
  IDC LOADING ANIMATION
══════════════════════════════════════════════════════════════ */
function IDCLoader({ onDone }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 250);
    const t2 = setTimeout(() => setPhase(2), 950);
    const t3 = setTimeout(() => setPhase(3), 1300);
    const t4 = setTimeout(() => setPhase(4), 2500);
    const t5 = setTimeout(onDone, 3050);
    return () => [t1, t2, t3, t4, t5].forEach(clearTimeout);
  }, [onDone]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#04050c',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      opacity: phase >= 4 ? 0 : 1,
      transition: 'opacity 0.55s ease',
      pointerEvents: phase >= 4 ? 'none' : 'all',
    }}>
      <div style={{
        position: 'absolute', width: 380, height: 380, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(200,151,42,0.14) 0%, transparent 70%)',
        opacity: phase >= 1 ? 1 : 0, transition: 'opacity 0.8s ease',
      }} />
      <svg width="160" height="80" viewBox="0 0 160 80" style={{
        opacity: phase >= 1 ? 0.18 : 0, transition: 'opacity 0.8s ease',
        marginBottom: '-10px', fill: '#c8972a',
      }}>
        <path d="M10,60 Q20,20 40,30 Q50,10 70,25 Q80,5 100,20 Q120,8 140,25 Q155,18 158,35 Q150,30 135,40 Q120,25 105,38 Q90,28 75,40 Q60,25 45,42 Q30,28 18,50 Z" />
        <path d="M140,25 L158,10 L150,30 Z M10,60 L0,45 L18,50 Z" />
      </svg>
      <div style={{
        fontFamily: "'Orbitron', sans-serif",
        fontSize: 'clamp(4.5rem, 14vw, 9.5rem)',
        fontWeight: 900,
        background: 'linear-gradient(180deg, #ffe580 0%, #c8972a 45%, #ff7a00 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        letterSpacing: '0.28em', lineHeight: 1,
        opacity: phase >= 1 ? 1 : 0,
        transform: phase >= 1 ? 'scale(1) translateY(0)' : 'scale(0.55) translateY(40px)',
        transition: 'all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
        filter: phase >= 1 ? 'drop-shadow(0 0 45px rgba(200,151,42,0.75))' : 'none',
      }}>IDC</div>
      <div style={{
        fontFamily: "'Orbitron', sans-serif",
        fontSize: 'clamp(0.42rem, 1.1vw, 0.62rem)',
        letterSpacing: '0.48em', color: '#777', marginTop: '0.4rem',
        opacity: phase >= 2 ? 1 : 0, transition: 'opacity 0.6s ease',
      }}>IMMORTAL DE CAMPEONES</div>
      <div style={{
        width: phase >= 2 ? 220 : 0, height: 1,
        background: 'linear-gradient(90deg, transparent, #c8972a 40%, #ff7a00 60%, transparent)',
        marginTop: '1.4rem', transition: 'width 0.7s ease 0.1s',
      }} />
      <div style={{ width: 220, height: 2, background: 'rgba(200,151,42,0.12)', borderRadius: 2, marginTop: '1rem', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #c8972a, #ff7a00)',
          width: phase >= 3 ? '100%' : '0%',
          transition: 'width 1.1s ease',
          boxShadow: '0 0 12px rgba(200,151,42,0.8)',
        }} />
      </div>
      <div style={{
        fontFamily: "'Orbitron', sans-serif",
        fontSize: '0.48rem', letterSpacing: '0.32em',
        color: 'rgba(200,151,42,0.45)', marginTop: '0.75rem',
        opacity: phase >= 2 ? 1 : 0, transition: 'opacity 0.5s ease 0.2s',
      }}>LOADING...</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
  MAIN APP
══════════════════════════════════════════════════════════════ */
function App() {
  const [players,     setPlayers]     = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [gallery,     setGallery]     = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [displayedPlayers, setDisplayedPlayers] = useState([]);
  const [searchTerm,  setSearchTerm]  = useState('');
  const [playerFade,  setPlayerFade]  = useState(true);

  const admins = players.filter(p => p.role === 'admin');

  const revealObsRef            = useRef(null);
  const showAllAchievementsRef  = useRef(false);

  const { targetPosition, animation, speed, onReached } = useDragonSequence();

  /* ── helpers ── */
  function toggleMobile() { document.getElementById('mobileMenu').classList.toggle('open'); }
  function closeMobile()  { document.getElementById('mobileMenu').classList.remove('open'); }

  function closeModal() {
    const el = document.getElementById('playerModal');
    if (el) { el.classList.remove('open'); document.body.style.overflow = ''; }
  }

  function closeLightbox(e) {
    if (e.target.id === 'lightbox' || e.target.closest('.lightbox-close')) {
      const el = document.getElementById('lightbox');
      if (el) el.classList.remove('open');
    }
  }

  /* ── Effect 1: particle canvas ── */
  useEffect(() => {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, particles = [], animId;

    function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
    resize();

    function createParticles() {
      particles = [];
      const n = Math.floor(W * H / 18000);
      for (let i = 0; i < n; i++) {
        particles.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.3, vy: -Math.random() * 0.4 - 0.1,
          size: Math.random() * 1.5 + 0.3, opacity: Math.random() * 0.5 + 0.1,
          color: Math.random() > 0.7 ? '#c8972a' : Math.random() > 0.5 ? '#ff7a00' : '#ffffff',
        });
      }
    }
    createParticles();

    function tick() {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(tick);
    }
    tick();

    const onResize = () => { resize(); createParticles(); };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(animId); };
  }, []);

  /* ── Effect 2: one-time UI setup ── */
  useEffect(() => {
    const onScroll = () => {
      document.getElementById('mainNav')?.classList.toggle('scrolled', window.scrollY > 30);
    };
    window.addEventListener('scroll', onScroll);

    const loader      = document.getElementById('pageLoader');
    const loaderTimer = setTimeout(() => {
      loader?.classList.add('hide');
      setTimeout(() => loader?.remove(), 500);
    }, 1800);

    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          e.target.style.transitionDelay = (i * 0.08) + 's';
          e.target.classList.add('visible');
        }
      });
    }, { threshold: 0.12 });
    revealObsRef.current = revealObs;
    document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

    function animateCounters() {
      document.querySelectorAll('[data-target]').forEach(el => {
        const target   = +el.dataset.target;
        const duration = 3000;
        const startTime = performance.now();
        function updateCounter(currentTime) {
          const progress      = Math.min((currentTime - startTime) / duration, 1);
          const easedProgress = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.floor(target * easedProgress);
          if (progress < 1) requestAnimationFrame(updateCounter);
          else el.textContent = target;
        }
        requestAnimationFrame(updateCounter);
      });
    }

    const statsEl = document.querySelector('.stats-strip');
    let statsObs;
    if (statsEl) {
      statsObs = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { animateCounters(); statsObs.disconnect(); }
      }, { threshold: 0.5 });
      statsObs.observe(statsEl);
    }

    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      const modal = document.getElementById('playerModal');
      if (modal) { modal.classList.remove('open'); document.body.style.overflow = ''; }
      document.getElementById('lightbox')?.classList.remove('open');
    };
    document.addEventListener('keydown', onKey);

    const overlay = document.getElementById('playerModal');
    const onOverlayClick = (e) => {
      if (e.target === overlay) { overlay.classList.remove('open'); document.body.style.overflow = ''; }
    };
    overlay?.addEventListener('click', onOverlayClick);

    window.__openLightbox = (src, alt) => {
      if (!src) return;
      const img = document.getElementById('lightboxImg');
      if (img) { img.src = src; img.alt = alt || ''; }
      document.getElementById('lightbox')?.classList.add('open');
    };

    fetchPlayers();
    fetchAchievements();
    fetchGallery();
    fetchTournaments();

    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('keydown', onKey);
      clearTimeout(loaderTimer);
      revealObs.disconnect();
      statsObs?.disconnect();
      overlay?.removeEventListener('click', onOverlayClick);
      delete window.__openLightbox;
    };
  }, []);

  /* ── Effect 3: rotating players ── */
  useEffect(() => {
    if (!players.length) return;
    if (searchTerm) {
      const filtered = players.filter(p =>
        (p.ign || '').toLowerCase().includes(searchTerm) ||
        (p.name || '').toLowerCase().includes(searchTerm)
      );
      setDisplayedPlayers(filtered);
      return;
    }
    const pick = () => {
      setPlayerFade(false);
      setTimeout(() => {
        const shuffled = [...players].sort(() => Math.random() - 0.5);
        setDisplayedPlayers(shuffled.slice(0, Math.min(4, players.length)));
        setPlayerFade(true);
      }, 380);
    };
    pick();
    const interval = setInterval(pick, 4000);
    return () => clearInterval(interval);
  }, [players, searchTerm]);

  /* ── Effect 4: render players grid ── */
  useEffect(() => {
    function renderPlayers() {
      const grid = document.getElementById('playersGrid');
      if (!grid) return;
      const list = displayedPlayers;
      if (!list.length) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-muted);font-family:var(--font-hd);font-size:0.75rem;letter-spacing:0.2em;">NO PLAYERS FOUND</div>';
        return;
      }
      grid.style.opacity   = playerFade ? '1' : '0';
      grid.style.transform = playerFade ? 'translateY(0)' : 'translateY(12px)';
      grid.style.transition = 'opacity 0.38s ease, transform 0.38s ease';

      grid.innerHTML = list.map(p => `
        <div class="player-card" onclick="window.__openModal('${p._id}')">
          <div class="player-img-wrap">
            ${p.image
              ? `<img class="player-img" src="${p.image}" alt="${p.ign}"/>`
              : `<div class="player-img-placeholder"><i class="fas fa-user-ninja"></i></div>`}
            <div class="player-overlay"></div>
            ${p.role === 'admin'
              ? `<div class="player-role-badge"><i class="fas fa-shield-alt"></i> ADMIN</div>`
              : ''}
            <div class="player-view-btn">View Profile</div>
          </div>
          <div class="player-info">
            <div class="player-ign">${p.ign}</div>
            <div class="player-name">${p.name}</div>
          </div>
        </div>
      `).join('');
    }

    renderPlayers();

    window.__openModal = (id) => {
      const p = players.find(x => x._id === id);
      if (!p) return;
      const hdr = document.getElementById('modalHeader');
      const bdy = document.getElementById('modalBody');
      if (hdr) hdr.innerHTML = `
        ${p.image
          ? `<img class="modal-img" src="${p.image}" alt="${p.ign}"/>`
          : `<div class="modal-img-placeholder"><i class="fas fa-user-ninja"></i></div>`}
        <div class="modal-meta">
          <div class="modal-ign">${p.ign}${p.role === 'admin'
            ? ' <span style="font-size:0.6rem;color:#c8972a;font-family:var(--font-hd);letter-spacing:0.15em;vertical-align:middle;">⭐ ADMIN</span>'
            : ''}</div>
          <div class="modal-realname">${p.name}</div>
          <div class="modal-bio">${p.bio || ''}</div>
          <div class="modal-socials">
            ${p.social?.instagram ? `<a href="${p.social.instagram}"><i class="fab fa-instagram"></i></a>` : ''}
            ${p.social?.discord   ? `<a href="${p.social.discord}"><i class="fab fa-discord"></i></a>`   : ''}
          </div>
        </div>`;
      if (bdy) bdy.innerHTML = `
        <div class="modal-section-title">Player Details</div>
        <div class="modal-details-grid">
          <div class="modal-detail-item"><label>Real Name</label><span>${p.name}</span></div>
          <div class="modal-detail-item"><label>Email</label><span>${p.email || '—'}</span></div>
          <div class="modal-detail-item"><label>Contact</label><span>${p.contact || '—'}</span></div>
          <div class="modal-detail-item"><label>Location</label><span>${p.address || '—'}</span></div>
        </div>`;
      const overlay = document.getElementById('playerModal');
      if (overlay) { overlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
    };

    return () => { delete window.__openModal; };
  }, [displayedPlayers, playerFade, players]);

  /* ── Effect 5: render admins carousel ── */
  useEffect(() => {
    const track = document.getElementById('adminsTrack');
    if (!track || !admins.length) return;

    const duplicated = [...admins, ...admins];
    track.innerHTML = duplicated.map((p) => `
      <div class="admin-card" onclick="window.__openAdminModal('${p._id}')" style="cursor:pointer">
        <div class="admin-img-wrap">
          ${p.image
            ? `<img class="admin-img" src="${p.image}" alt="${p.ign}"/>`
            : `<div class="admin-img-placeholder"><i class="fas fa-user-shield"></i></div>`}
          <div class="admin-badge-ring"></div>
        </div>
        <div class="admin-info">
          <div class="admin-ign">${p.ign}</div>
          <div class="admin-name">${p.name}</div>
        </div>
      </div>
    `).join('');
    track.classList.add('scroll-mode');
  }, [admins]);

  /* ── Admin modal ── */
  useEffect(() => {
    window.__openAdminModal = (id) => {
      const p = admins.find(x => x._id === id);
      if (!p) return;
      const hdr = document.getElementById('modalHeader');
      const bdy = document.getElementById('modalBody');
      if (hdr) hdr.innerHTML = `
        ${p.image
          ? `<img class="modal-img" src="${p.image}" alt="${p.ign}"/>`
          : `<div class="modal-img-placeholder"><i class="fas fa-user-shield"></i></div>`}
        <div class="modal-meta">
          <div class="modal-ign">${p.ign} <span style="font-size:0.6rem;color:#c8972a;font-family:var(--font-hd);letter-spacing:0.15em;vertical-align:middle;">⭐ ADMIN</span></div>
          <div class="modal-realname">${p.name}</div>
          <div class="modal-bio">${p.bio || ''}</div>
          <div class="modal-socials">
            ${p.social?.instagram ? `<a href="${p.social.instagram}" target="_blank"><i class="fab fa-instagram"></i></a>` : ''}
            ${p.social?.discord   ? `<a href="${p.social.discord}"   target="_blank"><i class="fab fa-discord"></i></a>`   : ''}
          </div>
        </div>`;
      if (bdy) bdy.innerHTML = `
        <div class="modal-section-title">Admin Details</div>
        <div class="modal-details-grid">
          <div class="modal-detail-item"><label>Real Name</label><span>${p.name}</span></div>
          <div class="modal-detail-item"><label>Email</label><span>${p.email || '—'}</span></div>
          <div class="modal-detail-item"><label>Contact</label><span>${p.contact || '—'}</span></div>
          <div class="modal-detail-item"><label>Location</label><span>${p.address || '—'}</span></div>
        </div>`;
      const overlay = document.getElementById('playerModal');
      if (overlay) { overlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
    };
    return () => { delete window.__openAdminModal; };
  }, [admins]);

  /* ── Effect 6: achievements ── */
  useEffect(() => {
    function renderAchievements(data) {
      const grid = document.getElementById('achievementsGrid');
      if (!grid) return;
      const showAll = showAllAchievementsRef.current;
      const visible = showAll ? data : data.slice(0, 8);

      let cards = visible.map(a => `
        <div class="achieve-card reveal">
          <div class="achieve-card-top"></div>
          <div class="achieve-card-body">
            <div class="achieve-icon">${a.icon || '🏆'}</div>
            <div class="achieve-date">${a.date || 'Unknown Date'}</div>
            <div class="achieve-title">${a.title || 'Achievement'}</div>
            <div class="achieve-desc">${a.desc || 'No description available'}</div>
            <span class="achieve-badge">${a.badge || 'Champion'}</span>
          </div>
        </div>
      `).join('');

      if (!showAll && data[8]) {
        cards += `
          <div class="see-more-card">
            <div class="preview-achievement">
              <div class="achieve-card reveal">
                <div class="achieve-card-top"></div>
                <div class="achieve-card-body">
                  <div class="achieve-icon">${data[8].icon || '🏆'}</div>
                  <div class="achieve-date">${data[8].date || 'Unknown Date'}</div>
                  <div class="achieve-title">${data[8].title || 'Achievement'}</div>
                  <div class="achieve-desc">${data[8].desc || 'No description available'}</div>
                  <span class="achieve-badge">${data[8].badge || 'Champion'}</span>
                </div>
              </div>
            </div>
            <button class="see-more-btn" onclick="window.__toggleAchievements()">SEE MORE</button>
          </div>`;
      }

      if (showAll) {
        cards += `
          <div class="show-less-wrap">
            <button class="show-less-btn" onclick="window.__toggleAchievements()">SHOW LESS</button>
          </div>`;
      }

      grid.innerHTML = cards;
      grid.querySelectorAll('.reveal').forEach(el => revealObsRef.current?.observe(el));
    }

    renderAchievements(achievements);

    window.__toggleAchievements = () => {
      showAllAchievementsRef.current = !showAllAchievementsRef.current;
      renderAchievements(achievements);
    };

    return () => { delete window.__toggleAchievements; };
  }, [achievements]);

  /* ── Effect 7: gallery ── */
  useEffect(() => {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;
    const orientationCache = {};

    function getOrientation(src) {
      return new Promise((resolve) => {
        if (orientationCache[src]) return resolve(orientationCache[src]);
        const img = new Image();
        img.onload  = () => {
          const ratio       = img.naturalWidth / img.naturalHeight;
          const orientation = ratio < 0.9 ? 'portrait' : 'landscape';
          orientationCache[src] = orientation;
          resolve(orientation);
        };
        img.onerror = () => resolve('landscape');
        img.src = src;
      });
    }

    async function renderGallery() {
      if (!gallery?.length) {
        grid.innerHTML = `<div class="gallery-placeholder"><i class="fas fa-image"></i><span>No Images Found</span></div>`;
        return;
      }
      const duplicatedGallery = [...gallery, ...gallery];
      const orientations = await Promise.all(
        duplicatedGallery.map(item => item.src ? getOrientation(item.src) : Promise.resolve('landscape'))
      );
      const html = duplicatedGallery.map((item, i) => {
        const orientation = orientations[i];
        return `
          <div class="gallery-item ${orientation}" onclick="window.__openLightbox('${item.src}','${item.caption || ''}')">
            <img src="${item.src}" alt="${item.caption || ''}" loading="lazy" />
            <div class="gallery-item-overlay">
              <span class="gallery-item-caption">${item.caption || ''}</span>
            </div>
          </div>`;
      }).join('');
      grid.innerHTML = html;
    }

    renderGallery();
  }, [gallery]);

  /* ── Lightbox ── */
  useEffect(() => {
    window.__openLightbox = (src, caption = '') => {
      const lightbox     = document.getElementById('galleryLightbox');
      const image        = document.getElementById('galleryLightboxImg');
      const captionText  = document.getElementById('galleryLightboxCaption');
      if (!lightbox || !image) return;
      image.src           = src;
      captionText.innerText = caption || '';
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    };
    window.__closeLightbox = () => {
      const lightbox = document.getElementById('galleryLightbox');
      if (!lightbox) return;
      lightbox.classList.remove('open');
      document.body.style.overflow = 'auto';
    };
    return () => { delete window.__openLightbox; delete window.__closeLightbox; };
  }, []);

  /* ── Effect 8: tournaments ── */
  useEffect(() => {
    const grid = document.getElementById('tournamentsGrid');
    if (!grid) return;
    const cls   = { live: 'status-live', upcoming: 'status-upcoming', completed: 'status-completed' };
    const label = { live: '🔴 LIVE NOW', upcoming: '📅 UPCOMING', completed: '✅ COMPLETED' };
    grid.innerHTML = tournaments.map(t => {
      const status = t.status || 'upcoming';
      return `
        <div class="tournament-card reveal">
          <span class="tournament-status ${cls[status]}">${label[status]}</span>
          <div class="tournament-name">${t.name}</div>
          <div class="tournament-game">${t.game}</div>
          <div class="tournament-meta">
            <div class="t-meta-item"><i class="fas fa-calendar"></i> ${t.date}</div>
            <div class="t-meta-item"><i class="fas fa-trophy"></i> ${t.prizePool}</div>
            <div class="t-meta-item"><i class="fas fa-users"></i> ${t.format}</div>
          </div>
        </div>`;
    }).join('');
    grid.querySelectorAll('.reveal').forEach(el => revealObsRef.current?.observe(el));
  }, [tournaments]);

  /* ── Fetch functions ── */
  const fetchPlayers = async () => {
    try { const res = await fetch(`${API}/players`); setPlayers(await res.json()); }
    catch (err) { console.log(err); }
  };
  const fetchAchievements = async () => {
    try { const res = await fetch(`${API}/achievements`); setAchievements(await res.json()); }
    catch (err) { console.log(err); }
  };
  const fetchGallery = async () => {
    try { const res = await fetch(`${API}/gallery`); setGallery(await res.json()); }
    catch (err) { console.log(err); }
  };
  const fetchTournaments = async () => {
    try { const res = await fetch(`${API}/tournaments`); setTournaments(await res.json()); }
    catch (err) { console.log(err); }
  };

  const [formData, setFormData] = useState({
    name: '', email: '', subject: 'Sponsorship Inquiry', message: '',
  });
  const [formState, setFormState] = useState('idle');
  const [formError, setFormError] = useState('');

  function handleInput(e) {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function submitForm() {
    const { name, email, subject, message } = formData;
    if (!name || !email || !message) { setFormError('Please fill in all required fields.'); return; }
    setFormState('loading'); setFormError('');
    try {
      const res  = await fetch(`${API}/contact`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setFormState('success');
      setFormData({ name: '', email: '', subject: 'Sponsorship Inquiry', message: '' });
    } catch (err) {
      setFormError(err.message);
      setFormState('error');
    }
  }

  /* ══════════════════════════════════════════════════════════════
    JSX
  ══════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* PAGE LOADER */}
      <div className="page-loader" id="pageLoader">
        <img className="loader-logo" src="https://i.imgur.com/placeholder.png"
          onError={(e) => { e.target.style.display = 'none'; }} alt="IDC" />
        <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: '1.4rem', fontWeight: '900', background: 'linear-gradient(90deg,#f0c060,#c8972a)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '0.15em' }}>IDC</div>
        <div className="loader-bar"><div className="loader-bar-fill"></div></div>
        <div className="loader-text">LOADING · IMMORTAL DE CAMPEONES</div>
      </div>

      {/* PARTICLE CANVAS */}
      <canvas id="particle-canvas"></canvas>

      {/* NAV */}
      <nav className="nav" id="mainNav">
        <div className="nav-logo">
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg,#c8972a,#ff7a00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Orbitron',sans-serif", fontWeight: '900', fontSize: '0.85rem', color: '#fff', boxShadow: '0 0 15px rgba(200,151,42,0.5)' }}>IDC</div>
          <span className="nav-logo-text">Immortal De Campeones</span>
        </div>
        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#about">About</a>
          <a href="#founders">Founders</a>
          <a href="#achievements">Achievements</a>
          {admins.length > 0 && <a href="#admins">Admins</a>}
          <a href="#players">Players</a>
          <a href="#gallery">Gallery</a>
          <a href="#tournaments">Tournaments</a>
          <a href="#contact">Contact</a>
        </div>
        {/* ✅ Fixed: uses ADMIN_URL env var instead of ../components/admin.jsx */}
        <a href={ADMIN_URL} target="_blank" rel="noopener noreferrer" className="nav-cta">Admin Panel</a>
        <div className="nav-hamburger" onClick={toggleMobile}>
          <span></span><span></span><span></span>
        </div>
      </nav>

      <div className="mobile-menu" id="mobileMenu">
        <a href="#home" onClick={closeMobile}>Home</a>
        <a href="#about" onClick={closeMobile}>About</a>
        <a href="#founders" onClick={closeMobile}>Founders</a>
        <a href="#achievements" onClick={closeMobile}>Achievements</a>
        {admins.length > 0 && <a href="#admins" onClick={closeMobile}>Admins</a>}
        <a href="#players" onClick={closeMobile}>Players</a>
        <a href="#gallery" onClick={closeMobile}>Gallery</a>
        <a href="#tournaments" onClick={closeMobile}>Tournaments</a>
        <a href="#contact" onClick={closeMobile}>Contact</a>
        {/* ✅ Fixed: uses ADMIN_URL env var */}
        <a href={ADMIN_URL} target="_blank" rel="noopener noreferrer">Admin Panel →</a>
      </div>

      {/* HERO */}
      <section className="hero" id="home">
        <div className="hero-bg"></div>
        <div className="hero-grid"></div>
        <div className="hero-content" style={{ pointerEvents: 'none', userSelect: 'none' }}>
          <div className="hero-badge" style={{ pointerEvents: 'auto' }}>
            <i className="fas fa-circle"></i> Est. 2022 · Professional Esports
          </div>
          <div style={{ width: '170px', height: '170px', margin: '0 auto 2rem', padding: '18px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(200,151,42,0.15),transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'float 6s ease-in-out infinite', filter: 'drop-shadow(0 0 30px rgba(200,151,42,0.4))' }}>
            <div style={{ width: '135px', height: '135px', borderRadius: '50%', border: '2px solid rgba(200,151,42,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/logo.png" alt="IDC Logo"
                style={{ width: '100%', height: '100%', objectFit: 'contain', overflow: 'hidden', transform: 'scale(1.1) translateY(1.8px) translateX(0.3px)' }}
                onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
          </div>
          <h1 className="hero-title">
            <span className="sub">Welcome to</span>
            <span>Immortal</span>
            <span>De Campeones</span>
          </h1>
          <div className="hero-divider"></div>
          <p className="hero-tagline">"We don't just play to compete — we play to conquer."</p>
          <div className="hero-actions" style={{ pointerEvents: 'auto' }}>
            <a href="#players" className="btn-primary">Meet The Roster</a>
            <a href="#achievements" className="btn-secondary">Our Legacy</a>
          </div>
        </div>
        <div style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }}>
          <Canvas shadows gl={{ alpha: true, antialias: true }} camera={{ position: [0, 3.5, 14], fov: 22 }} style={{ background: 'transparent' }}>
            <ambientLight intensity={0.7} />
            <directionalLight position={[5, 5, 5]} intensity={2} castShadow />
            <pointLight position={[-5, 3, 5]} intensity={3} color="#ff5a2a" />
            <Environment preset="sunset" />
            <Suspense fallback={null}>
              <DragonModel targetPosition={targetPosition} animation={animation} speed={speed} onReached={onReached} />
            </Suspense>
          </Canvas>
        </div>
        <div className="hero-scroll">
          <span>SCROLL</span>
          <div className="hero-scroll-line"></div>
        </div>
      </section>

      {/* STATS STRIP */}
      <div className="stats-strip reveal">
        <div className="stats-grid">
          {[
            [tournaments.length,  'Tournaments'],
            [players.length,      'Active Players'],
            [achievements.length, 'Achievements'],
            [`${today - 2022}`,   'Years Active'],
            ['92',                'Win Rate %'],
          ].map(([n, lbl]) => (
            <div className="stat-item" key={lbl}>
              <div className="stat-num" data-target={n}>0</div>
              <div className="stat-label">{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ABOUT */}
      <section className="section-pad" id="about">
        <div className="about-grid">
          <div className="about-visual reveal">
            <div className="about-logo-wrap">
              <div className="about-ring"></div>
              <div className="about-ring"></div>
              <div style={{ width: '68%', aspectRatio: '1', borderRadius: '50%', background: 'radial-gradient(circle,rgba(200,151,42,0.08),transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 2 }}>
                <div style={{ fontFamily: "'Orbitron'", fontSize: '4rem', fontWeight: '900', background: 'linear-gradient(135deg,#f0c060,#c8972a,#ff7a00)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 20px rgba(200,151,42,0.5))' }}>IDC</div>
              </div>
            </div>
          </div>
          <div className="about-text reveal">
            <h3>Our Story</h3>
            <h2>Born to <em>Dominate</em><br />the Arena</h2>
            <p>Immortal De Campeones (IDC) was founded in 2022 with one mission — to dominate the world of competitive eFootball through passion, discipline, and elite gameplay.</p>
            <p>Built by players who live for the game, IDC represents more than just an esports squad. We are a family of competitors driven by ambition, teamwork, and the hunger to become champions.</p>
            <p>From intense league battles to high-stakes tournaments, IDC fields top-tier eFootball players known for their skill, consistency, and winning mentality. Every match is played with pride, strategy, and the determination to leave our mark on the esports scene.</p>
            <p>At IDC, victory is not just a goal — it's our identity. Because legends aren't born overnight. They are built match by match, trophy by trophy.</p>
            <div className="about-pills">
              <span className="pill">⚽ Efootball</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOUNDERS */}
      <section className="section-pad founders-section" id="founders">
        <div className="section-header reveal">
          <div className="section-eyebrow">Leadership Origins</div>
          <h2 className="section-title">The <em>Founders</em></h2>
          <p className="section-subtitle">The visionaries who built IDC from the ground up — their legacy is eternal.</p>
        </div>
        <div className="founders-grid">
          {FOUNDERS.map((f) => (
            <div className="founder-card reveal" key={f.role}>
              <div className="founder-card-top"></div>
              <div className="founder-role-badge">{f.icon} {f.role.toUpperCase()}</div>
              <div className="founder-img-wrap">
                {f.image
                  ? <img className="founder-img" src={f.image} alt={f.ign} />
                  : <div className="founder-img-placeholder"><i className="fas fa-user-shield"></i></div>}
                <div className="founder-ring"></div>
              </div>
              <div className="founder-ign">{f.ign}</div>
              <div className="founder-name">{f.name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ACHIEVEMENTS */}
      <section className="section-pad achievements" id="achievements">
        <div className="section-header reveal">
          <div className="section-eyebrow">Trophy Room</div>
          <h2 className="section-title">Our <em>Achievements</em></h2>
          <p className="section-subtitle">Every title, every trophy — built on sweat, strategy, and relentless grind.</p>
        </div>
        <div className="achieve-grid" id="achievementsGrid"></div>
        <div id="achievementsBtn"></div>
      </section>

      {/* ADMINS */}
      <section className="section-pad admins-section" id="admins" style={{ display: admins.length > 0 ? 'block' : 'none' }}>
        <div className="section-header reveal">
          <div className="section-eyebrow">Leadership</div>
          <h2 className="section-title">Meet Our <em>Admins</em></h2>
          <p className="section-subtitle">The minds behind the machine — guiding IDC to glory.</p>
        </div>
        <div className="admins-carousel-wrap" id="adminsCarouselWrap">
          <div className="admins-carousel-viewport" id="adminsViewport">
            <div className="admins-carousel-track" id="adminsTrack"></div>
          </div>
        </div>
      </section>

      {/* PLAYERS */}
      <section className="section-pad" id="players">
        <div className="section-header reveal">
          <div className="section-eyebrow">The Roster</div>
          <h2 className="section-title"><em>Meet</em> Our Players</h2>
          <p className="section-subtitle">The warriors who carry the IDC banner into every arena.</p>
        </div>
        <div className="players-controls reveal">
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input type="text" id="playerSearch" placeholder="Search players..."
              onInput={() => window.__filterPlayers?.()} />
          </div>
        </div>
        <div className="players-grid" id="playersGrid"></div>
      </section>

      {/* GALLERY */}
      <section className="section-pad gallery" id="gallery">
        <div className="section-header reveal">
          <div className="section-eyebrow">Media</div>
          <h2 className="section-title">IDC <em>Gallery</em></h2>
          <p className="section-subtitle">Moments that define us — captured forever.</p>
        </div>
        <div className="gallery-scroll-wrap">
          <div className="gallery-grid" id="galleryGrid"></div>
        </div>
      </section>

      <div className="gallery-lightbox" id="galleryLightbox" onClick={() => window.__closeLightbox()}>
        <button className="gallery-lightbox-close">✕</button>
        <img id="galleryLightboxImg" alt="" />
        <div className="gallery-lightbox-caption" id="galleryLightboxCaption"></div>
      </div>

      {/* TOURNAMENTS */}
      <section className="section-pad" id="tournaments">
        <div className="section-header reveal">
          <div className="section-eyebrow">Schedule</div>
          <h2 className="section-title">Upcoming <em>Tournaments</em></h2>
          <p className="section-subtitle">Track our journey through the competitive circuit.</p>
        </div>
        <div className="tournaments-grid" id="tournamentsGrid"></div>
      </section>

      {/* DISCORD + TRIALS */}
      <div className="discord-section reveal">
        <div className="discord-duo">
          <div className="discord-card">
            <div className="discord-icon"><i className="fab fa-discord"></i></div>
            <h2>Join the <em style={{ color: '#5865f2' }}>IDC Community</em></h2>
            <p>Connect with fellow fans, get match updates, and interact with the players directly. Our Discord server is the pulse of the IDC universe.</p>
            <a href="https://discord.gg/68RcVNrM9" target="_blank" rel="noopener noreferrer" className="btn-discord">
              <i className="fab fa-discord"></i> Join Our Discord
            </a>
          </div>
          <div className="discord-card trials-card">
            <div className="discord-icon" style={{ color: '#c8972a', filter: 'drop-shadow(0 0 16px rgba(200,151,42,0.5))' }}>
              <i className="fas fa-gamepad"></i>
            </div>
            <h2>Apply for <em style={{ color: '#c8972a' }}>IDC Trials</em></h2>
            <p>Think you have what it takes to wear the IDC badge? Submit your trial application and our scouts will reach out to evaluate your skills.</p>
            <a href="https://wa.me/+917003938733" target="_blank" rel="noopener noreferrer" className="btn-discord btn-trials">
              <i className="fas fa-trophy"></i> Apply for Trials
            </a>
          </div>
        </div>
      </div>

      {/* CONTACT */}
      <section className="section-pad contact" id="contact">
        <div className="section-header reveal">
          <div className="section-eyebrow">Get in Touch</div>
          <h2 className="section-title"><em>Contact</em> IDC</h2>
        </div>
        <div className="contact-grid">
          <div className="contact-info reveal">
            <h3>Reach Out</h3>
            <h2>Let's Talk<br /><em>Champions.</em></h2>
            <p>Whether you're interested in sponsorship, collaboration, player tryouts,
              or just want to connect with the IDC family — we're always open.</p>
            <div className="contact-links">
              {[
                { icon: 'fas fa-envelope', label: 'Email Us',   value: 'contact @ immortaldecampeons@gmail.com' },
                { icon: 'fab fa-discord',  label: 'Discord',    value: 'discord.gg/⚽ IDC OFFICIAL SERVER 🏆' },
                { icon: 'fab fa-instagram',label: 'Instagram',  value: '@immortal_de_campeones' },
              ].map(({ icon, label, value }) => (
                <div className="contact-link" key={label}>
                  <div className="contact-link-icon"><i className={icon}></i></div>
                  <div className="contact-link-text"><span>{label}</span><strong>{value}</strong></div>
                </div>
              ))}
            </div>
          </div>

          <div className="contact-form reveal">
            {formState === 'success' ? (
              <div className="form-success">
                <div className="form-success-icon">✅</div>
                <h3>Message Sent!</h3>
                <p>We've received your message and will get back to you soon. Check your email for confirmation.</p>
                <button className="form-submit" style={{ marginTop: '1.5rem' }} onClick={() => setFormState('idle')}>
                  Send Another <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            ) : (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label>Your Name <span style={{ color: 'var(--ember-1)' }}>*</span></label>
                    <input type="text" name="name" placeholder="Your Name" value={formData.name} onChange={handleInput} />
                  </div>
                  <div className="form-group">
                    <label>Email <span style={{ color: 'var(--ember-1)' }}>*</span></label>
                    <input type="email" name="email" placeholder="Email for contact" value={formData.email} onChange={handleInput} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Subject</label>
                  <select name="subject" value={formData.subject} onChange={handleInput}>
                    <option>Sponsorship Inquiry</option>
                    <option>Player Tryout</option>
                    <option>Collaboration</option>
                    <option>General</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Message <span style={{ color: 'var(--ember-1)' }}>*</span></label>
                  <textarea name="message" placeholder="Tell us more..." value={formData.message} onChange={handleInput} />
                </div>
                {formError && (
                  <div className="form-error">
                    <i className="fas fa-exclamation-circle"></i> {formError}
                  </div>
                )}
                <button className="form-submit" onClick={submitForm} disabled={formState === 'loading'}>
                  {formState === 'loading'
                    ? <><i className="fas fa-spinner fa-spin"></i> Sending...</>
                    : <>Send Message <i className="fas fa-arrow-right"></i></>}
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo">
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg,#c8972a,#ff7a00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Orbitron',sans-serif", fontWeight: '900', fontSize: '0.8rem', color: '#fff' }}>IDC</div>
              <span className="footer-logo-text">Immortal De Campeones</span>
            </div>
            <p className="footer-tagline">We are IDC — a band of relentless competitors united by one goal: immortality in the arena of champions.</p>
            <div className="footer-socials">
              {[
                { name: 'instagram', link: 'https://www.instagram.com/immortal_de_campeones/' },
                { name: 'discord',   link: 'https://discord.gg/68RcVNrM9' },
                { name: 'facebook',  link: 'https://www.facebook.com/profile.php?id=61568829924803&mibextid=ZbWKwL&utm_source=ig&utm_medium=social&utm_content=link_in_bio' },
              ].map((s) => (
                <a href={s.link} key={s.name} target="_blank" rel="noopener noreferrer">
                  <i className={`fab fa-${s.name}`}></i>
                </a>
              ))}
            </div>
          </div>
          <div className="footer-col">
            <h4>Navigation</h4>
            <ul>
              <li><a href="#home">Home</a></li>
              <li><a href="#about">About Us</a></li>
              <li><a href="#founders">Founders</a></li>
              <li><a href="#achievements">Achievements</a></li>
              <li><a href="#players">Players</a></li>
              <li><a href="#gallery">Gallery</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Compete</h4>
            <ul>
              <li><a href="#tournaments">Tournaments</a></li>
              <li><a href="#contact">Tryouts</a></li>
              <li><a href="#">Match History</a></li>
              <li><a href="#">Rankings</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Connect</h4>
            <ul>
              <li><a href="#">Sponsorship</a></li>
              <li><a href="#">Discord</a></li>
              <li><a href="#contact">Contact</a></li>
              {/* ✅ Fixed: uses ADMIN_URL env var */}
              <li><a href={ADMIN_URL} target="_blank" rel="noopener noreferrer">Admin</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Immortal De Campeones. All rights reserved.</p>
          <span>IDC ESPORTS · BORN IMMORTAL</span>
        </div>
      </footer>

      {/* PLAYER MODAL */}
      <div className="modal-overlay" id="playerModal">
        <div className="modal">
          <button className="modal-close" onClick={closeModal}><i className="fas fa-times"></i></button>
          <div className="modal-header" id="modalHeader"></div>
          <div className="modal-body" id="modalBody"></div>
        </div>
      </div>

      {/* LIGHTBOX */}
      <div className="lightbox" id="lightbox" onClick={closeLightbox}>
        <span className="lightbox-close"><i className="fas fa-times"></i></span>
        <img id="lightboxImg" src="" alt="" onClick={e => e.stopPropagation()} />
      </div>

      {/* TOAST */}
      <div className="toast-container" id="toastContainer"></div>
    </>
  );
}

export default App;