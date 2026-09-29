import React, { useState } from "react";
import {
  FolderPlus,
  Tag,
  Check,
  Plus,
  BookOpen,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  DEFAULT_COLLECTIONS,
  DEFAULT_PLAYBOOK_TAGS,
  type PlaybookCollection,
  type PlaybookTag,
} from "@/domain/tactics/playbook-domain.ts";
import type { SoccerDrill } from "@/data/soccer-drills.ts";
import { toast } from "sonner";

interface PlaybookCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drill: SoccerDrill | null;
  onTagsUpdated?: (drillId: string, tags: string[]) => void;
  collections?: PlaybookCollection[];
  onCollectionsUpdated?: (collections: PlaybookCollection[]) => void;
}

export const PlaybookCollectionDialog: React.FC<PlaybookCollectionDialogProps> = ({
  open,
  onOpenChange,
  drill,
  onTagsUpdated,
  collections = DEFAULT_COLLECTIONS,
  onCollectionsUpdated,
}) => {
  const [drillTags, setDrillTags] = useState<string[]>(() => drill?.tags || []);
  const [newCollectionTitle, setNewCollectionTitle] = useState("");
  const [allCollections, setAllCollections] = useState<PlaybookCollection[]>(collections);

  if (!drill) return null;

  const toggleTag = (tagName: string) => {
    let updated: string[];
    if (drillTags.includes(tagName)) {
      updated = drillTags.filter((t) => t !== tagName);
    } else {
      updated = [...drillTags, tagName];
    }
    setDrillTags(updated);
    onTagsUpdated?.(drill.id, updated);
  };

  const toggleDrillInCollection = (colId: string) => {
    const updated = allCollections.map((col) => {
      if (col.id === colId) {
        const has = col.drillIds.includes(drill.id);
        const drillIds = has
          ? col.drillIds.filter((id) => id !== drill.id)
          : [...col.drillIds, drill.id];
        return { ...col, drillIds, updatedAt: new Date().toISOString() };
      }
      return col;
    });

    setAllCollections(updated);
    onCollectionsUpdated?.(updated);
    toast.success("Updated playbook collection!");
  };

  const handleCreateCollection = () => {
    if (!newCollectionTitle.trim()) return;
    const newCol: PlaybookCollection = {
      id: `col_${Date.now()}`,
      title: newCollectionTitle.trim(),
      description: "Custom coaching drill collection",
      tagColor: "#3B82F6",
      drillIds: [drill.id],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const next = [...allCollections, newCol];
    setAllCollections(next);
    onCollectionsUpdated?.(next);
    setNewCollectionTitle("");
    toast.success(`Created collection "${newCol.title}"!`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <BookOpen className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">
                Playbook Tags & Collections
              </DialogTitle>
              <DialogDescription className="text-xs">
                Organize <strong className="text-foreground">{drill.title}</strong> into thematic coaching collections and tags.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Playbook Tags */}
        <div className="space-y-2 py-1">
          <Label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="size-3.5 text-primary" /> Playbook Tags
          </Label>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {DEFAULT_PLAYBOOK_TAGS.map((tag) => {
              const active = drillTags.includes(tag.name);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.name)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 font-medium ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {active && <Check className="size-3" />}
                  <span>{tag.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Playbook Collections */}
        <div className="border-t pt-3 space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <FolderPlus className="size-3.5 text-primary" /> Playbook Collections
          </Label>

          <div className="space-y-2">
            {allCollections.map((col) => {
              const included = col.drillIds.includes(drill.id);
              return (
                <div
                  key={col.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border bg-card/60 text-xs"
                >
                  <div>
                    <h5 className="font-bold text-foreground">{col.title}</h5>
                    <p className="text-[11px] text-muted-foreground">
                      {col.drillIds.length} {col.drillIds.length === 1 ? "drill" : "drills"}
                    </p>
                  </div>
                  <Button
                    variant={included ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => toggleDrillInCollection(col.id)}
                    className="h-7 text-xs font-medium"
                  >
                    {included ? "Included ✓" : "+ Add"}
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Create Collection Input */}
          <div className="flex items-center gap-2 pt-2">
            <Input
              value={newCollectionTitle}
              onChange={(e) => setNewCollectionTitle(e.target.value)}
              placeholder="New collection title..."
              className="h-8 text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateCollection}
              disabled={!newCollectionTitle.trim()}
              className="h-8 text-xs shrink-0"
            >
              <Plus className="size-3 mr-1" /> Create
            </Button>
          </div>
        </div>

        <DialogFooter className="border-t pt-2">
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
