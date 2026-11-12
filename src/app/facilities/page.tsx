"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import Icon from "@/components/Icon";
import Image from "next/image";

import Link from "next/link";
import { useScrollReveal } from "@/hooks/useScrollReveal";

import tv from '@/app/assets/tv.avif'
import games from '@/app/assets/games.avif'
import wifi from '@/app/assets/wifi.avif'
import pool from '@/app/assets/pool.avif'
import chef from '@/app/assets/chef.avif'
import mountain from '@/app/assets/mountain.avif'
import one from '@/app/assets/1.jpg'
import food1 from '@/app/assets/food1.avif'
import food2 from '@/app/assets/food2.avif'


const images = {
  tv,
  games,
  wifi,
  pool,
  chef,
  mountain,
  one,
  food1,
  food2
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

export default function FacilitiesPage() {
  return (
    <>
      <Header />

      {/* Hero */}
      <header className="relative h-[614px] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 z-0 scale-105"
          style={{ backgroundImage: `url('${images.mountain.src}')` }}
        />
        <div className="absolute inset-0 bg-primary/20 z-10" />
        <div className="relative z-20 text-center px-margin-mobile md:px-0 max-w-3xl">
          <h1 className="font-display-lg text-display-lg text-white mb-6">
            Everything You Need for a Complete Resort Stay
          </h1>
          <p className="font-body-lg text-body-lg text-white/90">
            Experience the pinnacle of Modern Sri Lankan Luxury in our
            sanctuary.
          </p>
        </div>
      </header>

      {/* Facilities Bento Grid */}
      <section className="py-section-gap px-margin-mobile md:px-margin-desktop bg-ivory">
        <div className="max-w-7xl mx-auto">
          <SectionReveal>
            <div className="mb-16">
              <span className="font-label-lg text-label-lg text-tertiary uppercase tracking-widest mb-4 block">
                World Class Amenities
              </span>
              <h2 className="font-headline-lg text-headline-lg text-primary">
                Unrivaled Hospitality
              </h2>
            </div>
          </SectionReveal>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
            {[
              {
                cols: "md:col-span-8",
                img: images.tv,
                icon: "tv",
                title: "TV Room",
                desc: "Private cinematic experience with premium sound.",
                delay: 0,
              },
              {
                cols: "md:col-span-4",
                img: images.pool,
                icon: "pool",
                title: "Infinity Pool",
                desc: "Boundless views of the forest.",
                delay: 100,
              },
              {
                cols: "md:col-span-4",
                img: images.chef,
                icon: "restaurant",
                title: "Villa Chef",
                desc: "Custom gourmet dining experiences.",
                delay: 200,
              },
              {
                cols: "md:col-span-4",
                img: images.wifi,
                icon: "wifi",
                title: "Free Wi-Fi",
                desc: "High-speed connectivity everywhere.",
                delay: 300,
              },
              {
                cols: "md:col-span-4",
                img: images.games,
                icon: "sports_esports",
                title: "Games",
                desc: "Recreation for all ages.",
                delay: 400,
              },
            ].map((item) => (
              <div
                key={item.title}
                className={`${item.cols} group relative overflow-hidden rounded-xl h-[400px] border border-mist`}
                data-reveal-delay={item.delay}
              >
               <Image
  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
  src={item.img}
  alt={item.title}
  fill
/>
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent" />
                <div className="absolute bottom-0 left-0 p-8 flex items-center gap-4">
                  <Icon name={item.icon} className="text-white text-4xl" />
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-white">
                      {item.title}
                    </h3>
                    <p className="text-white/80 font-body-md">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Wonderful Staff */}
      <section className="py-section-gap px-margin-mobile md:px-margin-desktop bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-gutter items-center">
          <SectionReveal>
            <span className="font-label-lg text-label-lg text-tertiary uppercase tracking-widest mb-4 block">
              Dedicated Service
            </span>
            <h2 className="font-headline-lg text-headline-lg text-primary mb-8">
              A Team That Truly Cares
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-12">
              Our staff are the heart of Royal Mansion.
            </p>
            <div className="grid grid-cols-2 gap-8">
              {[
                { icon: "skillet", title: "Expert Chef", desc: "Master of local and global cuisines." },
                { icon: "concierge", title: "Butler Service", desc: "At your beck and call 24/7." },
                { icon: "cleaning_services", title: "Housekeeping", desc: "Impeccable attention to detail." },
                { icon: "security", title: "Security", desc: "Safe and private 24/7 protection." },
              ].map((item, i) => (
                <div key={item.title} className="flex gap-4" data-reveal-delay={i * 80}>
                  <Icon name={item.icon} className="text-tertiary text-3xl" />
                  <div>
                    <h4 className="font-label-lg text-label-lg text-primary uppercase">
                      {item.title}
                    </h4>
                    <p className="font-caption text-caption text-outline">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </SectionReveal>
          <SectionReveal delay={200}>
            <div className="relative h-[600px]">
              <div className="absolute inset-0 rounded-2xl overflow-hidden border border-mist shadow-lg rotate-2 z-10">
                <img
                  className="w-full h-full object-cover"
                  src={images.one.src}
                  alt="Villa butler"
                />
              </div>
              <div className="absolute inset-0 bg-secondary-fixed/30 -rotate-2 rounded-2xl" />
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Delicious Food */}
      <section className="py-section-gap bg-primary text-on-primary">
        <div className="px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto">
          <SectionReveal>
            <div className="text-center mb-20">
              <h2 className="font-display-lg text-display-lg mb-6">
                Culinary Excellence
              </h2>
              <p className="font-body-lg text-body-lg text-on-primary/70 max-w-2xl mx-auto">
                Savor the authentic flavors of Sri Lanka or enjoy familiar Western
                favorites.
              </p>
            </div>
          </SectionReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div data-reveal-delay={100}>
              <div className="h-[500px] rounded-2xl overflow-hidden mb-8 border border-white/10">
                <img
                  className="w-full h-full object-cover"
                  src={images.food1.src}
                  alt="Sri Lankan Rice and Curry"
                />
              </div>
              <h3 className="font-headline-md text-headline-md mb-4">
                Authentic Sri Lankan
              </h3>
              <p className="font-body-md text-body-md text-on-primary/80">
                Experience a symphony of spices and local organic produce.
              </p>
            </div>
            <div data-reveal-delay={300}>
              <div className="h-[500px] rounded-2xl overflow-hidden mb-8 border border-white/10">
                <img
                  className="w-full h-full object-cover"
                  src={images.food2.src}
                  alt="Western gourmet dinner"
                />
              </div>
              <h3 className="font-headline-md text-headline-md mb-4">
                Western Classics
              </h3>
              <p className="font-body-md text-body-md text-on-primary/80">
                Expertly prepared international dishes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Practical Info */}
      <section className="py-section-gap px-margin-mobile md:px-margin-desktop bg-surface">
        <div className="max-w-7xl mx-auto">
          <SectionReveal>
            <div className="mb-16">
              <h2 className="font-headline-lg text-headline-lg text-primary">
                Practical Information
              </h2>
            </div>
          </SectionReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {[
              { icon: "outdoor_grill", title: "BBQ Facilities", desc: "Host a memorable evening under the stars." },
              { icon: "schedule", title: "Check-In / Out", desc: "Check-in: 2:00 PM. Check-out: 11:00 AM." },
              { icon: "waves", title: "Pool Access", desc: "Our infinity pool is available 24/7." },
            ].map((item, i) => (
              <div
                key={item.title}
                className="p-8 bg-white rounded-xl border border-mist hover:shadow-xl transition-shadow"
                data-reveal-delay={i * 120}
              >
                <Icon name={item.icon} className="text-tertiary text-4xl mb-6" />
                <h3 className="font-headline-sm text-headline-sm text-primary mb-4">
                  {item.title}
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <SectionReveal>
        <section className="py-section-gap px-margin-mobile md:px-margin-desktop text-center bg-ivory">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display-lg text-display-lg text-primary mb-8">
              Ready to Start Your Retreat?
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-12">
              Whether it&apos;s a family gathering or a private escape, we have
              the perfect package for you.
            </p>
            <div className="flex flex-col md:flex-row justify-center gap-6">
              <Link
                href="/packages"
                className="bg-primary text-on-primary px-10 py-4 rounded-full font-label-lg uppercase tracking-widest hover:bg-primary/90 transition-all scale-100 hover:scale-105 active:scale-95"
              >
                View Packages
              </Link>
              <Link
                href="/booking"
                className="border-2 border-primary text-primary px-10 py-4 rounded-full font-label-lg uppercase tracking-widest hover:bg-mist transition-all scale-100 hover:scale-105 active:scale-95"
              >
                Book Now
              </Link>
            </div>
          </div>
        </section>
      </SectionReveal>

      <Footer />
      <WhatsAppButton />
    </>
  );
}
