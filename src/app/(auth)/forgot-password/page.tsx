"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth.schema";
import { requestPasswordReset } from "@/actions/auth.actions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (data: ForgotPasswordInput) => {
    const result = await requestPasswordReset(data);
    setMessage(result.message);
  };

  return (
    <Card>
      <CardBody>
        {message ? (
          <div className="flex flex-col gap-4 text-center">
            <p className="text-sm text-foreground">{message}</p>
            <Link href="/login" className="text-sm text-primary hover:underline">
              Volver a iniciar sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <p className="text-sm text-muted">
              Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
            </p>
            <Input
              label="Correo electrónico"
              type="email"
              required
              error={errors.email?.message}
              {...register("email")}
            />
            <Button type="submit" isLoading={isSubmitting} className="w-full">
              Enviar enlace
            </Button>
            <Link href="/login" className="text-sm text-primary text-center hover:underline">
              Volver a iniciar sesión
            </Link>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
