"use client";

import { useState } from "react";
import QuickBookModal from "./QuickBookModal";

export default function NewAppointmentCard({
  doctors,
}: {
  doctors: { id: string; name: string }[];
}) {
  const [activeDoctorId, setActiveDoctorId] = useState<string | null>(null);

  return (
    <>
      <section
        className="animate-in rounded-2xl p-6"
        style={{
          background: "linear-gradient(135deg, #2c527f, #1e3a5f)",
          boxShadow: "0 4px 0 #14283f, 0 20px 40px -16px rgba(30,58,95,0.5)",
        }}
      >
        <h2 className="mb-3 text-lg font-semibold text-white">ثبت نوبت جدید</h2>
        <div className="flex flex-wrap gap-3">
          {doctors.map((doctor) => (
            <button
              key={doctor.id}
              type="button"
              onClick={() => setActiveDoctorId(doctor.id)}
              className="btn btn-light"
            >
              نوبت برای {doctor.name}
            </button>
          ))}
        </div>
      </section>

      {activeDoctorId && (
        <QuickBookModal doctorId={activeDoctorId} onClose={() => setActiveDoctorId(null)} />
      )}
    </>
  );
}
