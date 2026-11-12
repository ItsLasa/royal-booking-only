"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import Icon from "@/components/Icon";
import { motion, Variants } from "framer-motion";
import Link from "next/link";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import Image from "next/image";
import mountain from '@/app/assets/mountain.avif'
import one from '@/app/assets/1.jpg'
import two from '@/app/assets/2.jpg'
import three from '@/app/assets/3.jpg'
import four from '@/app/assets/4.jpg'
import five from '@/app/assets/5.jpg'
import six from '@/app/assets/6.jpg'
import pool from '@/app/assets/pool.avif'
import food1 from '@/app/assets/food1.avif'
import room from '@/app/assets/room.jpg'

import gallery1 from '@/app/assets/gallery1.webp'
import gallery2 from '@/app/assets/gallery2.webp'
import gallery3 from '@/app/assets/gallery3.webp'
import gallery4 from '@/app/assets/gallery4.webp'
import book1 from '@/app/assets/book2.jpg'
import book2 from '@/app/assets/book1.jpg'
import breathing from '@/app/assets/breathing.avif'
import view from '@/app/assets/view.avif'
const images = {

  mountain,
  one,
  two,
  three,
  four,
  five,
  six,
  breathing,
  view,
  pool,
  gallery1,
  gallery2,
  gallery3,
  gallery4,
  food1,
  book1,
  book2,
  room


} as const;

const amenities = [
  { icon: "villa", label: "Private Villa" },
  { icon: "pool", label: "Infinity Pool" },
  { icon: "restaurant", label: "In-house Chef" },
  { icon: "landscape", label: "Mountain Views" },
  { icon: "wifi", label: "Free Wi-Fi" },
  { icon: "ac_unit", label: "A/C Rooms" },
] as const;

function SectionReveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useScrollReveal<HTMLDivElement>();
  return (
    <div ref={ref} data-reveal-delay={delay} className={className}>
      {children}
    </div>
  );
}

// Parent controls the stagger
const gridVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.09, delayChildren: 0.1 },
  },
};

// Each item: rises up with a little spring "pop" and slight rotation settle
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.85, rotate: -4 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotate: 0,
    transition: { type: "spring", stiffness: 260, damping: 20, mass: 0.7 },
  },
};

// Background disc behind the icon
const discVariants: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", stiffness: 200, damping: 16, delay: 0.05 },
  },
};

