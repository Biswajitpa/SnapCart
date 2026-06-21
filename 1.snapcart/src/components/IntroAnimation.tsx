"use client";

import { useState, useEffect } from "react";

const TEXT = "SnapCart";
const LETTER_DELAY = 80; // ms between each letter appearing
const HOLD_DURATION = 900; // ms to hold before fading
const FADE_DURATION = 600; // ms fade out

export default function IntroAnimation({ children }: { children: React.ReactNode }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleCount(i);
      if (i === TEXT.length) {
        clearInterval(interval);
        setTimeout(() => {
          setFadeOut(true);
          setTimeout(() => setShowIntro(false), FADE_DURATION);
        }, HOLD_DURATION);
      }
    }, LETTER_DELAY);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {showIntro && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            background:
              "linear-gradient(120deg, #064e3b, #16a34a, #22c55e, #064e3b)",
            backgroundSize: "300% 300%",
            animation: "gradientShift 6s ease infinite",
            opacity: fadeOut ? 0 : 1,
            transition: `opacity ${FADE_DURATION}ms ease`,
            pointerEvents: fadeOut ? "none" : "auto",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: "500px",
              height: "500px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 70%)",
              animation: "pulseGlow 2.4s ease-in-out infinite",
            }}
          />

          <h1
            style={{
              position: "relative",
              fontSize: "4rem",
              fontWeight: 800,
              color: "#ffffff",
              fontFamily: "system-ui, sans-serif",
              letterSpacing: "0.03em",
              textShadow:
                "0 0 20px rgba(255,255,255,0.6), 0 0 40px rgba(74,222,128,0.8)",
              display: "flex",
            }}
          >
            {TEXT.split("").map((char, idx) => (
              <span
                key={idx}
                style={{
                  display: "inline-block",
                  opacity: idx < visibleCount ? 1 : 0,
                  transform:
                    idx < visibleCount
                      ? "translateY(0) scale(1)"
                      : "translateY(20px) scale(0.8)",
                  transition: "opacity 0.4s ease, transform 0.4s ease",
                }}
              >
                {char}
              </span>
            ))}
          </h1>

          <style>{`
            @keyframes gradientShift {
              0% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }
            @keyframes pulseGlow {
              0%, 100% { transform: scale(1); opacity: 0.6; }
              50% { transform: scale(1.15); opacity: 1; }
            }
          `}</style>
        </div>
      )}
      <div style={{ visibility: showIntro ? "hidden" : "visible" }}>
        {children}
      </div>
    </>
  );
}
