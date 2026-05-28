/**
 * @file route.ts
 * @module app/api/auth/verify-email
 *
 * POST /api/auth/verify-email — Server-side email deliverability check.
 *
 * Checks:
 *   1. Format validation (RFC 5322 simplified)
 *   2. Disposable/throwaway domain blocklist
 *   3. DNS MX record lookup — confirms the domain can receive email
 *
 * Returns: { valid: boolean; reason?: string }
 *
 * This runs server-side because browser DNS APIs don't exist and
 * third-party email validation APIs cost money.
 */

import { NextResponse } from "next/server";
import dns              from "dns/promises";

// ─── Disposable domain blocklist ──────────────────────────────────────────────
// Common throwaway email providers — not exhaustive but covers the obvious ones

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "tempmail.com", "throwam.com",
  "yopmail.com", "sharklasers.com", "guerrillamailblock.com", "grr.la",
  "guerrillamail.info", "guerrillamail.biz", "guerrillamail.de",
  "guerrillamail.net", "guerrillamail.org", "spam4.me", "trashmail.com",
  "trashmail.me", "trashmail.net", "dispostable.com", "mailnull.com",
  "spamgourmet.com", "spamgourmet.net", "spamgourmet.org", "maildrop.cc",
  "fakeinbox.com", "mailnesia.com", "mailnull.com", "spamfree24.org",
  "spamfree24.de", "spamfree24.eu", "spamfree24.info", "spamfree24.net",
  "spamfree.eu", "spamhole.com", "spamify.com", "spamthis.co.uk",
  "tempinbox.com", "tempr.email", "temp-mail.org", "temp-mail.io",
  "throwaway.email", "discard.email", "spamgourmet.com", "10minutemail.com",
  "10minutemail.net", "10minutemail.org", "10minutemail.co.uk",
  "20minutemail.com", "filzmail.com", "getairmail.com", "gishpuppy.com",
  "hmamail.com", "incognitomail.com", "incognitomail.net", "incognitomail.org",
  "jetable.com", "jetable.fr.nf", "jetable.net", "jetable.org",
  "kasmail.com", "klassmaster.com", "klassmaster.net", "lol.ovpn.to",
  "lookugly.com", "lortemail.dk", "mailandftp.com", "mailbidon.com",
  "mailbiz.biz", "mailblocks.com", "mailbucket.org", "mailcat.biz",
  "mailcatch.com", "mailexpire.com", "mailfreeonline.com", "mailguard.me",
  "mailimate.com", "mailin8r.com", "mailinater.com", "mailinator2.com",
  "mailincubator.com", "mailismagic.com", "mailme.ir", "mailme.lv",
  "mailme24.com", "mailmetrash.com", "mailmoat.com", "mailnew.com",
  "mailnull.com", "mailpick.biz", "mailrock.biz", "mailscrap.com",
  "mailshell.com", "mailsiphon.com", "mailslite.com", "mailtemp.info",
  "mailtome.de", "mailtothis.com", "mailtrash.net", "mailtv.net",
  "mailzilla.com", "mailzilla.org", "mbx.cc", "mega.zik.dj",
  "meltmail.com", "mierdamail.com", "mintemail.com", "moncourrier.fr.nf",
  "monemail.fr.nf", "monmail.fr.nf", "mt2009.com", "mt2014.com",
  "mytrashmail.com", "neomailbox.com", "nepwk.com", "nervmich.net",
  "nervtmich.net", "netmails.com", "netmails.net", "netzidiot.de",
  "nh3.ro", "nice-4u.com", "nincsmail.hu", "nnh.com", "no-spam.ws",
  "nobulk.com", "noclickemail.com", "nogmailspam.info", "nomail.pw",
  "nomail.xl.cx", "nomail2me.com", "nomorespamemails.com", "nonspam.eu",
  "nonspammer.de", "noref.in", "nospam.ze.tc", "nospam4.us",
  "nospamfor.us", "nospammail.net", "nospamthanks.info", "notmailinator.com",
  "nowmymail.com", "nwldx.com", "objectmail.com", "obobbo.com",
  "odaymail.com", "odnorazovoe.ru", "one-time.email", "oneoffemail.com",
  "onewaymail.com", "onlatedotcom.info", "online.ms", "oopi.org",
  "opayq.com", "ordinaryamerican.net", "otherinbox.com", "ourklips.com",
  "outlawspam.com", "ovpn.to", "owlpic.com",
]);

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  let body: { email?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ valid: false, reason: "Invalid request" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ valid: false, reason: "Email is required" });
  }

  // ── 1. Format check ───────────────────────────────────────────────────────
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ valid: false, reason: "Invalid email format" });
  }

  const domain = email.split("@")[1];

  // ── 2. Disposable domain check ────────────────────────────────────────────
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return NextResponse.json({
      valid:  false,
      reason: "Disposable/temporary email addresses are not allowed",
    });
  }

  // ── 3. DNS MX record check ────────────────────────────────────────────────
  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      return NextResponse.json({
        valid:  false,
        reason: `Domain "${domain}" has no mail server — email cannot be delivered`,
      });
    }
    // MX records exist — domain can receive email
    return NextResponse.json({ valid: true });
  } catch (err: unknown) {
    // DNS lookup failed — domain doesn't exist or has no MX
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOTFOUND" || code === "ENODATA" || code === "ESERVFAIL") {
      return NextResponse.json({
        valid:  false,
        reason: `Domain "${domain}" does not exist or cannot receive email`,
      });
    }
    // Network/DNS timeout — don't block registration, just warn
    console.warn("[verify-email] DNS lookup failed:", code, domain);
    return NextResponse.json({ valid: true, warning: "Could not verify domain — proceeding anyway" });
  }
}
