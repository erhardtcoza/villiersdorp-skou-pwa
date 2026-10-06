import { redirect } from "next/navigation";

// Staff use the live POS at /pos. Keep this old testing URL from selecting a
// separate staging identity/data store in the live app.
export default function PosTestPage() {
  redirect("/pos");
}
