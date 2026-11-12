"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { BookingForm } from "@/components/BookingForm";

export default function BookPage() {
  return (
    <>
      <Header />
      <main className="bg-ivory pt-28 font-open-sans">
        <BookingForm />
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
