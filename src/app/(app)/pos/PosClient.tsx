"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { searchProductsForPos, getProductByBarcode } from "@/actions/products.actions";
import { createSale } from "@/actions/sales.actions";
import type { isRegisterOpen } from "@/actions/cash.actions";
import type { listCustomers } from "@/actions/customers.actions";
import type { listPaymentMethods } from "@/actions/paymentMethods.actions";
import { ProductSearchPanel } from "@/components/pos/ProductSearchPanel";
import { CartPanel } from "@/components/pos/CartPanel";
import { PaymentModal } from "@/components/pos/PaymentModal";
import { QuickAddCustomerModal } from "@/components/pos/QuickAddCustomerModal";
import { ScannerModal } from "@/components/scanner/ScannerModal";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatMoney } from "@/lib/money";
import { formatTicketLabel } from "@/lib/ticket";
import type { CartLine } from "@/components/pos/types";

type Product = Awaited<ReturnType<typeof searchProductsForPos>>[number];
type Customer = Awaited<ReturnType<typeof listCustomers>>[number];
type PaymentMethod = Awaited<ReturnType<typeof listPaymentMethods>>[number];
type RegisterStatus = Awaited<ReturnType<typeof isRegisterOpen>>;

export function PosClient({
  initialProducts,
  initialCustomers,
  paymentMethods,
  registerStatus,
}: {
  initialProducts: Product[];
  initialCustomers: Customer[];
  paymentMethods: PaymentMethod[];
  registerStatus: RegisterStatus;
}) {
  const router = useRouter();
  const toast = useToast();

  const canSell = registerStatus.open;
  const checkoutDisabledReason = canSell
    ? undefined
    : registerStatus.canOpen
      ? "No hay una caja abierta — ábrela para poder cobrar."
      : "No hay una caja abierta. Pide a un administrador o cajero que la abra.";

  const [lines, setLines] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [customers, setCustomers] = useState(initialCustomers);
  const [customerId, setCustomerId] = useState(
    initialCustomers.find((c) => c.isGeneral)?.id ?? initialCustomers[0]?.id ?? ""
  );

  const [scannerOpen, setScannerOpen] = useState(false);
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addProduct = (product: Product) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error(`Stock máximo alcanzado (${product.stock})`);
          return prev;
        }
        return prev.map((l) => (l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unit: product.unit,
          unitPrice: Number(product.salePrice),
          stock: product.stock,
          quantity: 1,
          discount: 0,
        },
      ];
    });
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setLines((prev) => {
      if (quantity <= 0) return prev.filter((l) => l.productId !== productId);
      return prev.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(quantity, l.stock) } : l));
    });
  };

  const handleRemove = (productId: string) => setLines((prev) => prev.filter((l) => l.productId !== productId));

  const handleScanDetected = async (code: string) => {
    setScannerOpen(false);
    try {
      const product = await getProductByBarcode(code);
      if (!product) {
        setNotFoundBarcode(code);
        return;
      }
      addProduct(product);
      toast.success(`${product.name} agregado`);
    } catch {
      toast.error("Error al buscar el producto");
    }
  };

  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const total = Math.max(0, subtotal - discount);

  const handleConfirmSale = async (paymentMethodId: string, amountReceived?: number) => {
    setIsSubmitting(true);
    try {
      const sale = await createSale({
        customerId,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, discount: 0 })),
        discount,
        payments: [{ paymentMethodId, amount: total }],
        amountReceived,
      });
      toast.success(`Venta ${formatTicketLabel(sale.ticketSeries, sale.ticketNumber)} registrada correctamente`);
      setLines([]);
      setDiscount(0);
      setPaymentOpen(false);
      setMobileCartOpen(false);
      router.push(`/ventas/${sale.id}/ticket`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al registrar la venta");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-4 lg:-m-6 p-4 lg:p-6 gap-4">
      {!canSell && (
        <div className="no-print flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm">
          <span className="text-warning font-medium">⚠️ No hay una caja abierta — no se pueden cobrar ventas hasta que se abra una.</span>
          {registerStatus.canOpen ? (
            <Link href="/caja"><Button size="sm">Abrir caja</Button></Link>
          ) : (
            <span className="text-muted">Pide a un administrador o cajero que la abra.</span>
          )}
        </div>
      )}

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row gap-4">
        <div className="flex-1 min-h-0">
          <ProductSearchPanel initialProducts={initialProducts} onAdd={addProduct} onOpenScanner={() => setScannerOpen(true)} />
        </div>

        {/* Desktop cart panel */}
        <div className="hidden lg:flex lg:w-96 shrink-0 rounded-xl border border-border bg-white p-4">
          <CartPanel
            lines={lines}
            discount={discount}
            onDiscountChange={setDiscount}
            onQuantityChange={handleQuantityChange}
            onRemove={handleRemove}
            onCheckout={() => setPaymentOpen(true)}
            checkoutDisabled={!canSell}
            checkoutDisabledReason={checkoutDisabledReason}
          />
        </div>
      </div>

      {/* Mobile floating cart bar */}
      {lines.length > 0 && (
        <button
          onClick={() => setMobileCartOpen(true)}
          className="no-print lg:hidden fixed bottom-20 inset-x-4 z-30 flex items-center justify-between rounded-xl bg-primary text-primary-foreground px-4 py-3 shadow-lg"
        >
          <span className="font-medium">🛒 {lines.length} producto(s)</span>
          <span className="font-bold">{formatMoney(total)} · Ver carrito</span>
        </button>
      )}

      <Modal open={mobileCartOpen} onClose={() => setMobileCartOpen(false)} title="Carrito" size="full">
        <div className="h-[70vh]">
          <CartPanel
            lines={lines}
            discount={discount}
            onDiscountChange={setDiscount}
            onQuantityChange={handleQuantityChange}
            onRemove={handleRemove}
            showTitle={false}
            onCheckout={() => {
              setMobileCartOpen(false);
              setPaymentOpen(true);
            }}
            checkoutDisabled={!canSell}
            checkoutDisabledReason={checkoutDisabledReason}
          />
        </div>
      </Modal>

      <ScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={handleScanDetected} />

      <Modal open={!!notFoundBarcode} onClose={() => setNotFoundBarcode(null)} title="Producto no registrado" size="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground">
            No se encontró ningún producto con el código <strong>{notFoundBarcode}</strong>.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setNotFoundBarcode(null)}>Cerrar</Button>
            <Button onClick={() => router.push(`/productos/nuevo?barcode=${notFoundBarcode}`)}>Registrar producto</Button>
          </div>
        </div>
      </Modal>

      <PaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        total={total}
        customers={customers}
        paymentMethods={paymentMethods}
        customerId={customerId}
        onCustomerChange={setCustomerId}
        onAddCustomer={() => setAddCustomerOpen(true)}
        onConfirm={handleConfirmSale}
        isSubmitting={isSubmitting}
      />

      <QuickAddCustomerModal
        open={addCustomerOpen}
        onClose={() => setAddCustomerOpen(false)}
        onCreated={(customer) => {
          setCustomers((prev) => [...prev, customer]);
          setCustomerId(customer.id);
        }}
      />
    </div>
  );
}
