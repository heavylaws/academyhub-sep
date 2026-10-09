import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Building2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { StatCard } from "./shared/stat-card.tsx";

export type PlatformData = {
  role: "platform_admin";
  academyCount: number;
  userCount: number;
  academies: Array<{
    _id: string;
    name: string;
    slug: string;
    status: string;
    createdAt: string;
  }>;
};

export function PlatformAdminDashboard({ data }: { data: PlatformData }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Total academies"
          value={data.academyCount}
          icon={Building2}
          to="/admin/academies"
        />
        <StatCard
          label="Registered users"
          value={data.userCount}
          icon={Users}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Academies</CardTitle>
            <Link
              to="/admin/academies"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Manage
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {data.academies.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Building2 />
                </EmptyMedia>
                <EmptyTitle>No academies yet</EmptyTitle>
                <EmptyDescription>
                  Create your first academy from the Academies page.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-2">
              {data.academies.map((a) => (
                <div
                  key={a._id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-medium truncate">{a.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {a.slug}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-xs capitalize">
                      {a.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(a.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
