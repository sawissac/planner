import "@/styles/globals.css";

import type { Metadata, Viewport } from "next";
import { Caveat, Fira_Code, Open_Sans, Poppins, Roboto } from "next/font/google";

import { ServiceWorkerRegister } from "@/components/customs/ServiceWorkerRegister";
import { Providers } from "@/providers/StoreProvider";

// compacto-ui faces: Poppins for titles/display, Open Sans for body,
// Fira Code for code. Roboto and Caveat stay for the table font picker.
const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Planner",
  description:
    "Local-first task and todo planner with optional cloud sync. Multiple files, timelines, analytics.",
  manifest: "/manifest.webmanifest",
  applicationName: "Planner",
  appleWebApp: {
    capable: true,
    title: "Planner",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#eaf3fb",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${openSans.variable} ${firaCode.variable} ${roboto.variable} ${poppins.variable} ${caveat.variable} h-dvh antialiased`}
    >
      <body className="h-full flex flex-col" suppressHydrationWarning>
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
