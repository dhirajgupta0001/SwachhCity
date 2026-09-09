import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MapPinOff } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 text-center">
      <div className="rounded-full bg-gray-100 p-3 mb-4">
        <MapPinOff className="h-8 w-8 text-gray-400" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">
        Page Not Found
      </h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        We couldn't find the page you were looking for. It might have been moved or doesn't exist.
      </p>
      <Link href="/">
        <Button variant="default">
          Return Home
        </Button>
      </Link>
    </div>
  );
}
