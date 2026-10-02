import React, { useState, useCallback, useEffect } from "react";
import { AdminTutorialContext } from "./tutorial-context.ts";
import { AdminTutorialDialog } from "./admin-tutorial-dialog.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";

export function AdminTutorialProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialStep, setInitialStep] = useState(1);
  const { user } = useCurrentUser();

  const openTutorial = useCallback((step = 1) => {
    setInitialStep(step);
    setIsOpen(true);
  }, []);

  const closeTutorial = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Listen to custom window events so even nested subcomponents can trigger with no prop drilling
  useEffect(() => {
    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ step?: number }>;
      const step = customEvent.detail?.step ?? 1;
      openTutorial(step);
    };

    window.addEventListener("coachtactics:open-admin-tutorial", handleCustomEvent);
    return () => {
      window.removeEventListener("coachtactics:open-admin-tutorial", handleCustomEvent);
    };
  }, [openTutorial]);

  return (
    <AdminTutorialContext.Provider value={{ isOpen, openTutorial, closeTutorial }}>
      {children}
      {user && (user.role === "academy_admin" || user.role === "platform_admin" || user.role === "coach") && (
        <AdminTutorialDialog
          open={isOpen}
          onOpenChange={setIsOpen}
          initialStep={initialStep}
        />
      )}
    </AdminTutorialContext.Provider>
  );
}
