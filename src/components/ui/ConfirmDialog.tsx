"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    title: string;
    message: string;
    danger?: boolean;
    resolve?: (value: boolean) => void;
  }>({ open: false, title: "", message: "" });

  const confirm = (title: string, message: string, danger = false) =>
    new Promise<boolean>((resolve) => {
      setState({ open: true, title, message, danger, resolve });
    });

  const dialog = (
    <Modal open={state.open} onClose={() => { state.resolve?.(false); setState((s) => ({ ...s, open: false })); }} title={state.title} size="sm">
      <p className="text-sm text-foreground">{state.message}</p>
      <div className="flex justify-end gap-2 mt-5">
        <Button
          variant="secondary"
          onClick={() => {
            state.resolve?.(false);
            setState((s) => ({ ...s, open: false }));
          }}
        >
          Cancelar
        </Button>
        <Button
          variant={state.danger ? "danger" : "primary"}
          onClick={() => {
            state.resolve?.(true);
            setState((s) => ({ ...s, open: false }));
          }}
        >
          Confirmar
        </Button>
      </div>
    </Modal>
  );

  return { confirm, dialog };
}
