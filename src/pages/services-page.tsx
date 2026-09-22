import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Scissors,
  Plus,
  Pencil,
  Trash2,
  Clock,
  DollarSign,
  ImagePlus,
  X,
  Tag,
  Percent,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PageTransition } from "@/components/shared/page-transition";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/utils";
import type { Service } from "@/lib/types";
import { toast } from "sonner";

export function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    const { data } = await supabase.from("services").select("*").order("name");
    setServices(data ?? []);
    setLoading(false);
  };

  const toggleActive = async (service: Service) => {
    const { error } = await supabase
      .from("services")
      .update({ active: !service.active })
      .eq("id", service.id);
    if (error) toast.error("Failed to update service");
    else {
      toast.success(`Service ${!service.active ? "activated" : "deactivated"}`);
      fetchServices();
    }
  };

  const deleteService = async (id: string) => {
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) toast.error("Failed to delete service");
    else {
      toast.success("Service deleted");
      fetchServices();
    }
  };

  const openEdit = (service?: Service) => {
    setEditingService(service ?? null);
    setEditOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 bg-muted rounded shimmer" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 bg-muted rounded-2xl shimmer" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold">Services</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {services.length} services available
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setPromoOpen(true)}
            className="gap-2"
          >
            <Tag className="h-4 w-4" />
            Promo Program
          </Button>
          <Button onClick={() => openEdit()} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Service
          </Button>
        </div>
      </div>

      {services.length === 0 ? (
        <EmptyState
          icon={Scissors}
          title="No services yet"
          description="Add your first lash service to start accepting bookings."
          action={
            <Button onClick={() => openEdit()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Service
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service, i) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative rounded-2xl border border-border bg-card overflow-hidden shadow-soft hover:shadow-soft-lg transition-shadow"
            >
              {/* Promo Badge */}
              {service.discount_price && service.discount_price > 0 && (
                <div className="absolute top-3 right-3 z-10 bg-rose-500 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                  <Percent className="h-3 w-3" /> PROMO
                </div>
              )}

              {service.image_url ? (
                <div className="relative h-40 w-full overflow-hidden bg-muted">
                  <img
                    src={service.image_url}
                    alt={service.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-50" />
                </div>
              ) : (
                <div className="h-40 w-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/10">
                  <Scissors className="h-10 w-10 text-muted-foreground/40" />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-serif font-semibold text-lg line-clamp-1 pr-2">
                    {service.name}
                  </h3>
                  <Switch
                    checked={service.active}
                    onCheckedChange={() => toggleActive(service)}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {service.description}
                </p>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {service.duration_minutes} min
                    </div>
                    <div className="flex flex-col">
                      {service.discount_price ? (
                        <>
                          <span className="text-[10px] text-muted-foreground line-through leading-none">
                            {formatCurrency(service.price)}
                          </span>
                          <span className="text-sm font-bold text-rose-500 leading-tight mt-0.5">
                            {formatCurrency(service.discount_price)}
                          </span>
                        </>
                      ) : (
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          {formatCurrency(service.price)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(service)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteService(service.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {!service.active && (
                  <div className="mt-3 text-xs text-muted-foreground text-center bg-muted rounded-lg py-1">
                    Inactive — not visible on public booking
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {editOpen && (
        <ServiceEditModal
          service={editingService}
          open={editOpen}
          onOpenChange={(o) => {
            setEditOpen(o);
            if (!o) fetchServices();
          }}
        />
      )}

      {promoOpen && (
        <BulkPromoModal
          services={services}
          open={promoOpen}
          onOpenChange={(o) => {
            setPromoOpen(o);
            if (!o) fetchServices();
          }}
        />
      )}
    </PageTransition>
  );
}

// ----------------------------------------------------------------------
// MODAL UNTUK EDIT/TAMBAH SATU SERVICE (Dengan field Harga Diskon)
// ----------------------------------------------------------------------
function ServiceEditModal({
  service,
  open,
  onOpenChange,
}: {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [duration, setDuration] = useState(
    String(service?.duration_minutes ?? 60),
  );
  const [price, setPrice] = useState(String(service?.price ?? ""));
  const [discountPrice, setDiscountPrice] = useState(
    String(service?.discount_price ?? ""),
  );
  const [active, setActive] = useState(service?.active ?? true);
  const [imageUrl, setImageUrl] = useState(service?.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("service-images")
      .upload(fileName, file);
    if (uploadError) {
      toast.error("Failed to upload image");
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage
      .from("service-images")
      .getPublicUrl(fileName);
    setImageUrl(urlData.publicUrl);
    setUploading(false);
    toast.success("Image uploaded");
  };

  const handleSave = async () => {
    if (!name || !duration || !price) {
      toast.error("Name, duration, and price are required");
      return;
    }
    setSaving(true);

    const parsedPrice = parseFloat(price);
    const parsedDiscount = parseFloat(discountPrice);

    // Validasi diskon
    if (parsedDiscount >= parsedPrice) {
      toast.error("Discount price cannot be higher or equal to normal price");
      setSaving(false);
      return;
    }

    const payload = {
      name,
      description: description || null,
      duration_minutes: parseInt(duration),
      price: parsedPrice,
      discount_price:
        isNaN(parsedDiscount) || parsedDiscount <= 0 ? null : parsedDiscount,
      active,
      image_url: imageUrl || null,
    };

    const { error } = service
      ? await supabase.from("services").update(payload).eq("id", service.id)
      : await supabase.from("services").insert(payload);

    setSaving(false);
    if (error) toast.error("Failed to save service");
    else {
      toast.success(service ? "Service updated" : "Service added");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif">
            {service ? "Edit Service" : "Add Service"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Service Image</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
              }}
            />
            {imageUrl ? (
              <div className="relative rounded-xl overflow-hidden h-40 group">
                <img
                  src={imageUrl}
                  alt="Service"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setImageUrl("")}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full h-40 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-accent/30 transition-colors"
              >
                {uploading ? (
                  <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Click to upload an image
                    </span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="space-y-2">
            <Label>Service Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Classic Lash"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Service description..."
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Normal Price (Rp)</Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Discount Price (Optional)</Label>
            <Input
              type="number"
              placeholder="Leave empty for no discount"
              value={discountPrice}
              onChange={(e) => setDiscountPrice(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label>Active</Label>
              <p className="text-xs text-muted-foreground">
                Show on public booking page
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
          {(price || discountPrice) && (
            <div className="rounded-lg bg-accent/50 px-4 py-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Normal Price Display
                </span>
                <span className="font-semibold">
                  {price ? formatCurrency(parseFloat(price)) : "Rp 0"}
                </span>
              </div>
              {discountPrice && parseFloat(discountPrice) > 0 && (
                <div className="flex items-center justify-between text-rose-500">
                  <span className="text-sm">Discount Display</span>
                  <span className="font-semibold">
                    {formatCurrency(parseFloat(discountPrice))}
                  </span>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------------
// MODAL UNTUK PROGRAM DISKON MASSAL (BULK PROMO)
// ----------------------------------------------------------------------
function BulkPromoModal({
  services,
  open,
  onOpenChange,
}: {
  services: Service[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [promoType, setPromoType] = useState<"percent" | "fixed">("percent");
  const [promoValue, setPromoValue] = useState("");
  const [target, setTarget] = useState<"all" | "specific">("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);

  // Fungsi apply diskon
  const handleApplyPromo = async () => {
    const amount = parseFloat(promoValue);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid discount amount");
      return;
    }

    const targetServices =
      target === "all"
        ? services
        : services.filter((s) => selectedIds.includes(s.id));

    if (targetServices.length === 0) {
      toast.error("No services selected");
      return;
    }

    setProcessing(true);

    const updates = targetServices.map((service) => {
      let discPrice = null;
      if (promoType === "percent") {
        discPrice = service.price - service.price * (amount / 100);
      } else {
        discPrice = service.price - amount;
      }

      // Cegah harga minus
      if (discPrice < 0) discPrice = 0;

      return {
        id: service.id,
        discount_price: discPrice,
      };
    });

    try {
      // Supabase update batch (promise all)
      await Promise.all(
        updates.map((u) =>
          supabase
            .from("services")
            .update({ discount_price: u.discount_price })
            .eq("id", u.id),
        ),
      );
      toast.success(`Discount applied to ${targetServices.length} services!`);
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to apply discount");
    } finally {
      setProcessing(false);
    }
  };

  // Fungsi hapus diskon
  const handleClearPromo = async () => {
    const targetServices =
      target === "all"
        ? services
        : services.filter((s) => selectedIds.includes(s.id));

    if (targetServices.length === 0) return;

    setProcessing(true);
    try {
      await Promise.all(
        targetServices.map((service) =>
          supabase
            .from("services")
            .update({ discount_price: null })
            .eq("id", service.id),
        ),
      );
      toast.success(`Discount removed from ${targetServices.length} services!`);
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to remove discount");
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif">
            Discount Program
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Apply To</Label>
            <div className="flex gap-2">
              <Button
                variant={target === "all" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setTarget("all")}
              >
                All Services
              </Button>
              <Button
                variant={target === "specific" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setTarget("specific")}
              >
                Specific Services
              </Button>
            </div>
          </div>

          {target === "specific" && (
            <div className="space-y-2 border border-border p-3 rounded-lg max-h-40 overflow-y-auto">
              {services.map((service) => (
                <div key={service.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={service.id}
                    checked={selectedIds.includes(service.id)}
                    onCheckedChange={() => toggleSelect(service.id)}
                  />
                  <label
                    htmlFor={service.id}
                    className="text-sm cursor-pointer"
                  >
                    {service.name}{" "}
                    <span className="text-muted-foreground">
                      ({formatCurrency(service.price)})
                    </span>
                  </label>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-border">
            <Label>Discount Type</Label>
            <div className="flex gap-2">
              <Button
                variant={promoType === "percent" ? "secondary" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setPromoType("percent")}
              >
                Percentage (%)
              </Button>
              <Button
                variant={promoType === "fixed" ? "secondary" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setPromoType("fixed")}
              >
                Nominal (Rp)
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Discount Amount</Label>
            <Input
              type="number"
              placeholder={
                promoType === "percent" ? "e.g. 20 (for 20%)" : "e.g. 50000"
              }
              value={promoValue}
              onChange={(e) => setPromoValue(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <Button
              onClick={handleApplyPromo}
              disabled={processing}
              className="w-full"
            >
              {processing ? "Applying..." : "Apply Discount"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearPromo}
              disabled={processing}
              className="w-full"
            >
              Remove Discount from Selected
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
