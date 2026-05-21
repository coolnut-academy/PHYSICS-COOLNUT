"use client";

import { AppWindow, BookOpen, CircleHelp } from "lucide-react";

export type ContentCategory = "app" | "ebook" | "quiz";

interface ZoneSwitcherProps {
    currentZone: ContentCategory;
    onZoneChange: (zone: ContentCategory) => void;
}

const CATEGORIES = [
    {
        value: "app",
        label: "App",
        icon: AppWindow,
        gradient: "linear-gradient(135deg, rgba(14, 165, 233, 0.85) 0%, rgba(37, 99, 235, 0.9) 100%)",
        glow: "rgba(14, 165, 233, 0.6)",
        shadow: "rgba(14, 165, 233, 0.4)",
        text: "text-sky-600",
    },
    {
        value: "ebook",
        label: "Ebook",
        icon: BookOpen,
        gradient: "linear-gradient(135deg, rgba(251, 191, 36, 0.85) 0%, rgba(245, 158, 11, 0.9) 100%)",
        glow: "rgba(251, 191, 36, 0.6)",
        shadow: "rgba(251, 191, 36, 0.4)",
        text: "text-amber-600",
    },
    {
        value: "quiz",
        label: "Quiz",
        icon: CircleHelp,
        gradient: "linear-gradient(135deg, rgba(16, 185, 129, 0.85) 0%, rgba(5, 150, 105, 0.9) 100%)",
        glow: "rgba(16, 185, 129, 0.6)",
        shadow: "rgba(16, 185, 129, 0.4)",
        text: "text-emerald-600",
    },
] as const;

export default function ZoneSwitcher({
    currentZone,
    onZoneChange,
}: ZoneSwitcherProps) {
    const activeIndex = CATEGORIES.findIndex((category) => category.value === currentZone);
    const activeCategory = CATEGORIES[activeIndex] ?? CATEGORIES[0];

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div className="relative p-1.5 rounded-[24px] glass-zone-switcher">
                <div
                    className="absolute top-1.5 bottom-1.5 w-[calc(33.333%-6px)] rounded-[18px] transition-all duration-500 ease-out"
                    style={{
                        left: `calc(${activeIndex * 33.333}% + 6px)`,
                        background: activeCategory.gradient,
                        boxShadow: `0 8px 32px ${activeCategory.shadow},
                               inset 0 1px 1px rgba(255, 255, 255, 0.4),
                               inset 0 -2px 4px rgba(0, 0, 0, 0.1)`,
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                    }}
                >
                    <div
                        className="absolute top-0 left-0 right-0 h-1/2 rounded-t-[18px] pointer-events-none"
                        style={{
                            background: "linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 50%, transparent 100%)",
                        }}
                    />
                    <div
                        className="absolute inset-0 rounded-[18px] blur-xl opacity-60 -z-10"
                        style={{
                            background: activeCategory.glow,
                        }}
                    />
                </div>

                <div className="relative grid grid-cols-3">
                    {CATEGORIES.map(({ value, label, icon: Icon }) => {
                        const isActive = currentZone === value;

                        return (
                            <button
                                key={value}
                                onClick={() => onZoneChange(value)}
                                className={`flex items-center justify-center gap-2 sm:gap-3 py-4 px-3 sm:px-6 rounded-[18px] transition-all duration-300 relative z-10 ${isActive
                                    ? "text-white"
                                    : "text-slate-500 hover:text-slate-700"
                                    }`}
                            >
                                <Icon
                                    className={`w-5 h-5 transition-all duration-300 ${isActive
                                        ? "scale-110 drop-shadow-lg"
                                        : "scale-100"
                                        }`}
                                />
                                <span className={`font-semibold text-sm sm:text-base ${isActive ? "drop-shadow-sm" : ""
                                    }`}>
                                    {label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex justify-center mt-4">
                <div
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-500"
                    style={{
                        background: "rgba(255, 255, 255, 0.25)",
                        backdropFilter: "blur(16px)",
                        border: "1px solid rgba(255, 255, 255, 0.35)",
                        boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.6)",
                    }}
                >
                    <span className="text-sm text-slate-500">กำลังดู:</span>
                    <span className={`font-semibold text-sm transition-colors duration-300 ${activeCategory.text}`}>
                        {activeCategory.label}
                    </span>
                </div>
            </div>
        </div>
    );
}
