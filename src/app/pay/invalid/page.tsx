export default function InvalidPaymentPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-lg">
        <h1 className="text-lg font-semibold text-gray-800">Something went wrong with this payment.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please contact support if you believe this is an error.</p>
      </div>
    </div>
  );
}