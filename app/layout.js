import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppProviders from "../src/providers/AppProviders";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Future University Egypt - Admission Assistant",
  description: "AI-powered admission assistance for Future University Egypt. Get help with admissions, programs, and student services in Arabic and English.",
  keywords: ["Future University Egypt", "FUE", "Admission", "University", "Egypt", "AI Assistant", "Arabic", "English"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
