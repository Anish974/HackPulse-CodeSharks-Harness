import React, { useEffect, useRef, useState } from 'react';
import './AyusReactor.css';

const STATE_COLORS = {
  standby: '#38bdf8',
  listening: '#00f2fe',
  thinking: '#a855f7',
  speaking: '#34d399',
  alert: '#f59e0b'
};

const STATE_SUB = {
  standby: 'SYSTEM NOMINAL • AUTONOMOUS HARNESS ACTIVE',
  listening: 'RECEIVING COMMAND INPUT...',
  thinking: 'MULTI-AGENT COGNITIVE PLANNING...',
  speaking: 'STREAMING EXECUTED OPERATIONS SYNTHESIS...',
  alert: 'CRITICAL ACTION INTERCEPTED • AWAITING FOUNDER CLEARANCE'
};

export default function AyusReactor({
  currentState = 'standby',
  transcript = 'CodeSharks Ground Control active. Department agents operational.',
  onTriggerSweep
}) {
  const canvasRef = useRef(null);
  const [state, setState] = useState(currentState);
  const levelRef = useRef(0.2);
  const pulseRef = useRef(0);

  useEffect(() => {
    setState(currentState);
  }, [currentState]);

  const activeColor = STATE_COLORS[state] || STATE_COLORS.standby;

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let raf;
    const DPR = Math.min(2, window.devicePixelRatio || 1);

    function size() {
      const r = cv.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        cv.width = r.width * DPR;
        cv.height = r.height * DPR;
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      }
    }
    size();
    const ro = new ResizeObserver(size);
    ro.observe(cv);

    // Particles and Stars
    const particles = Array.from({ length: 48 }, () => ({
      a: Math.random() * Math.PI * 2,
      r: 25 + Math.random() * 45,
      spd: (Math.random() * 0.02 + 0.005) * (Math.random() < 0.5 ? -1 : 1),
      sz: Math.random() * 2 + 0.8,
    }));

    const hexToRgba = (hex, alpha) => {
      const c = hex.replace('#', '');
      const r = parseInt(c.substring(0, 2), 16);
      const g = parseInt(c.substring(2, 4), 16);
      const b = parseInt(c.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    let angle = 0;

    function render() {
      const w = cv.width / DPR;
      const h = cv.height / DPR;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      angle += 0.015;
      const time = performance.now() / 1000;
      const energyPulse = Math.sin(time * 3) * 0.15 + 0.85;

      // 1. Ambient Core Glow
      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 75);
      grad.addColorStop(0, hexToRgba(activeColor, 0.45 * energyPulse));
      grad.addColorStop(0.5, hexToRgba(activeColor, 0.15));
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 75, 0, Math.PI * 2);
      ctx.fill();

      // 2. Outer Rotating Reticle / HUD Rings
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.strokeStyle = hexToRgba(activeColor, 0.5);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([12, 10, 4, 10]);
      ctx.beginPath();
      ctx.arc(0, 0, 62, 0, Math.PI * 2);
      ctx.stroke();

      ctx.rotate(-angle * 1.8);
      ctx.strokeStyle = hexToRgba(activeColor, 0.7);
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, 46, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 3. Central Reactor Core
      ctx.beginPath();
      ctx.arc(cx, cy, 22 * energyPulse, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(activeColor, 0.85);
      ctx.shadowColor = activeColor;
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.shadowBlur = 0;

      // 4. Orbiting Energy Sparkles
      ctx.fillStyle = activeColor;
      for (const p of particles) {
        p.a += p.spd;
        const px = cx + Math.cos(p.a) * (p.r * energyPulse);
        const py = cy + Math.sin(p.a) * (p.r * energyPulse);
        ctx.beginPath();
        ctx.arc(px, py, p.sz, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(render);
    }

    render();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [activeColor]);

  return (
    <div className="ayus-reactor" style={{ '--ax': activeColor }}>
      <div className="ayus-reactor-canvas-wrap">
        <canvas ref={canvasRef} />
        <div className="ayus-scanlines" />
      </div>

      <div className="ayus-reactor-body">
        <div className="ayus-reactor-tagline">
          <div className="ayus-reactor-badge">
            <i />
            <span>AYUS REACTOR CORE • v2.6.4</span>
          </div>
          <div className="ayus-reactor-sub">
            {STATE_SUB[state] || STATE_SUB.standby}
          </div>
        </div>

        <div className="ayus-reactor-title">
          EXECUTIVE OPERATIONS HARNESS
          <small>[HUMAN-IN-THE-LOOP SECURE PERIMETER]</small>
        </div>

        <div className="ayus-reactor-transcript">
          &gt; {transcript}
        </div>

        <div className="ayus-reactor-controls">
          <button className="ayus-hud-btn" onClick={onTriggerSweep}>
            ⚡ INITIATE ENTERPRISE SWEEP
          </button>
          <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.72rem', color: '#64748b' }}>
            STATUS: <strong>{state.toUpperCase()}</strong> • 0 UNAPPROVED MUTATIONS
          </span>
        </div>
      </div>
    </div>
  );
}
