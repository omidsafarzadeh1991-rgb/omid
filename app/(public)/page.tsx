import { Hero } from "@/components/home/Hero";
import { ServicesPreview } from "@/components/home/ServicesPreview";
import { WhyUs } from "@/components/home/WhyUs";
import { TeamPreview } from "@/components/home/TeamPreview";
import { Testimonials } from "@/components/home/Testimonials";
import { CallToAction } from "@/components/home/CallToAction";
import { getFeaturedServices } from "@/lib/data/services";
import { getFeaturedDoctors } from "@/lib/data/doctors";

export default async function HomePage() {
  const [services, doctors] = await Promise.all([
    getFeaturedServices(6),
    getFeaturedDoctors(3),
  ]);

  return (
    <>
      <Hero />
      <ServicesPreview services={services} />
      <WhyUs />
      <TeamPreview doctors={doctors} />
      <Testimonials />
      <CallToAction />
    </>
  );
}
