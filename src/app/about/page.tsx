"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import Icon from "@/components/Icon";

import Link from "next/link";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { images } from "@/lib/images";
import Image from "next/image";
import bg from '@/app/assets/about-bg.jpg'

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

export default function AboutPage() {
  return (
    <>
      <Header />

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-primary/20 z-10" />
          <Image
            className="object-cover scale-105 animate-pulse-slow"
            src={bg}
            fill
            priority
            sizes="100vw"
            alt="Luxury villa in Sri Lanka mountains"
          />
        </div>
        <div className="relative z-20 text-center text-on-primary px-margin-mobile md:px-margin-desktop">
          <span className="font-label-lg text-label-lg uppercase tracking-[0.3em] mb-6 block opacity-90">
            Discover Your Sanctuary
          </span>
          <h1 className="font-display-lg text-display-lg md:text-[80px] leading-tight mb-8">
            Welcome to <br /> Royal Mansion Resort
          </h1>
          <div className="w-24 h-px bg-on-primary mx-auto opacity-50" />
        </div>
        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 animate-bounce cursor-pointer"
          onClick={() =>
            document
              .getElementById("our-story")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        >
          <Icon name="expand_more" className="text-on-primary text-3xl" />
        </div>
      </section>

      {/* Our Story Section */}
      <section
        className="py-section-gap px-margin-mobile md:px-margin-desktop max-w-[1440px] mx-auto bg-ivory"
        id="our-story"
      >
        <div className="grid md:grid-cols-12 gap-gutter items-center">
          <SectionReveal className="md:col-span-5">
            <span className="font-label-lg text-label-lg text-tertiary uppercase tracking-widest mb-4 block">
              The Heritage
            </span>
            <h2 className="font-headline-lg text-headline-lg text-primary mb-8 leading-tight">
              A Whisper of Luxury in the Heart of Sri Lanka
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-6 leading-relaxed">
              Royal Mansion Resort was born from a vision to create a sanctuary
              where modern design harmonizes with the ancient rhythm of the
              Pussallawa hills.
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant/80 mb-10 leading-relaxed italic">
              &ldquo;Luxury is not loud; it is the silence of the mountains,
              the mist on the tea estates, and the warmth of Sri Lankan
              hospitality.&rdquo;
            </p>
            <button className="border-b border-primary text-primary font-label-lg uppercase tracking-widest pb-2 hover:text-tertiary transition-colors">
              Our Philosophy
            </button>
          </SectionReveal>
          <SectionReveal className="md:col-span-6 md:col-start-7" delay={150}>
            <div className="relative group">
              <img
                className="w-full aspect-[4/5] object-cover rounded-lg shadow-sm group-hover:scale-[1.02] transition-transform duration-700"
                src={images.luxuryInterior}
                alt="Hand-woven linen interior"
              />
              <div className="absolute -bottom-10 -left-10 hidden md:block w-64 h-80 bg-primary-container p-8 text-on-primary">
                <Icon name="nature" className="text-tertiary-fixed text-4xl mb-4" />
                <h4 className="font-headline-sm text-headline-sm mb-4">
                  Green Serenity
                </h4>
                <p className="font-caption text-caption opacity-80">
                  Surrounded by over 10 acres of protected forest and organic
                  gardens.
                </p>
              </div>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Editorial Nature Section */}
      <section className="bg-white py-section-gap">
        <div className="px-margin-mobile md:px-margin-desktop max-w-[1440px] mx-auto">
          <div className="flex flex-col md:flex-row-reverse gap-gutter items-center">
            <SectionReveal className="md:w-1/2">
              <h2 className="font-display-lg text-[48px] md:text-[56px] text-primary mb-8">
                Where Peace Finds You
              </h2>
              <div className="space-y-8">
                <div className="flex gap-6">
                  <span className="font-display-lg text-primary/10 text-6xl select-none">
                    01
                  </span>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-primary mb-2">
                      Morning Mist
                    </h3>
                    <p className="font-body-md text-on-surface-variant">
                      Wake up to the ethereal dance of clouds floating below
                      your balcony.
                    </p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <span className="font-display-lg text-primary/10 text-6xl select-none">
                    02
                  </span>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-primary mb-2">
                      Hillside Symphony
                    </h3>
                    <p className="font-body-md text-on-surface-variant">
                      Listen to the gentle rustle of leaves and the distant song
                      of tropical birds.
                    </p>
                  </div>
                </div>
              </div>
            </SectionReveal>
            <SectionReveal className="md:w-1/2" delay={150}>
              <img
                className="w-full aspect-video md:aspect-square object-cover rounded-xl grayscale hover:grayscale-0 transition-all duration-1000"
                src={images.mountainValley}
                alt="Panoramic mountain view"
              />
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* Facilities Icons */}
      <section className="py-section-gap px-margin-mobile md:px-margin-desktop bg-surface-container-low">
        <SectionReveal>
          <div className="max-w-[1200px] mx-auto text-center mb-16">
            <span className="font-label-lg text-label-lg text-tertiary uppercase tracking-widest mb-4 block">
              Refined Living
            </span>
            <h2 className="font-headline-lg text-headline-lg text-primary">
              Unparalleled Facilities
            </h2>
          </div>
        </SectionReveal>
        <SectionReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 max-w-[1200px] mx-auto">
            {[
              { icon: "balcony", title: "Private Balconies", desc: "Panoramic views from every room" },
              { icon: "bathtub", title: "En-suite Baths", desc: "Freestanding tubs with forest views" },
              { icon: "pool", title: "Infinity Pool", desc: "Temperature controlled hill-edge pool" },
              { icon: "chef_hat", title: "Private Chef", desc: "Curated Sri Lankan fusion cuisine" },
              { icon: "wifi", title: "High-speed Wi-Fi", desc: "Seamless connectivity in the clouds" },
              { icon: "fitness_center", title: "Wellness Hub", desc: "Yoga deck and boutique gymnasium" },
              { icon: "local_bar", title: "Sky Lounge", desc: "Craft cocktails with mountain vistas" },
              { icon: "concierge", title: "24/7 Concierge", desc: "Personalized tours and arrangements" },
            ].map((item, i) => (
              <div
                key={item.title}
                className="flex flex-col items-center text-center group"
                data-reveal-delay={i * 60}
              >
                <div className="w-16 h-16 rounded-full border border-outline-variant flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-on-primary transition-all duration-300">
                  <Icon name={item.icon} className="text-3xl" />
                </div>
                <h3 className="font-label-lg text-label-lg uppercase mb-2">
                  {item.title}
                </h3>
                <p className="font-caption text-caption text-on-surface-variant">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </SectionReveal>
      </section>

      {/* Best For Section */}
      <section className="py-section-gap px-margin-mobile md:px-margin-desktop">
        <SectionReveal>
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 max-w-[1440px] mx-auto">
            <div>
              <span className="font-label-lg text-label-lg text-tertiary uppercase tracking-widest mb-4 block">
                Curated For You
              </span>
              <h2 className="font-headline-lg text-headline-lg text-primary max-w-md">
                The Perfect Match for Every Traveler
              </h2>
            </div>
            <div className="hidden md:block">
              <p className="font-body-md text-on-surface-variant max-w-xs mb-4">
                Tailored experiences designed to exceed the expectations of our
                most discerning guests.
              </p>
            </div>
          </div>
        </SectionReveal>
        <SectionReveal>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter max-w-[1440px] mx-auto">
            {[
              { img: images.natureScenic, title: "Honeymooners", desc: "Intimate escapes with candlelit dinners and floral spa rituals." },
              { img: images.luxuryInterior, title: "Families", desc: "Spacious suites and engaging outdoor adventures for all ages." },
              { img: images.heroMountain, title: "Private Groups", desc: "Full villa buyouts for exclusive gatherings and celebrations." },
              { img: images.mountainValley, title: "Nature Escapes", desc: "For the soul seeking reconnection through hiking and bird watching." },
            ].map((item, i) => (
              <div
                key={item.title}
                className="relative group overflow-hidden rounded-xl h-[450px]"
                data-reveal-delay={i * 100}
              >
                <img
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  src={item.img}
                  alt={item.title}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent p-8 flex flex-col justify-end">
                  <h3 className="font-headline-sm text-on-primary mb-2">
                    {item.title}
                  </h3>
                  <p className="font-caption text-on-primary/80 mb-4">
                    {item.desc}
                  </p>
                  <span className="font-label-md text-on-primary uppercase tracking-widest flex items-center gap-2">
                    View Experience{" "}
                    <Icon name="arrow_forward" className="text-sm" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionReveal>
      </section>

      {/* Location Section */}
      <section className="py-section-gap bg-ivory">
        <div className="px-margin-mobile md:px-margin-desktop max-w-[1440px] mx-auto grid md:grid-cols-2 gap-gutter items-center">
          <SectionReveal>
            <span className="font-label-lg text-label-lg text-tertiary uppercase tracking-widest mb-4 block">
              The Destination
            </span>
            <h2 className="font-headline-lg text-headline-lg text-primary mb-6">
              Pussallawa: The Emerald Threshold
            </h2>
            <p className="font-body-lg text-on-surface-variant mb-8">
              Perched high above the tea-growing heartlands of Sri Lanka,
              Pussallawa offers a climate of eternal spring.
            </p>
            <div className="space-y-4 mb-10">
              <div className="flex items-center gap-4">
                <Icon name="location_on" className="text-primary" />
                <span className="font-body-md">Kandy: 45 minutes drive</span>
              </div>
              <div className="flex items-center gap-4">
                <Icon name="local_airport" className="text-primary" />
                <span className="font-body-md">Colombo Int. Airport: 3.5 hours drive</span>
              </div>
              <div className="flex items-center gap-4">
                <Icon name="explore" className="text-primary" />
                <span className="font-body-md">Nuwara Eliya: 1 hour drive</span>
              </div>
            </div>
            <Link
              href="/contact"
              className="bg-primary text-on-primary px-10 py-4 rounded-full font-label-lg uppercase tracking-widest hover:bg-tertiary transition-colors inline-flex items-center gap-3"
            >
              View on Map{" "}
              <Icon name="map" />
            </Link>
          </SectionReveal>
          <SectionReveal delay={150} className="h-[500px] rounded-2xl overflow-hidden shadow-xl">
            <img
              className="w-full h-full object-cover"
              src={images.villaAerial}
              alt="Pussallawa, Sri Lanka"
            />
          </SectionReveal>
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
    </>
  );
}
