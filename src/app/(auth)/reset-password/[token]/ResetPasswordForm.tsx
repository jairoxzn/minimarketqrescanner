"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth.schema";
import { resetPasswordWithToken } from "@/actions/auth.actions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = async (data: ResetPasswordInput) => {
    setError(null);
    const result = await resetPasswordWithToken({ token, ...data });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push("/login"), 1500);
  };

  return (
    <Card>
      <CardBody>
        {success ? (
          <p className="text-sm text-center text-foreground">
            Contraseña actualizada. Redirigiendo a inicio de sesión…
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <Input
              label="Nueva contraseña"
              type="password"
              required
              error={errors.password?.message}
              {...register("password")}
            />
            <Input
              label="Confirmar contraseña"
              type="password"
              required
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />
            {error && (
              <p role="alert" className="text-sm text-danger bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <Button type="submit" isLoading={isSubmitting} className="w-full">
              Restablecer contraseña
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
