import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Save,
  RotateCcw,
  Check,
  CalendarDays,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { PageTransition } from '@/components/shared/page-transition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface BusinessHour {
  id: string;
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
  break_start: string | null;
  break_end: string | null;
  created_at?: string;
  updated_at?: string;
}

interface DaySchedule extends BusinessHour {
  day_name: string;
  short_name: string;
}

const DAYS = [
  { value: 0, name: 'Sunday', short: 'Sun' },
  { value: 1, name: 'Monday', short: 'Mon' },
  { value: 2, name: 'Tuesday', short: 'Tue' },
  { value: 3, name: 'Wednesday', short: 'Wed' },
  { value: 4, name: 'Thursday', short: 'Thu' },
  { value: 5, name: 'Friday', short: 'Fri' },
  { value: 6, name: 'Saturday', short: 'Sat' },
];

const DEFAULT_SCHEDULE = {
  is_open: true,
  open_time: '09:00',
  close_time: '20:00',
  break_start: '12:00',
  break_end: '13:00',
};

export function AvailableHoursPage() {
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchBusinessHours();
  }, []);

  const fetchBusinessHours = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('business_hours')
      .select('*')
      .order('day_of_week');

    if (error) {
      console.error('Failed to fetch business hours:', error);
      toast.error('Failed to load available hours');
      setLoading(false);
      return;
    }

    const rows = data ?? [];

    const normalized: DaySchedule[] = DAYS.map((day) => {
      const existing = rows.find(
        (row) => row.day_of_week === day.value
      );

      return {
        id: existing?.id ?? '',
        day_of_week: day.value,
        day_name: day.name,
        short_name: day.short,
        is_open: existing?.is_open ?? DEFAULT_SCHEDULE.is_open,
        open_time: existing?.open_time?.slice(0, 5) ?? DEFAULT_SCHEDULE.open_time,
        close_time:
          existing?.close_time?.slice(0, 5) ??
          DEFAULT_SCHEDULE.close_time,
        break_start:
          existing?.break_start?.slice(0, 5) ??
          DEFAULT_SCHEDULE.break_start,
        break_end:
          existing?.break_end?.slice(0, 5) ??
          DEFAULT_SCHEDULE.break_end,
      };
    });

    setSchedule(normalized);
    setLoading(false);
  };

  const updateDay = (
    dayOfWeek: number,
    updates: Partial<DaySchedule>
  ) => {
    setSaved(false);

    setSchedule((current) =>
      current.map((day) =>
        day.day_of_week === dayOfWeek
          ? { ...day, ...updates }
          : day
      )
    );
  };

  const validateSchedule = () => {
    for (const day of schedule) {
      if (!day.is_open) continue;

      if (!day.open_time || !day.close_time) {
        toast.error(`${day.day_name}: opening and closing time are required`);
        return false;
      }

      if (day.open_time >= day.close_time) {
        toast.error(
          `${day.day_name}: closing time must be later than opening time`
        );
        return false;
      }

      const hasBreakStart = Boolean(day.break_start);
      const hasBreakEnd = Boolean(day.break_end);

      if (hasBreakStart !== hasBreakEnd) {
        toast.error(
          `${day.day_name}: both break start and break end are required`
        );
        return false;
      }

      if (hasBreakStart && hasBreakEnd) {
        if (day.break_start! >= day.break_end!) {
          toast.error(
            `${day.day_name}: break end must be later than break start`
          );
          return false;
        }

        if (
          day.break_start! < day.open_time ||
          day.break_end! > day.close_time
        ) {
          toast.error(
            `${day.day_name}: break must be inside business hours`
          );
          return false;
        }
      }
    }

    return true;
  };

  const saveSchedule = async () => {
    if (!validateSchedule()) return;

    setSaving(true);
    setSaved(false);

    try {
      for (const day of schedule) {
        const payload = {
          day_of_week: day.day_of_week,
          is_open: day.is_open,
          open_time: day.open_time,
          close_time: day.close_time,
          break_start: day.break_start || null,
          break_end: day.break_end || null,
          updated_at: new Date().toISOString(),
        };

        if (day.id) {
          const { error } = await supabase
            .from('business_hours')
            .update(payload)
            .eq('id', day.id);

          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from('business_hours')
            .insert(payload)
            .select()
            .single();

          if (error) throw error;

          if (data) {
            setSchedule((current) =>
              current.map((item) =>
                item.day_of_week === day.day_of_week
                  ? {
                      ...item,
                      id: data.id,
                    }
                  : item
              )
            );
          }
        }
      }

      setSaved(true);
      toast.success('Available hours saved successfully');

      await fetchBusinessHours();

      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to save business hours:', error);

      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to save available hours'
      );
    } finally {
      setSaving(false);
    }
  };

  const resetSchedule = () => {
    setSchedule((current) =>
      current.map((day) => ({
        ...day,
        is_open: DEFAULT_SCHEDULE.is_open,
        open_time: DEFAULT_SCHEDULE.open_time,
        close_time: DEFAULT_SCHEDULE.close_time,
        break_start: DEFAULT_SCHEDULE.break_start,
        break_end: DEFAULT_SCHEDULE.break_end,
      }))
    );

    setSaved(false);
    toast.info('Schedule reset to default values');
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-48 bg-muted rounded-lg shimmer" />

        <div className="h-5 w-80 bg-muted rounded-lg shimmer" />

        <div className="space-y-4">
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              key={index}
              className="h-32 rounded-2xl bg-muted shimmer"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>

              <div>
                <h1 className="text-2xl font-serif font-bold">
                  Available Hours
                </h1>

                <p className="text-sm text-muted-foreground mt-1">
                  Set when your studio is available for bookings
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={resetSchedule}
              disabled={saving}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>

            <Button
              onClick={saveSchedule}
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <Check className="h-4 w-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/50">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>

            <div>
              <h2 className="font-semibold">
                Booking availability
              </h2>

              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                These hours control when customers can select appointment
                times on the public booking page. Changes are applied
                automatically after saving.
              </p>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="space-y-4">
          {schedule.map((day, index) => (
            <motion.div
              key={day.day_of_week}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-2xl border border-border bg-card p-5 shadow-soft hover:shadow-soft-lg transition-shadow"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                {/* Day */}
                <div className="flex items-center gap-4 lg:w-52 shrink-0">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl font-semibold text-sm ${
                      day.is_open
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {day.short_name}
                  </div>

                  <div>
                    <h3 className="font-serif font-semibold">
                      {day.day_name}
                    </h3>

                    <p className="text-xs text-muted-foreground mt-0.5">
                      {day.is_open ? 'Available for booking' : 'Closed'}
                    </p>
                  </div>
                </div>

                {/* Toggle */}
                <div className="flex items-center gap-3 lg:w-32">
                  <Switch
                    checked={day.is_open}
                    onCheckedChange={(checked) =>
                      updateDay(day.day_of_week, {
                        is_open: checked,
                      })
                    }
                  />

                  <span
                    className={`text-sm font-medium ${
                      day.is_open
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {day.is_open ? 'Open' : 'Closed'}
                  </span>
                </div>

                {/* Times */}
                {day.is_open ? (
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Opening Time
                      </Label>

                      <Input
                        type="time"
                        value={day.open_time}
                        onChange={(e) =>
                          updateDay(day.day_of_week, {
                            open_time: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Closing Time
                      </Label>

                      <Input
                        type="time"
                        value={day.close_time}
                        onChange={(e) =>
                          updateDay(day.day_of_week, {
                            close_time: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Break
                      </Label>

                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="time"
                          value={day.break_start ?? ''}
                          onChange={(e) =>
                            updateDay(day.day_of_week, {
                              break_start: e.target.value || null,
                            })
                          }
                        />

                        <Input
                          type="time"
                          value={day.break_end ?? ''}
                          onChange={(e) =>
                            updateDay(day.day_of_week, {
                              break_end: e.target.value || null,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 rounded-xl bg-muted/60 px-4 py-3">
                    <p className="text-sm text-muted-foreground">
                      Customers cannot book appointments on this day.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Save */}
        <div className="flex justify-end pt-2">
          <Button
            onClick={saveSchedule}
            disabled={saving}
            size="lg"
            className="gap-2"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Available Hours
              </>
            )}
          </Button>
        </div>
      </div>
    </PageTransition>
  );
}