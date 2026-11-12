import Link from "next/link";
import Icon from "./Icon";

export default function Footer() {
  return (
    <footer className="bg-primary text-on-primary w-full">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter px-margin-mobile md:px-margin-desktop py-section-gap max-w-7xl mx-auto">
        <div className="space-y-6">
          <h3 className="font-headline-lg text-headline-lg text-on-primary">
            Royal Mansion
          </h3>
          <p className="text-on-primary/70 leading-relaxed">
            A premier luxury villa destination in Pussallawa, offering an
            unmatched mountain living experience for the discerning traveler.
          </p>
        </div>
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
        <div className="space-y-4 md:pl-10">
          <h4 className="font-label-lg text-label-lg uppercase tracking-widest text-tertiary-fixed">
            Contact
          </h4>
          <ul className="space-y-3 text-on-primary/80 font-body-md">
            <li className="flex items-start gap-3">
              <Icon name="location_on" className="text-sm mt-1 shrink-0" />
              <span>Pussallawa, Sri Lanka</span>
            </li>
            <li className="flex items-center gap-3">
              <Icon name="call" className="text-sm shrink-0" />
              <span>+94 77 123 4567</span>
            </li>
            <li className="flex items-center gap-3">
              <Icon name="mail" className="text-sm shrink-0" />
              <span>hello@royalmansion.lk</span>
            </li>
          </ul>
        </div>
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
      </div>
      <div className="max-w-7xl mx-auto mt-10 pt-10 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-on-primary/60 px-margin-mobile md:px-margin-desktop pb-10">
        <p>© 2024 Royal Mansion Resort Villa. All Rights Reserved.</p>
        <div className="flex gap-8">
          <a className="hover:text-white transition-colors" href="#">
            Privacy Policy
          </a>
          <a className="hover:text-white transition-colors" href="#">
            Terms of Service
          </a>
          <a className="hover:text-white transition-colors" href="#">
            Cookies
          </a>
        </div>
      </div>
    </footer>
  );
}
