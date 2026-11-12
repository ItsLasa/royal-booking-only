"use client";

import { ReactLenis } from "lenis/react";
import "lenis/dist/lenis.css";

interface LenisWrapperProps {
  children: React.ReactNode;
}

export default function LenisWrapper({ children }: LenisWrapperProps) {
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.1,
        duration: 1.0,
        smoothWheel: true,
        syncTouch: false,
        wheelMultiplier: 1,
        touchMultiplier: 1,
      }}
    >
      {children}
    </ReactLenis>
  );
}
