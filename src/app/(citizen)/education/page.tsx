"use client";

import { useEffect, useState } from "react";
import { getPublishedEducationContent, getCategories } from "@/app/actions/education";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Search, BookOpen, Leaf, Recycle, Trash2, BatteryWarning } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function EducationHubPage() {
  const [content, setContent] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [contentData, categoryData] = await Promise.all([
          getPublishedEducationContent(search, activeCategory),
          getCategories()
        ]);
        setContent(contentData);
        setCategories(categoryData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    const timeoutId = setTimeout(() => load(), 300); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [search, activeCategory]);

  const featuredContent = content.filter(c => c.is_featured);
  const regularContent = content.filter(c => !c.is_featured);

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="bg-green-50 rounded-2xl p-6 md:p-10 border border-green-100 flex flex-col items-center text-center">
        <Leaf className="w-12 h-12 text-green-600 mb-4" />
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">Recycling & Awareness</h1>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl">
          Learn how to segregate waste, recycle correctly, and contribute to a cleaner, more sustainable community.
        </p>
      </section>

      {/* Quick Visual Guide */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Quick Segregation Guide</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-green-50/50 border-green-200">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-green-100 rounded-full"><Leaf className="w-6 h-6 text-green-700" /></div>
              <h3 className="font-bold text-green-900">Wet / Organic</h3>
              <p className="text-sm text-green-800">Food scraps, peels, garden waste. Easily compostable.</p>
            </CardContent>
          </Card>
          
          <Card className="bg-blue-50/50 border-blue-200">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-blue-100 rounded-full"><Recycle className="w-6 h-6 text-blue-700" /></div>
              <h3 className="font-bold text-blue-900">Dry / Recyclable</h3>
              <p className="text-sm text-blue-800">Clean paper, plastic bottles, cardboard, metal cans.</p>
            </CardContent>
          </Card>

          <Card className="bg-red-50/50 border-red-200">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-red-100 rounded-full"><BatteryWarning className="w-6 h-6 text-red-700" /></div>
              <h3 className="font-bold text-red-900">E-Waste</h3>
              <p className="text-sm text-red-800">Phones, chargers, batteries. Requires specialized pickup.</p>
            </CardContent>
          </Card>

          <Card className="bg-orange-50/50 border-orange-200">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-orange-100 rounded-full"><Trash2 className="w-6 h-6 text-orange-700" /></div>
              <h3 className="font-bold text-orange-900">Bulk Waste</h3>
              <p className="text-sm text-orange-800">Old furniture, appliances. Schedule a bulk pickup request.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Library Section */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold tracking-tight">Educational Library</h2>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search articles..."
                className="w-full pl-9 pr-4 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <select 
              className="px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : content.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed rounded-xl bg-gray-50 text-gray-500">
            No articles found matching your criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Featured items first */}
            {featuredContent.map((c) => (
              <ArticleCard key={c.id} article={c} />
            ))}
            {/* Standard items */}
            {regularContent.map((c) => (
              <ArticleCard key={c.id} article={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ArticleCard({ article }: { article: any }) {
  return (
    <Link href={`/education/${article.slug}`} className="block group h-full">
      <Card className="h-full flex flex-col hover:border-primary transition-colors hover:shadow-md">
        <CardContent className="p-6 flex flex-col h-full gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-600 rounded-md">
              {article.category}
            </span>
            {article.is_featured && (
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                Featured
              </span>
            )}
          </div>
          
          <h3 className="font-bold text-lg group-hover:text-primary transition-colors line-clamp-2">
            {article.title}
          </h3>
          
          <p className="text-sm text-gray-600 line-clamp-3 flex-1">
            {article.summary}
          </p>
          
          <div className="flex items-center justify-between text-xs text-gray-500 pt-4 mt-auto border-t">
            <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> Read Guide</span>
            <span>{format(new Date(article.published_at), "MMM d, yyyy")}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
