"use server";

import { createClient } from "@/utils/supabase/server";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "ADMIN") throw new Error("Forbidden: Must be an administrator");

  return { supabase, user };
}

// --- CITIZEN & PUBLIC ACTIONS ---

export async function getPublishedEducationContent(search?: string, category?: string) {
  const supabase = await createClient();
  
  let q = supabase
    .from("education_content")
    .select("id, slug, title, summary, category, cover_image_url, is_featured, published_at")
    .eq("is_published", true)
    .order("is_featured", { ascending: false })
    .order("published_at", { ascending: false });

  if (category && category !== "ALL") {
    q = q.eq("category", category);
  }
  
  if (search) {
    q = q.ilike("title", `%${search}%`);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}

export async function getEducationContentBySlug(slug: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("education_content")
    .select("*, related_waste_type:waste_types(id, name)")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getCategories() {
  const supabase = await createClient();
  
  // Get distinct categories from published content
  const { data, error } = await supabase
    .from("education_content")
    .select("category")
    .eq("is_published", true);
    
  if (error) throw new Error(error.message);
  
  const categories = Array.from(new Set(data.map(d => d.category))).sort();
  return categories;
}

export async function getRelatedContent(category: string, excludeSlug: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("education_content")
    .select("slug, title, summary, cover_image_url")
    .eq("category", category)
    .eq("is_published", true)
    .neq("slug", excludeSlug)
    .limit(3);

  if (error) throw new Error(error.message);
  return data || [];
}

// --- ADMIN ACTIONS ---

export async function getAdminEducationContent() {
  const { supabase } = await verifyAdmin();
  
  const { data, error } = await supabase
    .from("education_content")
    .select(`
      id, slug, title, category, is_published, is_featured, updated_at, published_at,
      author:profiles!created_by(full_name)
    `)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function createEducationContent(formData: FormData) {
  const { supabase, user } = await verifyAdmin();
  
  const title = formData.get("title") as string;
  const slug = (formData.get("slug") as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const summary = formData.get("summary") as string;
  const content = formData.get("content") as string;
  const category = formData.get("category") as string;
  const is_published = formData.get("is_published") === "true";
  const is_featured = formData.get("is_featured") === "true";

  const payload: any = {
    title,
    slug,
    summary,
    content,
    category,
    is_published,
    is_featured,
    created_by: user.id
  };

  if (is_published) {
    payload.published_at = new Date().toISOString();
  }

  const { error } = await supabase.from("education_content").insert(payload);
  if (error) throw new Error(error.message);
}

export async function getEducationContentById(id: string) {
  const { supabase } = await verifyAdmin();
  const { data, error } = await supabase.from("education_content").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateEducationContent(id: string, formData: FormData) {
  const { supabase } = await verifyAdmin();
  
  const title = formData.get("title") as string;
  const slug = (formData.get("slug") as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const summary = formData.get("summary") as string;
  const content = formData.get("content") as string;
  const category = formData.get("category") as string;
  const is_published = formData.get("is_published") === "true";
  const is_featured = formData.get("is_featured") === "true";

  // Check current publish state
  const { data: current } = await supabase.from("education_content").select("is_published").eq("id", id).single();

  const payload: any = {
    title,
    slug,
    summary,
    content,
    category,
    is_published,
    is_featured,
    updated_at: new Date().toISOString()
  };

  // If transitioning from draft to published
  if (is_published && !current?.is_published) {
    payload.published_at = new Date().toISOString();
  }

  const { error } = await supabase.from("education_content").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteEducationContent(id: string) {
  const { supabase } = await verifyAdmin();
  const { error } = await supabase.from("education_content").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function togglePublishStatus(id: string, publish: boolean) {
  const { supabase } = await verifyAdmin();
  const payload: any = {
    is_published: publish,
    updated_at: new Date().toISOString()
  };
  
  if (publish) {
    payload.published_at = new Date().toISOString();
  }

  const { error } = await supabase.from("education_content").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}
