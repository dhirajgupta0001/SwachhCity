"use client";

import { useEffect, useState } from "react";
import { getDashboardAnalytics, logExportAudit } from "@/app/actions/analytics";
import { DATE_RANGES, DateRangeValue } from "@/lib/analytics/definitions";
import { KpiCard } from "@/components/analytics/KpiCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download, AlertTriangle, Truck, Users, CheckCircle2, Clock, Star } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import Link from "next/link";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658'];

export default function AnalyticsDashboardPage() {
  const [range, setRange] = useState<DateRangeValue>("30d");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const result = await getDashboardAnalytics(range);
        setData(result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [range]);

  const handleExport = async () => {
    if (!data) return;
    
    // Generate simple CSV payload for the time series
    const headers = ["Date", "Complaints Submitted", "Pickups Requested"];
    const rows = data.timeSeries.map((t: any) => [t.date, t.complaints, t.pickups]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `swachhcity-analytics-${range}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Audit Log
    await logExportAudit(range, "TIME_SERIES_CSV");
  };

  if (loading && !data) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground font-medium">Aggregating municipal analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) return <div className="p-8 text-center text-red-500">Failed to load analytics.</div>;

  const { kpis, distributions, workforcePerformance, timeSeries } = data;

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics & Reporting</h1>
          <p className="text-muted-foreground mt-1">Real-time operational metrics across the municipality.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={range}
            onChange={(e) => setRange(e.target.value as DateRangeValue)}
            className="h-10 px-3 py-2 bg-white border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {DATE_RANGES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Overview KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
          title="Total Complaints" 
          value={kpis.totalComplaints} 
          icon={AlertTriangle} 
          description={kpis.openComplaints > 0 ? `${kpis.openComplaints} currently open` : "All resolved"}
        />
        <KpiCard 
          title="Complaint Resolution Rate" 
          value={kpis.complaintResolutionRate !== null ? `${kpis.complaintResolutionRate.toFixed(1)}%` : "N/A"} 
          icon={CheckCircle2} 
          description={`Based on ${kpis.totalComplaints} records`}
        />
        <KpiCard 
          title="Avg. Resolution Time" 
          value={kpis.avgResolutionTimeHours !== null ? `${kpis.avgResolutionTimeHours.toFixed(1)} hrs` : "N/A"} 
          icon={Clock} 
          description={kpis.resolvedWithHistoryCount > 0 ? `Sample size: ${kpis.resolvedWithHistoryCount}` : "Insufficient data"}
        />
        <KpiCard 
          title="Total Pickups" 
          value={kpis.totalPickups} 
          icon={Truck} 
          description={kpis.pendingPickups > 0 ? `${kpis.pendingPickups} pending approval` : "No pending requests"}
        />
        <KpiCard 
          title="Pickup Completion Rate" 
          value={kpis.pickupCompletionRate !== null ? `${kpis.pickupCompletionRate.toFixed(1)}%` : "N/A"} 
          icon={CheckCircle2} 
          description="Excludes cancelled/rejected"
        />
        <KpiCard 
          title="Avg. Pickup Time" 
          value={kpis.avgPickupCompletionHours !== null ? `${kpis.avgPickupCompletionHours.toFixed(1)} hrs` : "N/A"} 
          icon={Clock} 
          description={kpis.completedPickupsWithHistoryCount > 0 ? `Sample size: ${kpis.completedPickupsWithHistoryCount}` : "Insufficient data"}
        />
        <KpiCard 
          title="Active Collectors" 
          value={kpis.totalActiveCollectors} 
          icon={Users} 
          description="Ready for assignment"
        />
        <KpiCard 
          title="Avg. Service Rating" 
          value={kpis.avgFeedbackRating !== null ? `${kpis.avgFeedbackRating.toFixed(1)} / 5` : "N/A"} 
          icon={Star} 
          description={`Based on ${kpis.totalFeedback} reviews`}
        />
      </div>

      {/* Geographic Alert */}
      <Card className="bg-blue-50 border-blue-100">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-blue-900">Geographic Operations</h3>
            <p className="text-sm text-blue-800">Need to see where problems are concentrated? Use the Operations Map to view spatial densities.</p>
          </div>
          <Button asChild variant="outline" className="bg-white hover:bg-gray-50 border-blue-200">
            <Link href="/admin/map">Open Operations Map</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Time Series */}
      <Card>
        <CardHeader>
          <CardTitle>Demand Trends</CardTitle>
          <CardDescription>Volume of newly submitted complaints and pickup requests over time.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            {timeSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeries} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{fontSize: 12}} />
                  <YAxis tick={{fontSize: 12}} />
                  <RechartsTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="complaints" name="Complaints" stroke="#ef4444" strokeWidth={2} dot={{r: 4}} activeDot={{r: 6}} />
                  <Line type="monotone" dataKey="pickups" name="Pickups" stroke="#3b82f6" strokeWidth={2} dot={{r: 4}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
                No activity records in this period.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Complaint Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Complaints by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {distributions.complaintsByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distributions.complaintsByCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {distributions.complaintsByCategory.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
                  Insufficient data
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pickup Waste Types */}
        <Card>
          <CardHeader>
            <CardTitle>Pickups by Waste Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {distributions.pickupsByWasteType.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distributions.pickupsByWasteType} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" tick={{fontSize: 12}} width={90} />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
                  Insufficient data
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workforce Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Workforce Performance</CardTitle>
          <CardDescription>Task completion metrics for active collectors.</CardDescription>
        </CardHeader>
        <CardContent>
          {workforcePerformance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3">Collector Name</th>
                    <th className="px-4 py-3 text-right">Assigned Tasks</th>
                    <th className="px-4 py-3 text-right">In Progress</th>
                    <th className="px-4 py-3 text-right">Completed</th>
                    <th className="px-4 py-3 text-right">Failed</th>
                    <th className="px-4 py-3 text-right">Completion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {workforcePerformance.map((wp: any, idx: number) => (
                    <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{wp.collectorName}</td>
                      <td className="px-4 py-3 text-right">{wp.assigned}</td>
                      <td className="px-4 py-3 text-right text-blue-600">{wp.inProgress}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-semibold">{wp.completed}</td>
                      <td className="px-4 py-3 text-right text-red-600">{wp.failed}</td>
                      <td className="px-4 py-3 text-right">
                        {wp.completionRate !== null ? (
                          <span className={wp.completionRate >= 80 ? "text-green-600 font-bold" : "text-amber-600 font-bold"}>
                            {wp.completionRate.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground border-2 border-dashed rounded-md">
              No active collectors found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
