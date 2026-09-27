import { NextResponse } from "next/server";

function getRazorpayErrorMessage(data: any) {
  return (
    data?.error?.description ||
    data?.error?.reason ||
    data?.error?.field ||
    data?.error?.code ||
    data?.message ||
    "Razorpay could not process this refund."
  );
}

async function readResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return {
      raw: "",
      data: {},
    };
  }

  try {
    return {
      raw: text,
      data: JSON.parse(text),
    };
  } catch {
    return {
      raw: text,
      data: {},
    };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const paymentId = String(body.payment_id || "").trim();
    const requestedAmount = body.amount;

    if (!paymentId) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment ID is required.",
        },
        { status: 400 }
      );
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error("Razorpay environment variables are missing.");

      return NextResponse.json(
        {
          success: false,
          error: "Razorpay payment configuration is missing.",
        },
        { status: 500 }
      );
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    /*
     * STEP 1:
     * Fetch the Razorpay payment first.
     * This lets us verify that the payment actually exists
     * and has been captured before requesting a refund.
     */
    const paymentResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(
        paymentId
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${auth}`,
        },
        cache: "no-store",
      }
    );

    const paymentResult = await readResponse(paymentResponse);
    const paymentData = paymentResult.data;

    if (!paymentResponse.ok) {
      console.error(
        "Razorpay payment fetch error:",
        paymentResponse.status,
        paymentResult.raw || paymentData
      );

      return NextResponse.json(
        {
          success: false,
          error: getRazorpayErrorMessage(paymentData),
          razorpay_status: paymentResponse.status,
          razorpay_response: paymentData,
        },
        { status: paymentResponse.status }
      );
    }

    const paymentStatus = String(
      paymentData?.status || ""
    ).toLowerCase();

    const captured = Boolean(paymentData?.captured);

    const refundStatus = String(
      paymentData?.refund_status || ""
    ).toLowerCase();

    const paymentAmountPaise = Number(
      paymentData?.amount || 0
    );

    const amountRefundedPaise = Number(
      paymentData?.amount_refunded || 0
    );

    /*
     * Razorpay only allows refunds for captured payments.
     */
    if (!captured || paymentStatus !== "captured") {
      if (
        paymentStatus === "refunded" ||
        refundStatus === "full"
      ) {
        return NextResponse.json(
          {
            success: false,
            already_refunded: true,
            error:
              "This payment has already been fully refunded in Razorpay.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: `This payment cannot be refunded because its Razorpay status is "${
            paymentStatus || "unknown"
          }". Only captured payments can be refunded.`,
          payment_status: paymentStatus,
          captured,
        },
        { status: 400 }
      );
    }

    /*
     * Calculate how much is still refundable.
     */
    const remainingPaise = Math.max(
      paymentAmountPaise - amountRefundedPaise,
      0
    );

    if (
      remainingPaise <= 0 ||
      refundStatus === "full"
    ) {
      return NextResponse.json(
        {
          success: false,
          already_refunded: true,
          error:
            "This payment has already been fully refunded in Razorpay.",
        },
        { status: 400 }
      );
    }

    /*
     * Build Razorpay refund request.
     *
     * If no amount is supplied, Razorpay receives a full refund request.
     * If the supplied amount equals the remaining amount, we also use
     * a full refund request.
     */
    const refundBody: {
      amount?: number;
    } = {};

    const hasRequestedAmount =
      requestedAmount !== undefined &&
      requestedAmount !== null &&
      String(requestedAmount).trim() !== "";

    if (hasRequestedAmount) {
      const amountInRupees = Number(requestedAmount);

      if (
        !Number.isFinite(amountInRupees) ||
        amountInRupees <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Refund amount must be greater than zero.",
          },
          { status: 400 }
        );
      }

      const requestedPaise = Math.round(
        amountInRupees * 100
      );

      if (requestedPaise > remainingPaise) {
        return NextResponse.json(
          {
            success: false,
            error: `Refund amount ₹${amountInRupees.toFixed(
              2
            )} is greater than the remaining refundable amount ₹${(
              remainingPaise / 100
            ).toFixed(2)}.`,
            requested_amount_paise: requestedPaise,
            remaining_amount_paise: remainingPaise,
          },
          { status: 400 }
        );
      }

      /*
       * For a partial refund we explicitly send amount.
       *
       * For a full refund we leave amount out so Razorpay
       * performs a complete refund.
       */
      if (requestedPaise < remainingPaise) {
        refundBody.amount = requestedPaise;
      }
    }

    /*
     * STEP 2:
     * Actually request the refund from Razorpay.
     */
    const razorpayResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(
        paymentId
      )}/refund`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify(refundBody),
      }
    );

    const refundResult = await readResponse(
      razorpayResponse
    );

    const refundData = refundResult.data;

    if (!razorpayResponse.ok) {
      console.error(
        "Razorpay refund API error:",
        razorpayResponse.status,
        refundResult.raw || refundData
      );

      /*
       * If Razorpay gives an empty/non-JSON response,
       * return a useful error instead of {}.
       */
      const fallbackError =
        refundResult.raw?.trim() ||
        "Razorpay rejected the refund request without providing a readable error.";

      return NextResponse.json(
        {
          success: false,
          error: getRazorpayErrorMessage(refundData) ===
            "Razorpay could not process this refund."
            ? fallbackError
            : getRazorpayErrorMessage(refundData),
          razorpay_status: razorpayResponse.status,
          razorpay_response: refundData,
        },
        { status: razorpayResponse.status }
      );
    }

    /*
     * Razorpay should return a refund object containing an ID.
     */
    if (!refundData?.id) {
      console.error(
        "Razorpay returned an unexpected refund response:",
        refundResult.raw || refundData
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Razorpay accepted the request but did not return a refund ID. Please check the Razorpay Dashboard before trying again.",
          razorpay_response: refundData,
        },
        { status: 502 }
      );
    }

    /*
     * SUCCESS
     */
    return NextResponse.json({
      success: true,
      refund_id: refundData.id,
      status: refundData.status || "pending",
      amount: refundData.amount,
      currency: refundData.currency,
    });
  } catch (error) {
    console.error("Razorpay refund server error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to process refund.",
      },
      { status: 500 }
    );
  }
}