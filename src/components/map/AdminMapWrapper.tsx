"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const AdminMap = dynamic(() => import("./AdminMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[600px] w-full items-center justify-center bg-gray-50 rounded-md border shadow-sm">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      <span className="ml-3 text-sm font-medium text-gray-500">Loading Operations Map...</span>
    </div>
  )
});

export function AdminMapWrapper(props: any) {
  return <AdminMap {...props} />;
}
