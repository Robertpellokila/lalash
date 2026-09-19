import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Clock, CalendarX, Plus, Trash2, Save, Store } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageTransition } from '@/components/shared/page-transition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';
import type { BusinessHour, BlockedDate, Settings } from '@/lib/types';
import { toast } from 'sonner';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function SettingsPage() {
  const [tab, setTab] = useState('business');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addBlockedOpen, setAddBlockedOpen] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [s, bh, bd] = await Promise.all([
      supabase.from('settings').select('*').maybeSingle(),
      supabase.from('business_hours').select('*').order('day_of_week'),
      supabase.from('blocked_dates').select('*').order('blocked_date'),
    ]);
    setSettings(s.data);
    setBusinessHours(bh.data ?? []);
    setBlockedDates(bd.data ?? []);
    setLoading(false);
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase.from('settings').update({
      business_name: settings.business_name,
      phone: settings.phone,
      whatsapp: settings.whatsapp,
      instagram: settings.instagram,
      address: settings.address,
      min_booking_notice_hours: settings.min_booking_notice_hours,
      max_booking_days_ahead: settings.max_booking_days_ahead,
      cancellation_policy: settings.cancellation_policy,
      allow_public_booking: settings.allow_public_booking,
      auto_confirm_public_booking: settings.auto_confirm_public_booking,
    }).eq('id', settings.id);
    setSaving(false);
    if (error) toast.error('Failed to save settings');
    else toast.success('Settings saved');
  };

  const updateBusinessHour = async (bh: BusinessHour, updates: Partial<BusinessHour>) => {
    const { error } = await supabase.from('business_hours').update(updates).eq('id', bh.id);
    if (error) toast.error('Failed to update business hours');
    else {
      setBusinessHours(prev => prev.map(b => b.id === bh.id ? { ...b, ...updates } : b));
    }
  };

  const addBlockedDate = async (date: string, reason: string) => {
    const { error } = await supabase.from('blocked_dates').insert({ blocked_date: date, reason });
    if (error) toast.error('Failed to add blocked date');
    else {
      toast.success('Date blocked');
      setAddBlockedOpen(false);
      fetchAll();
    }
  };

  const removeBlockedDate = async (id: string) => {
    const { error } = await supabase.from('blocked_dates').delete().eq('id', id);
    if (error) toast.error('Failed to remove blocked date');
    else {
      toast.success('Date unblocked');
      setBlockedDates(prev => prev.filter(b => b.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 bg-muted rounded shimmer" />
        <div className="h-96 bg-muted rounded-2xl shimmer" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="mb-6">
        <h1 className="text-2xl font-serif font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your studio and booking preferences
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="hours">Business Hours</TabsTrigger>
          <TabsTrigger value="blocked">Blocked Dates</TabsTrigger>
          <TabsTrigger value="booking">Booking Settings</TabsTrigger>
        </TabsList>

        {/* Business Info */}
        <TabsContent value="business">
          {settings && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft max-w-2xl space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Store className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-serif font-semibold">Business Information</h3>
            </div>
            <div className="space-y-2">
              <Label>Business Name</Label>
              <Input
                value={settings.business_name}
                onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={settings.phone ?? ''}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input
                  value={settings.whatsapp ?? ''}
                  onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Instagram</Label>
                <Input
                  value={settings.instagram ?? ''}
                  onChange={(e) => setSettings({ ...settings, instagram: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={settings.address ?? ''}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={saveSettings} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            </div>
          )}
        </TabsContent>

        {/* Business Hours */}
        <TabsContent value="hours">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-serif font-semibold">Business Hours</h3>
            </div>
            <div className="space-y-3">
              {DAYS.map((day, idx) => {
                const bh = businessHours.find((b) => b.day_of_week === idx);
                if (!bh) return null;
                return (
                  <div key={idx} className="flex items-center gap-4 rounded-xl border border-border p-3">
                    <div className="w-28">
                      <span className="text-sm font-medium">{day}</span>
                    </div>
                    <Switch
                      checked={bh.is_open}
                      onCheckedChange={(v) => updateBusinessHour(bh, { is_open: v })}
                    />
                    {bh.is_open ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="time"
                          value={bh.open_time}
                          onChange={(e) => updateBusinessHour(bh, { open_time: e.target.value })}
                          className="w-28"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={bh.close_time}
                          onChange={(e) => updateBusinessHour(bh, { close_time: e.target.value })}
                          className="w-28"
                        />
                        <div className="flex items-center gap-1 ml-2">
                          <span className="text-xs text-muted-foreground">Break:</span>
                          <Input
                            type="time"
                            value={bh.break_start ?? ''}
                            onChange={(e) => updateBusinessHour(bh, { break_start: e.target.value || null })}
                            className="w-24"
                          />
                          <span className="text-muted-foreground">-</span>
                          <Input
                            type="time"
                            value={bh.break_end ?? ''}
                            onChange={(e) => updateBusinessHour(bh, { break_end: e.target.value || null })}
                            className="w-24"
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Closed</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Blocked Dates */}
        <TabsContent value="blocked">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarX className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-serif font-semibold">Blocked Dates</h3>
              </div>
              <Button size="sm" onClick={() => setAddBlockedOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Block Date
              </Button>
            </div>
            {blockedDates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No blocked dates. Add one to prevent bookings on holidays or closed days.
              </p>
            ) : (
              <div className="space-y-2">
                {blockedDates.map((bd) => (
                  <div key={bd.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                    <div>
                      <p className="text-sm font-medium">{formatDate(bd.blocked_date)}</p>
                      <p className="text-xs text-muted-foreground">{bd.reason}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBlockedDate(bd.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Booking Settings */}
        <TabsContent value="booking">
          {settings && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft max-w-2xl space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <SettingsIcon className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-serif font-semibold">Booking Settings</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Booking Notice (hours)</Label>
                  <Input
                    type="number"
                    value={settings.min_booking_notice_hours}
                    onChange={(e) => setSettings({ ...settings, min_booking_notice_hours: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Days Ahead</Label>
                  <Input
                    type="number"
                    value={settings.max_booking_days_ahead}
                    onChange={(e) => setSettings({ ...settings, max_booking_days_ahead: parseInt(e.target.value) || 30 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cancellation Policy</Label>
                <Textarea
                  value={settings.cancellation_policy ?? ''}
                  onChange={(e) => setSettings({ ...settings, cancellation_policy: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <Label>Allow Public Booking</Label>
                  <p className="text-xs text-muted-foreground">Enable the public booking page</p>
                </div>
                <Switch
                  checked={settings.allow_public_booking}
                  onCheckedChange={(v) => setSettings({ ...settings, allow_public_booking: v })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <Label>Auto-confirm Public Bookings</Label>
                  <p className="text-xs text-muted-foreground">Automatically confirm public bookings</p>
                </div>
                <Switch
                  checked={settings.auto_confirm_public_booking}
                  onCheckedChange={(v) => setSettings({ ...settings, auto_confirm_public_booking: v })}
                />
              </div>
              <Button onClick={saveSettings} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {addBlockedOpen && (
        <AddBlockedDateModal
          open={addBlockedOpen}
          onOpenChange={setAddBlockedOpen}
          onAdd={addBlockedDate}
        />
      )}
    </PageTransition>
  );
}

function AddBlockedDateModal({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (date: string, reason: string) => void;
}) {
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('Closed');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif">Block a Date</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Holiday, Closed for maintenance"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
            <Button
              onClick={() => date && onAdd(date, reason)}
              disabled={!date}
              className="flex-1"
            >
              Block Date
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
