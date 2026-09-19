import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BookingRequest {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  service_id: string;
  booking_date: string;
  start_time: string;
  notes?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const body: BookingRequest = await req.json();
    const {
      customer_name,
      customer_phone,
      customer_email,
      service_id,
      booking_date,
      start_time,
      notes,
    } = body;

    // Validate required fields
    if (!customer_name || !customer_phone || !service_id || !booking_date || !start_time) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch the service
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("*")
      .eq("id", service_id)
      .eq("active", true)
      .maybeSingle();

    if (serviceError || !service) {
      return new Response(
        JSON.stringify({ error: "Service not found or not available" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Calculate end time
    const [sh, sm] = start_time.split(":").map(Number);
    const endMinutes = sh * 60 + sm + service.duration_minutes;
    const eh = Math.floor(endMinutes / 60);
    const em = endMinutes % 60;
    const end_time = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;

    // Fetch business hours for the day
    const dateObj = new Date(booking_date + "T00:00:00");
    const dayOfWeek = dateObj.getDay();

    const { data: bh } = await supabase
      .from("business_hours")
      .select("*")
      .eq("day_of_week", dayOfWeek)
      .maybeSingle();

    if (!bh || !bh.is_open) {
      return new Response(
        JSON.stringify({ error: "We are closed on this day" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check if date is blocked
    const { data: blocked } = await supabase
      .from("blocked_dates")
      .select("id")
      .eq("blocked_date", booking_date)
      .maybeSingle();

    if (blocked) {
      return new Response(
        JSON.stringify({ error: "This date is not available for booking" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check if slot is within business hours
    if (start_time < bh.open_time || end_time > bh.close_time) {
      return new Response(
        JSON.stringify({ error: "Selected time is outside business hours" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check if slot overlaps with break time
    if (bh.break_start && bh.break_end) {
      if (start_time < bh.break_end && end_time > bh.break_start) {
        return new Response(
          JSON.stringify({ error: "Selected time overlaps with break time" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Check for double booking (server-side validation)
    const { data: conflicts } = await supabase
      .from("bookings")
      .select("id")
      .eq("booking_date", booking_date)
      .neq("status", "CANCELLED")
      .neq("status", "NO_SHOW")
      .lt("start_time", end_time)
      .gt("end_time", start_time);

    if (conflicts && conflicts.length > 0) {
      return new Response(
        JSON.stringify({ error: "This slot was just booked. Please choose another available time." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Find or create customer
    let customerId: string;
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", customer_phone)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer, error: custError } = await supabase
        .from("customers")
        .insert({
          name: customer_name,
          phone: customer_phone,
          email: customer_email || null,
        })
        .select("id")
        .single();

      if (custError || !newCustomer) {
        return new Response(
          JSON.stringify({ error: "Failed to create customer record" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      customerId = newCustomer.id;
    }

    // Fetch settings for auto-confirm
    const { data: settings } = await supabase
      .from("settings")
      .select("auto_confirm_public_booking")
      .maybeSingle();

    const status = settings?.auto_confirm_public_booking ? "CONFIRMED" : "PENDING";

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        customer_id: customerId,
        service_id: service_id,
        booking_date: booking_date,
        start_time: start_time,
        end_time: end_time,
        status,
        payment_status: "UNPAID",
        source: "PUBLIC",
        notes: notes || null,
      })
      .select("id")
      .single();

    if (bookingError) {
      return new Response(
        JSON.stringify({ error: "Failed to create booking" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        booking_id: booking.id,
        status,
        message: "Booking request received successfully",
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
