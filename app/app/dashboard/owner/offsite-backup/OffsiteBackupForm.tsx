"use client";

import { useActionState, useState } from "react";
import {
  saveBackupDestinationAction,
  type BackupSettingsFormState,
} from "@/app/actions/backup-settings";

type ExistingSettings = {
  type: "S3" | "SFTP" | null;
  enabled: boolean;
  scheduleHour: number;
  retentionDays: number;
  s3Endpoint: string | null;
  s3Bucket: string | null;
  s3Region: string | null;
  hasS3Credentials: boolean;
  sftpHost: string | null;
  sftpPort: number | null;
  sftpUsername: string | null;
  sftpRemotePath: string | null;
  hasSftpCredentials: boolean;
};

const initialState: BackupSettingsFormState = undefined;

export default function OffsiteBackupForm({ existing }: { existing: ExistingSettings }) {
  const [state, action, pending] = useActionState(saveBackupDestinationAction, initialState);
  const [type, setType] = useState<"S3" | "SFTP">(existing.type ?? "SFTP");

  return (
    <form action={action} dir="rtl" className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          id="enabled"
          name="enabled"
          type="checkbox"
          defaultChecked={existing.enabled}
          className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
        />
        <label htmlFor="enabled" className="text-sm text-slate-700">
          ارسال خودکار بک‌آپ آفسایت فعال باشد
        </label>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">مقصد بک‌آپ</label>
        <div className="flex flex-wrap gap-4 text-sm text-slate-700">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="type"
              value="SFTP"
              checked={type === "SFTP"}
              onChange={() => setType("SFTP")}
            />
            SFTP (سرور/NAS خودتان)
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="type"
              value="S3"
              checked={type === "S3"}
              onChange={() => setType("S3")}
            />
            S3-Compatible (فضای ابری بیرونی)
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {type === "SFTP"
            ? "با این گزینه، فایل رمزنگاری‌شده فقط به سرور/NAS خودِ کلینیک شما می‌رود؛ از زیرساخت شما خارج نمی‌شود."
            : "با این گزینه، فایل رمزنگاری‌شده (نه دادهٔ خام) به یک سرویس ابری بیرونی مثل Wasabi/Backblaze B2/MinIO ارسال می‌شود؛ این تنها استثنای این پروژه بر قانون «داده هیچ‌وقت از کامپیوتر شما خارج نمی‌شود» است و کاملاً اختیاری است."}
        </p>
      </div>

      {type === "S3" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Endpoint"
            name="s3Endpoint"
            defaultValue={existing.s3Endpoint ?? ""}
            placeholder="https://s3.eu-central-1.wasabisys.com"
            required
          />
          <Field label="Bucket" name="s3Bucket" defaultValue={existing.s3Bucket ?? ""} required />
          <Field label="Region (اختیاری)" name="s3Region" defaultValue={existing.s3Region ?? ""} />
          <div />
          <Field
            label="Access Key"
            name="s3AccessKey"
            type="password"
            placeholder={existing.hasS3Credentials ? "برای تغییر، مقدار جدید را وارد کنید" : "Access Key"}
            required
          />
          <Field
            label="Secret Key"
            name="s3SecretKey"
            type="password"
            placeholder={existing.hasS3Credentials ? "برای تغییر، مقدار جدید را وارد کنید" : "Secret Key"}
            required
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="آدرس سرور (Host)" name="sftpHost" defaultValue={existing.sftpHost ?? ""} required />
          <Field
            label="پورت"
            name="sftpPort"
            type="number"
            defaultValue={String(existing.sftpPort ?? 22)}
            required
          />
          <Field
            label="نام‌کاربری"
            name="sftpUsername"
            defaultValue={existing.sftpUsername ?? ""}
            required
          />
          <Field
            label="رمز عبور"
            name="sftpPassword"
            type="password"
            placeholder={existing.hasSftpCredentials ? "برای تغییر، مقدار جدید را وارد کنید" : "رمز عبور"}
            required
          />
          <Field
            label="مسیر مقصد در سرور"
            name="sftpRemotePath"
            defaultValue={existing.sftpRemotePath ?? ""}
            placeholder="/backups/clinic"
            required
          />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="ساعت اجرای خودکار روزانه (۰ تا ۲۳)"
          name="scheduleHour"
          type="number"
          defaultValue={String(existing.scheduleHour)}
          min={0}
          max={23}
          required
        />
        <Field
          label="تعداد روزهای نگه‌داری نسخه‌ها"
          name="retentionDays"
          type="number"
          defaultValue={String(existing.retentionDays)}
          min={1}
          max={365}
          required
        />
      </div>

      <button type="submit" disabled={pending} className="btn btn-dark btn-sm">
        {pending ? "در حال ذخیره..." : "ذخیرهٔ تنظیمات"}
      </button>
      {state?.success && <p className="text-xs text-teal-700">{state.success}</p>}
      {state?.message && <p className="text-xs text-red-600">{state.message}</p>}
    </form>
  );
}

function Field({
  label,
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <input
        {...rest}
        dir="ltr"
        className="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm ltr:text-left focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
      />
    </div>
  );
}
