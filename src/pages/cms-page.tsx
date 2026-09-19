import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { LayoutTemplate, Save, ImagePlus, X, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { PageTransition } from '@/components/shared/page-transition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { LandingContent } from '@/lib/types';

export function CmsPage() {
  const [content, setContent] = useState<LandingContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    setLoading(true);
    const { data } = await supabase.from('landing_content').select('*').limit(1).maybeSingle();
    setContent(data);
    setLoading(false);
  };

  const update = (field: keyof LandingContent, value: string) => {
    setContent((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const handleSave = async () => {
    if (!content) return;
    setSaving(true);
    const { id, updated_at, ...payload } = content;
    const { error } = await supabase.from('landing_content').update(payload).eq('id', id);
    setSaving(false);
    if (error) toast.error('Failed to save content');
    else toast.success('Landing page content saved');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 bg-muted rounded shimmer" />
        <div className="h-96 bg-muted rounded-2xl shimmer" />
      </div>
    );
  }

  if (!content) {
    return (
      <PageTransition>
        <div className="text-center py-20">
          <p className="text-muted-foreground">No content found. Run the migration first.</p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold">Landing Page CMS</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Edit the content shown on your public landing page.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/" target="_blank">
              <Eye className="h-4 w-4" />
              Preview
            </Link>
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="space-y-6 max-w-3xl">
        {/* Hero Section */}
        <Section title="Hero Section" icon={LayoutTemplate}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Badge Text</Label>
              <Input value={content.hero_badge} onChange={(e) => update('hero_badge', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hero Title</Label>
              <Input value={content.hero_title} onChange={(e) => update('hero_title', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hero Subtitle</Label>
              <Textarea value={content.hero_subtitle} onChange={(e) => update('hero_subtitle', e.target.value)} rows={2} />
            </div>
            <ImageField
              label="Hero Image"
              value={content.hero_image_url ?? ''}
              bucket="landing-images"
              onChange={(url) => update('hero_image_url', url)}
            />
          </div>
        </Section>

        {/* Features Section */}
        <Section title="Features Section">
          <div className="space-y-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="space-y-2 rounded-xl border border-border p-4">
                <p className="text-sm font-medium text-muted-foreground">Feature {n}</p>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={content[`feature_${n}_title` as keyof LandingContent] as string}
                    onChange={(e) => update(`feature_${n}_title` as keyof LandingContent, e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={content[`feature_${n}_desc` as keyof LandingContent] as string}
                    onChange={(e) => update(`feature_${n}_desc` as keyof LandingContent, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Gallery Section */}
        <Section title="Gallery Section">
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <ImageField
                key={n}
                label={`Gallery Image ${n}`}
                value={content[`gallery_image_${n}` as keyof LandingContent] as string ?? ''}
                bucket="landing-images"
                onChange={(url) => update(`gallery_image_${n}` as keyof LandingContent, url)}
              />
            ))}
          </div>
        </Section>

        {/* CTA Section */}
        <Section title="Call to Action Section">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>CTA Title</Label>
              <Input value={content.cta_title} onChange={(e) => update('cta_title', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>CTA Subtitle</Label>
              <Textarea value={content.cta_subtitle} onChange={(e) => update('cta_subtitle', e.target.value)} rows={2} />
            </div>
          </div>
        </Section>

        {/* Footer */}
        <Section title="Footer">
          <div className="space-y-2">
            <Label>Footer Tagline</Label>
            <Input
              value={content.footer_tagline ?? ''}
              onChange={(e) => update('footer_tagline', e.target.value)}
              placeholder="Optional tagline shown in the footer"
            />
          </div>
        </Section>

        <div className="flex justify-end gap-3 pb-8">
          <Button asChild variant="outline" className="gap-1.5">
            <Link to="/" target="_blank">
              <Eye className="h-4 w-4" />
              Preview Landing Page
            </Link>
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </PageTransition>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon?: typeof LayoutTemplate; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-6 shadow-soft"
    >
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <h2 className="font-serif font-semibold text-lg">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

function ImageField({ label, value, bucket, onChange }: { label: string; value: string; bucket: string; onChange: (url: string) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split('.').pop();
    const fileName = `${label.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file);
    if (uploadError) {
      toast.error('Failed to upload image');
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    onChange(urlData.publicUrl);
    setUploading(false);
    toast.success('Image uploaded');
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
      />
      {value ? (
        <div className="relative rounded-xl overflow-hidden h-32 group">
          <img src={value} alt={label} className="w-full h-full object-cover" />
          <button
            onClick={() => onChange('')}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full h-32 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-accent/30 transition-colors"
        >
          {uploading ? (
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          ) : (
            <>
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Click to upload</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
