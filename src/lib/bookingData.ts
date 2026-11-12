export const fallbackPackages = [
  { id: "seed-full-villa", slug: "full-villa-stay", name: "Full Villa Stay", shortDescription: "Exclusive full-villa accommodation.", basePrice: 75000, includedAdults: 6, maximumGuests: 10, minimumNights: 1, mealPlan: "Room only" },
  { id: "seed-family-weekend", slug: "family-weekend-package", name: "Family Weekend Package", shortDescription: "Weekend villa escape for families.", basePrice: 95000, includedAdults: 8, maximumGuests: 10, minimumNights: 2, mealPlan: "Breakfast included" },
  { id: "seed-honeymoon", slug: "honeymoon-villa-package", name: "Honeymoon Villa Package", shortDescription: "A romantic private villa stay.", basePrice: 45000, includedAdults: 2, maximumGuests: 2, minimumNights: 1, mealPlan: "Breakfast included" },
];

export const fallbackAddOns = ["Breakfast", "BBQ dinner", "Airport transfer", "Romantic room decoration"];

export const lkr = (value: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(value);
