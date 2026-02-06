import { DashboardButton } from "@/components/dashboard-button";
import { PageHeader } from "@/components/page-header";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-4 items-center">
        <PageHeader />
        <div className="flex-1 flex flex-col gap-4 max-w-5xl p-5">
          <main className="flex-1 flex flex-col gap-4 px-4">
            <DashboardButton />
          </main>
        </div>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-4 py-16">
          This is a footer down here
        </footer>
      </div>
    </main>
  );
}
