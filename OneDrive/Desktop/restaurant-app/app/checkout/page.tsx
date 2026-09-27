"use client";

import { useEffect, useRef, useState } from "react";
import LocationMap from "@/components/LocationMap";
import { supabase } from "@/lib/supabase";

type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  handler: (response: RazorpaySuccessResponse) => void | Promise<void>;
  modal?: {
    ondismiss?: () => void;
  };
};

type RazorpayConstructor = new (options: RazorpayOptions) => {
  open: () => void;
};

declare global {
  interface Window {
    Razorpay: RazorpayConstructor;
  }
}

type CartItem = {
  id: number;
  name: string;
  price: number;
  emoji: string;
  category: string;
  quantity: number;
  image?: string;
};

type LocationSearchResult = {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
};

const RESTAURANT_LAT = 28.641936;
const RESTAURANT_LNG = 77.9556954;

const foodImages: Record<string, string> = {
  "Veg Momos": "/images/veg-momos.jpg",
  "Paneer Momos": "/images/paneer-momos.webp",
  "Chilli Potato": "/images/chilli-potato.jpg",
  "Veg Noodles": "/images/veg-noodles.webp",
  "Hakka Noodles": "/images/hakka-noodles.webp",
  "Fried Rice": "/images/fried-rice.jpg",
  "Paneer Fried Rice": "/images/paneer-fried-rice.jpg",
  "Chilli Paneer": "/images/chilli-paneer.jpg",
  "Veg Burger": "/images/veg-burger.jpeg",
  "Paneer Burger": "/images/paneer-burger.webp",
  "Veg Pizza": "/images/veg-pizza.jpg",
  "Paneer Pizza": "/images/paneer-pizza.jpg",
  "French Fries": "/images/french-fries.jpg",
  "Cold Drink": "/images/cold-drink.webp",
  "Veg Thali": "/images/veg-thali.jpg",
  "Paneer Thali": "/images/paneer-thali.jpg",
  "Veg Combo": "/images/veg-combo.jpg",
  "Gulab Jamun": "/images/gulab-jamun.jpg",
};

