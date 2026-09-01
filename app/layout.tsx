import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./brand.css";
import "./approval.css";
import "./status.css";
export const metadata: Metadata={title:"Villiersdorp Skou PWA",description:"Mobile event access for Villiersdorp Skou visitors, vendors, staff and committee members.",applicationName:"Villiersdorp Skou",manifest:"/manifest.webmanifest",appleWebApp:{capable:true,statusBarStyle:"default",title:"VilliersdorpSkou"},icons:{icon:[{url:"/favicon.png",sizes:"192x192",type:"image/png"},{url:"/icon-192.png",sizes:"192x192",type:"image/png"},{url:"/icon-512.png",sizes:"512x512",type:"image/png"}],shortcut:"/favicon.png",apple:[{url:"/apple-touch-icon.png",sizes:"180x180",type:"image/png"}]},other:{"codex-preview":"development","apple-mobile-web-app-capable":"yes","apple-mobile-web-app-title":"VilliersdorpSkou","msapplication-TileColor":"#0f4b2b","msapplication-TileImage":"/icon-192.png"}};
export const viewport:Viewport={width:"device-width",initialScale:1,maximumScale:1,themeColor:"#0f4b2b"};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="af"><body>{children}</body></html>}
