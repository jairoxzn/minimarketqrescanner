"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { businessSchema, type BusinessInput } from "@/lib/validations/business.schema";
import { updateBusiness, getBusiness } from "@/actions/business.actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";

type Business = Awaited<ReturnType<typeof getBusiness>>;
type BusinessFormValues = z.input<typeof businessSchema>;

export function BusinessForm({ business }: { business: Business }) {
  const toast = useToast();
  const [seriesWarningAck, setSeriesWarningAck] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BusinessFormValues, unknown, BusinessInput>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      name: business.name,
      legalName: business.legalName ?? "",
      ruc: business.ruc ?? "",
      address: business.address ?? "",
      phone: business.phone ?? "",
      whatsapp: business.whatsapp ?? "",
      email: business.email ?? "",
      logoUrl: business.logoUrl ?? "",
      currencySymbol: business.currencySymbol,
      igvEnabled: business.igvEnabled,
      igvPercent: Number(business.igvPercent),
      igvIncluded: business.igvIncluded,
      ticketSeries: business.ticketSeries,
      allowNegativeStock: business.allowNegativeStock,
      resetTicketCounter: false,
    },
  });

  const ticketSeries = watch("ticketSeries");
  const seriesChanged = ticketSeries !== business.ticketSeries;

  const onSubmit = async (data: BusinessInput) => {
    if (seriesChanged && !seriesWarningAck) {
      toast.error("Confirma el reinicio de la numeración de tickets antes de guardar");
      return;
    }
    try {
      await updateBusiness(data);
      toast.success("Configuración actualizada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 max-w-2xl" noValidate>
      <Card>
        <CardBody className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">Datos del negocio</h2>
          <Input label="Nombre comercial" required error={errors.name?.message} {...register("name")} />
          <Input label="Razón social" error={errors.legalName?.message} {...register("legalName")} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="RUC" error={errors.ruc?.message} {...register("ruc")} />
            <Input label="Teléfono" error={errors.phone?.message} {...register("phone")} />
          </div>
          <Input label="Dirección" error={errors.address?.message} {...register("address")} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="WhatsApp (formato internacional, ej. 51987654321)" error={errors.whatsapp?.message} {...register("whatsapp")} />
            <Input label="Correo" type="email" error={errors.email?.message} {...register("email")} />
          </div>
          <Input label="URL del logo" placeholder="https://…" error={errors.logoUrl?.message} {...register("logoUrl")} />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">Moneda e impuestos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Símbolo de moneda" required error={errors.currencySymbol?.message} {...register("currencySymbol")} />
            <Input label="IGV (%)" type="number" step="0.01" required error={errors.igvPercent?.message} {...register("igvPercent")} />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" className="h-4 w-4 rounded border-border" {...register("igvEnabled")} />
            Aplicar IGV a las ventas
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" className="h-4 w-4 rounded border-border" {...register("igvIncluded")} />
            El precio de venta ya incluye el IGV
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" className="h-4 w-4 rounded border-border" {...register("allowNegativeStock")} />
            Permitir ventas con stock negativo
          </label>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">Tickets</h2>
          <Input label="Serie de tickets" required error={errors.ticketSeries?.message} {...register("ticketSeries")} />
          {seriesChanged && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex flex-col gap-2">
              <p className="text-sm text-warning">
                ⚠️ Cambiaste la serie de tickets. Esto no renumera tickets pasados. ¿Deseas reiniciar el contador a 0 para la nueva serie?
              </p>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" className="h-4 w-4 rounded border-border" {...register("resetTicketCounter")} />
                Sí, reiniciar el contador
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" className="h-4 w-4 rounded border-border" checked={seriesWarningAck} onChange={(e) => setSeriesWarningAck(e.target.checked)} />
                Entiendo el cambio de serie
              </label>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" isLoading={isSubmitting}>Guardar cambios</Button>
      </div>
    </form>
  );
}
