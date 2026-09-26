import { useState } from "react";
import { Delete, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";

interface KioskPinKeypadProps {
  onSubmitPin: (pin: string) => Promise<boolean>;
  isLoading?: boolean;
}

export function KioskPinKeypad({ onSubmitPin, isLoading }: KioskPinKeypadProps) {
  const [pin, setPin] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const handleDigit = async (digit: string) => {
    if (isLoading || pin.length >= 4) return;
    setErrorMsg(null);

    const nextPin = pin + digit;
    setPin(nextPin);

    if (nextPin.length === 4) {
      // Auto-submit when 4 digits are completed
      const success = await onSubmitPin(nextPin);
      if (!success) {
        setShake(true);
        setErrorMsg("Invalid PIN. Please check your 4-digit code and try again.");
        setTimeout(() => {
          setPin("");
          setShake(false);
        }, 1200);
      } else {
        setPin("");
      }
    }
  };

  const handleBackspace = () => {
    if (isLoading || pin.length === 0) return;
    setErrorMsg(null);
    setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    if (isLoading) return;
    setErrorMsg(null);
    setPin("");
  };

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 py-4">
      <div className="text-center space-y-1">
        <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
          <KeyRound className="size-6" />
        </div>
        <h3 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Athlete PIN Check-In
        </h3>
        <p className="text-xs text-muted-foreground">
          Enter your 4-digit check-in code to mark attendance
        </p>
      </div>

      {/* 4-Digit Indicator Dots */}
      <div
        className={cn(
          "flex items-center justify-center gap-4 py-3 transition-transform duration-200",
          shake && "animate-[wiggle_0.3s_ease-in-out]",
        )}
      >
        {Array.from({ length: 4 }).map((_, i) => {
          const isFilled = pin.length > i;
          return (
            <div
              key={i}
              className={cn(
                "size-5 rounded-full border-2 transition-all duration-150",
                isFilled
                  ? "border-primary bg-primary shadow-sm shadow-primary/40 scale-110"
                  : "border-border bg-muted/40",
              )}
            />
          );
        })}
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="text-xs font-semibold text-destructive animate-in fade-in text-center px-4">
          {errorMsg}
        </div>
      )}

      {/* Touch Numeric Keypad */}
      <div className="grid grid-cols-3 gap-3.5 w-full">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
          <Button
            key={digit}
            type="button"
            variant="outline"
            onClick={() => handleDigit(digit)}
            disabled={isLoading || pin.length >= 4}
            className="h-16 text-2xl font-display font-bold rounded-2xl border-border bg-card hover:bg-primary/10 hover:text-primary hover:border-primary/40 active:scale-95 transition-all shadow-sm"
          >
            {digit}
          </Button>
        ))}

        {/* Clear Button */}
        <Button
          type="button"
          variant="ghost"
          onClick={handleClear}
          disabled={isLoading || pin.length === 0}
          className="h-16 text-sm font-semibold rounded-2xl hover:bg-muted"
        >
          Clear
        </Button>

        {/* 0 Button */}
        <Button
          type="button"
          variant="outline"
          onClick={() => handleDigit("0")}
          disabled={isLoading || pin.length >= 4}
          className="h-16 text-2xl font-display font-bold rounded-2xl border-border bg-card hover:bg-primary/10 hover:text-primary hover:border-primary/40 active:scale-95 transition-all shadow-sm"
        >
          0
        </Button>

        {/* Backspace Button */}
        <Button
          type="button"
          variant="ghost"
          onClick={handleBackspace}
          disabled={isLoading || pin.length === 0}
          className="h-16 rounded-2xl hover:bg-muted"
          aria-label="Backspace"
        >
          <Delete className="size-6 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}
