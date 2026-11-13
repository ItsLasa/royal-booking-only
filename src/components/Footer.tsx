import Link from "next/link";
import Icon from "./Icon";
import {
  FaFacebookF,
  FaInstagram,
  FaWhatsapp,

  FaTiktok,

} from "react-icons/fa";

const socialLinks = [
  {
    name: "Facebook",
    href: "https://www.facebook.com/Royal.Mansion.Resort/",
    icon: FaFacebookF,
    ariaLabel: "Royal Mansion Resort on Facebook",
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/royal_mansion_resort_pussellaw/",
    icon: FaInstagram,
    ariaLabel: "Royal Mansion Resort on Instagram",
  },
  {
    name: "WhatsApp",
    href: "https://wa.me/94764001245",
    icon: FaWhatsapp,
    ariaLabel: "Chat with Royal Mansion Resort on WhatsApp",
  },

  {
    name: "TikTok",
    href: "https://www.tiktok.com/@royal.mansion.res",
    icon: FaTiktok,
    ariaLabel: "Royal Mansion Resort on TikTok",
  },
];

export default function Footer() {
  return (
    <footer className="bg-primary text-on-primary w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter px-margin-mobile md:px-margin-desktop py-section-gap max-w-7xl mx-auto">
        <div className="space-y-6 max-w-md">
          <h3 className="font-headline-lg text-headline-lg text-on-primary">
            Royal Mansion Resort Villa
          </h3>
          <p className="text-on-primary/70 leading-relaxed">
            A tropical luxury nestled in nature's embrace, where pure tranquility meets modern elegance and timeless charm.
          </p>

          <div className="pt-2">
            <h4 className="font-label-lg  uppercase tracking-widest text-tertiary-fixed mb-4 text-xs ">
              Connect With Us
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              {socialLinks.map((social) => {
                const IconComponent = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.ariaLabel}
                    className="w-10 h-10 rounded-full border border-white/20 bg-white/5 flex items-center justify-center text-white/80 transition-all duration-300 hover:bg-white hover:text-primary hover:border-white hover:scale-110 shadow-sm"
                  >
                    <IconComponent className="text-base" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Navigation - Commented out per client request
        <div className="space-y-4 md:pl-10">
          <h4 className="font-label-lg text-label-lg uppercase tracking-widest text-tertiary-fixed">
            Navigation
          </h4>
          <ul className="space-y-3">
            <li>
              <Link
                href="/"
                className="text-on-primary/80 hover:text-white transition-colors font-body-md"
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                className="text-on-primary/80 hover:text-white transition-colors font-body-md"
              >
                About
              </Link>
            </li>
            <li>
              <Link
                href="/facilities"
                className="text-on-primary/80 hover:text-white transition-colors font-body-md"
              >
                Facilities
              </Link>
            </li>
            <li>
              <Link
                href="/packages"
                className="text-on-primary/80 hover:text-white transition-colors font-body-md"
              >
                Packages
              </Link>
            </li>
          </ul>
        </div>
        */}

        <div className="space-y-4 md:pl-10 md:justify-self-end">
          <h4 className="font-label-lg  uppercase tracking-widest text-tertiary-fixed">
            Contact
          </h4>
          <ul className="space-y-3 text-on-primary/80 font-body-md">
            <li className="flex items-start gap-3">
              <Icon name="location_on" className="text-sm mt-1 shrink-0" />
              <span>Royal Mansion Resort Pussallawa,
                No.21, Prime Panaromic,
                Paradeka, Pussellawa.</span>
            </li>
            <li className="flex items-center gap-3">
              <Icon name="call" className="text-sm shrink-0" />
              <span>+94 76 400 1245</span>
            </li>
            <li className="flex items-center gap-3">
              <Icon name="mail" className="text-sm shrink-0" />
              <span>info.royalmationresort@gmail.com</span>
            </li>
          </ul>
        </div>

        {/* Newsletter - Commented out per client request
        <div className="space-y-6">
          <h4 className="font-label-lg text-label-lg uppercase tracking-widest text-tertiary-fixed">
            Newsletter
          </h4>
          <p className="text-on-primary/70 text-sm">
            Join our mailing list for exclusive seasonal offers.
          </p>
          <div className="flex border-b border-white/20 pb-2">
            <input
              className="bg-transparent border-none  text-white placeholder-white/40 w-full px-0 p-2  "
              placeholder="Email Address"
              type="email"
            />
            <button className="text-white" aria-label="Subscribe">
              <Icon name="arrow_forward" />
            </button>
          </div>
        </div>
        */}
      </div>
      <div className="max-w-7xl mx-auto mt-10 pt-10 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-on-primary/60 px-margin-mobile md:px-margin-desktop pb-10">
        <p>© 2026 Royal Mansion Resort Villa. All Rights Reserved.</p>
        <div className="flex gap-8">
          <a className="hover:text-white transition-colors" href="#">
            Privacy Policy
          </a>
          <a className="hover:text-white transition-colors" href="#">
            Terms of Service
          </a>

        </div>
      </div>
    </footer>
  );
}
