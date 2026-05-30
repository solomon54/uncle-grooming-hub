/**
 * @file route.ts
 * @module app/api/reserve
 *
 * POST /api/reserve — Customer reservation request.
 *
 * Stores a reservation request in Supabase (uncle_grooming.reservation_requests).
 * Services are stored as JSON in the notes field until the services column is added
 * via migration 004. Once the column exists, it is used directly.
 *
 * Body: { name, phone, services, preferred_barber_id?, requested_date, requested_time, notes? }
 */

import { NextResponse }      from "next/server";
import { getSupabaseServer } from "@/core/cloud/supabase.server";
import { DB_SCHEMA }         from "@/core/cloud/supabase.client";

interface ServiceItem {
  id:        string;
  name:      string;
  price_etb: number;
}

// Canonical service catalogue — single source of truth for validation
const VALID_SERVICES: ServiceItem[] = [
  { id: "classic_cut", name: "Classic Cut",       price_etb: 350 },
  { id: "premium_cut", name: "Premium Cut",        price_etb: 500 },
  { id: "beard_groom", name: "Beard Grooming",     price_etb: 250 },
  { id: "cut_beard",   name: "Cut & Beard Combo",  price_etb: 700 },
  { id: "head_shave",  name: "Head Shave",         price_etb: 300 },
  { id: "kids_cut",    name: "Kids Cut",           price_etb: 200 },
];

export async function POST(request: Request) {
  let body: {
    name?:                string;
    phone?:               string;
    services?:            string[];
    preferred_barber_id?: string;
    requested_date?:      string;
    requested_time?:      string;
    notes?:               string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, phone, services, preferred_barber_id, requested_date, requested_time, notes } = body;

  // ── Required field validation ─────────────────────────────────────────────
  if (!name?.trim())
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!phone?.trim())
    return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
  if (!requested_date || !requested_time)
    return NextResponse.json({ error: "Date and time are required" }, { status: 400 });

  // ── Services — must select at least one ──────────────────────────────────
  if (!services || services.length === 0)
    return NextResponse.json({ error: "Select at least one service" }, { status: 400 });

  const resolvedServices: ServiceItem[] = [];
  for (const id of services) {
    const svc = VALID_SERVICES.find(s => s.id === id);
    if (!svc) return NextResponse.json({ error: `Unknown service: ${id}` }, { status: 400 });
    resolvedServices.push(svc);
  }

  // ── Phone validation ──────────────────────────────────────────────────────
  const cleanPhone = phone.replace(/\s/g, "");
  if (!/^(\+251|0)[79]\d{8}$/.test(cleanPhone))
    return NextResponse.json({ error: "Enter a valid Ethiopian phone number" }, { status: 400 });

  // ── Date must be today or future ──────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];
  if (requested_date < today)
    return NextResponse.json({ error: "Reservation date must be today or in the future" }, { status: 400 });

  // ── Time within shop hours ────────────────────────────────────────────────
  if (requested_time < "08:00" && requested_time > "00:00")
    return NextResponse.json({ error: "Reservation time must be between 08:00 and 00:00 (midnight)" }, { status: 400 });

  const supabase = getSupabaseServer();

  // ── Build the notes field: combine customer notes + services JSON ─────────
  // Format: "SERVICES:<json>\nNOTES:<customer notes>"
  // This lets the cashier see services even before the column migration runs.
  const totalEtb = resolvedServices.reduce((s, sv) => s + sv.price_etb, 0);
  const servicesSummary = resolvedServices.map(s => `${s.name} (${s.price_etb} ETB)`).join(", ");
  const combinedNotes = [
    `SERVICES:${JSON.stringify(resolvedServices)}`,
    `TOTAL:${totalEtb} ETB`,
    `SUMMARY:${servicesSummary}`,
    notes?.trim() ? `NOTE:${notes.trim()}` : "",
  ].filter(Boolean).join("\n");

  // ── Try inserting with services column first, fall back without ───────────
  const baseRow = {
    customer_name:        name.trim(),
    phone:                cleanPhone,
    preferred_barber_id:  preferred_barber_id?.trim() || null,
    requested_date,
    requested_time,
    notes:                combinedNotes,
    status:               "PENDING",
    created_at:           new Date().toISOString(),
  };

  // First attempt: with services column (post-migration)
  const { data, error } = await supabase
    .schema(DB_SCHEMA)
    .from("reservation_requests")
    .insert({ ...baseRow, services: resolvedServices })
    .select("id")
    .single();

  if (!error) {
    return NextResponse.json({ success: true, reservation_id: data?.id });
  }

  // If services column doesn't exist yet, fall back to without it
  if (error.message.includes("services") || error.code === "PGRST205" || error.code === "42703") {
    console.warn("[reserve] services column not found — inserting without it. Run migration 004.");
    const { data: data2, error: error2 } = await supabase
      .schema(DB_SCHEMA)
      .from("reservation_requests")
      .insert(baseRow)
      .select("id")
      .single();

    if (error2) {
      console.error("[reserve] Supabase fallback error:", error2.message);
      return NextResponse.json({ error: "Failed to save reservation — try again" }, { status: 500 });
    }
    return NextResponse.json({ success: true, reservation_id: data2?.id });
  }

  console.error("[reserve] Supabase error:", error.message);
  return NextResponse.json({ error: "Failed to save reservation — try again" }, { status: 500 });
}
