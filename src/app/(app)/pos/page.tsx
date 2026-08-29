import { searchProductsForPos } from "@/actions/products.actions";
import { listCustomers } from "@/actions/customers.actions";
import { listPaymentMethods } from "@/actions/paymentMethods.actions";
import { isRegisterOpen } from "@/actions/cash.actions";
import { getBusiness } from "@/actions/business.actions";
import { PosClient } from "./PosClient";

export default async function PosPage() {
  const [products, customers, paymentMethods, registerStatus, business] = await Promise.all([
    searchProductsForPos(""),
    listCustomers(),
    listPaymentMethods(),
    isRegisterOpen(),
    getBusiness(),
  ]);

  return (
    <PosClient
      initialProducts={products}
      initialCustomers={customers}
      paymentMethods={paymentMethods}
      registerStatus={registerStatus}
      businessName={business.name}
      businessWhatsapp={business.whatsapp}
    />
  );
}