const getFoodImage = (name: string) => {
  return foodImages[name] || "";
};

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [distance, setDistance] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");

  const [customerLat, setCustomerLat] = useState<number | null>(null);
  const [customerLng, setCustomerLng] = useState<number | null>(null);
  const [locationConfirmed, setLocationConfirmed] = useState(false);

  const [locationSearch, setLocationSearch] = useState("");
  const [locationSearchLoading, setLocationSearchLoading] = useState(false);
  const [locationSearchResults, setLocationSearchResults] = useState<LocationSearchResult[]>([]);
  const [selectedLocationLabel, setSelectedLocationLabel] = useState("");

  const [orderMessage, setOrderMessage] = useState("");
  const [orderLoading, setOrderLoading] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");
  const [orderType, setOrderType] = useState<"asap" | "scheduled">("asap");
  const [scheduledFor, setScheduledFor] = useState("");

  // Coupon / Offer
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);


  useEffect(() => {
    const savedCart = localStorage.getItem("restaurant-cart");

    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);

        const cartWithImages = parsedCart.map(
          (item: CartItem) => ({
            ...item,
            image:
              item.image ||
              getFoodImage(item.name),
          })
        );

        setCart(cartWithImages);
      } catch {
        setCart([]);
      }
    }

    setLoaded(true);
  }, []);

  const subtotal = cart.reduce(
    (total, item) =>
      total + item.price * item.quantity,
    0
  );

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const earthRadius = 6371;

    const latDifference =
      ((lat2 - lat1) * Math.PI) / 180;
    const lonDifference =
      ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(latDifference / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(lonDifference / 2) ** 2;

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );

    return earthRadius * c;
  };

  const updateSelectedLocation = async (
    lat: number,
    lng: number,
    label?: string,
  ) => {
    setCustomerLat(lat);
    setCustomerLng(lng);
    setLocationConfirmed(false);

    const calculatedDistance = calculateDistance(
      RESTAURANT_LAT,
      RESTAURANT_LNG,
      lat,
      lng,
    );

    setDistance(calculatedDistance);

    if (label) {
      setAddress(label);
      setSelectedLocationLabel(label);
    }

    if (calculatedDistance <= 8) {
      setLocationMessage(
        `📍 Delivery location selected — ${calculatedDistance.toFixed(1)} km from the restaurant.`,
      );
    } else {
      setLocationMessage(
        `📍 This location is ${calculatedDistance.toFixed(1)} km away. Delivery is not available above 8 km.`,
      );
    }
  };

  const searchDeliveryLocation = async () => {
    const query = locationSearch.trim();

    if (!query) {
      setLocationMessage("Please enter an area, address, landmark or PIN code.");
      return;
    }

    setLocationSearchLoading(true);
    setLocationMessage("");
    setOrderMessage("");
    setLocationSearchResults([]);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=in&q=${encodeURIComponent(
          query,
        )}`,
        {
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Location search failed.");
      }

      const results = (await response.json()) as LocationSearchResult[];

      if (!results.length) {
        setLocationMessage(
          "No matching location found. Try a nearby landmark, locality or PIN code.",
        );
        return;
      }

      setLocationSearchResults(results);
      setLocationMessage("Select the exact delivery location from the results.");
    } catch (error) {
      console.error("Location search error:", error);
      setLocationMessage(
        "Unable to search this location right now. Please try again or use your current location.",
      );
    } finally {
      setLocationSearchLoading(false);
    }
  };

  const selectSearchResult = async (result: LocationSearchResult) => {
    const lat = Number(result.lat);
    const lng = Number(result.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setLocationMessage("This location could not be mapped. Please choose another result.");
      return;
    }

    setLocationSearchResults([]);
    setLocationSearch(result.display_name);
    await updateSelectedLocation(lat, lng, result.display_name);
  };

  const getMyLocation = () => {
    setLocationMessage("");
    setOrderMessage("");
    setLocationConfirmed(false);

    if (!navigator.geolocation) {
      setLocationMessage(
        "Location is not supported by your browser. You can search your delivery address instead.",
      );
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
              headers: {
                Accept: "application/json",
              },
            },
          );

          if (response.ok) {
            const result = await response.json();
            const label = result.display_name || "Current location";

            setLocationSearch(label);
            await updateSelectedLocation(lat, lng, label);
          } else {
            await updateSelectedLocation(lat, lng, "Current location");
          }
        } catch (error) {
          console.error("Reverse geocoding error:", error);
          await updateSelectedLocation(lat, lng, "Current location");
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        setLocationLoading(false);

        if (error.code === 1) {
          setLocationMessage(
            "Location permission was denied. You can search your delivery address instead.",
          );
        } else if (error.code === 2) {
          setLocationMessage(
            "Your current location could not be determined. Try searching the delivery address.",
          );
        } else {
          setLocationMessage(
            "Unable to get your current location. Try again or search the delivery address.",
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  const confirmLocation = () => {
    if (
      customerLat === null ||
      customerLng === null ||
      distance === null
    ) {
      setOrderMessage(
        "Please use My Location first."
      );
      return;
    }

    if (distance > 8) {
      setOrderMessage(
        "Sorry, delivery is not available to your location."
      );
      return;
    }

    setLocationConfirmed(true);
    setLocationMessage(
      "✅ Delivery location confirmed."
    );
    setOrderMessage("");
  };

  let deliveryCharge: number | null = null;

  if (distance !== null) {
    if (distance <= 2) {
      deliveryCharge = subtotal >= 200 ? 0 : 20;
    } else if (distance <= 5) {
      deliveryCharge = 50;
    } else if (distance <= 8) {
      deliveryCharge = 80;
    } else {
      deliveryCharge = -1;
    }
  }

  const totalBeforeDiscount =
    deliveryCharge !== null &&
    deliveryCharge >= 0
      ? subtotal + deliveryCharge
      : subtotal;

  const total = Math.max(
    totalBeforeDiscount - discountAmount,
    0
  );

  const calculateCouponDiscount = (coupon: any) => {
    const minimumOrder = Number(coupon.minimum_order_amount || 0);

    if (subtotal < minimumOrder) {
      return {
        valid: false,
        discount: 0,
        message: `This coupon requires a minimum order of ₹${minimumOrder.toFixed(0)}.`,
      };
    }

    let discount =
      coupon.discount_type === "percentage"
        ? (subtotal * Number(coupon.discount_value)) / 100
        : Number(coupon.discount_value);

    if (coupon.maximum_discount_amount !== null) {
      discount = Math.min(
        discount,
        Number(coupon.maximum_discount_amount)
      );
    }

    discount = Math.min(Math.max(discount, 0), subtotal);

    if (discount <= 0) {
      return {
        valid: false,
        discount: 0,
        message: "This coupon does not provide a valid discount.",
      };
    }

    return {
      valid: true,
      discount: Math.round(discount * 100) / 100,
      message: "",
    };
  };

  const applyCoupon = async (codeOverride?: string) => {
    const normalizedCode = (codeOverride ?? couponCode).trim().toUpperCase();
    setCouponMessage("");

    if (!normalizedCode) {
      setCouponMessage("Please enter a coupon code.");
      return;
    }

    setCouponLoading(true);

    try {
      // Coupon usage is tied to the logged-in customer.
      // Do not allow coupon validation while logged out, otherwise
      // the per-customer one-time-use rule cannot be determined.
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        setAppliedCoupon(null);
        setDiscountAmount(0);
        setCouponMessage(
          "Please login to your account before applying a coupon."
        );
        return;
      }

      const { data, error } = await supabase.rpc("validate_coupon", {
        p_code: normalizedCode,
        p_order_amount: subtotal,
      });

      if (error) {
        console.error("Coupon validation error:", error);
        setAppliedCoupon(null);
        setDiscountAmount(0);
        setCouponMessage("Unable to check this coupon. Please try again.");
        return;
      }

      const result = data?.[0];

      if (!result?.valid) {
        setAppliedCoupon(null);
        setDiscountAmount(0);
        setCouponMessage(
          result?.message || "Invalid or inactive coupon code."
        );
        return;
      }

      setAppliedCoupon({
        id: result.coupon_id,
        code: result.code,
        title: result.title,
        description: result.description,
        discount_type: result.discount_type,
        discount_value: Number(result.discount_value),
      });

      setDiscountAmount(Number(result.discount_amount || 0));
      setCouponCode(String(result.code).toUpperCase());
      setCouponMessage(
        `✅ ${result.title || result.code} applied — you saved ₹${Number(
          result.discount_amount || 0
        ).toFixed(0)}.`
      );
    } catch (error) {
      console.error("Coupon apply error:", error);
      setCouponMessage("Unable to apply coupon. Please try again.");
    } finally {
      setCouponLoading(false);
    }
  };

  // Automatically apply a coupon opened from the homepage offer card.
  // Example: /checkout?coupon=WELCOME50
  const autoCouponHandled = useRef(false);

  useEffect(() => {
    if (!loaded || subtotal <= 0 || autoCouponHandled.current) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const couponFromUrl = params.get("coupon")?.trim();

    autoCouponHandled.current = true;

    if (!couponFromUrl) {
      return;
    }

    const normalizedCoupon = couponFromUrl.toUpperCase();
    setCouponCode(normalizedCoupon);

    void applyCoupon(normalizedCoupon);

    // Remove the query parameter after reading it so refresh/back navigation
    // does not repeatedly try to apply the same coupon.
    window.history.replaceState({}, "", "/checkout");
  }, [loaded, subtotal]);

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCode("");
    setCouponMessage("");
  };

  const redeemCoupon = async () => {
    if (!appliedCoupon?.code) {
      return true;
    }

    const { data, error } = await supabase.rpc("redeem_coupon", {
      p_code: String(appliedCoupon.code),
    });

    if (error) {
      console.error("Coupon redemption error:", error);
      return false;
    }

    const result = data?.[0];

    if (!result?.success) {
      console.error(
        "Coupon redemption failed:",
        result?.message || "Coupon is no longer available."
      );
      return false;
    }

    return true;
  };

  const loadRazorpayScript = () =>
    new Promise<boolean>((resolve) => {
      if (typeof window.Razorpay === "function") {
        resolve(true);
        return;
      }

      const existingScript = document.getElementById(
        "razorpay-checkout-script"
      );

      if (existingScript) {
        existingScript.remove();
      }

      const script = document.createElement("script");
      script.id = "razorpay-checkout-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;

      script.onload = () => {
        resolve(typeof window.Razorpay === "function");
      };

      script.onerror = () => {
        resolve(false);
      };

      document.body.appendChild(script);
    });

  const isValidPhone = (value: string) => {
    const cleaned = value.replace(/[\s-]/g, "");
    return /^(?:\+91)?[6-9]\d{9}$/.test(cleaned);
  };

  const getMinimumScheduleDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    now.setSeconds(0, 0);

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const validateSchedule = () => {
    if (orderType !== "scheduled") return true;

    if (!scheduledFor) {
      setOrderMessage("Please select a date and time for your scheduled order.");
      return false;
    }

    if (
      new Date(scheduledFor).getTime() <
      new Date(getMinimumScheduleDateTime()).getTime()
    ) {
      setOrderMessage("Please choose a schedule at least 30 minutes from now.");
      return false;
    }

    return true;
  };

  const placeOrder = async () => {
    setOrderMessage("");

    if (orderLoading || paymentProcessing) {
      return;
    }

    if (!validateSchedule()) {
      return;
    }

    if (!isValidPhone(phone)) {
      setOrderMessage("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (paymentMethod === "online") {
      if (!name.trim() || !phone.trim() || !address.trim()) {
        setOrderMessage("Please fill all delivery details.");
        return;
      }

      if (cart.length === 0) {
        setOrderMessage("Your cart is empty.");
        return;
      }

      if (distance === null) {
        setOrderMessage(
          "Please select your delivery location first."
        );
        return;
      }

      if (customerLat === null || customerLng === null) {
        setOrderMessage("Please select your delivery location first.");
        return;
      }

      if (!locationConfirmed) {
        setOrderMessage(
          "Please confirm your delivery location before placing the order."
        );
        return;
      }

      if (deliveryCharge === null || deliveryCharge === -1) {
        setOrderMessage(
          "Sorry, delivery is not available to your location."
        );
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setOrderMessage(
          "Please login to your account before placing an order."
        );
        return;
      }

      setOrderLoading(true);

      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        setOrderLoading(false);
        setOrderMessage(
          "Unable to load Razorpay. Please check your internet connection and try again."
        );
        return;
      }

      try {
        const razorpayOrderResponse = await fetch(
          "/api/razorpay/order",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ amount: total }),
          }
        );

        const razorpayOrderData =
          await razorpayOrderResponse.json();

        if (
          !razorpayOrderResponse.ok ||
          !razorpayOrderData.id ||
          !razorpayOrderData.key_id
        ) {
          throw new Error(
            razorpayOrderData.error ||
              "Unable to create Razorpay order"
          );
        }

        const newOrderId = `YSR-${Date.now()
          .toString()
          .slice(-8)}`;

        const options: RazorpayOptions = {
          key: razorpayOrderData.key_id,
          amount: razorpayOrderData.amount,
          currency: razorpayOrderData.currency,
          name: "YASH SAINI RESTAURANT",
          description: `Order ${newOrderId}`,
          order_id: razorpayOrderData.id,
          prefill: {
            name: name.trim(),
            contact: phone.trim(),
          },
          theme: {
            color: "#f97316",
          },
          handler: async (response) => {
            setPaymentProcessing(true);
            setOrderMessage(
              "Payment received. Verifying your payment..."
            );

            try {
              const verifyResponse = await fetch(
                "/api/razorpay/verify",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(response),
                }
              );

              const verifyData = await verifyResponse.json();

              if (
                !verifyResponse.ok ||
                !verifyData.verified
              ) {
                throw new Error(
                  verifyData.error ||
                    "Payment verification failed"
                );
              }

              const { error } = await supabase
                .from("orders")
                .insert({
                  user_id: user.id,
                  order_id: newOrderId,
                  customer_name: name.trim(),
                  customer_phone: phone.trim(),
                  delivery_address: address.trim(),
                  customer_lat: customerLat,
                  customer_lng: customerLng,
                  distance_km: distance,
                  subtotal,
                  delivery_charge: deliveryCharge,
                  total,
                  coupon_code: appliedCoupon?.code || null,
                  discount_amount: discountAmount,
                  status: "pending",
                  payment_method: "online",
                  razorpay_payment_id: response.razorpay_payment_id,
                  refund_status: null,
                  items: cart,
                });

              if (error) {
                console.error(
                  "Online order insert error:",
                  JSON.stringify(error, null, 2),
                  error
                );

                let recoveryMessage =
                  "The order could not be saved. We are trying to refund your payment automatically.";

                try {
                  const refundResponse = await fetch(
                    "/api/razorpay/refund",
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        payment_id: response.razorpay_payment_id,
                      }),
                    }
                  );

                  const refundData = await refundResponse.json();

                  if (refundResponse.ok) {
                    recoveryMessage =
                      "The order could not be saved. Your payment refund has been requested successfully.";
                  } else {
                    console.error(
                      "Automatic refund request failed:",
                      refundData
                    );
                    recoveryMessage =
                      "The order could not be saved and the automatic refund request failed. Please contact support with your Payment ID.";
                  }
                } catch (refundError) {
                  console.error(
                    "Automatic refund request error:",
                    refundError
                  );
                  recoveryMessage =
                    "The order could not be saved. Please contact support with your Payment ID for a refund.";
                }

                setOrderMessage(
                  `${recoveryMessage} Payment ID: ${response.razorpay_payment_id}`
                );
                setOrderLoading(false);
                setPaymentProcessing(false);
                return;
              }

              await redeemCoupon();


              localStorage.setItem("last-order-id", newOrderId);
              localStorage.removeItem("restaurant-cart");
              setOrderLoading(false);
              setPaymentProcessing(false);
              window.location.href = "/order-tracking";
            } catch (error) {
              console.error("Razorpay verification error:", error);
              setOrderLoading(false);
              setPaymentProcessing(false);
              setOrderMessage(
                "Payment verification failed. Please contact support before trying again."
              );
            }
          },
          modal: {
            ondismiss: () => {
              setOrderLoading(false);
              setOrderMessage(
                "Payment was cancelled. Your order has not been placed."
              );
            },
          },
        };

        if (typeof window.Razorpay !== "function") {
          throw new Error("Razorpay checkout library is not available");
        }

        const razorpay = new window.Razorpay(options);
        razorpay.open();
      } catch (error) {
        console.error("Razorpay checkout error:", error);
        setOrderLoading(false);
        setPaymentProcessing(false);
        setOrderMessage(
          "Unable to start online payment. Please try again."
        );
      }

      return;
    }

    if (
      !name.trim() ||
      !phone.trim() ||
      !address.trim()
    ) {
      setOrderMessage(
        "Please fill all delivery details."
      );
      return;
    }

    if (cart.length === 0) {
      setOrderMessage(
        "Your cart is empty."
      );
      return;
    }

    if (distance === null) {
      setOrderMessage(
        "Please select your delivery location first."
      );
      return;
    }

    if (
      customerLat === null ||
      customerLng === null
    ) {
      setOrderMessage(
        "Please select your delivery location first."
      );
      return;
    }

    if (!locationConfirmed) {
      setOrderMessage(
        "Please confirm your delivery location before placing the order."
      );
      return;
    }

    if (
      deliveryCharge === null ||
      deliveryCharge === -1
    ) {
      setOrderMessage(
        "Sorry, delivery is not available to your location."
      );
      return;
    }

    const newOrderId = `YSR-${Date.now()
      .toString()
      .slice(-8)}`;

    setOrderLoading(true);

    // Make sure this order is linked to the logged-in customer.
    // This is required so the customer's RLS policy can load the order
    // on the order-tracking page.
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setOrderLoading(false);
      setOrderMessage(
        "Please login to your account before placing an order."
      );
      return;
    }

    const { error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        order_id: newOrderId,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        delivery_address: address.trim(),
        customer_lat: customerLat,
        customer_lng: customerLng,
        distance_km: distance,
        subtotal,
        delivery_charge: deliveryCharge,
        total,
        coupon_code: appliedCoupon?.code || null,
        discount_amount: discountAmount,
        status: "pending",
        payment_method: paymentMethod,
        order_type: orderType,
        scheduled_for:
          orderType === "scheduled"
            ? new Date(scheduledFor).toISOString()
            : null,
        items: cart,
      });

    if (error) {
      console.error(
        "Order insert error:",
        error
      );

      setOrderLoading(false);
      setOrderMessage(
        "Failed to place order. Please try again."
      );
      return;
    }

    await redeemCoupon();

    localStorage.setItem(
      "last-order-id",
      newOrderId
    );

    localStorage.removeItem(
      "restaurant-cart"
    );

    setOrderLoading(false);

    window.location.href =
      "/order-tracking";
  };

  if (!loaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f0d0b] text-white">
        <p className="text-white/60">
          Loading checkout...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f0d0b] text-white">
      {/* NAVBAR */}
      <nav className="border-b border-white/10 bg-[#0f0d0b] px-4 py-4 md:px-12">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <a
            href="/"
            className="text-2xl font-black text-orange-500"
          >
            YASH SAINI RESTAURANT
          </a>

          <a
            href="/menu"
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/15"
          >
            ← Back to Menu
          </a>
        </div>
      </nav>

      {/* CHECKOUT */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:px-12 md:py-16">
        <div className="mb-10">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-500">
            Almost there
          </p>

          <h1 className="mt-2 text-4xl font-black md:text-5xl">
            Checkout
          </h1>

          <p className="mt-3 text-white/50">
            Enter your details, find your location, and confirm delivery.
          </p>
        </div>

        {cart.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center">
            <div className="text-6xl">
              🛒
            </div>

            <h2 className="mt-5 text-2xl font-black">
              Your cart is empty
            </h2>

            <p className="mt-2 text-white/50">
              Add some delicious food before checking out.
            </p>

            <a
              href="/menu"
              className="mt-6 inline-block rounded-xl bg-orange-500 px-6 py-3 font-bold text-black transition hover:bg-orange-400"
            >
              Browse Menu
            </a>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
            {/* CUSTOMER DETAILS */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
              <h2 className="text-2xl font-black">
                Delivery Details
              </h2>

              <div className="mt-6 space-y-5">
                {/* NAME */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-white/70">
                    Full Name
                  </label>

                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value)
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none placeholder:text-white/30 transition focus:border-orange-500"
                  />
                </div>

                {/* PHONE */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-white/70">
                    Phone Number
                  </label>

                  <input
                    type="tel"
                    placeholder="Enter your phone number"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value)
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none placeholder:text-white/30 transition focus:border-orange-500"
                  />
                </div>

                {/* ADDRESS */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-white/70">
                    Delivery Address
                  </label>

                  <textarea
                    placeholder="House no., street, area..."
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      setLocationConfirmed(false);
                    }}
                    rows={5}
                    className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none placeholder:text-white/30 transition focus:border-orange-500"
                  />
                </div>

                {/* ORDER TIMING */}
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <h3 className="font-bold">Order Timing</h3>
                  <p className="mt-1 text-sm text-white/50">
                    Choose when you want us to prepare your order.
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setOrderType("asap");
                        setScheduledFor("");
                        setOrderMessage("");
                      }}
                      className={`rounded-2xl border p-4 text-left transition ${
                        orderType === "asap"
                          ? "border-orange-500 bg-orange-500/10"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">⚡</span>
                        <div>
                          <p className="font-bold">ASAP</p>
                          <p className="mt-1 text-xs text-white/45">
                            Prepare and deliver as soon as possible.
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOrderType("scheduled");
                        setOrderMessage("");
                        if (!scheduledFor) {
                          setScheduledFor(getMinimumScheduleDateTime());
                        }
                      }}
                      className={`rounded-2xl border p-4 text-left transition ${
                        orderType === "scheduled"
                          ? "border-orange-500 bg-orange-500/10"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🕐</span>
                        <div>
                          <p className="font-bold">Schedule Later</p>
                          <p className="mt-1 text-xs text-white/45">
                            Choose a future date and time.
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>

                  {orderType === "scheduled" && (
                    <div className="mt-4">
                      <label className="mb-2 block text-sm font-semibold text-white/70">
                        Scheduled Date &amp; Time
                      </label>
                      <input
                        type="datetime-local"
                        min={getMinimumScheduleDateTime()}
                        value={scheduledFor}
                        onChange={(e) => {
                          setScheduledFor(e.target.value);
                          setOrderMessage("");
                        }}
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-orange-500"
                      />
                      <p className="mt-2 text-xs text-white/40">
                        Schedule at least 30 minutes from now.
                      </p>
                    </div>
                  )}
                </div>

                {/* PAYMENT METHOD */}
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div>
                    <h3 className="font-bold">Payment Method</h3>
                    <p className="mt-1 text-sm text-white/50">
                      Choose how you want to pay for your order.
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cod")}
                      className={`rounded-2xl border p-4 text-left transition ${
                        paymentMethod === "cod"
                          ? "border-orange-500 bg-orange-500/10"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">💵</span>
                        <div>
                          <p className="font-bold">Cash on Delivery</p>
                          <p className="mt-1 text-xs text-white/45">
                            Pay when your order arrives.
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("online")}
                      className={`rounded-2xl border p-4 text-left transition ${
                        paymentMethod === "online"
                          ? "border-orange-500 bg-orange-500/10"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">💳</span>
                        <div>
                          <p className="font-bold">Online Payment</p>
                          <p className="mt-1 text-xs text-white/45">
                            UPI, Cards &amp; more — secure Razorpay checkout.
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>

                  {paymentMethod === "online" && (
                    <div className="mt-4 rounded-xl border border-orange-500/20 bg-orange-500/10 p-4 text-sm text-orange-300">
                      Your payment is verified securely before the order is confirmed.
                    </div>
                  )}
                </div>

                {/* LOCATION */}
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">📍</span>

                    <div className="flex-1">
                      <h3 className="font-bold">Where should we deliver?</h3>

                      <p className="mt-1 text-sm text-white/50">
                        Search the delivery address or use the customer&apos;s
                        current GPS location. Your phone&apos;s location is
                        only used when you choose &quot;Use Current Location&quot;.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <label className="mb-2 block text-sm font-semibold text-white/70">
                      Search delivery location
                    </label>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={locationSearch}
                        onChange={(e) => {
                          setLocationSearch(e.target.value);
                          setLocationSearchResults([]);
                          setLocationMessage("");
                          setOrderMessage("");
                          setLocationConfirmed(false);
                          setSelectedLocationLabel("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void searchDeliveryLocation();
                          }
                        }}
                        placeholder="Area, landmark, street or PIN code"
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none placeholder:text-white/30 transition focus:border-orange-500"
                      />

                      <button
                        type="button"
                        onClick={() => void searchDeliveryLocation()}
                        disabled={locationSearchLoading}
                        className="rounded-xl bg-white px-5 py-3 font-bold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {locationSearchLoading ? "Searching..." : "🔎 Search"}
                      </button>
                    </div>

                    {locationSearchResults.length > 0 && (
                      <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[#15120f]">
                        {locationSearchResults.map((result) => (
                          <button
                            key={result.place_id}
                            type="button"
                            onClick={() => void selectSearchResult(result)}
                            className="w-full border-b border-white/10 px-4 py-3 text-left transition last:border-b-0 hover:bg-white/5"
                          >
                            <p className="text-sm font-semibold text-white">
                              📍 {result.display_name}
                            </p>
                            <p className="mt-1 text-xs text-white/40">
                              Tap to use this exact map point
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={getMyLocation}
                      disabled={locationLoading}
                      className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 font-bold text-orange-300 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {locationLoading
                        ? "📍 Finding current location..."
                        : "📍 Use Current Location"}
                    </button>

                    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/45">
                      <span className="font-semibold text-white/70">
                        Ordering for someone else?
                      </span>
                      <br />
                      Search their delivery address instead of using your GPS.
                    </div>
                  </div>

                  {selectedLocationLabel && (
                    <div className="mt-4 rounded-xl border border-green-500/20 bg-green-500/10 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-green-300">
                        Delivery destination selected
                      </p>
                      <p className="mt-1 text-sm leading-6 text-white/80">
                        {selectedLocationLabel}
                      </p>
                    </div>
                  )}

                  {locationMessage && (
                    <div
                      className={`mt-4 rounded-xl p-4 text-sm ${
                        distance !== null && distance <= 8
                          ? "border border-green-500/20 bg-green-500/10 text-green-300"
                          : distance !== null && distance > 8
                          ? "border border-red-500/20 bg-red-500/10 text-red-300"
                          : "border border-white/10 bg-white/5 text-white/60"
                      }`}
                    >
                      {locationMessage}
                    </div>
                  )}

                  {customerLat !== null && customerLng !== null && (
                    <>
                      <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
                        <LocationMap
                          customerLat={customerLat}
                          customerLng={customerLng}
                        />
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-white/5 p-4">
                          <span className="text-sm text-white/50">
                            Distance from restaurant
                          </span>
                          <p className="mt-1 font-black text-orange-500">
                            {distance !== null
                              ? `${distance.toFixed(1)} km`
                              : "—"}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white/5 p-4">
                          <span className="text-sm text-white/50">
                            GPS destination
                          </span>
                          <p className="mt-1 truncate font-mono text-xs text-white/60">
                            {customerLat.toFixed(6)}, {customerLng.toFixed(6)}
                          </p>
                        </div>
                      </div>

                      {distance !== null && distance <= 8 && (
                        <button
                          type="button"
                          onClick={confirmLocation}
                          className={`mt-4 w-full rounded-xl px-5 py-3 font-bold transition ${
                            locationConfirmed
                              ? "border border-green-500/30 bg-green-500/10 text-green-300"
                              : "bg-white text-black hover:bg-white/90"
                          }`}
                        >
                          {locationConfirmed
                            ? "✅ Delivery Location Confirmed"
                            : "📍 Confirm Delivery Location"}
                        </button>
                      )}

                      {distance !== null && distance > 8 && (
                        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                          This delivery destination is outside the 8 km delivery
                          limit.
                        </div>
                      )}
                    </>
                  )}

                  <p className="mt-4 text-xs leading-5 text-white/35">
                    Your selected GPS coordinates are saved with the order.
                    This means the delivery partner can navigate to the
                    selected destination even if you are ordering from another
                    city.
                  </p>
                </div>
              </div>

              {orderMessage && (
                <div className="mt-6 rounded-xl border border-orange-500/20 bg-orange-500/10 p-4 text-sm text-orange-300">
                  {orderMessage}
                </div>
              )}

              <button
                onClick={placeOrder}
                disabled={
                  orderLoading ||
                  (distance !== null &&
                    deliveryCharge === -1)
                }
                className="mt-8 w-full rounded-2xl bg-orange-500 px-6 py-4 font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {orderLoading
                  ? paymentProcessing
                    ? "Processing Payment..."
                    : "Placing Order..."
                  : `Place Order • ₹${total}`}
              </button>
            </div>

            {/* ORDER SUMMARY */}
            <div className="h-fit rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
              <h2 className="text-2xl font-black">
                Your Order
              </h2>

              <div className="mt-6 space-y-4">
                {cart.map((item) => {
                  const image =
                    item.image ||
                    getFoodImage(item.name);

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3"
                    >
                      {/* REAL FOOD IMAGE */}
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/5">
                        {image ? (
                          <img
                            src={image}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-2xl">
                            {item.emoji}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-bold">
                          {item.name}
                        </h3>

                        <p className="text-sm text-white/40">
                          ₹{item.price} ×{" "}
                          {item.quantity}
                        </p>
                      </div>

                      <span className="font-bold">
                        ₹
                        {item.price *
                          item.quantity}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="my-6 border-t border-white/10" />

              {/* COUPON / OFFERS */}
               <div className="mb-6 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4">
                 <div className="flex items-center gap-2">
                   <span className="text-xl">🎟️</span>
                   <div>
                     <h3 className="font-bold">Coupon & Offers</h3>
                     <p className="text-xs text-white/45">
                       Apply a valid coupon to save on your order.
                     </p>
                   </div>
                 </div>

                 {appliedCoupon ? (
                   <div className="mt-4 rounded-xl border border-green-500/20 bg-green-500/10 p-3">
                     <div className="flex items-start justify-between gap-3">
                       <div className="min-w-0">
                         <p className="font-black text-green-300">
                           {String(appliedCoupon.code).toUpperCase()}
                         </p>
                         <p className="mt-1 text-xs text-white/60">
                           {appliedCoupon.title}
                         </p>
                         <p className="mt-2 text-sm font-bold text-green-300">
                           You save ₹{discountAmount.toFixed(0)}
                         </p>
                       </div>
                       <button
                         type="button"
                         onClick={removeCoupon}
                         className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-white/60 transition hover:bg-white/10 hover:text-white"
                       >
                         Remove
                       </button>
                     </div>
                   </div>
                 ) : (
                   <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                     <input
                       type="text"
                       value={couponCode}
                       onChange={(e) => {
                         setCouponCode(e.target.value.toUpperCase());
                         setCouponMessage("");
                       }}
                       onKeyDown={(e) => {
                         if (e.key === "Enter") {
                           e.preventDefault();
                           applyCoupon();
                         }
                       }}
                       placeholder="Enter coupon code"
                       className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold uppercase outline-none placeholder:normal-case placeholder:font-normal placeholder:text-white/30 focus:border-orange-500"
                     />
                     <button
                       type="button"
                       onClick={() => applyCoupon()}
                       disabled={couponLoading}
                       className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                     >
                       {couponLoading ? "Checking..." : "Apply"}
                     </button>
                   </div>
                 )}

                 {couponMessage && (
                   <p
                     className={`mt-3 text-xs font-semibold ${
                       appliedCoupon ? "text-green-300" : "text-red-300"
                     }`}
                   >
                     {couponMessage}
                   </p>
                 )}
               </div>

               <div className="space-y-3 text-sm">
                <div className="flex justify-between text-white/60">
                  <span>Subtotal</span>
                  <span>
                    ₹{subtotal}
                  </span>
                </div>

                                 {discountAmount > 0 && (
                   <div className="flex justify-between font-semibold text-green-400">
                     <span>
                       Discount
                       {appliedCoupon?.code
                         ? ` (${String(appliedCoupon.code).toUpperCase()})`
                         : ""}
                     </span>
                     <span>-₹{discountAmount.toFixed(0)}</span>
                   </div>
                 )}

<div className="flex justify-between text-white/60">
                  <span>Delivery</span>

                  <span>
                    {deliveryCharge === null
                      ? "Check location"
                      : deliveryCharge === -1
                      ? "Unavailable"
                      : deliveryCharge === 0
                      ? "FREE"
                      : `₹${deliveryCharge}`}
                  </span>
                </div>
              </div>

              <div className="my-6 border-t border-white/10" />

              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">
                  Total
                </span>

                <span className="text-2xl font-black text-orange-500">
                  ₹{total}
                </span>
              </div>

              <div className="mt-6 rounded-2xl bg-white/5 p-4">
                <p className="text-sm font-bold">
                  🚴 Delivery Charges
                </p>

                <div className="mt-3 space-y-1 text-xs text-white/50">
                  <p>
                    0–2 km: FREE on orders ₹200+
                  </p>
                  <p>
                    0–2 km: ₹20 below ₹200
                  </p>
                  <p>
                    2–5 km: ₹50
                  </p>
                  <p>
                    5–8 km: ₹80
                  </p>
                  <p>
                    Above 8 km: Not available
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}