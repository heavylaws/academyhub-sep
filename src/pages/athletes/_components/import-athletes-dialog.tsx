import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import Papa from "papaparse";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileUp,
  Loader2,
  XCircle,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { cn } from "@/lib/utils.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

type RawRow = Record<string, string>;

type ParsedRow = {
  rowNum: number;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  sport?: string;
  gender?: string;
  email?: string;
  phone?: string;
  errors: string[];
};

type ImportSummary = {
  added: number;
  skipped: number;
  errors: string[];
};

// ─── CSV helpers ──────────────────────────────────────────────────────────────

const REQUIRED_COLS = ["first_name", "last_name"] as const;

/** Normalize a raw CSV row into our ParsedRow shape with per-field validation. */
function parseRow(raw: RawRow, rowNum: number): ParsedRow {
  const get = (key: string) => (raw[key] ?? "").toString().trim();

  const firstName = get("first_name");
  const lastName = get("last_name");
  const dob = get("date_of_birth");
  const sport = get("sport");
  const gender = get("gender").toLowerCase();
  const email = get("email");
  const phone = get("phone");

  const errors: string[] = [];

  if (!firstName) errors.push("first_name is required");
  if (!lastName) errors.push("last_name is required");

  // Validate DOB format if present
  if (dob) {
    const d = new Date(dob);
    if (isNaN(d.getTime()))
      errors.push("date_of_birth must be a valid date (YYYY-MM-DD)");
  }

  // Validate gender if present
  const validGenders = ["male", "female", "other"];
  if (gender && !validGenders.includes(gender)) {
    errors.push(`gender must be one of: ${validGenders.join(", ")}`);
  }

  // Basic email format check
  if (email && !email.includes("@")) {
    errors.push("email appears invalid");
  }

  return {
    rowNum,
    firstName,
    lastName,
    dateOfBirth: dob || undefined,
    sport: sport || undefined,
    gender: gender || undefined,
    email: email || undefined,
    phone: phone || undefined,
    errors,
  };
}

// ─── Sample CSV download ──────────────────────────────────────────────────────

