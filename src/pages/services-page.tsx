import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Scissors, Plus, Pencil, Trash2, Clock, DollarSign, ImagePlus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageTransition } from '@/components/shared/page-transition';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import type { Service } from '@/lib/types';
import { toast } from 'sonner';

export function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    const { data } = await supabase.from('services').select('*').order('name');
    setServices(data ?? []);
    setLoading(false);
  };

  const toggleActive = async (service: Service) => {
    const { error } = await supabase
      .from('services')
      .update({ active: !service.active })
      .eq('id', service.id);
    if (error) toast.error('Failed to update service');
    else {
      toast.success(`Service ${!service.active ? 'activated' : 'deactivated'}`);
      fetchServices();
    }
  };

  const deleteService = async (id: string) => {
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) toast.error('Failed to delete service');
    else {
      toast.success('Service deleted');
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold">Services</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {services.length} services available
          </p>
        </div>
        <Button onClick={() => openEdit()} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Service
        </Button>
      </div>

      {services.length === 0 ? (
        <EmptyState
          icon={Scissors}
          title="No services yet"
          description="Add your first lash service to start accepting bookings."
          action={<Button onClick={() => openEdit()} className="gap-2"><Plus className="h-4 w-4" />Add Service</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service, i) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-border bg-card overflow-hidden shadow-soft hover:shadow-soft-lg transition-shadow"
            >
              {service.image_url ? (
                <div className="h-40 w-full overflow-hidden bg-muted">
                  <img src={service.image_url} alt={service.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-40 w-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/10">
                  <Scissors className="h-10 w-10 text-muted-foreground/40" />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-serif font-semibold text-lg">{service.name}</h3>
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
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      {formatCurrency(service.price)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(service)}>
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
    </PageTransition>
  );
}

function ServiceEditModal({
  service,
  open,
  onOpenChange,
}: {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(service?.name ?? '');
  const [description, setDescription] = useState(service?.description ?? '');
  const [duration, setDuration] = useState(String(service?.duration_minutes ?? 60));
  const [price, setPrice] = useState(String(service?.price ?? 0));
  const [active, setActive] = useState(service?.active ?? true);
  const [imageUrl, setImageUrl] = useState(service?.image_url ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('service-images')
      .upload(fileName, file);
    if (uploadError) {
      toast.error('Failed to upload image');
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage
      .from('service-images')
      .getPublicUrl(fileName);
    setImageUrl(urlData.publicUrl);
    setUploading(false);
    toast.success('Image uploaded');
  };

  const handleSave = async () => {
    if (!name || !duration || !price) {
      toast.error('Name, duration, and price are required');
      return;
    }
    setSaving(true);
    const payload = {
      name,
      description: description || null,
      duration_minutes: parseInt(duration),
      price: parseFloat(price),
      active,
      image_url: imageUrl || null,
    };

    const { error } = service
      ? await supabase.from('services').update(payload).eq('id', service.id)
      : await supabase.from('services').insert(payload);

    setSaving(false);
    if (error) toast.error('Failed to save service');
    else {
      toast.success(service ? 'Service updated' : 'Service added');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif">
            {service ? 'Edit Service' : 'Add Service'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Image upload */}
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
                <img src={imageUrl} alt="Service" className="w-full h-full object-cover" />
                <button
                  onClick={() => setImageUrl('')}
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
                    <span className="text-sm text-muted-foreground">Click to upload an image</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="space-y-2">
            <Label>Service Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Classic Lash" />
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
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Price (Rp)</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label>Active</Label>
              <p className="text-xs text-muted-foreground">Show on public booking page</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
          {price && (
            <div className="rounded-lg bg-accent/50 px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Price Display</span>
              <span className="font-semibold">{formatCurrency(parseFloat(price))}</span>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
