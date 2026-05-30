/**
 * @file route.ts
 * @module app/api/auth/upload-avatar
 *
 * POST /api/auth/upload-avatar — Upload staff profile photo.
 *
 * Accepts multipart/form-data with:
 *   - file: image file (JPEG, PNG, WebP — max 2MB)
 *   - actor_id: the operator's UUID
 *
 * Uploads to Supabase Storage (staff-avatars bucket),
 * then updates operators.avatar_url with the public URL.
 *
 * Returns: { success: true; avatar_url: string }
 */

import { NextResponse }      from "next/server";
import { getSupabaseServer } from "@/core/cloud/supabase.server";
import { DB_SCHEMA }         from "@/core/cloud/supabase.client";

const BUCKET          = "staff-avatars";
const MAX_SIZE_BYTES  = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES   = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file    = formData.get("file") as File | null;
  const actorId = (formData.get("actor_id") as string | null)?.trim();

  if (!file || !actorId) {
    return NextResponse.json({ error: "file and actor_id are required" }, { status: 400 });
  }

  // ── Validate file type ────────────────────────────────────────────────────
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG and WebP images are allowed" }, { status: 400 });
  }

  // ── Validate file size ────────────────────────────────────────────────────
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Image must be under 2MB" }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  // ── Upload to Supabase Storage ────────────────────────────────────────────
  const ext      = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path     = `${actorId}/avatar.${ext}`;
  const buffer   = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType:  file.type,
      upsert:       true,   // overwrite existing avatar
    });

  if (uploadError) {
    console.error("[upload-avatar] Storage error:", uploadError.message);
    return NextResponse.json({ error: "Upload failed — try again" }, { status: 500 });
  }

  // ── Get public URL ────────────────────────────────────────────────────────
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path);

  // Add cache-busting timestamp so browsers reload the new photo
  const avatarUrl = `${publicUrl}?t=${Date.now()}`;

  // ── Update operators.avatar_url ───────────────────────────────────────────
  const { error: updateError } = await supabase
    .schema(DB_SCHEMA)
    .from("operators")
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("actor_id", actorId);

  if (updateError) {
    // Column may not exist yet — still return the URL so the UI can use it
    console.warn("[upload-avatar] Could not update avatar_url column:", updateError.message);
    console.warn("[upload-avatar] Run migration 005 to add the avatar_url column.");
    return NextResponse.json({ success: true, avatar_url: avatarUrl, warning: "avatar_url column not yet in DB — run migration 005" });
  }

  return NextResponse.json({ success: true, avatar_url: avatarUrl });
}
