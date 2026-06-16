"use client";

import Link from "next/link";
import { FolderOpen, ChevronRight } from "lucide-react";
import { ContentPageDocument } from "@/lib/firestore";

interface ContentPageLauncherGridProps {
    pages: ContentPageDocument[];
}

export default function ContentPageLauncherGrid({ pages }: ContentPageLauncherGridProps) {
    // Return null if there are no enabled custom pages to display
    if (!pages || pages.length === 0) return null;

    return (
        <div className="mb-8 animate-fade-in">
            {/* Section Pill Title */}
            <div className="mb-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-xs sm:text-sm font-bold text-slate-600">
                        หน้าเว็บเสริมบทเรียน
                    </span>
                </div>
            </div>

            {/* Launchers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pages.map((page) => (
                    <Link
                        key={page.id}
                        href={`/hub/${page.slug}`}
                        className="group relative flex items-center justify-between p-5 rounded-2xl border border-white/40 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
                        style={{
                            background: "rgba(255, 255, 255, 0.25)",
                            backdropFilter: "blur(20px)",
                            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.04)",
                        }}
                    >
                        {/* Interactive Background Shine */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-100 transition-opacity pointer-events-none" />
                        <div className="absolute -inset-10 bg-gradient-to-br from-cyan-400/10 to-purple-500/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none" />

                        <div className="flex items-center gap-4 relative z-10">
                            {/* Icon Container with Glassmorphism */}
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/40 border border-white/50 shadow-inner group-hover:scale-105 transition-all duration-300">
                                <FolderOpen className="w-5 h-5 text-cyan-600 group-hover:text-cyan-500 transition-colors" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-700 group-hover:text-slate-800 text-sm sm:text-base leading-tight transition-colors">
                                    {page.title}
                                </h3>
                                <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5 tracking-wide">
                                    เข้าชมหน้าหลัก
                                </p>
                            </div>
                        </div>

                        {/* Chevron Indicator */}
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/30 border border-white/40 group-hover:bg-cyan-500 group-hover:text-white transition-all duration-300 relative z-10 text-slate-500">
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-300" />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
