"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PayHerePayment } from "@/components/PayHerePayment";

function PaymentPanel() {
  const reference = useSearchParams().get("reference") ?? "";
  return <PayHerePayment reference={reference} />;
}

export default function PaymentPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-ivory px-margin-mobile pb-20 pt-36 md:px-margin-desktop">
        <Suspense fallback={<div className="mx-auto max-w-4xl bg-white p-12 text-center text-primary font-semibold">Loading booking summary...</div>}>
          <PaymentPanel />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
