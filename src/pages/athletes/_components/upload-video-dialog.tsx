import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { Upload, Video } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Progress } from "@/components/ui/progress.tsx";

const MAX_SIZE_MB = 100;

const formSchema = z.object({
  context: z.string(),
});

/** Extract N evenly-spaced frames from a video file as base64 JPEG strings. */
async function extractFrames(file: File, count = 4): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.src = url;
    video.crossOrigin = "anonymous";
    video.muted = true;

    video.addEventListener("loadedmetadata", () => {
      const duration = video.duration;
      const times = Array.from(
        { length: count },
        (_, i) => (duration / (count + 1)) * (i + 1),
      );
      const frames: string[] = [];
      let idx = 0;

      const captureNext = () => {
        if (idx >= times.length) {
          URL.revokeObjectURL(url);
          resolve(frames);
          return;
        }
        video.currentTime = times[idx];
      };

      video.addEventListener("seeked", () => {
        const canvas = document.createElement("canvas");
        // Cap at 480p to keep base64 payload small
        const scale = Math.min(1, 480 / video.videoHeight);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        const ctx2d = canvas.getContext("2d");
        if (ctx2d) {
          ctx2d.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          // Strip the data:image/jpeg;base64, prefix
          frames.push(dataUrl.split(",")[1] ?? "");
        }
        idx++;
        captureNext();
      });

      video.addEventListener("error", () => {
        URL.revokeObjectURL(url);
        reject(new Error("Could not load video for frame extraction"));
      });

      captureNext();
    });

    video.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load video"));
    });

    video.load();
  });
}

export default function UploadVideoDialog({
  open,
  onOpenChange,
  athleteId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteId: Id<"athletes">;
}) {
  const generateUploadUrl = useMutation(api.videoAnalyses.generateUploadUrl);
  const saveAndAnalyze = useMutation(api.videoAnalyses.saveVideoAndAnalyze);
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [stage, setStage] = useState<
    "idle" | "extracting" | "uploading" | "submitting"
  >("idle");
  const [progress, setProgress] = useState(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { context: "" },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Video must be under ${MAX_SIZE_MB}MB`);
      return;
    }
    setSelectedFile(file);
  };

  const handleClose = () => {
    if (stage !== "idle") return;
    setSelectedFile(null);
    setProgress(0);
    setStage("idle");
    form.reset();
    if (fileRef.current) fileRef.current.value = "";
    onOpenChange(false);
  };

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!selectedFile) {
      toast.error("Please select a video file");
      return;
    }
    try {
      // Step 1: extract frames
      setStage("extracting");
      setProgress(10);
      const frames = await extractFrames(selectedFile, 4);
      setProgress(30);

      // Step 2: upload video to Convex storage
      setStage("uploading");
      const uploadUrl = await generateUploadUrl();
      setProgress(40);

      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });
      if (!uploadRes.ok) throw new Error("Video upload failed");
      const { storageId } = (await uploadRes.json()) as {
        storageId: Id<"_storage">;
      };
      setProgress(80);

      // Step 3: save record and trigger AI analysis
      setStage("submitting");
      await saveAndAnalyze({
        athleteId,
        storageId,
        filename: selectedFile.name,
        context: values.context || undefined,
        frames,
      });
      setProgress(100);

      toast.success("Video uploaded — AI analysis in progress");
      handleClose();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : error instanceof Error
            ? error.message
            : "Upload failed",
      );
      setStage("idle");
      setProgress(0);
    }
  };

  const busy = stage !== "idle";

  const handlePickerClick = () => {
    if (!busy) fileRef.current?.click();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload performance video</DialogTitle>
          <DialogDescription>
            Upload a short training clip. Frames will be extracted and analysed
            by AI to provide performance feedback.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="flex flex-col gap-4">
            {/* File picker */}
            <div
              className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors hover:border-primary/50"
              onClick={handlePickerClick}
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                {selectedFile ? (
                  <Video className="size-5 text-primary" />
                ) : (
                  <Upload className="size-5 text-muted-foreground" />
                )}
              </div>
              {selectedFile ? (
                <div className="text-center">
                  <p className="text-sm font-medium truncate max-w-[240px]">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-medium">Click to select video</p>
                  <p className="text-xs text-muted-foreground">
                    MP4, MOV, AVI — max {MAX_SIZE_MB}MB
                  </p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={busy}
              />
            </div>

            <FormField
              control={form.control}
              name="context"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Context for AI (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Sprint start, focus on drive phase and hip extension"
                      rows={2}
                      disabled={busy}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {busy && (
              <div className="flex flex-col gap-1.5">
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground text-center">
                  {stage === "extracting" && "Extracting video frames…"}
                  {stage === "uploading" && "Uploading video…"}
                  {stage === "submitting" && "Submitting for AI analysis…"}
                </p>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!selectedFile || busy}
                onClick={() => {
                  void form.handleSubmit(handleSubmit)();
                }}
              >
                {busy && <Spinner className="size-4" />}
                {busy ? "Processing…" : "Upload & analyse"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
