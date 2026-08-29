import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import AppProviders from "@/components/providers/AppProviders";
import Navbar from "@/components/ui/Navbar";
import CompareTray from "@/components/compare/CompareTray";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CollegeDiscover — Find and compare colleges in India",
    template: "%s | CollegeDiscover",
  },
  description:
    "Search, compare and shortlist colleges by location, fees, rating and placement packages.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakarta.variable}`}>
      <body className="min-h-screen flex flex-col">
        <AppProviders>
          <Navbar />
          <main className="flex-1">{children}</main>

          {/*
            The compare tray lives in the layout, not on a single page, so a
            selection made on the listing page is still visible on the detail
            and saved pages.
          */}
          <CompareTray />

          <footer className="border-t border-slate-200 bg-white">
            <div className="max-w-7xl mx-auto px-4 py-8 text-center text-sm text-slate-500">
              <p>
                © {new Date().getFullYear()} CollegeDiscover — a portfolio project.
              </p>
              <p className="mt-1 text-xs text-slate-400">
                All college data shown is generated sample data for demonstration
                purposes. It is not verified and must not be used for real
                admission decisions.
              </p>
            </div>
          </footer>
        </AppProviders>
      </body>
    </html>
  );
}
