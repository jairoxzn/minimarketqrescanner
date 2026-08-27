"use client";

import { useState } from "react";
import type { getBusiness } from "@/actions/business.actions";
import type { listPaymentMethods } from "@/actions/paymentMethods.actions";
import { BusinessForm } from "./BusinessForm";
import { PaymentMethodsPanel } from "./PaymentMethodsPanel";

type Business = Awaited<ReturnType<typeof getBusiness>>;
type PaymentMethod = Awaited<ReturnType<typeof listPaymentMethods>>[number];

export function ConfiguracionClient({
  business,
  initialPaymentMethods,
}: {
  business: Business;
  initialPaymentMethods: PaymentMethod[];
}) {
  const [tab, setTab] = useState<"negocio" | "pagos">("negocio");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-foreground">Configuración</h1>

      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab("negocio")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === "negocio" ? "border-primary text-primary" : "border-transparent text-muted"}`}
        >
          Negocio
        </button>
        <button
          onClick={() => setTab("pagos")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === "pagos" ? "border-primary text-primary" : "border-transparent text-muted"}`}
        >
          Métodos de pago
        </button>
      </div>

      {tab === "negocio" ? (
        <BusinessForm business={business} />
      ) : (
        <PaymentMethodsPanel initialMethods={initialPaymentMethods} />
      )}
    </div>
  );
}
