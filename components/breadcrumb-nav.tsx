"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BreadcrumbNav() {
  const pathname = usePathname();
  const paths = pathname.split("/").filter((path) => path !== "");

  const breadcrumbs = [
    { href: "/", label: "home" },
    ...paths.map((path, index) => {
      // Reconstruct the path based on the filtered array
      const href = `/${paths.slice(0, index + 1).join("/")}`;
      return { href, label: path };
    }),
  ];

  return (
    <div className="w-9/10 flex">
      {breadcrumbs.map((crumb, idx) => (
        <div key={`${crumb.href}-${idx}-breadcrumb`} className="flex text-xs">
          <Link
            href={crumb.href}
            className="hover:text-primary hover:uppercase"
          >
            {crumb.label}
          </Link>
          {idx < breadcrumbs.length - 1 && <span>&ensp;{">"}&ensp;</span>}
        </div>
      ))}
    </div>
  );
}
