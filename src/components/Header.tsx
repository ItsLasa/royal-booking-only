"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion, Variants } from "framer-motion";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/facilities", label: "Facilities" },
  { href: "/packages", label: "Packages" },
  { href: "/contact", label: "Contact" },
] as const;

interface HeaderProps {
  transparent?: boolean;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

// ---- Animation variants ---------------------------------------------------

const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, transition: { duration: 0.25, ease: "easeIn" } },
};

const drawerVariants: Variants = {
  hidden: { x: "-100%", rotateZ: -1.5, skewY: 0.5 },
  visible: {
    x: 0,
    rotateZ: 0,
    skewY: 0,
    transition: { type: "spring", stiffness: 260, damping: 30, mass: 0.9 },
  },
  exit: {
    x: "-100%",
    transition: { duration: 0.4, ease: [0.7, 0, 0.84, 0] },
  },
};

// Container that staggers its children in
const navContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.18 },
  },
  exit: {
    transition: { staggerChildren: 0.03, staggerDirection: -1 },
  },
};

// Each link: clipped "curtain" reveal, text slides up from behind a mask
const navItemVariants: Variants = {
  hidden: { y: "110%" },
  visible: {
    y: "0%",
    transition: { type: "spring", stiffness: 300, damping: 26 },
  },
  exit: { y: "110%", transition: { duration: 0.25, ease: "easeIn" } },
};

const footerVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { delay: 0.4, duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function Header({ transparent = false }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  const menuId = useId();
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const isScrolled = window.scrollY > 28;
          setScrolled((prev) => (prev !== isScrolled ? isScrolled : prev));
          ticking = false;
        });
        ticking = true;
      }
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const { overflow } = document.documentElement.style;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = overflow;
    };
  }, [menuOpen]);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    toggleButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== "Tab" || !drawerRef.current) return;

      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    if (!menuOpen) return;
    const frame = requestAnimationFrame(() => {
      const firstLink = drawerRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      firstLink?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [menuOpen]);

  const headerDensity = scrolled ? "py-4" : "py-5 md:py-6";
  const isSeeThrough = transparent && !scrolled && !menuOpen;

  return (
    <>
      <header
        className={`fixed top-0 z-50 w-full text-white transition-all duration-300 ${headerDensity} ${
          isSeeThrough
            ? "border-b border-transparent bg-transparent"
            : "border-b border-white/15 bg-[#11170f]/80 shadow-[0_10px_30px_rgba(3,8,4,0.18)] backdrop-blur-md"
        }`}
        style={{ transform: "translateZ(0)", willChange: "transform" }}
      >
        <div className="mx-auto grid max-w-[1500px] grid-cols-[1fr_auto_1fr] items-center px-margin-mobile md:px-margin-desktop">
          {/* Menu button hidden/commented out as requested */}
          {/*
          <motion.button
            ref={toggleButtonRef}
            className="group flex w-fit items-center gap-4 text-[11px] font-medium uppercase leading-none tracking-[0.26em] text-white/88 transition-colors duration-300 hover:text-white"
            type="button"
            aria-label="Toggle menu"
            aria-haspopup="dialog"
            aria-controls={menuId}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            whileTap={{ scale: 0.94 }}
          >
            <span className="relative flex h-4 w-8 flex-col justify-center">
              <motion.span
                className="absolute h-px w-8 origin-center bg-white"
                animate={
                  menuOpen
                    ? { rotate: 45, y: 0, width: 32 }
                    : { rotate: 0, y: -4, width: 32 }
                }
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
              />
              <motion.span
                className="absolute h-px bg-white/75 origin-center"
                animate={
                  menuOpen
                    ? { rotate: -45, y: 0, width: 32, opacity: 1 }
                    : { rotate: 0, y: 4, width: 20, opacity: 1 }
                }
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
              />
            </span>
            <span className="hidden sm:inline text-[15px] ">{menuOpen ? "Close" : "Menu"}</span>
          </motion.button>
          */}
          <div aria-hidden="true" />

          <Link
            href="/"
            className="justify-self-center whitespace-nowrap transition-opacity duration-300 hover:opacity-80"
          >
            <img
              src="/logo.png"
              alt="Royal Mansion"
              className="h-12 w-auto md:h-14"
              width={200}
              height={56}
              decoding="async"
            />
          </Link>

          {/* Booking buttons hidden/commented out as requested */}
          {/*
          <nav className="hidden items-center justify-end gap-8 md:flex xl:gap-11" aria-label="Primary navigation">
            <Link
              href="/booking"
              aria-current={pathname === "/booking" ? "page" : undefined}
              className={`group relative inline-flex items-center border border-white/30 px-5 py-2.5 text-[16px] uppercase leading-none tracking-[0.24em] transition-all duration-300 ${
                pathname === "/booking"
                  ? "border-white bg-white text-[#11170f]"
                  : "text-white/90 hover:border-white hover:bg-white hover:text-[#11170f]"
              }`}
            >
              Booking
            </Link>
          </nav>

          <Link
            href="/booking"
            className="justify-self-end text-[10px] font-semibold uppercase leading-none tracking-[0.22em] text-white/86 transition-colors duration-300 hover:text-white active:scale-[0.98] md:hidden"
          >
            Book
          </Link>
          */}
          <div aria-hidden="true" />
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="overlay"
            className="fixed inset-0 z-[55] bg-[#11170f]/55 backdrop-blur-sm"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={prefersReducedMotion ? { duration: 0 } : undefined}
            onClick={closeMenu}
            aria-hidden="true"
          />
        )}

        {menuOpen && (
          <motion.aside
            key="drawer"
            id={menuId}
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className="fixed inset-y-0 left-0 z-[60] flex w-[min(88vw,390px)] flex-col border-r border-white/12 bg-[#f8f5ef] shadow-[24px_0_80px_rgba(10,14,9,0.22)]"
            style={{ transformOrigin: "left center" }}
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={prefersReducedMotion ? { duration: 0 } : undefined}
          >
            <motion.div
              className="flex items-start justify-between px-7 pb-8 pt-9"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: prefersReducedMotion ? 0 : 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <div>
                <div className="text-[28px] leading-none tracking-[0.1em] text-primary">
                  Royal Mansion
                </div>
                <p className="mt-3 max-w-[24ch] text-sm leading-relaxed text-on-surface-variant">
                  Private resort living in Pussallawa.
                </p>
              </div>
              <motion.button
                className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/12 text-primary/70"
                type="button"
                aria-label="Close menu"
                onClick={closeMenu}
                whileHover={{ rotate: 90, borderColor: "rgba(0,0,0,0.24)" }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
              >
                <span className="relative block h-4 w-4" aria-hidden="true">
                  <span className="absolute left-1/2 top-1/2 h-px w-5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-current" />
                  <span className="absolute left-1/2 top-1/2 h-px w-5 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-current" />
                </span>
              </motion.button>
            </motion.div>

            <motion.nav
              className="flex flex-1 flex-col overflow-y-auto border-y border-primary/10 px-3 py-5"
              aria-label="Menu navigation"
              variants={navContainerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <div key={link.href} className="overflow-hidden">
                    <motion.div variants={navItemVariants}>
                      <Link
                        href={link.href}
                        aria-current={isActive ? "page" : undefined}
                        className={`group flex items-center justify-between px-4 py-4 text-[25px] leading-none tracking-[0.03em] transition-colors duration-300 ${
                          isActive ? "text-primary" : "text-primary/58 hover:text-primary"
                        }`}
                      >
                        <span>{link.label}</span>
                        <motion.span
                          className={`h-px bg-primary ${isActive ? "w-10" : "w-4"}`}
                          whileHover={{ width: 40 }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </Link>
                    </motion.div>
                  </div>
                );
              })}
            </motion.nav>

            <motion.div
              className="space-y-5 px-7 py-7"
              variants={footerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/booking"
                  className="flex w-full items-center justify-center border border-primary bg-primary px-6 py-4 text-[11px] font-sans uppercase tracking-[0.24em] text-on-primary transition-colors duration-300 hover:bg-transparent hover:text-primary"
                >
                  Book Your Stay
                </Link>
              </motion.div>
              <div className="grid grid-cols-3 gap-3 text-center text-[10px] uppercase tracking-[0.18em] text-primary/42">
                <span>Villa</span>
                <span>Dining</span>
                <span>Views</span>
              </div>
            </motion.div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
