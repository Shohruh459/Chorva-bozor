import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import ListingForm from "@/components/ListingForm";

export default async function NewListingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/kirish?next=/elon/yangi");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-lg font-bold text-gray-900">Yangi e&apos;lon berish</h1>
      <div className="mt-4">
        <ListingForm mode="create" />
      </div>
    </div>
  );
}
