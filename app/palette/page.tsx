import ColorSwatch from "@/components/color-swatch";
import { PageHeader } from "@/components/page-header";
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

export default function Palette() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-4 items-center">
        <PageHeader />
        <div className="flex-1 flex flex-col gap-4 max-w-5xl p-5">
          <main className="flex flex-row items-start gap-4 px-4">
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
                <ColorSwatch color="tertiary" />
                <ColorSwatch color="tertiary-foreground" />
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

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-4 py-16">
          This is a footer down here
        </footer>
      </div>
    </main>
  );
}
