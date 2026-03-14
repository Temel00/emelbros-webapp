import { Suspense } from "react";
import Link from "next/link";
import { UtensilsCrossed, Activity, Lock } from "lucide-react";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getUserAccessLevel } from "@/lib/supabase/access";
import { hasAccess, ACCESS_LEVEL_LABELS } from "@/lib/access-level";
import type { AccessLevel } from "@/lib/access-level";
import { Toolbox } from "./widgets";

type SectionDef = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  requiredLevel: AccessLevel;
};

const COLOR_CYCLE = [
  { icon: "text-primary", border: "hover:border-primary/50" },
  { icon: "text-secondary", border: "hover:border-secondary/50" },
  { icon: "text-tertiary", border: "hover:border-tertiary/50" },
  { icon: "text-accent", border: "hover:border-accent/50" },
] as const;

const SECTIONS: SectionDef[] = [
  {
    title: "Food",
    description: "Inventory, recipes, meal planning, and shopping lists",
    href: "/dashboard/food",
    icon: UtensilsCrossed,
    requiredLevel: "sisters",
  },
  {
    title: "Health",
    description: "Water intake, exercises, and physical measurements",
    href: "/dashboard/health",
    icon: Activity,
    requiredLevel: "mt_hood",
  },
];

async function DashboardContent() {
  const accessLevel = await getUserAccessLevel();

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        {accessLevel && (
          <Badge variant="outline">{ACCESS_LEVEL_LABELS[accessLevel]}</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map((section, index) => {
          const allowed = hasAccess(accessLevel, section.requiredLevel);
          const Icon = section.icon;
          const colors = COLOR_CYCLE[index % COLOR_CYCLE.length];

          if (!allowed) {
            return (
              <Card
                key={section.title}
                className="opacity-50 cursor-not-allowed"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                      <CardTitle>{section.title}</CardTitle>
                    </div>
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Requires {ACCESS_LEVEL_LABELS[section.requiredLevel]} access
                  </p>
                </CardContent>
              </Card>
            );
          }

          return (
            <Link key={section.title} href={section.href}>
              <Card className={cn(colors.border, "transition-colors h-full")}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className={cn("w-5 h-5", colors.icon)} />
                    <CardTitle>{section.title}</CardTitle>
                  </div>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

      {hasAccess(accessLevel, "mt_hood") && <Toolbox />}
    </>
  );
}

export default function DashboardPage() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-4 items-center">
        <PageHeader />
        <BreadcrumbNav />
        <section className="w-full max-w-5xl p-5 space-y-4">
          <Suspense fallback={<div>Loading dashboard...</div>}>
            <DashboardContent />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
