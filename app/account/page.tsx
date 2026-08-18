import { redirect } from "next/navigation";

// /account moved to the new sidebar workspace under /dashboard/profile.
// Kept as a redirect so old bookmarks/links keep working.
export default function AccountPage() {
  redirect("/dashboard/profile");
}
