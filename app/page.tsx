import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-4 items-center">
        <PageHeader />
        <main className="flex-1 flex flex-col gap-4 px-4 items-center">
          <h1>Home Page</h1>
          <Button asChild variant={"secondary"} size={"lg"}>
            <Link href={"/dashboard"}>Dashboard</Link>
          </Button>
        </main>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-4 py-16">
          This is a footer down here
        </footer>
      </div>
    </div>
  );
}
