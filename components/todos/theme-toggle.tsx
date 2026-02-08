"use client";
import { MonitorIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import React from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "../theme-provider";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    function getThemeIcon(theme: string) {
        if (theme === "light") return <SunIcon />;
        if (theme === "dark") return <MoonIcon />;
        return <MonitorIcon />;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger render={<Button aria-label="Toggle theme" size="icon" variant="ghost" />}>
                {getThemeIcon(theme)}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup onValueChange={setTheme} value={theme}>
                    <DropdownMenuRadioItem value="light">
                        <SunIcon /> Light
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark">
                        <MoonIcon /> Dark
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="system">
                        <MonitorIcon /> System
                    </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
