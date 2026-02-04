"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";

interface UnitProps {
  currentVal?: string;
}

const UnitSwitcher = ({ currentVal }: UnitProps) => {
  const [mounted, setMounted] = useState(false);
  const [value, setValue] = useState(currentVal);

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="border rounded">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size={"lg"}>
            {value}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-content" align="start">
          <DropdownMenuRadioGroup
            value={value}
            onValueChange={(e) => setValue(e)}
          >
            <DropdownMenuRadioItem className="flex gap-2" value="g">
              <span>g</span>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem className="flex gap-2" value="ml">
              <span>ml</span>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem className="flex gap-2" value="pc">
              <span>pc</span>
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export { UnitSwitcher };
