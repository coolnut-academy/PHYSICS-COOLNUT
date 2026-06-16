"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, RefreshCw, Sparkles, FolderOpen, AlertCircle } from "lucide-react";
import { getContentPageBySlug, getApps, ContentPageDocument } from "@/lib/firestore";
import AppGrid from "./AppGrid";
import { AppData, toAppData } from "./AppCard";

interface ContentPageViewProps {
    slug: string;
}



export default function ContentPageView({ slug }: ContentPageViewProps) {
    const [page, setPage] = useState<ContentPageDocument | null>(null);
    const [apps, setApps] = useState<AppData[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError("");

            // Fetch current custom page by slug
            const pageData = await getContentPageBySlug(slug);
            if (!pageData || pageData.isEnabled === false) {
                setError("not_found");
                return;
            }
            setPage(pageData);

            // Fetch all cards
            const fetchedApps = await getApps();
            setApps(fetchedApps.map(toAppData));

            // Select default tab
            const enabledTabs = (pageData.tabs || [])
                .filter((t) => t.isEnabled !== false)
                .sort((a, b) => a.order - b.order);

            if (enabledTabs.length > 0) {
                setActiveTabId(enabledTabs[0].id);
            }
        } catch (err) {
            console.error("Failed to load page data:", err);
            setError("failed");
        } finally {
            setIsLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 py-12">
                <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-purple-400/20 backdrop-blur-xl border border-white/40 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                    </div>
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-400 blur-2xl opacity-20" />
                </div>
                <p className="text-slate-500 mt-4 font-bold">กำลังโหลดหน้าบทเรียน...</p>
            </div>
        );
    }

    if (error === "not_found" || !page) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
                <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-3xl bg-rose-50/80 backdrop-blur-md border border-rose-200/50 flex items-center justify-center text-rose-500 shadow-lg">
                        <AlertCircle className="w-10 h-10 animate-bounce" />
                    </div>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">ไม่พบหน้าเว็บที่คุณต้องการ</h2>
                <p className="text-sm text-slate-500 font-semibold mb-6 text-center max-w-sm">หน้าเว็บนี้อาจถูกลบออก หรือถูกปิดการใช้งานชั่วคราวโดยผู้ดูแลระบบ</p>
                <Link
                    href="/"
                    className="glass-button-primary px-6 py-3 rounded-2xl font-bold transition-all shadow-md flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    กลับหน้าแรก
                </Link>
            </div>
        );
    }

    if (error === "failed") {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
                <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-6">
                    <RefreshCw className="w-10 h-10" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">การเชื่อมต่อผิดพลาด</h2>
                <p className="text-sm text-slate-500 font-semibold mb-6">ไม่สามารถโหลดข้อมูลจากฐานข้อมูลของโรงเรียนได้</p>
                <button
                    onClick={loadData}
                    className="glass-button-primary px-6 py-3 rounded-2xl font-bold transition-all shadow-md"
                >
                    ลองใหม่อีกครั้ง
                </button>
            </div>
        );
    }

    const enabledTabs = (page.tabs || [])
        .filter((t) => t.isEnabled !== false)
        .sort((a, b) => a.order - b.order);

    const activeTab = enabledTabs.find((t) => t.id === activeTabId);

    const filteredApps = apps
        .filter((app) => app.pageId === page.id && app.tabId === activeTabId && app.isEnabled !== false)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    return (
        <main className="min-h-screen flex flex-col pb-8">
            {/* Liquid Glass Header */}
            <header className="sticky top-0 z-50 glass-header">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                        {/* Back Button */}
                        <Link
                            href="/"
                            className="glass-button p-2.5 rounded-xl flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-all"
                            title="กลับหน้าแรก"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">ย้อนกลับ</span>
                        </Link>

                        {/* Centered Page Title Badge */}
                        <div className="flex items-center gap-3 bg-white/30 backdrop-blur-xl border border-white/50 px-4 py-2 rounded-2xl shadow-md">
                            <FolderOpen className="w-5 h-5 text-cyan-500" />
                            <h1 className="text-base sm:text-lg font-bold text-slate-700">{page.title}</h1>
                        </div>

                        {/* Refresh Button */}
                        <button
                            onClick={loadData}
                            className="glass-button p-2.5 rounded-xl"
                            title="รีเฟรช"
                        >
                            <RefreshCw className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>

                    {/* Custom Segmented Zone Switcher (Horizontal scrollable on mobile) */}
                    {enabledTabs.length > 0 && (
                        <div className="mt-6 flex justify-center">
                            <div className="glass-zone-switcher max-w-full overflow-x-auto scrollbar-none flex gap-1 p-1 py-1 rounded-2xl">
                                {enabledTabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTabId(tab.id)}
                                        className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap focus:outline-none focus:ring-0 ${
                                            activeTabId === tab.id
                                                ? "bg-white text-slate-800 shadow-md transform scale-102"
                                                : "text-slate-500 hover:text-slate-800"
                                        }`}
                                    >
                                        {tab.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content Grid Area */}
            <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 sm:py-8">
                {/* Section Pill Badge */}
                {activeTab && (
                    <div className="mb-6 sm:mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/30 backdrop-blur-lg border border-white/40 shadow-sm">
                            <Sparkles className="w-4 h-4 text-cyan-500" />
                            <h2 className="text-xs sm:text-sm font-bold text-slate-700">
                                {activeTab.title} ({filteredApps.length} รายการ)
                            </h2>
                        </div>
                    </div>
                )}

                {/* Grid Box */}
                <div className="glass-card p-4 sm:p-6 md:p-8">
                    {enabledTabs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                                <Sparkles className="w-8 h-8" />
                            </div>
                            <p className="text-slate-500 font-bold">ยังไม่มีแท็บย่อยที่เปิดแสดงในหน้านี้</p>
                        </div>
                    ) : (
                        <AppGrid
                            apps={filteredApps}
                            emptyMessage={`ไม่พบเนื้อหาในแท็บ "${activeTab?.title || ""}"`}
                        />
                    )}
                </div>
            </div>

            {/* Footer */}
            <footer className="text-center py-4">
                <div className="flex items-center justify-center gap-3">
                    <div className="developer-badge">
                        <div className="developer-badge-icon">
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M8 5L3 12L8 19"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M16 5L21 12L16 19"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>
                        <div className="developer-badge-content">
                            <span className="developer-badge-label">Dev/ครูผู้สอน</span>
                            <span className="developer-badge-name">นายสาธิต ศิริวัชน์</span>
                        </div>
                    </div>
                </div>
            </footer>
        </main>
    );
}