export default function HomePage() {
  return (
    <>
      <style jsx>{`
        .hero-gradient {
          background: linear-gradient(
            to bottom,
            rgba(6, 27, 14, 0.4),
            rgba(6, 27, 14, 0.7)
          );
        }
      `}</style>

      <Header transparent={true} />

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div
            className="w-full h-full bg-cover bg-center scale-105 transition-transform duration-[10s] ease-out"
            style={{ backgroundImage: `url('${images.one.src}')` }}
          />
          <div className="absolute inset-0 hero-gradient" />
        </div>
        <div className="relative z-10 text-center px-margin-mobile md:max-w-4xl">
          <h1 className="font-cossette-texte text-headline-lg-mobile md:text-display-lg text-white mb-6 leading-tight">
            Royal Mansion Resort Villas
          </h1>
          <p className="font-body-inter text-[20px]  text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
            Experience luxury, tranquillity, breathtaking mountain views, and
            unforgettable private villa stays in the heart of Pussallawa.
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <Link
              href="/booking"
              className="w-full md:w-auto bg-primary text-on-primary px-10 py-4 rounded-full font-label-lg text-label-lg uppercase tracking-widest hover:bg-opacity-90 transition-all text-center"
            >
              Book Your Stay
            </Link>
            <Link
              href="/packages"
              className="w-full md:w-auto border border-white/40 text-white bg-white/10 backdrop-blur-sm px-10 py-4 rounded-full font-label-lg text-label-lg uppercase tracking-widest hover:bg-white/20 transition-all text-center"
            >
              Explore Packages
            </Link>
            <a
              href="https://wa.me/94771234567"
              target="_blank"
              className="flex items-center gap-3 text-white font-label-lg text-label-lg uppercase tracking-widest group"
            >
              <span className="p-2 rounded-full border border-white/20 group-hover:bg-white/10 transition-colors">
                <Icon name="chat" className="align-middle" />
              </span>
              WhatsApp Us
            </a>
          </div>
        </div>
      </section>

      {/* Trust Strip */}
       <SectionReveal>
      <section className="bg-white py-16 border-b border-mist relative z-20 -mt-16 mx-4 md:mx-margin-desktop rounded-xl shadow-xl overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center justify-items-center"
            variants={gridVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
          >
            {amenities.map((item) => (
              <motion.div
                key={item.label}
                className="group relative flex flex-col items-center gap-3"
                variants={itemVariants}
              >
                {/* Icon + hover ring */}
                <motion.div
                  className="relative flex h-16 w-16 items-center justify-center"
                  whileHover="hover"
                  initial="rest"
                  animate="rest"
                >
                  <motion.span
                    className="absolute inset-0 rounded-full border border-primary/20"
                    variants={{
                      rest: { scale: 0.7, opacity: 0 },
                      hover: {
                        scale: 1,
                        opacity: 1,
                        transition: { type: "spring", stiffness: 300, damping: 20 },
                      },
                    }}
                  />
                  <motion.div
                    variants={{
                      rest: { y: 0, rotate: 0, scale: 1 },
                      hover: {
                        y: -6,
                        rotate: [0, -8, 8, -4, 0],
                        scale: 1.12,
                        transition: {
                          y: { type: "spring", stiffness: 300, damping: 12 },
                          scale: { type: "spring", stiffness: 300, damping: 12 },
                          rotate: { duration: 0.5, ease: "easeInOut" },
                        },
                      },
                    }}
                  >
                    <Icon name={item.icon} className="relative z-10 text-primary text-3xl" />
                  </motion.div>
                </motion.div>

                {/* Label with drawing underline */}
                <div className="flex flex-col items-center gap-1.5">
                  <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest text-center">
                    {item.label}
                  </span>
                  <motion.span
                    className="h-px bg-primary"
                    initial={{ width: 0 }}
                    whileHover={{ width: 24 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </SectionReveal>

      {/* Intro: Editorial Story */}
      <SectionReveal>
        <section className="py-section-gap px-margin-mobile md:px-margin-desktop bg-white">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="relative">
              <div className="aspect-[4/5] overflow-hidden rounded-xl">
                <img
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  src={images.two.src}
                  alt="Royal Mansion entrance"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
            <div className="space-y-8">
              <span className="font-label-lg text-label-lg text-tertiary uppercase tracking-[0.2em] block">
                Our Heritage
              </span>
              <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary leading-tight">
                Discover Our Story
              </h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                Royal Mansion isn&apos;t just a destination; it&apos;s a
                sanctuary born from the whispers of the Pussallawa mountains.
                We&apos;ve crafted a space where the rugged beauty of the forest
                meets the refined elegance of modern luxury.
              </p>
              <p className="font-body-md text-body-md text-on-surface-variant opacity-80 leading-relaxed">
                Our villa stands as a testament to Sri Lankan hospitality,
                reimagined for the global traveler.
              </p>
              <div className="pt-4">
                <Link
                  href="/about"
                  className="group flex items-center gap-4 font-label-lg text-label-lg uppercase tracking-widest text-primary border-b border-primary/20 pb-2 hover:border-primary transition-all w-fit"
                >
                  Learn more about us
                  <Icon
                    name="arrow_right_alt"
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* Featured Stays */}
      <SectionReveal>
        <section className="py-section-gap px-margin-mobile md:px-margin-desktop bg-surface-container-low">
          <div className="max-w-7xl mx-auto text-center mb-20">
            <span className="font-label-lg text-label-lg text-tertiary uppercase tracking-[0.2em] block mb-4">
              Accommodations
            </span>
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">
              Luxury Stays
            </h2>
          </div>
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {[
              {
                img: images.five.src,
                badge: "Popular",
                badgeClass: "bg-white/90 text-primary",
                title: "Double Room",
                desc: "Elegant space perfect for couples seeking a serene mountain escape.",
                price: "Rs. 20,000",
              },
              {
                img: images.room.src,
                badge: "Premium",
                badgeClass: "bg-tertiary text-white",
                title: "Suite Room",
                desc: "Unrivaled luxury with panoramic views and expansive private lounge area.",
                price: "Rs. 45,000",
                featured: true,
              },
              {
                img: images.four.src,
                badge: "",
                badgeClass: "",
                title: "Four-Bedroom Villa",
                desc: "The ultimate retreat for families. Complete privacy with full villa access.",
                price: "Rs. 75,000",
              },
            ].map((room, i) => (
              <div
                key={room.title}
                className={`bg-white rounded-xl overflow-hidden group shadow-sm hover:shadow-xl transition-all duration-500 border border-mist ${i === 1 ? "scale-105 z-10" : ""
                  }`}
                data-reveal-delay={i * 120}
              >
                <div className="h-80 overflow-hidden relative">
                  <img
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    src={room.img}
                    alt={room.title}
                    loading="lazy"
                    decoding="async"
                  />
                  {room.badge && (
                    <div
                      className={`absolute top-4 right-4 ${room.badgeClass} backdrop-blur-md px-4 py-1 rounded-full font-label-md text-label-md uppercase tracking-wider`}
                    >
                      {room.badge}
                    </div>
                  )}
                </div>
                <div className="p-8">
                  <h3 className="font-headline-sm text-headline-sm text-primary mb-2">
                    {room.title}
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mb-6">
                    {room.desc}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-primary font-bold text-lg">
                      {room.price}
                      <span className="text-on-surface-variant font-normal text-sm">
                        {" "}/ night
                      </span>
                    </span>
                    <Link
                      href="/booking"
                      className={`p-3 rounded-full transition-colors ${i === 1
                          ? "bg-primary text-on-primary hover:bg-opacity-90"
                          : "bg-mist text-primary hover:bg-primary hover:text-white"
                        }`}
                    >
                      <Icon name="arrow_forward" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </SectionReveal>

      {/* Experiences: Masonry Layout */}
      <SectionReveal>
        <section className="py-section-gap px-margin-mobile md:px-margin-desktop bg-white overflow-hidden">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-gutter">
            <div className="md:w-1/3 space-y-gutter">
              <div className="rounded-xl overflow-hidden h-[500px] cursor-pointer">
                <img
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                  src={images.book2.src}
                  alt="Infinity pool"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="bg-mist p-10 rounded-xl space-y-4">
                <h4 className="font-headline-sm text-headline-sm text-primary">
                  Mountain Sanctuary
                </h4>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Reconnect with yourself in the silence of the high hills.
                </p>
              </div>
            </div>
            <div className="md:w-2/3 space-y-gutter">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                <div className="rounded-xl overflow-hidden h-[300px] cursor-pointer">
                  <img
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    src={images.food1.src}
                    alt="Sri Lankan breakfast"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="rounded-xl overflow-hidden h-[300px] cursor-pointer">
                  <img
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    src={images.book1.src}
                    alt="Yoga on deck"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
              <div className="rounded-xl overflow-hidden h-[450px] relative cursor-pointer">
                <img
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                  src={images.six.src}
                  alt="Pussallawa hills view"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute bottom-10 left-10 text-white">
                  <h3 className="font-headline-md text-headline-md font-bold text-shadow-sm mb-2">
                    Breathtaking Vistas
                  </h3>
                  <p className="font-body-md text-body-md text-shadow-sm opacity-90">
                    Witness the majesty of Sri Lanka&apos;s hill country.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* Gallery Preview */}
      <SectionReveal>
        <section className="py-section-gap px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                images.gallery1,
                images.gallery2,
                images.gallery3,
                images.gallery4,
              ].map((src, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-lg group cursor-pointer aspect-square"
                  data-reveal-delay={i * 100}
                >
                  <Image
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    src={src}
                    alt={`Gallery image ${i + 1}`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-12 text-center">
              <Link
                href="/packages"
                className="bg-mist text-primary border border-primary/10 px-10 py-4 rounded-full font-label-lg text-label-lg uppercase tracking-widest hover:bg-primary hover:text-white transition-all inline-block"
              >
                View Full Gallery
              </Link>
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* Booking CTA */}
      <SectionReveal>
        <section className="relative py-32 px-margin-mobile flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div
              className="w-full h-full bg-cover bg-center transform-gpu"
              style={{
                backgroundImage: `url('${images.mountain.src}')`,
                transform: "translateZ(0)",
              }}
            />
            <div className="absolute inset-0 bg-primary/60" />
          </div>
          <div className="relative z-10 text-center max-w-3xl">
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-white mb-8">
              Ready for an Unforgettable Escape?
            </h2>
            <p className="font-body-lg text-body-lg text-white/90 mb-10 leading-relaxed">
              Your private mountain sanctuary is waiting.
            </p>
            <Link
              href="/booking"
              className="bg-white text-primary px-12 py-5 rounded-full font-label-lg text-label-lg uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-2xl inline-block"
            >
              Book Your Stay Now
            </Link>
          </div>
        </section>
      </SectionReveal>

      <Footer />
      <WhatsAppButton />
    </>
  );
}
