"use client";

import { useState, useEffect } from "react";
import { submitFeedback, getFeedbackForOperation } from "@/app/actions/feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Loader2, MessageSquare, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface FeedbackWidgetProps {
  type: "COMPLAINT" | "PICKUP";
  id: string;
  status: string; // To verify if it's RESOLVED/CLOSED or COMPLETED
}

export function FeedbackWidget({ type, id, status }: FeedbackWidgetProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<any>(null);
  const isEligible = type === "COMPLAINT" 
    ? ["RESOLVED", "CLOSED"].includes(status)
    : status === "COMPLETED";

  const [loading, setLoading] = useState(isEligible);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEligible) {
      return;
    }
    async function load() {
      try {
        const existing = await getFeedbackForOperation(type, id);
        if (existing) {
          setFeedback(existing);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [type, id, isEligible]);

  if (!isEligible) return null;
  if (loading) return <div className="py-4 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  if (feedback) {
    return (
      <Card className="bg-gray-50/50 border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" /> Service Rated
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star 
                key={star} 
                className={`w-6 h-6 ${star <= feedback.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} 
              />
            ))}
          </div>
          {feedback.comment && (
            <p className="text-sm text-gray-700 italic border-l-2 border-gray-200 pl-3">&quot;{feedback.comment}&quot;</p>
          )}
          {feedback.admin_response && (
            <div className="mt-4 bg-white p-4 rounded-md border text-sm">
              <strong className="flex items-center gap-2 text-primary mb-1">
                <MessageSquare className="w-4 h-4" /> Admin Response
              </strong>
              <p className="text-gray-700">{feedback.admin_response}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      setError("Please select a star rating.");
      return;
    }
    setSubmitting(true);
    setError("");

    const formData = new FormData();
    if (type === "COMPLAINT") formData.append("complaint_id", id);
    else formData.append("pickup_request_id", id);
    
    formData.append("rating", rating.toString());
    formData.append("comment", comment);

    try {
      await submitFeedback(formData);
      // Reload feedback
      const existing = await getFeedbackForOperation(type, id);
      setFeedback(existing);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to submit feedback.");
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Rate this service</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md">{error}</div>}
          
          <div 
            className="flex gap-2" 
            role="radiogroup" 
            aria-label="Service Rating"
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                role="radio"
                aria-checked={rating === star}
                aria-label={`${star} out of 5 stars`}
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full transition-transform hover:scale-110"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              >
                <Star 
                  className={`w-8 h-8 ${star <= (hoverRating || rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} 
                />
              </button>
            ))}
          </div>
          
          <div className="space-y-2">
            <label htmlFor="feedback-comment" className="text-sm font-medium text-gray-700">
              Additional Comments (Optional)
            </label>
            <textarea 
              id="feedback-comment"
              maxLength={1000}
              rows={3}
              className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Tell us about your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={submitting || rating < 1} className="gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Feedback
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
