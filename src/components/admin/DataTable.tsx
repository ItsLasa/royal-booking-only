"use client";

import { ColumnDef, flexRender, getCoreRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table";
import { useState, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { EmptyState } from "./ui";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: TData) => void;
  keyField?: keyof TData;
}

export function DataTable<TData>({ columns, data, loading, emptyTitle = "No records found", emptyDescription, onRowClick, keyField = "id" as keyof TData }: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (loading) {
    return (
      <div className="divide-y divide-outline-variant/40 dark:divide-white/5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-6 px-5 py-4">
            <div className="h-3 w-24 animate-pulse rounded bg-surface-container dark:bg-white/10" />
            <div className="h-3 w-32 animate-pulse rounded bg-surface-container dark:bg-white/10" />
            <div className="h-3 flex-1 animate-pulse rounded bg-surface-container dark:bg-white/10" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max text-left text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-outline-variant/50 dark:border-white/10">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="whitespace-nowrap px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant dark:text-neutral-400"
                  colSpan={header.colSpan}
                >
                  {header.isPlaceholder ? null : (
                    <button
                      type="button"
                      className={cn("flex items-center gap-1 transition-colors hover:text-on-surface dark:hover:text-white", header.column.getCanSort() && "cursor-pointer select-none")}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === "asc" && <span className="text-[10px]">▲</span>}
                      {header.column.getIsSorted() === "desc" && <span className="text-[10px]">▼</span>}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={String(row.original[keyField] ?? row.id)}
              onClick={() => onRowClick?.(row.original)}
              className={cn("border-b border-outline-variant/40 transition-colors last:border-0 dark:border-white/5", onRowClick && "cursor-pointer hover:bg-surface-container/60 dark:hover:bg-white/5")}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="whitespace-nowrap px-5 py-3.5 text-on-surface dark:text-neutral-200">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type { ColumnDef };
