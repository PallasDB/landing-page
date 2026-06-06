'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export default function HeroSection() {
  const [shown, setShown] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setShown(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  function setShifts(activeIdx: number | null, phase: 'in' | 'out') {
    if (!groupRef.current) return;
    const cs = getComputedStyle(document.documentElement);
    const num = (name: string, fb: number) => {
      const v = parseFloat(cs.getPropertyValue(name));
      return Number.isFinite(v) ? v : fb;
    };
    const ease = (name: string, fb: string) =>
      cs.getPropertyValue(name).trim() || fb;

    const lift    = num('--avatar-lift', -4);
    const falloff = num('--avatar-falloff', 0.45);
    const scale   = num('--avatar-scale', 1.05);
    const tf      = phase === 'out'
      ? ease('--avatar-ease-out', 'cubic-bezier(0.34, 3.85, 0.64, 1)')
      : ease('--avatar-ease-in',  'cubic-bezier(0.22, 1, 0.36, 1)');

    groupRef.current.querySelectorAll<HTMLElement>('.t-avatar').forEach((el, i) => {
      el.style.transitionTimingFunction = tf;
      if (activeIdx == null) {
        el.style.setProperty('--shift', '0px');
        el.style.setProperty('--scale-active', '1');
        return;
      }
      const d = Math.abs(i - activeIdx);
      el.style.setProperty('--shift', (lift * Math.pow(falloff, d)).toFixed(3) + 'px');
      el.style.setProperty('--scale-active', i === activeIdx ? String(scale) : '1');
    });
  }

  return (
    <section
      className="relative min-h-screen overflow-hidden"
      style={{
        backgroundImage: 'url(/background.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >

      {/* Readability gradients — vignette + center darkening */}
      <div
        className="pointer-events-none absolute inset-0 z-[5]"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at center, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0.15) 70%, rgba(0,0,0,0) 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-[5]"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.75) 100%)',
        }}
      />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navbar */}
        <nav className="w-full max-w-7xl mx-auto flex items-center justify-between px-8 py-6">
          <span className="t-tt-wrap">
            <Link href="/" className="t-tt-trigger" aria-describedby="tt-logo">
              <Image
                src="/pallasdb-icon-clean.svg"
                alt="PallasDB"
                width={64}
                height={64}
                priority
              />
            </Link>
            <span className="t-tt" id="tt-logo" role="tooltip">PallasDB</span>
          </span>

        </nav>

        {/* Hero */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 pb-24">
          <div className="hero-content">
            <h1
              className={`t-stagger font-serif text-white leading-[1.02] tracking-tight${shown ? ' is-shown' : ''}`}
              style={{
                fontSize: 'clamp(1.5rem, 7vw, 7rem)',
                animation: 'none',
                fontWeight: 400,
                fontVariationSettings: '"opsz" 144, "SOFT" 50, "WONK" 1',
              }}
            >
              <div className="t-stagger-line t-stagger-line--1 gap-3 sm:gap-4 whitespace-nowrap">
                a distributed kv store
                <Image
                  src="/icons/database.png"
                  alt="Storage"
                  width={96}
                  height={96}
                  priority
                  className="inline-block align-baseline"
                  style={{
                    height: '0.85em',
                    width: 'auto',
                    transform: 'translateY(0.08em)',
                  }}
                />
              </div>
              <div className="t-stagger-line t-stagger-line--2 gap-3 sm:gap-4">
                written in Go
                <Image
                  src="/icons/golang.png"
                  alt="Go"
                  width={96}
                  height={96}
                  priority
                  className="inline-block align-baseline"
                  style={{
                    height: '0.85em',
                    width: 'auto',
                    transform: 'translateY(0.08em)',
                  }}
                />
              </div>
            </h1>

            <div
              ref={groupRef}
              className="t-avatar-group mt-10 flex flex-wrap items-center justify-center gap-4"
              style={{ animationDelay: '0.4s' }}
              onMouseLeave={() => setShifts(null, 'out')}
            >
              <div className="t-avatar" onMouseEnter={() => setShifts(0, 'in')}>
                <a
                  href="https://github.com/pallasdb/pallasdb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-3 text-sm font-mono uppercase tracking-[0.15em] text-white rounded-full
                    bg-white/35 backdrop-blur-md border border-white/45
                    shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]
                    hover:bg-white/45 transition-[background-color,border-color,color,box-shadow] duration-200"
                >
                  View GitHub
                </a>
              </div>
              <div className="t-avatar" onMouseEnter={() => setShifts(1, 'in')}>
                <a
                  href="https://pallasdb.github.io/docs/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-3 text-sm font-mono uppercase tracking-[0.15em] text-white/80 rounded-full
                    bg-white/20 backdrop-blur-md border border-white/35
                    shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]
                    hover:bg-white/35 hover:text-white transition-[background-color,border-color,color,box-shadow] duration-200"
                >
                  Read Docs
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
