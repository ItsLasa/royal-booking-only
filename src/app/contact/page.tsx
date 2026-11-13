"use client";

import Header from "@/components/Header";
import Icon from "@/components/Icon";
import WhatsAppButton from "@/components/WhatsAppButton";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import Image from "next/image";
import bg from "@/app/assets/about-bg.jpg";

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

export default function ContactPage() {
  return (
    <>
      <Header />

      {/* Hero */}
      <section className="relative h-[614px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            className="object-cover"
            src={bg}
            alt="Luxury villa surrounded by Sri Lankan mountain scenery"
            fill
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/60 via-primary/30 to-primary/70" />
        </div>
        <div className="relative z-10 text-center px-margin-mobile md:px-margin-desktop">
          <span className="font-label-lg text-label-lg text-ivory uppercase tracking-[0.3em] mb-4 block drop-shadow">
            Concierge & Assistance
          </span>
          <h1 className="font-display-lg text-display-lg text-white mb-6 drop-shadow-lg">
            Welcome to Royal Mansion Resort
          </h1>
          <p className="font-body-lg text-body-lg text-white max-w-2xl mx-auto italic drop-shadow">
            How may we assist you in planning your sanctuary retreat?
          </p>
        </div>
      </section>

      {/* Contact Content */}
      <section className="px-margin-mobile md:px-margin-desktop py-section-gap max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Left: Contact Info */}
          <SectionReveal className="lg:col-span-5 space-y-12">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-primary mb-8">
                Reach Out to Us
              </h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant mb-12">
                Whether you are inquiring about a specific package or need
                assistance with your travel arrangements, our dedicated team is here.
              </p>
            </div>
            <div className="space-y-8">
              {[
                { icon: "location_on", title: "Our Location", content: <>No 142, Nuwara Eliya Road,<br />Pussallawa, Sri Lanka</> },
                { icon: "schedule", title: "Reception Hours", content: <>Monday – Sunday<br />7:30 AM – 11:00 PM</> },
                { icon: "phone_in_talk", title: "Direct Line", content: <a href="tel:+94764001245" className="text-on-surface-variant hover:text-tertiary transition-colors">+94 76 400 1245</a> },
                { icon: "mail", title: "Email Enquiries", content: <a href="mailto:info@royalmansionvilla.com" className="text-on-surface-variant hover:text-tertiary transition-colors">info@royalmansionvilla.com</a> },
              ].map((item, i) => (
                <div key={item.title} className="flex items-start gap-6 group" data-reveal-delay={i * 80}>
                  <div className="w-12 h-12 rounded-full border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 shrink-0">
                    <Icon name={item.icon} />
                  </div>
                  <div>
                    <h4 className="font-label-lg text-label-lg text-primary uppercase tracking-wider mb-1">{item.title}</h4>
                    <p className="text-on-surface-variant leading-relaxed">{item.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <SectionReveal delay={400}>
              <div className="pt-8">
                <h4 className="font-label-lg text-label-lg text-primary uppercase tracking-wider mb-6">Connect With Us</h4>
                <div className="flex gap-4">
                  {["public", "chat", "photo_camera", "video_library"].map((icon, i) => (
                    <a
                      key={icon}
                      className="w-10 h-10 rounded-full bg-mist flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all duration-300"
                      href="#"
                      data-reveal-delay={i * 80}
                    >
                      <Icon name={icon} className="text-sm" />
                    </a>
                  ))}
                </div>
              </div>
            </SectionReveal>
          </SectionReveal>

          {/* Right: Inquiry Form */}
          <SectionReveal className="lg:col-span-7" delay={150}>
            <div className="bg-white p-8 md:p-16 luxury-shadow rounded-xl border border-mist">
              <h3 className="font-headline-md text-headline-md text-primary mb-12 italic">Send an Inquiry</h3>
              <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface-variant uppercase mb-2 tracking-wide">Full Name</label>
                    <input className="w-full bg-mist border-none rounded-lg px-6 py-4 focus:ring-1 focus:ring-primary transition-all" placeholder="Your name" type="text" />
                  </div>
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface-variant uppercase mb-2 tracking-wide">Email Address</label>
                    <input className="w-full bg-mist border-none rounded-lg px-6 py-4 focus:ring-1 focus:ring-primary transition-all" placeholder="your@email.com" type="email" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface-variant uppercase mb-2 tracking-wide">Phone Number</label>
                    <input className="w-full bg-mist border-none rounded-lg px-6 py-4 focus:ring-1 focus:ring-primary transition-all" placeholder="+94 XX XXX XXXX" type="tel" />
                  </div>
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface-variant uppercase mb-2 tracking-wide">Select Package</label>
                    <select className="w-full bg-mist border-none rounded-lg px-6 py-4 focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer">
                      <option>Honeymoon Retreat</option>
                      <option>Mountain Adventure</option>
                      <option>Luxury Wellness</option>
                      <option>Custom Stay</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface-variant uppercase mb-2 tracking-wide">Travel Dates</label>
                    <input className="w-full bg-mist border-none rounded-lg px-6 py-4 focus:ring-1 focus:ring-primary transition-all" placeholder="DD/MM/YYYY" type="text" />
                  </div>
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface-variant uppercase mb-2 tracking-wide">Number of Guests</label>
                    <input className="w-full bg-mist border-none rounded-lg px-6 py-4 focus:ring-1 focus:ring-primary transition-all" min="1" placeholder="2" type="number" />
                  </div>
                </div>
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant uppercase mb-2 tracking-wide">Message</label>
                  <textarea className="w-full bg-mist border-none rounded-lg px-6 py-4 focus:ring-1 focus:ring-primary transition-all resize-none" placeholder="How can we make your stay perfect?" rows={4} />
                </div>
                <button className="w-full bg-primary text-on-primary py-5 rounded-full font-label-lg text-label-lg uppercase tracking-[0.2em] hover:bg-primary-container transition-all duration-500 transform hover:scale-[1.02] active:scale-95" type="submit">
                  Send Inquiry
                </button>
              </form>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Map Section */}
      <section className="h-[520px] w-full relative overflow-hidden">
        {/* Interactive Google Map embed (no API key required) */}
        <iframe
          title="Map of Royal Mansion Resort Villa, Pussallawa, Sri Lanka"
          src="https://maps.google.com/maps?q=7.10533,80.63667&z=15&hl=en&output=embed"
          className="w-full h-full border-0 grayscale-[20%] hover:grayscale-0 transition-all duration-700"
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
        {/* Soft gradient to blend the map into the page */}
        <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-surface to-transparent pointer-events-none" />
        {/* Info card */}
        <div className="absolute bottom-6 md:bottom-12 left-4 md:left-margin-desktop right-4 md:right-auto bg-white p-7 md:p-8 luxury-shadow rounded-lg md:max-w-sm border border-mist">
          <h5 className="font-headline-sm text-headline-sm text-primary mb-2">The Sanctuary</h5>
          <p className="text-on-surface-variant mb-1">No 142, Nuwara Eliya Road,</p>
          <p className="text-on-surface-variant mb-4">Pussallawa, Sri Lanka · Gateway to Nuwara Eliya.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              className="flex items-center justify-center gap-2 bg-primary text-on-primary py-3 px-6 rounded-full font-label-lg text-label-lg uppercase tracking-wider hover:bg-primary-container transition-all duration-500 group"
              href="https://www.google.com/maps/dir/?api=1&destination=7.10533,80.63667"
              target="_blank"
              rel="noopener noreferrer"
            >
              Get Directions
              <Icon name="arrow_forward" className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              className="flex items-center justify-center gap-2 text-primary font-label-lg text-label-lg uppercase tracking-wider hover:text-tertiary transition-colors group"
              href="https://www.google.com/maps/search/?api=1&query=7.10533,80.63667"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="map" />
              View Larger Map
            </a>
          </div>
        </div>
      </section>

      <WhatsAppButton />

      {/* Footer */}
      <footer className="bg-primary text-on-primary font-body-md text-body-md w-full">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter px-margin-mobile md:px-margin-desktop py-section-gap max-w-7xl mx-auto">
          <div>
            <div className="font-headline-lg text-headline-lg text-on-primary mb-8">Royal Mansion</div>
            <p className="text-on-primary/70 mb-8 max-w-xs">Elevating the standard of luxury mountain retreats in the heart of Sri Lanka.</p>
          </div>
          <div>
            <h6 className="font-label-lg text-label-lg uppercase tracking-widest mb-8 text-tertiary-fixed">Experience</h6>
            <ul className="space-y-4 opacity-80">
              {["Our Suites", "Dining", "Wellness Spa", "Mountain Tours"].map((item) => (
                <li key={item}><a className="hover:text-tertiary-fixed transition-colors" href="#">{item}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h6 className="font-label-lg text-label-lg uppercase tracking-widest mb-8 text-tertiary-fixed">Company</h6>
            <ul className="space-y-4 opacity-80">
              {["About Us", "Careers", "Sustainability", "Contact"].map((item) => (
                <li key={item}><a className="hover:text-tertiary-fixed transition-colors" href="#">{item}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h6 className="font-label-lg text-label-lg uppercase tracking-widest mb-8 text-tertiary-fixed">Legal</h6>
            <ul className="space-y-4 opacity-80">
              {["Privacy Policy", "Terms of Service", "Cookies"].map((item) => (
                <li key={item}><a className="hover:text-tertiary-fixed transition-colors" href="#">{item}</a></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="px-margin-mobile md:px-margin-desktop py-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 max-w-7xl mx-auto">
          <div className="text-on-primary/60 text-sm">© 2026 Royal Mansion Resort Villa. All Rights Reserved.</div>
          <div className="flex gap-8 text-sm uppercase tracking-widest text-on-primary/60">
            <span>Interpreting Luxury</span>
            <span>Designed for Peace</span>
          </div>
        </div>
      </footer>
    </>
  );
}
