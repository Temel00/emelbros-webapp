import { AuthButton } from "@/components/auth-button";
import ColorSwatch from "@/components/color-swatch";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { hasEnvVars } from "@/lib/utils";
import { Suspense } from "react";

export default function Palette() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-6xl flex gap-5 justify-between items-center p-3 px-5 text-sm">
            <ThemeSwitcher />
            {!hasEnvVars ? (
              <p>Missing ENV vars</p>
            ) : (
              <Suspense>
                <AuthButton />
              </Suspense>
            )}
          </div>
        </nav>
        <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5">
          {/* <Hero /> */}
          <main className="flex flex-row items-start gap-6 px-4">
            <Card className="p-4">
              <CardTitle>Color Palette</CardTitle>
              <CardContent className="grid p-4 grid-cols-2 grid-rows-2 gap-4">
                <ColorSwatch color="background" />
                <ColorSwatch color="foreground" />
                <ColorSwatch color="card" />
                <ColorSwatch color="card-foreground" />
                <ColorSwatch color="popover" />
                <ColorSwatch color="popover-foreground" />
                <ColorSwatch color="primary" />
                <ColorSwatch color="primary-foreground" />
                <ColorSwatch color="secondary" />
                <ColorSwatch color="secondary-foreground" />
                <ColorSwatch color="terciary" />
                <ColorSwatch color="terciary-foreground" />
                <ColorSwatch color="accent" />
                <ColorSwatch color="accent-foreground" />
                <ColorSwatch color="destructive" />
                <ColorSwatch color="destructive-foreground" />
                <ColorSwatch color="border" />
                <ColorSwatch color="input" />
                <ColorSwatch color="ring" />
              </CardContent>
            </Card>
            <Card className="p-4">
              <CardHeader>
                <p>Header</p>
              </CardHeader>
              <CardTitle>Card Title</CardTitle>
              <CardDescription>This is a card description</CardDescription>
              <CardContent className="flex p-4 gap-4">
                <Button>Click me!</Button>
                <Badge>Badge</Badge>
              </CardContent>
              <CardFooter>Card Footer</CardFooter>
            </Card>
          </main>
        </div>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
          This is a footer down here
        </footer>
      </div>
    </main>
  );
}
