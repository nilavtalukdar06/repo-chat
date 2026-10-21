import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type AuthSubmitButtonProps = {
  pending: boolean;
  children: ReactNode;
};

export function AuthSubmitButton({ pending, children }: AuthSubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-full text-base font-medium"
    >
      {pending ? <Spinner /> : children}
    </Button>
  );
}
