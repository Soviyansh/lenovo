import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const paymentId = String(body.payment_id || "");
    const refundId = String(body.refund_id || "");

    if (!paymentId || !refundId) {
      return NextResponse.json(
        { error: "Payment ID and Refund ID are required" },
        { status: 400 }
      );
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error("Razorpay environment variables are missing");

      return NextResponse.json(
        { error: "Razorpay payment configuration is missing" },
        { status: 500 }
      );
    }

    const auth = Buffer.from(
      `${keyId}:${keySecret}`
    ).toString("base64");

    const razorpayResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(
        paymentId
      )}/refunds/${encodeURIComponent(refundId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${auth}`,
        },
        cache: "no-store",
      }
    );

    const data = await razorpayResponse.json();

    if (!razorpayResponse.ok) {
      console.error("Razorpay refund status API error:", data);

      return NextResponse.json(
        {
          error:
            data?.error?.description ||
            data?.error?.reason ||
            "Unable to fetch refund status",
        },
        { status: razorpayResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      refund_id: data.id,
      status: data.status,
      amount: data.amount,
      currency: data.currency,
    });
  } catch (error) {
    console.error("Razorpay refund status error:", error);

    return NextResponse.json(
      { error: "Unable to fetch refund status" },
      { status: 500 }
    );
  }
}
