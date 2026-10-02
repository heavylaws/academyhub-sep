import { createContext, useContext } from "react";

export interface AdminTutorialContextValue {
  isOpen: boolean;
  openTutorial: (step?: number) => void;
  closeTutorial: () => void;
}

export const AdminTutorialContext = createContext<AdminTutorialContextValue>({
  isOpen: false,
  openTutorial: () => {},
  closeTutorial: () => {},
});

export function useAdminTutorial() {
  return useContext(AdminTutorialContext);
}

/** Utility to open the tutorial from anywhere, even without React context */
export function triggerAdminTutorial(step = 1) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("coachtactics:open-admin-tutorial", {
        detail: { step },
      }),
    );
  }
}
