"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

const LOTTIE_SRC =
  "https://lottie.host/a9e3f506-e3d0-493e-8d72-f6c7782b961f/UyHt7TSaUP.lottie";

const HOLD_AFTER_COMPLETE = 300; // ms after animation finishes before fading
const FADE_DURATION = 600; // ms fade out
const FALLBACK_DURATION = 3000; // ms — used if "complete" event never fires

export default function IntroAnimation({ children }: { children: React.ReactNode }) {
  const [showIntro, setShowIntro] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const playerRef = useRef<any>(null);

  const finish = () => {
    setFadeOut(true);
    setTimeout(() => setShowIntro(false), FADE_DURATION);
  };

  useEffect(() => {
    // Fallback in case the "complete" event doesn't fire (e.g. script fails to load)
    const fallback = setTimeout(finish, FALLBACK_DURATION);

    const el = playerRef.current;
    if (el) {
      const onComplete = () => {
        clearTimeout(fallback);
        setTimeout(finish, HOLD_AFTER_COMPLETE);
      };
      el.addEventListener("complete", onComplete);
      return () => {
        el.removeEventListener("complete", onComplete);
        clearTimeout(fallback);
      };
    }

    return () => clearTimeout(fallback);
  }, [scriptReady]);

  return (
    <>
      <Script
        src="https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.14/dist/dotlottie-wc.js"
        type="module"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />

      {showIntro && (
        <div className={`intro-overlay ${fadeOut ? "intro-fade-out" : ""}`} aria-hidden="true">
          <div className="intro-bg" />
          <div className="intro-glow" />
          <div className="intro-content">
            {/* @ts-expect-error custom element not typed */}
            <dotlottie-wc
              ref={playerRef}
              src={LOTTIE_SRC}
              autoplay
              style={{ width: "220px", height: "220px" }}
            />
            <h1 className="intro-text">SnapCart</h1>
            <div className="intro-tagline">Groceries in minutes</div>
          </div>
        </div>
      )}

      <div style={{ visibility: showIntro ? "hidden" : "visible" }}>{children}</div>

      <style jsx global>{`
        .intro-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          opacity: 1;
        }
        .intro-fade-out {
          opacity: 0;
          pointer-events: none;
        }
        .intro-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #052e1c 0%, #0f5132 35%, #15803d 65%, #052e1c 100%);
          background-size: 260% 260%;
          animation: introGradient 8s ease infinite;
        }
        .intro-glow {
          position: absolute;
          width: 60vmax;
          height: 60vmax;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(134, 239, 172, 0.35) 0%, rgba(134, 239, 172, 0) 70%);
          filter: blur(10px);
          animation: introPulse 3s ease-in-out infinite;
        }
        .intro-content {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .intro-text {
          font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
          font-weight: 700;
          font-size: clamp(2.2rem, 7vw, 3.6rem);
          letter-spacing: 0.01em;
          color: #ffffff;
          margin: 0;
          opacity: 0;
          animation: introTextIn 0.6s ease 0.3s forwards;
        }
        .intro-tagline {
          opacity: 0;
          color: rgba(255, 255, 255, 0.75);
          font-family: system-ui, sans-serif;
          font-size: 0.95rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          animation: introTextIn 0.6s ease 0.5s forwards;
        }

        @keyframes introGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes introPulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.12); opacity: 1; }
        }
        @keyframes introTextIn {
          to { opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .intro-bg, .intro-text, .intro-tagline {
            animation: none !important;
            opacity: 1 !important;
          }
          .intro-glow {
            animation: none !important;
            opacity: 0 !important;
          }
        }
      `}</style>
    </>
  );
}
