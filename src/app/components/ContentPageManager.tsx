"use client";

import { useState } from "react";
import {
    Plus,
    Loader2,
    Pencil,
    Trash2,
    ChevronUp,
    ChevronDown,
    Layout,
    Eye,
    EyeOff,
} from "lucide-react";
import { ContentPageDocument, AppDocument } from "@/lib/firestore";

interface ContentPageManagerProps {
    pages: ContentPageDocument[];
    apps: AppDocument[];
    onAddClick: () => void;
    onEditClick: (page: ContentPageDocument) => void;
    onDeletePage: (page: ContentPageDocument) => Promise<void>;
    onTogglePageEnabled: (page: ContentPageDocument) => Promise<void>;
    onReorderPage: (pageId: string, direction: "up" | "down") => Promise<void>;
}

export default function ContentPageManager({
    pages,
    apps,
    onAddClick,
    onEditClick,
    onDeletePage,
    onTogglePageEnabled,
    onReorderPage,
}: ContentPageManagerProps) {
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const handleToggleEnabled = async (page: ContentPageDocument) => {
        setActionLoading(`toggle_${page.id}`);
        try {
            await onTogglePageEnabled(page);
        } catch (err) {
            console.error("Failed to toggle enabled:", err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleReorder = async (pageId: string, direction: "up" | "down") => {
        setActionLoading(`reorder_${pageId}`);
        try {
            await onReorderPage(pageId, direction);
        } catch (err) {
            console.error("Failed to reorder page:", err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (page: ContentPageDocument) => {
        // Safe check: count cards assigned to this page
        const pageCards = apps.filter((app) => app.pageId === page.id);
        if (pageCards.length > 0) {
            alert(`ไม่สามารถลบหน้า "${page.title}" ได้ เนื่องจากมี ${pageCards.length} การ์ด/บทเรียน อยู่ในหน้าเว็บนี้ กรุณาย้ายหรือลบการ์ดออกก่อน`);
            return;
        }

        if (confirm(`คุณต้องการลบหน้าเว็บ "${page.title}" หรือไม่?`)) {
            setActionLoading(`delete_${page.id}`);
            try {
                await onDeletePage(page);
            } catch (err) {
                console.error("Failed to delete page:", err);
            } finally {
                setActionLoading(null);
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Header section with add button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Layout className="w-6 h-6 text-cyan-600" />
                        หน้าเว็บเสริมที่สร้างเอง
                    </h3>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">
                        จัดการหน้าเว็บเสริมย่อยที่มีหลายแท็บ เช่น โครงงานวิจัย, คลังเอกสาร
                    </p>
                </div>

                <button
                    onClick={onAddClick}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-white transition-all hover:shadow-lg hover:-translate-y-0.5"
                    style={{
                        background: "linear-gradient(135deg, #0ea5e9 0%, #a855f7 100%)",
                        boxShadow: "0 8px 30px rgba(14, 165, 233, 0.4)",
                    }}
                >
                    <Plus className="w-5 h-5" />
                    สร้างหน้าใหม่
                </button>
            </div>

            {/* List Table */}
            <div className="glass-card overflow-hidden">
                {pages.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                            <Layout className="w-10 h-10 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 mb-1">
                            ยังไม่มีหน้าเว็บเสริม
                        </h3>
                        <p className="text-sm text-slate-500 mb-6 font-medium">
                            เริ่มต้นสร้างหน้าหลักแยกใหม่เพื่อเพิ่มเนื้อหาอย่างอิสระ
                        </p>
                        <button
                            onClick={onAddClick}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-100 text-cyan-700 font-bold hover:bg-cyan-200 transition-all"
                        >
                            <Plus className="w-5 h-5" />
                            สร้างหน้าแรกของคุณ
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {/* Table Header */}
                        <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            <div className="col-span-1 text-center">#</div>
                            <div className="col-span-4">ชื่อหน้าเว็บ / ลิงก์</div>
                            <div className="col-span-2 text-center">แท็บภายใน</div>
                            <div className="col-span-1 text-center">การ์ดรวม</div>
                            <div className="col-span-1 text-center">สถานะ</div>
                            <div className="col-span-1 text-center">เรียงลำดับ</div>
                            <div className="col-span-2 text-right">การจัดการ</div>
                        </div>

                        {/* Rows */}
                        {pages.map((page, index) => {
                            const pageCardsCount = apps.filter((app) => app.pageId === page.id).length;
                            const isDeleting = actionLoading === `delete_${page.id}`;
                            const isToggling = actionLoading === `toggle_${page.id}`;
                            const isReordering = actionLoading === `reorder_${page.id}`;

                            return (
                                <div
                                    key={page.id}
                                    className={`grid grid-cols-1 md:grid-cols-12 gap-4 px-4 sm:px-6 py-4 hover:bg-slate-50/50 transition-colors items-center ${
                                        page.isEnabled === false ? "opacity-60" : ""
                                    }`}
                                >
                                    {/* Position */}
                                    <div className="hidden md:block col-span-1 text-center">
                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-600 font-semibold text-sm">
                                            {index + 1}
                                        </span>
                                    </div>

                                    {/* Page Info */}
                                    <div className="md:col-span-4 min-w-0">
                                        <h4 className="font-bold text-slate-800 truncate text-base">
                                            {page.title}
                                        </h4>
                                        <p className="text-xs text-slate-400 font-medium truncate mt-0.5 flex items-center gap-1">
                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-500 font-mono">/hub/{page.slug}</span>
                                        </p>
                                    </div>

                                    {/* Tabs count & list preview */}
                                    <div className="md:col-span-2 flex flex-col items-center justify-center">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100">
                                            {page.tabs?.length || 0} แท็บ
                                        </span>
                                        <p className="text-[10px] text-slate-400 mt-1 max-w-[120px] truncate font-medium text-center">
                                            {page.tabs?.map((t) => t.title).join(", ") || "-"}
                                        </p>
                                    </div>

                                    {/* Total Apps */}
                                    <div className="md:col-span-1 text-center font-bold text-slate-700 text-sm">
                                        {pageCardsCount} การ์ด
                                    </div>

                                    {/* Enabled Status Toggle */}
                                    <div className="md:col-span-1 flex items-center justify-center">
                                        <button
                                            onClick={() => handleToggleEnabled(page)}
                                            disabled={isToggling}
                                            className={`flex items-center gap-1 px-3 py-1.5 rounded-full transition-all ${
                                                page.isEnabled === false
                                                    ? "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                                    : "bg-green-100 text-green-700 hover:bg-green-200"
                                            } disabled:opacity-50`}
                                            title={page.isEnabled === false ? "เปิดแสดงผลหน้าเว็บ" : "ปิดแสดงผลหน้าเว็บ"}
                                        >
                                            {isToggling ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : page.isEnabled === false ? (
                                                <EyeOff className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                            <span className="text-[11px] font-bold">
                                                {page.isEnabled === false ? "ปิด" : "เปิด"}
                                            </span>
                                        </button>
                                    </div>

                                    {/* Reorder Buttons */}
                                    <div className="md:col-span-1 flex items-center justify-center gap-1">
                                        <button
                                            onClick={() => handleReorder(page.id!, "up")}
                                            disabled={index === 0 || isReordering}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                            title="เลื่อนขึ้น"
                                        >
                                            {isReordering ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <ChevronUp className="w-4 h-4" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleReorder(page.id!, "down")}
                                            disabled={index === pages.length - 1 || isReordering}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                            title="เลื่อนลง"
                                        >
                                            {isReordering ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Admin Actions */}
                                    <div className="md:col-span-2 flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => onEditClick(page)}
                                            disabled={isDeleting}
                                            className="p-2 rounded-xl text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all disabled:opacity-50"
                                            title="แก้ไขหน้าย่อย"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(page)}
                                            disabled={isDeleting}
                                            className="p-2 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 transition-all disabled:opacity-50"
                                            title="ลบหน้าเว็บ"
                                        >
                                            {isDeleting ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
