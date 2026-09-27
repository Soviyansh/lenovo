import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Supabase server environment variables are missing");

      return NextResponse.json(
        {
          error: "Supabase server configuration is missing",
        },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const now = new Date().toISOString();

    const { data: scheduledOrders, error: fetchError } =
      await supabaseAdmin
        .from("orders")
        .select(
          "id, order_id, status, order_type, scheduled_for, scheduled_active"
        )
        .eq("order_type", "scheduled")
        .eq("scheduled_active", false)
        .lte("scheduled_for", now);

    if (fetchError) {
      console.error(
        "Error fetching scheduled orders:",
        fetchError
      );

      return NextResponse.json(
        {
          error: "Unable to fetch scheduled orders",
        },
        { status: 500 }
      );
    }

    if (!scheduledOrders || scheduledOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No scheduled orders are ready for activation",
        activated: 0,
      });
    }

    const orderIds = scheduledOrders.map(
      (order) => order.id
    );

    const { data: activatedOrders, error: updateError } =
      await supabaseAdmin
        .from("orders")
        .update({
          scheduled_active: true,
        })
        .in("id", orderIds)
        .eq("scheduled_active", false)
        .select(
          "id, order_id, status, order_type, scheduled_for, scheduled_active"
        );

    if (updateError) {
      console.error(
        "Error activating scheduled orders:",
        updateError
      );

      return NextResponse.json(
        {
          error: "Unable to activate scheduled orders",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${activatedOrders?.length || 0} scheduled order(s) activated`,
      activated: activatedOrders?.length || 0,
      orders: activatedOrders || [],
    });
  } catch (error) {
    console.error(
      "Scheduled activation API error:",
      error
    );

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}