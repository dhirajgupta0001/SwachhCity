"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const Map = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[300px] w-full items-center justify-center bg-gray-50 rounded-md border">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      <span className="ml-2 text-sm text-gray-500">Loading map...</span>
    </div>
  )
});

export function MapWrapper(props: any) {
  return <Map {...props} />;
}
