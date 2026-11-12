"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import Icon from "@/components/Icon";

import Link from "next/link";
import { useScrollReveal } from "@/hooks/useScrollReveal";

import honeymoon from '@/app/assets/honeymoon.jpeg'
import honeymoon2 from '@/app/assets/honeymoon-.jpeg'
import packgaes from '@/app/assets/packages-bg.jpg'   
import double from '@/app/assets/honeymoon-2.jpeg'   
import group from '@/app/assets/Group Luxury.jpg'   
import family from '@/app/assets/villa-family.jpg'   
import Image from "next/image";

const images = {

packgaes,


} as const;

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

export default function PackagesPage() {
  return (
    <>
      <Header />

      {/* Hero */}
      <header className="relative h-[614px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-primary/30 z-10" />
        <div
          className="absolute inset-0 w-full h-full bg-cover"
          style={{ backgroundImage: `url('${images.packgaes.src}')` }}
        />
        <div className="relative z-20 text-center px-4 max-w-4xl">
          <h1 className="font-display-lg text-display-lg text-white mb-6">
            Choose the Perfect Stay Package
          </h1>
          <p className="font-body-lg text-body-lg text-white/90 max-w-2xl mx-auto">
            Discover curated experiences tailored for intimate escapes, family
            gatherings, and rejuvenating retreats.
          </p>
        </div>
      </header>

      {/* Packages Bento Grid */}
      <section className="py-section-gap px-margin-mobile md:px-margin-desktop bg-ivory">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter max-w-7xl mx-auto">
          {/* Honeymoon Suite */}
          <SectionReveal className="md:col-span-8">
            <div className="group relative bg-white rounded-xl overflow-hidden border border-mist hover:shadow-xl transition-all duration-500">
              <div className="h-96 md:h-[500px] overflow-hidden">
                <Image
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  src={honeymoon}
                  width={100}
                  height={100}
                  alt="Honeymoon Suite"
                />
              </div>
              <div className="p-8">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="font-label-md text-label-md text-tertiary uppercase tracking-widest mb-2 block">
                      Romantic Getaway
                    </span>
                    <h3 className="font-headline-md text-headline-md text-primary">
                      Suite Honeymoon
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="font-headline-sm text-headline-sm text-primary">
                      Rs. 45k
                    </span>
                    <p className="font-caption text-caption text-outline">
                      per night
                    </p>
                  </div>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant mb-6 max-w-xl">
                  Our premier honeymoon offering. Enjoy the ultimate privacy of
                  our most spacious suite.
                </p>
                <Link
                  href="/booking"
                  className="bg-primary text-white px-8 py-3 rounded-full font-label-lg uppercase tracking-widest hover:bg-secondary transition-colors inline-block"
                >
                  Select Package
                </Link>
              </div>
            </div>
          </SectionReveal>

          {/* One Double Room Honeymoon */}
          <SectionReveal className="md:col-span-4" delay={100}>
            <div className="group relative bg-white rounded-xl overflow-hidden border border-mist hover:shadow-xl transition-all duration-500">
              <div className="h-64 md:h-80 overflow-hidden">
                <Image
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  src={honeymoon2}
                  height={100}
                  width={100}
                  alt="Double Room Honeymoon"
                />
              </div>
              <div className="p-6">
                <span className="font-label-md text-label-md text-tertiary uppercase tracking-widest mb-1 block">
                  Intimate Luxury
                </span>
                <h3 className="font-headline-sm text-headline-sm text-primary mb-2">
                  One Double Room Honeymoon
                </h3>
                <div className="flex justify-between items-center mt-4">
                  <span className="font-headline-sm text-headline-sm text-primary">
                    Rs. 35k
                  </span>
                  <Link
                    href="/booking"
                    className="text-primary font-label-lg uppercase tracking-widest border-b border-primary pb-1"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          </SectionReveal>

          {/* 4BR Villa + Family Suite */}
          <SectionReveal className="md:col-span-4" delay={200}>
            <div className="group relative bg-white rounded-xl overflow-hidden border border-mist hover:shadow-xl transition-all duration-500">
              <div className="h-64 md:h-80 overflow-hidden">
                <Image
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  src={family}
                  width={100}
                  height={100}
                  alt="4BR Villa + Family Suite"
                />
              </div>
              <div className="p-6">
                <span className="font-label-md text-label-md text-tertiary uppercase tracking-widest mb-1 block">
                  Ultimate Family Escape
                </span>
                <h3 className="font-headline-sm text-headline-sm text-primary mb-2">
                  4BR Villa + Family Suite
                </h3>
                <div className="flex justify-between items-center mt-4">
                  <span className="font-headline-sm text-headline-sm text-primary">
                    Rs. 95k
                  </span>
                  <Link
                    href="/booking"
                    className="text-primary font-label-lg uppercase tracking-widest border-b border-primary pb-1"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          </SectionReveal>

          {/* 4BR Villa */}
          <SectionReveal className="md:col-span-4" delay={100}>
            <div className="group relative bg-white rounded-xl overflow-hidden border border-mist hover:shadow-xl transition-all duration-500">
              <div className="h-64 md:h-80 overflow-hidden">
                <Image
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  src={group}
                  width={100}
                  height={100}
                  alt="4BR Villa"
                />
              </div>
              <div className="p-6">
                <span className="font-label-md text-label-md text-tertiary uppercase tracking-widest mb-1 block">
                  Group Luxury
                </span>
                <h3 className="font-headline-sm text-headline-sm text-primary mb-2">
                  4BR Villa
                </h3>
                <div className="flex justify-between items-center mt-4">
                  <span className="font-headline-sm text-headline-sm text-primary">
                    Rs. 75k
                  </span>
                  <Link
                    href="/booking"
                    className="text-primary font-label-lg uppercase tracking-widest border-b border-primary pb-1"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          </SectionReveal>

          {/* Standard Double Room */}
          <SectionReveal className="md:col-span-4" delay={200}>
            <div className="group relative bg-white rounded-xl overflow-hidden border border-mist hover:shadow-xl transition-all duration-500">
              <div className="h-64 md:h-80 overflow-hidden">
                <Image
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  src={double}
                  width={100}
                  height={100}
                  alt="Standard Double Room"
                />
              </div>
              <div className="p-6">
                <span className="font-label-md text-label-md text-tertiary uppercase tracking-widest mb-1 block">
                  Essential Serenity
                </span>
                <h3 className="font-headline-sm text-headline-sm text-primary mb-2">
                  One Double Room
                </h3>
                <div className="flex justify-between items-center mt-4">
                  <span className="font-headline-sm text-headline-sm text-primary">
                    Rs. 20k
                  </span>
                  <Link
                    href="/booking"
                    className="text-primary font-label-lg uppercase tracking-widest border-b border-primary pb-1"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Meal Plan Table */}
      <SectionReveal>
        <section className="py-section-gap px-margin-mobile md:px-margin-desktop bg-white">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="font-headline-lg text-headline-lg text-primary mb-4">
              Meal Plan Options
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Customize your culinary journey with our flexible dining
              arrangements.
            </p>
          </div>
          <div className="hidden md:block overflow-hidden rounded-xl border border-mist shadow-sm max-w-4xl mx-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="p-6 font-label-lg uppercase tracking-widest">Plan Type</th>
                  <th className="p-6 font-label-lg uppercase tracking-widest">Included Meals</th>
                  <th className="p-6 font-label-lg uppercase tracking-widest">Dining Style</th>
                  <th className="p-6 font-label-lg uppercase tracking-widest text-right">Premium Level</th>
                </tr>
              </thead>
              <tbody className="font-body-md text-on-surface-variant">
                {[
                  { plan: "Bed & Breakfast (BB)", meals: "Organic Morning Spread", style: "Buffet or In-room", level: "Standard Luxury" },
                  { plan: "Half Board (HB)", meals: "Breakfast + Choice of Lunch or Dinner", style: "3-Course Set Menu", level: "Enhanced Experience" },
                  { plan: "Full Board (FB)", meals: "Breakfast, Lunch, and Dinner", style: "Gourmet Chef's Table", level: "Ultimate Indulgence" },
                ].map((row, i) => (
                  <tr
                    key={row.plan}
                    className={`${i % 2 === 0 ? "bg-white" : "bg-ivory/30"} border-b font-normal border-mist hover:bg-ivory transition-colors`}
                  >
                    <td className="p-6 font-normal text-primary">{row.plan}</td>
                    <td className="p-6">{row.meals}</td>
                    <td className="p-6">{row.style}</td>
                    <td className="p-6 text-right">{row.level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-4 max-w-4xl mx-auto">
            {[
              { plan: "Bed & Breakfast (BB)", desc: "Organic Morning Spread included.", level: "Standard Luxury" },
              { plan: "Half Board (HB)", desc: "Breakfast plus your choice of Lunch or Dinner.", level: "Enhanced Experience" },
              { plan: "Full Board (FB)", desc: "All three daily meals featuring our Gourmet Chef's Table.", level: "Ultimate Indulgence" },
            ].map((row) => (
              <div key={row.plan} className="bg-ivory p-6 rounded-xl border border-mist">
                <h4 className="font-headline-sm text-headline-sm text-primary mb-2">{row.plan}</h4>
                <p className="text-on-surface-variant mb-2">{row.desc}</p>
                <div className="text-caption text-outline uppercase tracking-wider">{row.level}</div>
              </div>
            ))}
          </div>
        </section>
      </SectionReveal>

      {/* Final CTA */}
      <SectionReveal>
        <section className="py-section-gap px-margin-mobile md:px-margin-desktop bg-secondary-fixed">
          <div className="max-w-5xl mx-auto text-center flex flex-col items-center">
            <div className="w-16 h-[2px] bg-primary mb-8" />
            <h2 className="font-headline-lg text-headline-lg text-primary mb-6">
              Not sure which package is right for you?
            </h2>
            <p className="font-body-lg text-body-lg text-secondary mb-12 max-w-2xl">
              Our concierge team is available 24/7 to help you design a bespoke stay.
            </p>
            <div className="flex flex-col md:flex-row gap-6">
              <a
                href="https://wa.me/94771234567"
                target="_blank"
                className="flex items-center gap-3 bg-white text-primary px-10 py-4 rounded-full font-label-lg uppercase tracking-widest border border-primary hover:bg-mist transition-all group"
              >
                <Icon name="chat" className="text-green-600" />
                Chat on WhatsApp
              </a>
              <a
                href="tel:+94771234567"
                className="flex items-center gap-3 bg-primary text-white px-10 py-4 rounded-full font-label-lg uppercase tracking-widest hover:opacity-90 transition-all"
              >
                <Icon name="call" />
                Call Concierge
              </a>
            </div>
          </div>
        </section>
      </SectionReveal>

      <Footer />
      <WhatsAppButton />
    </>
  );
}
