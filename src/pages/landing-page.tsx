import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Calendar,
  Clock,
  Scissors,
  Star,
  ArrowRight,
  MapPin,
  Phone,
  Instagram,
  Heart,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import type { Service, Settings, LandingContent } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const DEFAULT_HERO =
  "https://images.pexels.com/photos/5128222/pexels-photo-5128222.jpeg?auto=compress&cs=tinysrgb&h=650&w=940";
const DEFAULT_GALLERY_1 =
  "https://images.pexels.com/photos/6135662/pexels-photo-6135662.jpeg?auto=compress&cs=tinysrgb&h=650&w=940";
const DEFAULT_GALLERY_2 =
  "https://images.pexels.com/photos/5128234/pexels-photo-5128234.jpeg?auto=compress&cs=tinysrgb&h=650&w=940";
const DEFAULT_GALLERY_3 =
  "https://images.pexels.com/photos/36930354/pexels-photo-36930354.jpeg?auto=compress&cs=tinysrgb&h=650&w=940";

export function LandingPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [cms, setCms] = useState<LandingContent | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [settingsRes, servicesRes, cmsRes] = await Promise.all([
        supabase.from("settings").select("*").maybeSingle(),
        supabase.from("services").select("*").eq("active", true).order("name"),
        supabase.from("landing_content").select("*").limit(1).maybeSingle(),
      ]);
      setSettings(settingsRes.data);
      setServices(servicesRes.data ?? []);
      setCms(cmsRes.data);
    };
    fetchData();
  }, []);

  const businessName = settings?.business_name ?? "LaaLash Studio";
  const heroImage = cms?.hero_image_url || DEFAULT_HERO;
  const gallery1 = cms?.gallery_image_1 || DEFAULT_GALLERY_1;
  const gallery2 = cms?.gallery_image_2 || DEFAULT_GALLERY_2;
  const gallery3 = cms?.gallery_image_3 || DEFAULT_GALLERY_3;

  const features = [
    {
      icon: Calendar,
      title: cms?.feature_1_title ?? "Easy Online Booking",
      desc:
        cms?.feature_1_desc ??
        "Pick your service and time in under a minute — no calls needed.",
    },
    {
      icon: Clock,
      title: cms?.feature_2_title ?? "Flexible Scheduling",
      desc:
        cms?.feature_2_desc ??
        "Choose from available slots that fit your busy lifestyle.",
    },
    {
      icon: Heart,
      title: cms?.feature_3_title ?? "Expert Care",
      desc:
        cms?.feature_3_desc ??
        "Professional lash treatments tailored to your unique style.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50/30 to-amber-50/20">
      {/* Header */}
      <header className="border-b border-rose-100/50 bg-white/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt="logo"
                className="h-10 w-10 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-soft">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
            )}
            <span className="text-lg font-serif font-bold">{businessName}</span>
          </div>
          <Button asChild size="sm" className="gap-1.5">
            <Link to="/book">
              <Calendar className="h-4 w-4" />
              Book Appointment
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 mb-6">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">
                  {cms?.hero_badge ?? "Premium Lash Studio"}
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-serif font-bold leading-tight text-foreground">
                {cms?.hero_title ?? "Beautiful lashes, effortlessly booked"}
              </h1>
              <p className="mt-5 text-base text-muted-foreground max-w-md leading-relaxed">
                {cms?.hero_subtitle ??
                  "Book your lash appointment online in just a few taps. Choose your service, pick a time, and we'll handle the rest."}
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="gap-2 text-base h-12 px-8">
                  <Link to="/book">
                    Book an Appointment
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="gap-2 text-base h-12 px-8"
                >
                  <a href="#services">
                    <Scissors className="h-4 w-4" />
                    View Services
                  </a>
                </Button>
              </div>
              <div className="mt-8 flex items-center gap-6">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                  <span className="ml-2 text-sm text-muted-foreground">
                    Loved by clients
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative rounded-3xl overflow-hidden shadow-soft-lg aspect-[4/5]">
                <img
                  src={heroImage}
                  alt="Lash extension treatment"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-rose-900/20 to-transparent" />
              </div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="absolute -bottom-4 -left-4 rounded-2xl bg-white p-4 shadow-soft-lg border border-rose-100"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Online Booking</p>
                    <p className="text-xs text-muted-foreground">
                      Available 24/7
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white/60 border-y border-rose-100/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid sm:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-serif font-semibold text-lg">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      {services.length > 0 && (
        <section
          id="services"
          className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-20"
        >
          <div className="text-center mb-10">
            <h2 className="text-3xl font-serif font-bold">Our Services</h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto">
              Explore our range of lash treatments designed to enhance your
              natural beauty.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((service, i) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl border border-rose-100 bg-white overflow-hidden shadow-soft hover:shadow-soft-lg transition-shadow"
              >
                {service.image_url ? (
                  <div className="h-44 w-full overflow-hidden">
                    <img
                      src={service.image_url}
                      alt={service.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-44 w-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/10">
                    <Scissors className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                      <Scissors className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium">{service.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {service.duration_minutes} min
                      </p>
                    </div>
                  </div>
                  {service.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {service.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="text-lg font-bold font-serif text-primary">
                      {formatCurrency(service.price)}
                    </span>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                    >
                      <Link to="/book">
                        Book
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Gallery */}
      <section className="bg-white/60 border-y border-rose-100/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-serif font-bold">Our Work</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              A glimpse into our lash studio.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[heroImage, gallery1, gallery2].map((img, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl overflow-hidden aspect-[3/4] shadow-soft"
              >
                <img
                  src={img}
                  alt={`Gallery ${i + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 md:py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-serif font-bold">
            {cms?.cta_title ?? "Ready to book?"}
          </h2>
          <p className="mt-4 text-base text-muted-foreground max-w-md mx-auto">
            {cms?.cta_subtitle ??
              "Schedule your lash appointment online today. It only takes a minute."}
          </p>
          <Button asChild size="lg" className="mt-8 gap-2 text-base h-12 px-10">
            <Link to="/book">
              <Calendar className="h-5 w-5" />
              Book an Appointment
            </Link>
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-rose-100/50 bg-white/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          {cms?.footer_tagline && (
            <p className="text-center text-sm text-muted-foreground mb-6 italic">
              {cms.footer_tagline}
            </p>
          )}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                {settings?.logo_url ? (
                  <img
                    src={settings.logo_url}
                    alt="logo"
                    className="h-10 w-10 rounded-xl object-cover"
                  />
                ) : (
                  <Sparkles className="h-4 w-4 text-white" />
                )}
              </div>
              <span className="font-serif font-bold">{businessName}</span>
            </div>
            <div className="flex items-center gap-5 text-sm text-muted-foreground">
              {settings?.phone && (
                <a
                  href={`tel:${settings.phone}`}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  {settings.phone}
                </a>
              )}
              {settings?.instagram && (
                <a
                  href={`https://instagram.com/${settings.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                >
                  <Instagram className="h-4 w-4" />@{settings.instagram}
                </a>
              )}
              {settings?.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {settings.address}
                </span>
              )}
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} {businessName}. All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
