import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Megaphone,
  Zap,
  AlertTriangle,
  Info,
  Calendar,
  DollarSign,
  Pin,
  Users,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  content: z.string().min(5, "Message must be at least 5 characters"),
  category: z.enum(["weather", "meet_schedule", "facility", "fees", "general"]),
  priority: z.enum(["urgent", "important", "normal"]),
  targetTeamId: z.string().optional(),
  isPinned: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateAnnouncementDialog({ open, onOpenChange }: Props) {
  const createAnnouncement = useMutation(api.announcements.createAnnouncement);
  const teams = useQuery(api.teams.listTeams) ?? [];
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      category: "general",
      priority: "normal",
      targetTeamId: "all",
      isPinned: false,
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      await createAnnouncement({
        title: values.title.trim(),
        content: values.content.trim(),
        category: values.category,
        priority: values.priority,
        targetTeamId:
          values.targetTeamId && values.targetTeamId !== "all"
            ? (values.targetTeamId as Id<"teams">)
            : undefined,
        isPinned: values.isPinned,
      });

      toast.success("Announcement broadcasted successfully!");
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to post announcement",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="size-5 text-primary" />
            Broadcast New Notice
          </DialogTitle>
          <DialogDescription>
            Publish an academy announcement or team alert. Urgent notices are pinned to the dashboard banner.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notice Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. ⚡ Lightning Warning: Track Session Moved to Gym B"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="general">📢 General Academy</SelectItem>
                        <SelectItem value="weather">⚡ Weather & Safety</SelectItem>
                        <SelectItem value="meet_schedule">🚌 Meet / Travel</SelectItem>
                        <SelectItem value="facility">🏋️ Facility & Gym</SelectItem>
                        <SelectItem value="fees">💳 Tuition & Fees</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="normal">Normal Information</SelectItem>
                        <SelectItem value="important">⚠️ Important Notice</SelectItem>
                        <SelectItem value="urgent">🚨 Urgent / Action Required</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="targetTeamId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Audience / Target Team</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Audience" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">Entire Academy (All Teams)</SelectItem>
                      {teams.map((t) => (
                        <SelectItem key={t._id} value={t._id}>
                          Team: {t.name} ({t.sport || "General"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    Choose whether this notice is academy-wide or targeted to a specific team roster.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message Body</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter detailed notice information, instructions, or meeting times..."
                      className="min-h-[110px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPinned"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-1.5 text-sm font-medium">
                      <Pin className="size-3.5 text-amber-500" />
                      Pin to Noticeboard & Dashboard
                    </FormLabel>
                    <FormDescription className="text-xs">
                      Keeps this notice prominently anchored at the top of feeds.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Broadcasting..." : "Broadcast Notice"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
