"use client";

import { useEffect, useRef } from "react";

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Set initial state with GPU acceleration hints
    el.style.opacity = "0";
    el.style.transform = "translate3d(0, 24px, 0)";
    el.style.willChange = "transform, opacity";
    el.style.transition =
      "opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)";

    // Cache stagger children once instead of querying repeatedly on scroll
    const staggerChildren = Array.from(
      el.querySelectorAll<HTMLElement>("[data-reveal-delay]")
    ).filter((child) => child !== el);

    staggerChildren.forEach((child) => {
      child.style.opacity = "0";
      child.style.transform = "translate3d(0, 18px, 0)";
      child.style.willChange = "transform, opacity";
      child.style.transition =
        "opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)";
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            const delay = parseInt(
              target.getAttribute("data-reveal-delay") || "0",
              10
            );

            // Animate container
            setTimeout(() => {
              target.style.opacity = "1";
              target.style.transform = "translate3d(0, 0, 0)";
              // Clean up will-change after transition ends to free GPU VRAM
              setTimeout(() => {
                target.style.willChange = "auto";
              }, 650);
            }, delay);

            // Animate cached stagger children
            staggerChildren.forEach((child) => {
              const childDelay = parseInt(
                child.getAttribute("data-reveal-delay") || "0",
                10
              );
              setTimeout(() => {
                child.style.opacity = "1";
                child.style.transform = "translate3d(0, 0, 0)";
                setTimeout(() => {
                  child.style.willChange = "auto";
                }, 550);
              }, childDelay);
            });

            observer.unobserve(target);
          }
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -20px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}
