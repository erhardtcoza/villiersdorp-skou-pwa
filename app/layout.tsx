import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./brand.css";
import "./approval.css";
import "./status.css";
const appDescription = "Villiersdorp Skou app vir kaartjies, beursies, POS, toegang, boodskappe en skou-inligting.";
export const metadata: Metadata={metadataBase:new URL("https://app.villiersdorpskou.co.za"),title:{default:"Villiersdorp Skou App",template:"%s · Villiersdorp Skou App"},description:appDescription,applicationName:"Villiersdorp Skou",manifest:"/manifest.webmanifest",alternates:{canonical:"/"},openGraph:{title:"Villiersdorp Skou App",description:appDescription,url:"/",siteName:"Villiersdorp Skou App",locale:"af_ZA",type:"website",images:[{url:"/icon-512.png",width:512,height:512,alt:"Villiersdorp Skou app"}]},twitter:{card:"summary",title:"Villiersdorp Skou App",description:appDescription,images:["/icon-512.png"]},appleWebApp:{capable:true,statusBarStyle:"default",title:"VilliersdorpSkou"},icons:{icon:[{url:"/favicon.png",sizes:"192x192",type:"image/png"},{url:"/icon-192.png",sizes:"192x192",type:"image/png"},{url:"/icon-512.png",sizes:"512x512",type:"image/png"}],shortcut:"/favicon.png",apple:[{url:"/apple-touch-icon.png",sizes:"180x180",type:"image/png"}]},other:{"codex-preview":"development","apple-mobile-web-app-capable":"yes","apple-mobile-web-app-title":"VilliersdorpSkou","msapplication-TileColor":"#0f4b2b","msapplication-TileImage":"/icon-192.png"}};
export const viewport:Viewport={width:"device-width",initialScale:1,maximumScale:1,themeColor:"#0f4b2b"};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="af"><body>{children}</body></html>}
