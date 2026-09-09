"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getEducationContentBySlug, getRelatedContent } from "@/app/actions/education";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Calendar, AlertTriangle, Truck } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";

export default function EducationArticlePage() {
  const params = useParams();
  const router = useRouter();
  const [article, setArticle] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const slug = params.slug as string;
        const data = await getEducationContentBySlug(slug);
        setArticle(data);

        // Load related
        if (data.category) {
          const relatedData = await getRelatedContent(data.category, slug);
          setRelated(relatedData);
        }
      } catch (err: any) {
        console.error(err);
        setError("Article not found or no longer available.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.slug]);

  if (loading) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (error || !article) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
        <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto" />
        <h1 className="text-2xl font-bold">Content Unavailable</h1>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => router.push("/education")}>Back to Education Hub</Button>
      </div>
    );
  }

  const needsPickupLink = article.category.toLowerCase().includes("e-waste") || article.category.toLowerCase().includes("bulk");

  return (
    <article className="max-w-4xl mx-auto space-y-12 pb-16">
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push("/education")} className="gap-2 -ml-3">
          <ArrowLeft className="w-4 h-4" /> Back to Articles
        </Button>
        
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
              {article.category}
            </span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {format(new Date(article.published_at), "MMMM d, yyyy")}
            </span>
          </div>
          
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-gray-900 leading-tight">
            {article.title}
          </h1>
          
          <p className="text-xl text-gray-600 leading-relaxed border-l-4 border-gray-200 pl-4 py-1">
            {article.summary}
          </p>
        </div>
      </div>

      <div className="prose prose-green max-w-none prose-headings:font-bold prose-a:text-primary">
        <ReactMarkdown>{article.content}</ReactMarkdown>
      </div>

      {needsPickupLink && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2">
              <Truck className="w-6 h-6 text-blue-600" /> Need to dispose of this waste?
            </h3>
            <p className="text-blue-800">
              Schedule a specialized pickup request and our collectors will handle it safely.
            </p>
          </div>
          <Button asChild size="lg" className="shrink-0 w-full md:w-auto bg-blue-600 hover:bg-blue-700">
            <Link href="/pickup">Request a Pickup</Link>
          </Button>
        </div>
      )}

      {related.length > 0 && (
        <div className="border-t pt-10 space-y-6">
          <h3 className="text-2xl font-bold tracking-tight">Related Articles</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {related.map(r => (
              <Link key={r.slug} href={`/education/${r.slug}`} className="group block">
                <div className="h-full p-5 rounded-xl border bg-gray-50 hover:bg-white hover:border-primary hover:shadow-sm transition-all space-y-3 flex flex-col">
                  <h4 className="font-bold text-gray-900 group-hover:text-primary line-clamp-2">{r.title}</h4>
                  <p className="text-sm text-gray-600 line-clamp-3">{r.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
