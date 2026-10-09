import React, { useState } from "react";
import { StickyNote, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";

interface QuickNoteDialogProps {
  isOpen: boolean;
  coords: { x: number; y: number } | null;
  authorName?: string;
  onSave: (text: string) => void;
  onClose: () => void;
}

export const QuickNoteDialog: React.FC<QuickNoteDialogProps> = ({
  isOpen,
  coords,
  authorName = "Coach",
  onSave,
  onClose,
}) => {
  const [text, setText] = useState("");

  if (!isOpen || !coords) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSave(text.trim());
    setText("");
    onClose();
  };

  return (
    <div
      id="quick-note-dialog-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="quick-note-dialog-card"
        className="w-full max-w-sm bg-[#0D1826] border border-[#1F334A] rounded-2xl p-4 shadow-2xl flex flex-col gap-3 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#1A2C40] pb-2">
          <div className="flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-[#FFD600]" />
            <h4 className="text-sm font-bold text-white">Pin Tactical Coaching Note</h4>
          </div>
          <button
            id="quick-note-close-btn"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-[#1A2C40] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <textarea
            id="quick-note-textarea"
            autoFocus
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. 'Press trigger when pivot turns back', 'Early near-post cut'..."
            className="w-full bg-[#132338] border border-[#223953] focus:border-[#FFD600] rounded-xl p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none resize-none transition-colors"
          />

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400">By {authorName}</span>
            <div className="flex items-center gap-2">
              <Button
                id="quick-note-cancel-btn"
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 text-xs text-gray-400 hover:text-white hover:bg-[#182B42]"
              >
                Cancel
              </Button>
              <Button
                id="quick-note-save-btn"
                type="submit"
                disabled={!text.trim()}
                className="h-8 px-3.5 bg-[#FFD600] hover:bg-[#FFE082] text-[#0A131F] font-bold text-xs rounded-lg transition-colors gap-1.5"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Pin Note</span>
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
