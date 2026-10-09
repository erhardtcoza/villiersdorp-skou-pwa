import { redirect } from "next/navigation";

// Keep the app-host admin entry point useful while the authoritative admin
// session and workflows remain on the public site's admin host.
export default function AdminEntryPage() {
  redirect("https://www.villiersdorpskou.co.za/admin");
}
