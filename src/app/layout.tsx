import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || "Digital Marketing",
  description: "AI-powered social media marketing for multiple companies and teams.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen font-sans" suppressHydrationWarning>
        {/*
          Browser extensions (e.g. Bitdefender) inject attributes such as
          `bis_skin_checked` into the DOM before React hydrates, causing a benign
          hydration-mismatch warning and an unrelated `share-modal.js` crash.
          This pre-hydration script silences ONLY those known-extension messages —
          genuine app errors and real hydration bugs are left untouched.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var RE=/bis_skin_checked|bis_register|__processed_/;var o=console.error;console.error=function(){try{for(var i=0;i<arguments.length;i++){var a=arguments[i];if(typeof a==='string'&&RE.test(a))return;}}catch(e){}return o.apply(console,arguments);};window.addEventListener('error',function(e){if(e&&e.filename&&/(share-modal\\.js|chrome-extension:\\/\\/|moz-extension:\\/\\/)/.test(e.filename)){e.stopImmediatePropagation();e.preventDefault();}},true);}catch(e){}})();",
          }}
        />
        {children}
      </body>
    </html>
  );
}
