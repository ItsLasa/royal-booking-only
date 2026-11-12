import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { images } from "@/lib/images";
import { apiGet } from "@/lib/api/client";
import { fallbackPackages, lkr } from "@/lib/bookingData";
import Link from "next/link";

type PackageDto = { id: string; slug: string; name: string; shortDescription: string; fullDescription?: string; basePrice: number; includedAdults: number; maximumGuests: number; minimumNights: number; mealPlan?: string; cancellationPolicy?: string; terms?: string };

export default async function PackageDetailPage({ params }: { params: { slug: string } }) {
  const fromApi = await apiGet<PackageDto>(`/public/packages/${params.slug}`);
  const pkg = (fromApi ?? fallbackPackages.find((item: (typeof fallbackPackages)[number]) => item.slug === params.slug) ?? fallbackPackages[0]) as PackageDto;
  return (
    <>
      <Header />
      <main className="bg-ivory pt-28">
        <section className="grid min-h-[78vh] grid-cols-1 lg:grid-cols-2">
          <div className="relative min-h-[360px] overflow-hidden lg:min-h-[78vh]">
            <img src={images.hotelRoom} alt={pkg.name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-primary/25" />
          </div>
          <div className="flex items-center px-margin-mobile py-14 md:px-margin-desktop">
            <div className="max-w-xl">
              <p className="mb-4 font-label-lg text-label-lg uppercase tracking-widest text-tertiary">Royal Mansion Package</p>
              <h1 className="mb-5 font-headline-lg text-headline-lg-mobile text-primary md:text-headline-lg">{pkg.name}</h1>
              <p className="mb-8 font-body-lg text-body-lg text-on-surface-variant">{pkg.fullDescription ?? pkg.shortDescription}</p>
              <dl className="grid grid-cols-2 gap-4 border-y border-outline-variant py-6 text-primary">
                <div><dt className="font-label-md text-label-md uppercase tracking-widest text-outline">From</dt><dd className="mt-2 text-2xl">{lkr(Number(pkg.basePrice))}</dd></div>
                <div><dt className="font-label-md text-label-md uppercase tracking-widest text-outline">Guests</dt><dd className="mt-2 text-2xl">Up to {pkg.maximumGuests}</dd></div>
                <div><dt className="font-label-md text-label-md uppercase tracking-widest text-outline">Min stay</dt><dd className="mt-2 text-2xl">{pkg.minimumNights} night{pkg.minimumNights === 1 ? "" : "s"}</dd></div>
                <div><dt className="font-label-md text-label-md uppercase tracking-widest text-outline">Meal plan</dt><dd className="mt-2 text-2xl">{pkg.mealPlan ?? "Flexible"}</dd></div>
              </dl>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={`/book?package=${pkg.slug}`} className="bg-primary px-8 py-4 text-center font-label-lg text-label-lg uppercase tracking-widest text-white transition hover:bg-secondary">Book Now</Link>
                <Link href="/packages" className="border border-primary px-8 py-4 text-center font-label-lg text-label-lg uppercase tracking-widest text-primary transition hover:bg-white">All Packages</Link>
              </div>
              <p className="mt-8 text-sm leading-6 text-on-surface-variant">{pkg.cancellationPolicy ?? "A 50% deposit confirms your reservation. Dates remain subject to final server availability checks before payment."}</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}

