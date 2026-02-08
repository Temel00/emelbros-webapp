import { Suspense } from "react";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

export function PageHeader() {
  return (
    <nav className="w-full flex justify-center bg-popover border-b border-b-foreground/10 h-16">
      <div className="w-full max-w-6xl grid grid-flow-row grid-cols-3 gap-4 place-content-center text-sm">
        <div className="flex items-center justify-start">
          <ThemeSwitcher />
        </div>
        <Link href="/" className="flex justify-center items-center">
          <Image src="/logo_v1.1.png" alt="logo" width={100} height={51} />
        </Link>
        {!hasEnvVars ? (
          <p>Missing ENV vars</p>
        ) : (
          <div className="flex justify-end">
            <Suspense>
              <AuthButton />
            </Suspense>
          </div>
        )}
      </div>
    </nav>
  );
}
