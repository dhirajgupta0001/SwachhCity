"use client";

import { useEffect, useState } from "react";
import { getAdminFeedback, addAdminResponse, logFeedbackExport } from "@/app/actions/feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Search, Star, MessageSquare, ExternalLink, Download } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from "next/link";
import { StatusBadge } from "@/components/custom/status-badge";

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  
  // Response Dialog State
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [response, setResponse] = useState("");
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    loadFeedback();
  }, []);

  async function loadFeedback() {
    setLoading(true);
    try {
      const data = await getAdminFeedback();
      setFeedback(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleRespond = async () => {
    if (!selectedFeedback || !response.trim()) return;
    setResponding(true);
    try {
      await addAdminResponse(selectedFeedback.id, response);
      setSelectedFeedback(null);
      setResponse("");
      loadFeedback();
    } catch (err) {
      console.error(err);
      alert("Failed to send response.");
    } finally {
      setResponding(false);
    }
  };

  const filtered = feedback.filter(f => {
    const matchSearch = f.reference_id?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (f.comment && f.comment.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = statusFilter === "ALL" || f.status === statusFilter;
    const matchType = typeFilter === "ALL" || f.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const handleExport = async () => {
    if (filtered.length === 0) return;
    const headers = ["Date", "Type", "Reference ID", "Rating", "Comment", "Status"];
    const rows = filtered.map(f => [
      format(new Date(f.created_at), "yyyy-MM-dd"),
      f.type,
      f.reference_id,
      f.rating,
      `"${(f.comment || "").replace(/"/g, '""')}"`,
      f.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `feedback-export-${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    await logFeedbackExport();
  };

  // Metrics
  const avgRating = feedback.length > 0 ? feedback.reduce((acc, f) => acc + f.rating, 0) / feedback.length : 0;
  const ratingDistribution = [1,2,3,4,5].map(r => ({
    rating: r,
    count: feedback.filter(f => f.rating === r).length
  }));

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Service Quality & Feedback</h1>
          <p className="text-muted-foreground mt-1">Monitor citizen satisfaction and respond to service quality issues.</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0} className="gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className="text-4xl font-bold text-amber-500">{avgRating.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground mb-1">/ 5.0</div>
            </div>
            <div className="flex gap-1 mt-2">
              {[1,2,3,4,5].map(star => (
                <Star key={star} className={`w-4 h-4 ${star <= Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4 w-full h-full pt-2">
              {ratingDistribution.map(({rating, count}) => (
                <div key={rating} className="flex flex-col items-center flex-1">
                  <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${rating >= 4 ? 'bg-green-500' : rating === 3 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                      style={{ width: `${feedback.length > 0 ? (count / feedback.length) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="text-xs font-semibold mt-2 flex items-center gap-1">
                    {rating} <Star className="w-3 h-3 fill-current" />
                  </div>
                  <div className="text-xs text-muted-foreground">{count}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Feedback Logs</CardTitle>
            <CardDescription>Recent ratings and comments from citizens.</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search reference ID or comments..."
                className="w-full pl-9 pr-4 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="px-3 py-2 text-sm border rounded-md"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="Requires Review">Requires Review (1-2 Stars)</option>
              <option value="Addressed">Addressed (Responded)</option>
              <option value="New">New (3-5 Stars)</option>
            </select>
            <select 
              className="px-3 py-2 text-sm border rounded-md"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All Types</option>
              <option value="COMPLAINT">Complaints</option>
              <option value="PICKUP">Pickups</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
             <div className="flex h-32 items-center justify-center">
               <Loader2 className="w-6 h-6 animate-spin text-primary" />
             </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground border-t">No feedback records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Operation</th>
                    <th className="px-6 py-3 font-medium">Rating</th>
                    <th className="px-6 py-3 font-medium">Comment</th>
                    <th className="px-6 py-3 font-medium text-center">Status</th>
                    <th className="px-6 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(f => (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                        {format(new Date(f.created_at), "MMM d, yyyy")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-xs font-semibold">{f.reference_id}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded w-max font-bold ${f.type === 'COMPLAINT' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {f.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className="font-bold">{f.rating}</span>
                          <Star className={`w-4 h-4 ${f.rating >= 4 ? 'fill-green-500 text-green-500' : f.rating === 3 ? 'fill-yellow-500 text-yellow-500' : 'fill-red-500 text-red-500'}`} />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs md:max-w-md line-clamp-2 text-gray-600">
                          {f.comment || <span className="italic text-gray-400">No comment provided</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <StatusBadge status={f.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedFeedback(f)}>
                          View & Respond
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Feedback Details</DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-6">
              <div className="flex justify-between items-start p-4 bg-gray-50 rounded-lg border">
                <div>
                  <div className="text-xs font-bold text-muted-foreground uppercase">{selectedFeedback.type}</div>
                  <div className="font-mono font-semibold">{selectedFeedback.reference_id}</div>
                </div>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(star => (
                    <Star key={star} className={`w-5 h-5 ${star <= selectedFeedback.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Citizen Comment</h4>
                <div className="p-4 bg-white border rounded-md text-sm text-gray-700">
                  {selectedFeedback.comment || <span className="italic text-gray-400">No comment provided.</span>}
                </div>
              </div>

              {selectedFeedback.admin_response ? (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" /> Admin Response Sent
                  </h4>
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-md text-sm text-blue-900">
                    {selectedFeedback.admin_response}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Add Response</h4>
                  <p className="text-xs text-muted-foreground">This response will be visible to the citizen, and they will receive a notification.</p>
                  <textarea
                    rows={4}
                    className="w-full text-sm p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Type your response here..."
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button onClick={handleRespond} disabled={responding || !response.trim()}>
                      {responding && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Send Response
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CheckCircle2(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
}
