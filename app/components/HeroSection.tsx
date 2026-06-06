'use client';

import Image from 'next/image';

export default function HeroSection() {
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
          <Image
            src="/pallasdb-icon-clean.svg"
            alt="PallasDB"
            width={64}
            height={64}
            priority
          />

        </nav>

        {/* Hero */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 pb-24">
          <div className="hero-content">
            <h1
              className="font-serif text-white leading-[1.02] tracking-tight"
              style={{
                fontSize: 'clamp(1.5rem, 7vw, 7rem)',
                animationDelay: '0.1s',
                fontWeight: 400,
                fontVariationSettings: '"opsz" 144, "SOFT" 50, "WONK" 1',
              }}
            >
              <span className="inline-flex items-center gap-3 sm:gap-4 whitespace-nowrap">
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
              </span>
              <br />
              <span className="inline-flex items-center gap-3 sm:gap-4">
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
              </span>
            </h1>

            <div
              className="mt-10 flex flex-wrap items-center justify-center gap-4"
              style={{ animationDelay: '0.4s' }}
            >
              <a
                href="https://github.com/pallasdb/pallasdb"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-3 text-sm font-mono uppercase tracking-[0.15em] text-white rounded-full
                  bg-white/15 backdrop-blur-md border border-white/25
                  shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]
                  hover:bg-white/25 transition-all duration-200"
              >
                View GitHub
              </a>
              <a
                href="https://pallasdb.github.io/docs/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-3 text-sm font-mono uppercase tracking-[0.15em] text-white/80 rounded-full
                  bg-white/5 backdrop-blur-md border border-white/15
                  shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]
                  hover:bg-white/12 hover:text-white transition-all duration-200"
              >
                Read Docs
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
