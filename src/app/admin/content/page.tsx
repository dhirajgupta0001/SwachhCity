"use client";

import { useEffect, useState } from "react";
import { getAdminEducationContent, deleteEducationContent, togglePublishStatus } from "@/app/actions/education";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Edit, Trash2, Eye, EyeOff, Search, Star } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminContentPage() {
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadContent();
  }, []);

  async function loadContent() {
    setLoading(true);
    try {
      const data = await getAdminEducationContent();
      setContent(data);
    } catch (err) {
      console.error(err);
      alert("Failed to load content.");
    } finally {
      setLoading(false);
    }
  }

  async function handleTogglePublish(id: string, currentStatus: boolean) {
    try {
      await togglePublishStatus(id, !currentStatus);
      loadContent();
    } catch (err) {
      console.error(err);
      alert("Failed to update status.");
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteEducationContent(deleteId);
      setDeleteId(null);
      loadContent();
    } catch (err) {
      console.error(err);
      alert("Failed to delete content.");
    } finally {
      setIsDeleting(false);
    }
  }

  const filteredContent = content.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Educational Content</h1>
          <p className="text-muted-foreground">Manage awareness articles and recycling guides.</p>
        </div>
        <Button render={<Link href="/admin/content/new" />} className="gap-2">
            <Plus className="w-4 h-4" /> New Article
          </Button>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <CardTitle>Content Library</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search title or category..."
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredContent.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No content found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3 font-medium">Title</th>
                    <th className="px-6 py-3 font-medium">Category</th>
                    <th className="px-6 py-3 font-medium text-center">Status</th>
                    <th className="px-6 py-3 font-medium">Last Updated</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredContent.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          {c.title}
                          {c.is_featured && <Star className="w-3 h-3 text-amber-500 fill-amber-500"  />}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">/{c.slug}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs font-medium">
                          {c.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${c.is_published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {c.is_published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {format(new Date(c.updated_at), "MMM d, yyyy")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title={c.is_published ? "Unpublish" : "Publish"}
                            onClick={() => handleTogglePublish(c.id, c.is_published)}
                          >
                            {c.is_published ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-primary" />}
                          </Button>
                          <Button variant="ghost" size="icon" render={<Link href={`/admin/content/${c.id}/edit`} />} >
                              <Edit className="w-4 h-4 text-blue-500" />
                            </Button>
                          <Button variant="ghost" size="icon"  onClick={() => setDeleteId(c.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Content</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this educational article? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
