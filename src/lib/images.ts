/**
 * Image assets reference map for marketing pages
 */
export const images = {
  heroMountain: "/assets/4.jpg",
  villaAerial: "/assets/Group Luxury.jpg",
  mountainValley: "/assets/about-bg.jpg",
  natureScenic: "/assets/5.jpg",
  landscapeWide: "/assets/packages-bg.jpg",
  luxuryInterior: "/assets/villa-family.jpg",
  poolResort: "/assets/4.jpg",
  foodPlatter: "/assets/5.jpg",
  hotelRoom: "/assets/villa-family.jpg",
} as const;

export type ImageKey = keyof typeof images;
