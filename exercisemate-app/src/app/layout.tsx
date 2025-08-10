import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { LoadingProvider } from "@/contexts/LoadingContext";

import { Toaster } from "react-hot-toast";
import { PWAProvider } from "@/components/PWAProvider";
import { FirebaseMessagingProvider } from "@/components/FirebaseMessagingProvider";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { BottomNavigation } from "@/components/BottomNavigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "오운완 챌린지",
  description: "친구와 함께하는 운동 습관 형성 챌린지",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "오운완 챌린지"
  },
  icons: {
    icon: [
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" }
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ]
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563eb'
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ServiceWorkerRegistration />
        <PWAProvider>
          <LoadingProvider>
            <AuthProvider>
              <FirebaseMessagingProvider>
                <div className="pb-16">
                  {children}
                </div>
                <BottomNavigation />
                <Toaster
                  position="top-center"
                  toastOptions={{
                    duration: 3000,
                    style: {
                      background: '#363636',
                      color: '#fff',
                    },
                  }}
                />
              </FirebaseMessagingProvider>
            </AuthProvider>
          </LoadingProvider>
        </PWAProvider>
      </body>
    </html>
  );
}
