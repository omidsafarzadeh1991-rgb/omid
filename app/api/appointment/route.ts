import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { appointmentFormSchema, flattenZodErrors } from "@/lib/validations";
import { getServiceById } from "@/lib/data/services";
import {
  createAppointment,
  DuplicateAppointmentError,
} from "@/lib/data/appointments";
import {
  appointmentIpLimiter,
  appointmentPhoneLimiter,
} from "@/lib/rate-limit";

/** Best-effort client IP extraction behind a reverse proxy / load balancer. */
function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: NextRequest) {
  // 1. Abuse protection by IP, before we do any parsing/DB work.
  const ip = getClientIp(request);
  const ipLimit = appointmentIpLimiter.check(ip);
  if (!ipLimit.success) {
    return NextResponse.json(
      {
        message:
          "تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً چند دقیقه دیگر دوباره تلاش کنید.",
      },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "ساختار درخواست نامعتبر است." },
      { status: 400 },
    );
  }

  // 2. Server-side validation — never trust client-side Zod checks alone.
  let values;
  try {
    values = appointmentFormSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: "اطلاعات وارد‌شده معتبر نیست.",
          fieldErrors: flattenZodErrors(error),
        },
        { status: 400 },
      );
    }
    throw error;
  }

  // 3. Per-phone abuse protection, now that we have a validated number.
  const phoneLimit = appointmentPhoneLimiter.check(values.phone);
  if (!phoneLimit.success) {
    return NextResponse.json(
      {
        message:
          "برای این شماره موبایل درخواست‌های زیادی ثبت شده است. لطفاً بعداً دوباره تلاش کنید.",
      },
      { status: 429 },
    );
  }

  // 4. Business rule: the requested service must actually exist.
  const service = await getServiceById(values.serviceId);
  if (!service) {
    return NextResponse.json(
      {
        message: "خدمت انتخاب‌شده معتبر نیست.",
        fieldErrors: { serviceId: "این خدمت یافت نشد." },
      },
      { status: 400 },
    );
  }

  try {
    const appointment = await createAppointment(values);
    return NextResponse.json(
      {
        message:
          "درخواست رزرو شما ثبت شد و پس از بررسی، زمان نهایی نوبت تأیید خواهد شد.",
        appointment: {
          id: appointment.id,
          status: appointment.status,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof DuplicateAppointmentError) {
      return NextResponse.json(
        {
          message:
            "این درخواست پیش‌تر با همین مشخصات ثبت شده است.",
        },
        { status: 409 },
      );
    }

    // Never leak internals (stack traces, DB errors) to the client.
    console.error("appointment creation failed", error);
    return NextResponse.json(
      { message: "خطایی در ثبت درخواست رخ داد. لطفاً دوباره تلاش کنید." },
      { status: 500 },
    );
  }
}
