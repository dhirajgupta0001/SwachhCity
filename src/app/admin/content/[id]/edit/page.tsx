"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getEducationContentById } from "@/app/actions/education";
import { EducationForm } from "@/components/admin/EducationForm";
import { Loader2 } from "lucide-react";

export default function EditEducationContent() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const content = await getEducationContentById(params.id as string);
        setData(content);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!data) return <div className="p-12 text-center text-red-500">Content not found.</div>;

  return <EducationForm initialData={data} />;
}