function downloadSampleCsv() {
  const header = "first_name,last_name,date_of_birth,sport,gender,email,phone";
  const rows = [
    "Alice,Johnson,2005-03-14,Soccer,female,alice@example.com,",
    "Ben,Smith,2004-07-22,Basketball,male,,+1-555-0100",
    "Chris,Lee,2006-11-01,Swimming,,chris@example.com,",
  ];
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "athletes_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Step = "upload" | "preview" | "done";

export default function ImportAthletesDialog({ open, onOpenChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [parseError, setParseError] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const bulkImport = useMutation(api.athletes.bulkImportAthletes);

  const validRows = rows.filter((r) => r.errors.length === 0);
  const invalidRows = rows.filter((r) => r.errors.length > 0);

  function reset() {
    setStep("upload");
    setParseError(null);
    setRows([]);
    setIsImporting(false);
    setSummary(null);
    setShowErrors(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError(null);
    setRows([]);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setParseError("Please upload a .csv file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setParseError("File must be under 5 MB.");
      return;
    }

    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
      complete: (results) => {
        // Check required columns exist
        const fields = results.meta.fields ?? [];
        const missing = REQUIRED_COLS.filter((c) => !fields.includes(c));
        if (missing.length > 0) {
          setParseError(
            `Missing required columns: ${missing.join(", ")}. Please check your CSV headers.`,
          );
          return;
        }

        if (results.data.length === 0) {
          setParseError("The CSV file has no data rows.");
          return;
        }

        const parsed = results.data.map((row, i) => parseRow(row, i + 2));
        setRows(parsed);
        setStep("preview");
      },
      error: (err) => {
        setParseError(`Could not parse file: ${err.message}`);
      },
    });
  }

  async function handleImport() {
    if (validRows.length === 0) return;
    setIsImporting(true);
    try {
      const result = await bulkImport({
        athletes: validRows.map((r) => ({
          firstName: r.firstName,
          lastName: r.lastName,
          dateOfBirth: r.dateOfBirth,
          sport: r.sport,
          gender:
            r.gender === "male" || r.gender === "female" || r.gender === "other"
              ? r.gender
              : undefined,
          email: r.email,
          phone: r.phone,
        })),
      });
      setSummary({
        added: result.added,
        skipped: result.skipped,
        errors: result.errors,
      });
      setStep("done");
      toast.success(
        `Imported ${result.added} athlete${result.added !== 1 ? "s" : ""}`,
      );
    } catch (err) {
      toast.error(
        err instanceof ConvexError
          ? String((err.data as { message?: string }).message)
          : "Import failed. Please try again.",
      );
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import athletes from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to add multiple athletes at once.
          </DialogDescription>
        </DialogHeader>

        {/* ── Step: upload ── */}
        {step === "upload" && (
          <div className="flex flex-col gap-4">
            {/* Format guide */}
            <div className="rounded-lg border bg-muted/40 p-4 text-sm">
              <p className="mb-2 font-medium">Required columns</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {["first_name", "last_name"].map((c) => (
                  <Badge
                    key={c}
                    variant="secondary"
                    className="font-mono text-xs"
                  >
                    {c}
                  </Badge>
                ))}
              </div>
              <p className="mb-2 font-medium">Optional columns</p>
              <div className="flex flex-wrap gap-1.5">
                {["date_of_birth", "sport", "gender", "email", "phone"].map(
                  (c) => (
                    <Badge
                      key={c}
                      variant="outline"
                      className="font-mono text-xs"
                    >
                      {c}
                    </Badge>
                  ),
                )}
              </div>
              <p className="mt-3 text-muted-foreground text-xs">
                Headers are case-insensitive. <code>gender</code> accepts: male,
                female, other. <code>date_of_birth</code> format: YYYY-MM-DD.
              </p>
            </div>

            {/* Drop zone / file input */}
            <label
              htmlFor="csv-upload"
              className={cn(
                "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer",
                "hover:border-primary/60 hover:bg-muted/20",
              )}
            >
              <FileUp className="size-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Click to choose a CSV file</p>
                <p className="text-sm text-muted-foreground">Max 5 MB</p>
              </div>
              <input
                id="csv-upload"
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="sr-only"
                onChange={handleFileChange}
              />
            </label>

            {parseError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 mt-0.5 shrink-0" />
                {parseError}
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="w-fit self-end"
              onClick={downloadSampleCsv}
            >
              <Download className="size-4" />
              Download sample CSV
            </Button>
          </div>
        )}

        {/* ── Step: preview ── */}
        {step === "preview" && (
          <div className="flex flex-col gap-4">
            {/* Summary chips */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="size-4 text-accent-foreground" />
                <span className="font-semibold text-foreground">
                  {validRows.length}
                </span>
                <span className="text-muted-foreground">ready to import</span>
              </div>
              {invalidRows.length > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <XCircle className="size-4 text-destructive" />
                  <span className="font-semibold text-destructive">
                    {invalidRows.length}
                  </span>
                  <span className="text-muted-foreground">will be skipped</span>
                </div>
              )}
            </div>

            {/* Table preview */}
            <div className="max-h-72 overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Sport</TableHead>
                    <TableHead>DOB</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.rowNum}
                      className={
                        row.errors.length > 0 ? "bg-destructive/5" : undefined
                      }
                    >
                      <TableCell className="text-muted-foreground text-xs">
                        {row.rowNum}
                      </TableCell>
                      <TableCell>
                        {row.errors.length === 0 ? (
                          <span className="font-medium">
                            {row.firstName} {row.lastName}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">
                            {row.firstName || "—"} {row.lastName || "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.sport ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.dateOfBirth ?? "—"}
                      </TableCell>
                      <TableCell>
                        {row.errors.length === 0 ? (
                          <Badge variant="secondary" className="text-xs">
                            Valid
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            Error
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Expandable error list */}
            {invalidRows.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5">
                <button
                  className="flex w-full items-center justify-between p-3 text-sm font-medium text-destructive"
                  onClick={() => setShowErrors((v) => !v)}
                >
                  <span className="flex items-center gap-2">
                    <AlertCircle className="size-4" />
                    {invalidRows.length} row
                    {invalidRows.length !== 1 ? "s" : ""} with errors
                  </span>
                  {showErrors ? (
                    <ChevronUp className="size-4" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                </button>
                {showErrors && (
                  <div className="border-t border-destructive/20 p-3 flex flex-col gap-1.5">
                    {invalidRows.map((row) => (
                      <div
                        key={row.rowNum}
                        className="text-xs text-destructive"
                      >
                        <span className="font-semibold">Row {row.rowNum}:</span>{" "}
                        {row.errors.join("; ")}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Step: done ── */}
        {step === "done" && summary && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="size-7 text-primary" />
            </div>
            <div>
              <p className="font-display text-xl font-bold">Import complete</p>
              <p className="text-muted-foreground text-sm mt-1">
                {summary.added} athlete{summary.added !== 1 ? "s" : ""} added
                successfully.
                {summary.skipped > 0 && ` ${summary.skipped} skipped.`}
              </p>
            </div>
            {summary.errors.length > 0 && (
              <div className="w-full rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-left">
                <p className="text-sm font-medium text-destructive mb-1">
                  Import errors
                </p>
                <ul className="text-xs text-destructive space-y-0.5">
                  {summary.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        <DialogFooter className="gap-2">
          {step === "upload" && (
            <Button variant="ghost" onClick={() => handleClose(false)}>
              Cancel
            </Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="ghost" onClick={reset}>
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={validRows.length === 0 || isImporting}
              >
                {isImporting && <Loader2 className="size-4 animate-spin" />}
                Import {validRows.length} athlete
                {validRows.length !== 1 ? "s" : ""}
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={() => handleClose(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
