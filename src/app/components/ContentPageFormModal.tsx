"use client";

import { useState, useEffect } from "react";
import {
    X,
    Loader2,
    Save,
    Type,
    Link as LinkIcon,
    Plus,
    Trash2,
    ChevronUp,
    ChevronDown,
    ToggleLeft,
    ToggleRight,
    Layout,
    AlertTriangle,
} from "lucide-react";
import { ContentPageDocument, ContentPageTab, AppDocument, isContentPageSlugAvailable, cleanSlug } from "@/lib/firestore";

interface ContentPageFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Omit<ContentPageDocument, "id" | "order" | "createdAt" | "updatedAt">) => Promise<void>;
    editingPage?: ContentPageDocument | null;
    apps: AppDocument[];
}

export default function ContentPageFormModal({
    isOpen,
    onClose,
    onSubmit,
    editingPage,
    apps,
}: ContentPageFormModalProps) {
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [isEnabled, setIsEnabled] = useState(true);
    const [tabs, setTabs] = useState<ContentPageTab[]>([]);
    const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [slugWarningShown, setSlugWarningShown] = useState(false);

    // Populate form when editing
    useEffect(() => {
        if (editingPage) {
            setTitle(editingPage.title);
            setSlug(editingPage.slug);
            setIsEnabled(editingPage.isEnabled !== false);
            setTabs(editingPage.tabs || []);
            setIsSlugManuallyEdited(true); // Don't auto-overwrite slug when editing
        } else {
            setTitle("");
            setSlug("");
            setIsEnabled(true);
            // Default to one tab for new page
            setTabs([
                {
                    id: `tab_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    title: "ทั่วไป",
                    order: 0,
                    isEnabled: true,
                },
            ]);
            setIsSlugManuallyEdited(false);
        }
        setError("");
        setSlugWarningShown(false);
    }, [editingPage, isOpen]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen && !isSubmitting) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [isOpen, isSubmitting, onClose]);



    const handleTitleChange = (val: string) => {
        setTitle(val);
        if (!isSlugManuallyEdited && !editingPage) {
            const autoSlug = cleanSlug(val) || `page-${Math.random().toString(36).substr(2, 5)}`;
            setSlug(autoSlug);
        }
    };

    const handleSlugChange = (val: string) => {
        const cleaned = cleanSlug(val);
        setSlug(cleaned);
        setIsSlugManuallyEdited(true);

        if (editingPage && !slugWarningShown) {
            alert("คำเตือน: การเปลี่ยน Slug จะทำให้ URL สาธารณะเปลี่ยนไป ลิงก์เดิมจะใช้งานไม่ได้");
            setSlugWarningShown(true);
        }
    };

    // Tab list controls
    const addTabRow = () => {
        const newTab: ContentPageTab = {
            id: `tab_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            title: "",
            order: tabs.length,
            isEnabled: true,
        };
        setTabs([...tabs, newTab]);
    };

    const handleTabTitleChange = (index: number, val: string) => {
        const newTabs = [...tabs];
        newTabs[index].title = val;
        setTabs(newTabs);
    };

    const handleTabToggleEnabled = (index: number) => {
        const newTabs = [...tabs];
        newTabs[index].isEnabled = !newTabs[index].isEnabled;
        setTabs(newTabs);
    };

    const moveTab = (index: number, direction: "up" | "down") => {
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= tabs.length) return;

        const newTabs = [...tabs];
        const temp = newTabs[index];
        newTabs[index] = newTabs[targetIndex];
        newTabs[targetIndex] = temp;

        // Recalculate order
        newTabs.forEach((t, i) => {
            t.order = i;
        });

        setTabs(newTabs);
    };

    const removeTabRow = (index: number) => {
        const tabToRemove = tabs[index];
        
        // Safeguard: Check if this tab has assigned cards
        if (editingPage && tabToRemove.id) {
            const hasCards = apps.some((app) => app.pageId === editingPage.id && app.tabId === tabToRemove.id);
            if (hasCards) {
                const cardCount = apps.filter((app) => app.pageId === editingPage.id && app.tabId === tabToRemove.id).length;
                alert(`ไม่สามารถลบแท็บนี้ได้ เนื่องจากมี ${cardCount} การ์ด/บทเรียน อยู่ในแท็บนี้ กรุณาย้ายหรือลบการ์ดออกก่อน`);
                return;
            }
        }

        const newTabs = tabs.filter((_, i) => i !== index);
        newTabs.forEach((t, i) => {
            t.order = i;
        });
        setTabs(newTabs);
    };

    // Form validation and submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!title.trim()) {
            setError("กรุณากรอกชื่อหน้าเว็บ");
            return;
        }

        if (!slug.trim()) {
            setError("กรุณากรอก URL Slug");
            return;
        }

        // Validate slug regex format
        if (!/^[a-z0-9-]+$/.test(slug)) {
            setError("Slug ต้องประกอบด้วยตัวอักษรภาษาอังกฤษ ตัวเลข และเครื่องหมายขีดคั่น (-) เท่านั้น");
            return;
        }

        // Check tabs
        if (tabs.length === 0) {
            setError("ต้องมีอย่างน้อย 1 แท็บ");
            return;
        }

        const hasEmptyTabTitle = tabs.some((t) => !t.title.trim());
        if (hasEmptyTabTitle) {
            setError("กรุณากรอกชื่อแท็บให้ครบทุกแท็บ");
            return;
        }

        // Check duplicate tab titles within the same page
        const tabTitles = tabs.map((t) => t.title.trim());
        const hasDuplicateTabs = tabTitles.some((val, i) => tabTitles.indexOf(val) !== i);
        if (hasDuplicateTabs) {
            setError("ชื่อแท็บในหน้านี้ต้องไม่ซ้ำกัน");
            return;
        }

        setIsSubmitting(true);
        try {
            // Validate slug uniqueness
            const isAvailable = await isContentPageSlugAvailable(slug, editingPage?.id);
            if (!isAvailable) {
                setError("URL Slug นี้ถูกใช้งานแล้ว กรุณาใช้ชื่ออื่น");
                setIsSubmitting(false);
                return;
            }

            await onSubmit({
                title: title.trim(),
                slug: slug.trim(),
                isEnabled,
                tabs: tabs.map((t) => ({
                    ...t,
                    title: t.title.trim(),
                })),
            });
            onClose();
        } catch (err) {
            console.error("Failed to submit page:", err);
            setError("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const isEditing = !!editingPage;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto py-8 bg-slate-900/60 backdrop-blur-md">
            <div className="absolute inset-0" onClick={() => !isSubmitting && onClose()} />

            <div className="relative z-10 w-full max-w-2xl mx-4 animate-fade-in-up">
                <div
                    className="relative overflow-hidden rounded-3xl"
                    style={{
                        background: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(20px)",
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                    }}
                >
                    <div className="h-1 bg-gradient-to-r from-cyan-500 to-purple-500" />

                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100/50 transition-all disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="p-6 sm:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white">
                                <Layout className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">
                                    {isEditing ? "แก้ไขหน้าเว็บเสริม" : "สร้างหน้าเว็บเสริมใหม่"}
                                </h2>
                                <p className="text-sm text-slate-500 font-medium">
                                    สร้างหน้าหลักที่มีเมนูแท็บย่อยเพื่อแยกกลุ่มบทเรียน
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Title Field */}
                            <div>
                                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-2">
                                    <Type className="w-4 h-4 text-slate-500" />
                                    ชื่อหน้าเว็บ (เช่น โครงงาน, ห้องเรียนพิเศษ)
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => handleTitleChange(e.target.value)}
                                    placeholder="กรอกชื่อหน้าเว็บ"
                                    disabled={isSubmitting}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 outline-none transition-all bg-white/70 disabled:bg-slate-100"
                                />
                            </div>

                            {/* Slug Field */}
                            <div>
                                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-2">
                                    <LinkIcon className="w-4 h-4 text-slate-500" />
                                    URL Slug (สำหรับสร้างลิงก์ /hub/slug)
                                </label>
                                <div className="flex items-center">
                                    <span className="bg-slate-100 border-2 border-r-0 border-slate-200 text-slate-500 px-3 py-3 rounded-l-xl text-sm font-medium">
                                        /hub/
                                    </span>
                                    <input
                                        type="text"
                                        value={slug}
                                        onChange={(e) => handleSlugChange(e.target.value)}
                                        placeholder="projects"
                                        disabled={isSubmitting}
                                        className="w-full px-4 py-3 rounded-r-xl border-2 border-slate-200 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 outline-none transition-all bg-white/70 disabled:bg-slate-100"
                                    />
                                </div>
                                <p className="text-xs text-slate-400 mt-1">
                                    ใช้ภาษาอังกฤษพิมพ์เล็ก ตัวเลข และเครื่องหมายขีดคั่น (-) เท่านั้น
                                </p>
                            </div>

                            {/* Enable Switch */}
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-700">สถานะการแสดงผล</h4>
                                    <p className="text-xs text-slate-500 font-medium">เปิด/ปิดการเข้าถึงหน้านี้จากเมนูหน้าแรก</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsEnabled(!isEnabled)}
                                    disabled={isSubmitting}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
                                        isEnabled
                                            ? "bg-cyan-100 text-cyan-700 hover:bg-cyan-200"
                                            : "bg-slate-200 text-slate-500 hover:bg-slate-300"
                                    }`}
                                >
                                    {isEnabled ? (
                                        <>
                                            <ToggleRight className="w-6 h-6" />
                                            <span className="text-xs font-semibold">เปิดการใช้งาน</span>
                                        </>
                                    ) : (
                                        <>
                                            <ToggleLeft className="w-6 h-6" />
                                            <span className="text-xs font-semibold">ปิดการใช้งาน</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Tabs Section */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-semibold text-slate-700">
                                        รายการแท็บภายในหน้า (เรียงลำดับซ้ายไปขวา)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={addTabRow}
                                        disabled={isSubmitting}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-600 hover:bg-cyan-100 text-xs font-semibold transition-all"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        เพิ่มแท็บ
                                    </button>
                                </div>

                                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                                    {tabs.map((tab, idx) => (
                                        <div
                                            key={tab.id}
                                            className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200 shadow-sm"
                                        >
                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                                                {idx + 1}
                                            </span>

                                            <input
                                                type="text"
                                                value={tab.title}
                                                onChange={(e) => handleTabTitleChange(idx, e.target.value)}
                                                placeholder="ชื่อแท็บ เช่น ฟิสิกส์ทั่วไป"
                                                disabled={isSubmitting}
                                                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-50 outline-none text-sm transition-all"
                                            />

                                            {/* Tab Enable/Disable Button */}
                                            <button
                                                type="button"
                                                onClick={() => handleTabToggleEnabled(idx)}
                                                disabled={isSubmitting}
                                                className={`p-1.5 rounded-lg transition-all ${
                                                    tab.isEnabled
                                                        ? "text-cyan-600 bg-cyan-50 border border-cyan-100 hover:bg-cyan-100"
                                                        : "text-slate-400 bg-slate-50 border border-slate-100 hover:bg-slate-100"
                                                }`}
                                                title={tab.isEnabled ? "เปิดแสดงผลแท็บ" : "ซ่อนแท็บ"}
                                            >
                                                {tab.isEnabled ? (
                                                    <span className="text-[10px] font-bold px-1.5">แสดง</span>
                                                ) : (
                                                    <span className="text-[10px] font-bold px-1.5">ซ่อน</span>
                                                )}
                                            </button>

                                            {/* Order Actions */}
                                            <div className="flex items-center gap-0.5">
                                                <button
                                                    type="button"
                                                    onClick={() => moveTab(idx, "up")}
                                                    disabled={idx === 0 || isSubmitting}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-20"
                                                >
                                                    <ChevronUp className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => moveTab(idx, "down")}
                                                    disabled={idx === tabs.length - 1 || isSubmitting}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-20"
                                                >
                                                    <ChevronDown className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Remove Button */}
                                            <button
                                                type="button"
                                                onClick={() => removeTabRow(idx)}
                                                disabled={isSubmitting}
                                                className="p-2 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 transition-all"
                                                title="ลบแท็บ"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-2xl text-sm border border-red-100">
                                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 px-6 rounded-2xl font-bold text-white transition-all disabled:opacity-75 disabled:cursor-not-allowed hover:shadow-lg flex items-center justify-center gap-2"
                                style={{
                                    background: "linear-gradient(135deg, #0ea5e9 0%, #a855f7 100%)",
                                    boxShadow: "0 8px 30px rgba(14, 165, 233, 0.3)",
                                }}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>กำลังบันทึก...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        <span>{isEditing ? "บันทึกการแก้ไขหน้าเว็บ" : "สร้างหน้าเว็บ"}</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
