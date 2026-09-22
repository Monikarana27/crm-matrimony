"use client";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

const PAYU_ENDPOINT = "https://secure.payu.in/_payment"; // production

function PayuRedirectInner() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = PAYU_ENDPOINT;
    searchParams.forEach((value, key) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Redirecting to secure payment...</p>
    </div>
  );
}

export default function PayuRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <PayuRedirectInner />
    </Suspense>
  );
}
