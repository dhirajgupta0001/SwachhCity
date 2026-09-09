"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createEducationContent, updateEducationContent } from "@/app/actions/education";

interface EducationFormProps {
  initialData?: any;
}

export function EducationForm({ initialData }: EducationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    const formData = new FormData(e.currentTarget);
    
    // Convert checkboxes
    formData.set("is_published", formData.get("is_published") === "on" ? "true" : "false");
    formData.set("is_featured", formData.get("is_featured") === "on" ? "true" : "false");

    try {
      if (initialData?.id) {
        await updateEducationContent(initialData.id, formData);
      } else {
        await createEducationContent(formData);
      }
      router.push("/admin/content");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to save content.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" render={<Link href="/admin/content" />}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {initialData ? "Edit Article" : "New Article"}
          </h1>
          <p className="text-muted-foreground">
            {initialData ? "Update existing educational content." : "Create new awareness content for citizens."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Content Details</CardTitle>
            <CardDescription>Use markdown formatting in the content body.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md">{error}</div>}
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title *</label>
                <input 
                  type="text" 
                  name="title" 
                  defaultValue={initialData?.title} 
                  required 
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="e.g. How to Segregate Waste"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Slug *</label>
                <input 
                  type="text" 
                  name="slug" 
                  defaultValue={initialData?.slug} 
                  required 
                  className="w-full border rounded-md px-3 py-2 text-sm bg-gray-50"
                  placeholder="e.g. how-to-segregate-waste"
                />
                <p className="text-xs text-muted-foreground">Unique URL identifier (auto-formatted on save).</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category *</label>
                <input 
                  type="text" 
                  name="category" 
                  defaultValue={initialData?.category} 
                  required 
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="e.g. Recycling"
                  list="categories"
                />
                <datalist id="categories">
                  <option value="Waste Segregation" />
                  <option value="Recycling" />
                  <option value="E-Waste" />
                  <option value="Composting" />
                  <option value="Waste Reduction" />
                </datalist>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Short Summary *</label>
              <textarea 
                name="summary" 
                defaultValue={initialData?.summary} 
                required 
                className="w-full border rounded-md px-3 py-2 text-sm h-20 resize-none"
                placeholder="A brief 1-2 sentence overview visible on cards."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Full Content (Markdown Supported) *</label>
              <textarea 
                name="content" 
                defaultValue={initialData?.content} 
                required 
                className="w-full border rounded-md px-3 py-2 text-sm h-64 font-mono"
                placeholder="Write the full article content here. Use ### for headings and * for bullet points."
              />
            </div>

            <div className="flex gap-6 pt-4 border-t">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input 
                  type="checkbox" 
                  name="is_published" 
                  defaultChecked={initialData?.is_published} 
                  className="rounded border-gray-300 w-4 h-4 text-primary"
                />
                Publish Immediately
              </label>
              
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input 
                  type="checkbox" 
                  name="is_featured" 
                  defaultChecked={initialData?.is_featured} 
                  className="rounded border-gray-300 w-4 h-4 text-primary"
                />
                Feature on Homepage
              </label>
            </div>
            
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={loading} className="gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {initialData ? "Save Changes" : "Create Article"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
