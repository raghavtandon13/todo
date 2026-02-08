"use client";

import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getInitialTheme(): Theme {
    if (typeof window === "undefined") return "system";
    const local = window.localStorage.getItem("theme");
    if (local === "light" || local === "dark" || local === "system") return local as Theme;
    return "system";
}

function applyHtmlClass(theme: Theme) {
    if (typeof document === "undefined") return;
    const htmlEl = document.documentElement;

    if (theme === "system") {
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        htmlEl.classList.toggle("dark", isDark);
    } else {
        htmlEl.classList.toggle("dark", theme === "dark");
    }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode; defaultTheme?: Theme }> = ({
    children,
    defaultTheme = "dark",
}) => {
    const [theme, setThemeState] = useState<Theme>(defaultTheme);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Check localStorage for saved theme
        const savedTheme = window.localStorage.getItem("theme") as Theme | null;
        if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
            setThemeState(savedTheme);
        }
    }, []);

    useEffect(() => {
        if (!mounted) return;

        if (theme === "system") {
            window.localStorage.removeItem("theme");
        } else {
            window.localStorage.setItem("theme", theme);
        }
        applyHtmlClass(theme);
        // Listen for system theme changes if "system" selected
        if (theme === "system") {
            const mq = window.matchMedia("(prefers-color-scheme: dark)");
            const handler = () => applyHtmlClass("system");
            mq.addEventListener("change", handler);
            return () => mq.removeEventListener("change", handler);
        }
    }, [theme, mounted]);

    function setTheme(newTheme: Theme) {
        setThemeState(newTheme);
    }

    return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
};

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
    return ctx;
}
