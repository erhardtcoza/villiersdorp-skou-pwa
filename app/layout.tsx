import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./brand.css";
import "./approval.css";
export const metadata: Metadata={title:"Villiersdorp Skou PWA",description:"Mobile event access for Villiersdorp Skou visitors, vendors, staff and committee members.",applicationName:"Villiersdorp Skou",manifest:"/manifest.webmanifest",appleWebApp:{capable:true,statusBarStyle:"default",title:"Skou"},icons:{icon:"/skou-app-icon.png",shortcut:"/skou-app-icon.png",apple:"/skou-app-icon.png"}};
export const viewport:Viewport={width:"device-width",initialScale:1,maximumScale:1,themeColor:"#0f4b2b"};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="af"><body>{children}</body></html>}
