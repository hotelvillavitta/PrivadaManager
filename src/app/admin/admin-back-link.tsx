import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function AdminBackLink({
  href = "/admin",
  label = "Volver a administración",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
    >
      <ChevronLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}
