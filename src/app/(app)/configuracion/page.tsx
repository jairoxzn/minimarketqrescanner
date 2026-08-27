import { getBusiness } from "@/actions/business.actions";
import { listPaymentMethods } from "@/actions/paymentMethods.actions";
import { ConfiguracionClient } from "./ConfiguracionClient";

export default async function ConfiguracionPage() {
  const [business, paymentMethods] = await Promise.all([getBusiness(), listPaymentMethods(true)]);
  return <ConfiguracionClient business={business} initialPaymentMethods={paymentMethods} />;
}
