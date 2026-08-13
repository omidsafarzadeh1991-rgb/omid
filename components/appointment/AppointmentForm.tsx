"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  appointmentFormSchema,
  type AppointmentFormValues,
} from "@/lib/validations";
import { appointmentTimeSlots } from "@/lib/config";

interface ServiceOption {
  id: string;
  title: string;
}

interface AppointmentFormProps {
  services: ServiceOption[];
  defaultServiceId?: string;
}

interface ApiErrorResponse {
  message: string;
  fieldErrors?: Partial<Record<keyof AppointmentFormValues, string>>;
}

/** Today in Asia/Tehran as an ISO `yyyy-mm-dd`, used as the date input's floor. */
function todayIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(
    new Date(),
  );
}

export function AppointmentForm({
  services,
  defaultServiceId,
}: AppointmentFormProps) {
  const [submitState, setSubmitState] = useState<
    "idle" | "submitting" | "success"
  >("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      serviceId: defaultServiceId ?? "",
      date: "",
      time: "",
    },
  });

  async function onSubmit(values: AppointmentFormValues) {
    setServerError(null);
    setSubmitState("submitting");

    try {
      const response = await fetch("/api/appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = (await response.json()) as ApiErrorResponse;

      if (!response.ok) {
        setSubmitState("idle");
        if (data.fieldErrors) {
          for (const [field, message] of Object.entries(data.fieldErrors)) {
            form.setError(field as keyof AppointmentFormValues, {
              message,
            });
          }
        }
        setServerError(data.message || "ثبت درخواست ناموفق بود.");
        return;
      }

      setSubmitState("success");
      form.reset();
    } catch {
      setSubmitState("idle");
      setServerError("ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.");
    }
  }

  if (submitState === "success") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-muted/30 px-6 py-14 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <CheckCircle2 className="size-6" aria-hidden="true" />
        </span>
        <h2 className="text-lg font-semibold text-foreground">
          درخواست شما ثبت شد
        </h2>
        <p className="max-w-sm text-sm leading-7 text-muted-foreground">
          درخواست رزرو شما ثبت شد و پس از بررسی، زمان نهایی نوبت تأیید خواهد شد.
        </p>
        <Button variant="outline" onClick={() => setSubmitState("idle")}>
          ثبت درخواست جدید
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="space-y-6"
      >
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>نام و نام خانوادگی</FormLabel>
              <FormControl>
                <Input
                  placeholder="مثلاً: علی محمدی"
                  autoComplete="name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>شماره موبایل</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  inputMode="numeric"
                  placeholder="09xxxxxxxxx"
                  autoComplete="tel"
                  dir="ltr"
                  className="text-right"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="serviceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>خدمت مورد نظر</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="یک آزمایش را انتخاب کنید" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>تاریخ مراجعه</FormLabel>
                <FormControl>
                  <Input type="date" min={todayIso()} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ساعت مراجعه</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="یک ساعت را انتخاب کنید" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {appointmentTimeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {serverError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{serverError}</span>
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={submitState === "submitting"}
        >
          {submitState === "submitting" && (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          )}
          ثبت درخواست رزرو
        </Button>
      </form>
    </Form>
  );
}
