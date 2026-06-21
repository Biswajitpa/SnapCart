import type { Metadata } from "next";
import "./globals.css";
import Provider from "@/Provider";
import StoreProvider from "@/redux/StoreProvider";
import InitUser from "@/InitUser";
import IntroAnimation from "@/components/IntroAnimation";

export const metadata: Metadata = {
  title: "Snapcart | 10 minutes grocery Delivery App",
  description: "10 minutes grocery Delivery App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 🎯 FIXED: Added suppressHydrationWarning to bypass chrome extension injections safely
    <html lang="en" suppressHydrationWarning>
      <body className="w-full min-h-screen bg-linear-to-b from-green-50 to-white">
        <IntroAnimation>
          <Provider>
            <StoreProvider>
              <InitUser />
              {children}
            </StoreProvider>
          </Provider>
        </IntroAnimation>
      </body>
    </html>
  );
}
