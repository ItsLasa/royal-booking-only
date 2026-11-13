import Link from "next/link";
import { FaWhatsapp } from "react-icons/fa";

export default function WhatsAppButton() {
  return (
    <Link
      href="https://wa.me/94764001245."
      target="_blank"
      className="fixed bottom-8 right-8 z-[100] w-16 h-16 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform active:scale-95 group"
    >
      <FaWhatsapp className="text-3xl" />
      <span className="absolute right-20 bg-white text-primary px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl pointer-events-none border border-mist">
        Chat with us
      </span>
    </Link>
  );
}
