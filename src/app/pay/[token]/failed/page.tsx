import Link from "next/link";
import { XCircle } from "lucide-react";

export default async function PaymentFailedPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-lg">
        <div className="mb-4 flex justify-center">
          <XCircle className="h-14 w-14 text-red-500" />
        </div>
        <h1 className="mb-1 text-xl font-bold text-gray-800">Payment Unsuccessful</h1>
        <p className="mb-6 text-sm text-muted-foreground">Your payment could not be completed.</p>

        <div className="flex flex-col gap-2">
          <Link
            href={`/pay/${token}`}
            className="rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 py-3 text-sm font-semibold text-white"
          >
            Try Again
          </Link>
          <a href="mailto:support@elitebandhan.com" className="text-sm text-muted-foreground hover:underline">
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}