import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book Your Stay | Royal Mansion Resort Villa",
  description: "Reserve your luxury private villa experience at Royal Mansion Resort Villa, Pussallawa.",
};

export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="font-open-sans">{children}</div>;
}
