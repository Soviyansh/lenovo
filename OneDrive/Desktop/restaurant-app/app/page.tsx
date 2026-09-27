"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import NotificationBell from "@/components/NotificationBell";

type MenuItem = {
  id: number;
  name: string;
  description?: string;
  price: number;
  emoji: string;
  category: string;
  image?: string;
};
const categories = [
  { name: "Chinese", image: "/images/chilli-paneer.jpg" },
  { name: "Noodles", image: "/images/hakka-noodles.webp" },
  { name: "Momos", image: "/images/veg-momos.jpg" },
  { name: "Burgers", image: "/images/veg-burger.jpeg" },
  { name: "Pizza", image: "/images/veg-pizza.jpg" },
  { name: "Drinks", image: "/images/cold-drink.webp" },
];

const bestsellers: MenuItem[] = [
  {
    id: 1,
    name: "Veg Noodles",
    description: "Fresh noodles tossed with vegetables and Chinese spices.",
    price: 100,
    emoji: "🍜",
    category: "Noodles",
    image: "/images/veg-noodles.webp",
  },
  {
    id: 3,
    name: "Veg Momos",
    description: "Soft steamed momos filled with delicious seasoned veggies.",
    price: 80,
    emoji: "🥟",
    category: "Momos",
    image: "/images/veg-momos.jpg",
  },
  {
    id: 9,
    name: "Veg Burger",
    description: "Crispy veg patty with fresh veggies and creamy sauce.",
    price: 100,
    emoji: "🍔",
    category: "Burgers",
    image: "/images/veg-burger.jpeg",
  },
];

const popularDishes: MenuItem[] = [
  { id: 5, name: "Chilli Potato", price: 120, emoji: "🥔", category: "Chinese", image: "/images/chilli-potato.jpg" },
  { id: 2, name: "Hakka Noodles", price: 120, emoji: "🍜", category: "Noodles", image: "/images/hakka-noodles.webp" },
  { id: 7, name: "Paneer Momos", price: 100, emoji: "🥟", category: "Momos", image: "/images/paneer-momos.webp" },
  { id: 6, name: "Fried Rice", price: 100, emoji: "🍚", category: "Rice", image: "/images/fried-rice.jpg" },
];

const combos = [
  {
    id: 101,
    name: "Momo Lover Combo",
    description: "Veg Momos + French Fries + Cold Drink",
    price: 199,
    oldPrice: 240,
    emoji: "🥟",
    category: "Combos",
    image: "/images/veg-combo.jpg",
  },
  {
    id: 102,
    name: "Chinese Feast",
    description: "Chowmein + Fried Rice + Spring Roll",
    price: 299,
    oldPrice: 350,
    emoji: "🥡",
    category: "Combos",
    image: "/images/veg-combo.jpg",
  },
];

const offers = [
  {
    title: "FREE COKE",
    subtitle: "Order 2 Burgers + 1 Pizza + 1 French Fries and get 1 Coke FREE.",
    badge: "MEGA COMBO OFFER",
    accent: "2 BURGERS + 1 PIZZA + FRIES",
    image: "/images/veg-burger.jpeg",
    gift: "🥤",
  },
  {
    title: "1 PIZZA FREE",
    subtitle: "Order 5 pizzas and get 1 extra pizza FREE.",
    badge: "PIZZA LOVERS",
    accent: "BUY 5 • GET 1 FREE",
    image: "/images/paneer-pizza.jpg",
    gift: "🍕",
  },
  {
    title: "FREE COLD COFFEE",
    subtitle: "Place an order above ₹399 and get 1 Cold Coffee FREE.",
    badge: "₹399+ SPECIAL",
    accent: "FREE ON ₹399+",
    image: "/images/cold-drink.webp",
    gift: "☕",
  },
];

const reviews = [
  {
    name: "Rahul",
    review:
      "Amazing taste and really good quantity. One of my favourite places now!",
    rating: 5,
  },
  {
    name: "Priya",
    review: "Food was fresh, hot and delivered on time. Loved the momos!",
    rating: 5,
  },
  {
    name: "Aman",
    review: "Great food at reasonable prices. Definitely ordering again.",
    rating: 5,
  },
];

type CartItem = MenuItem & {
  quantity: number;
};

type ActiveCoupon = {
  id: number;
  code: string;
  title: string;
  description?: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  minimum_order_amount: number;
  maximum_discount_amount?: number | null;
  usage_limit?: number | null;
  used_count: number;
  starts_at?: string | null;
  expires_at?: string | null;
};

export default function Home() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartCount, setCartCount] = useState(0);

  // Load existing cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem("restaurant-cart");

    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);

        if (Array.isArray(parsedCart)) {
          setCart(parsedCart);
        }
      } catch {
        localStorage.removeItem("restaurant-cart");
      }
    }
  }, []);

  // Keep cart count updated
  useEffect(() => {
    const count = cart.reduce(
      (total, item) => total + item.quantity,
      0
    );

    setCartCount(count);
  }, [cart]);

  const addToCart = (item: MenuItem) => {
    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (cartItem) => cartItem.id === item.id
      );

      let updatedCart: CartItem[];

      if (existingItem) {
        updatedCart = currentCart.map((cartItem) =>
          cartItem.id === item.id
            ? {
                ...cartItem,
                quantity: cartItem.quantity + 1,
              }
            : cartItem
        );
      } else {
        updatedCart = [
          ...currentCart,
          {
            ...item,
            quantity: 1,
          },
        ];
      }

      localStorage.setItem(
        "restaurant-cart",
        JSON.stringify(updatedCart)
      );

      return updatedCart;
    });
  };

  const addComboToCart = (combo: (typeof combos)[number]) => {
    const comboAsMenuItem: MenuItem = {
      id: combo.id,
      name: combo.name,
      price: combo.price,
      emoji: combo.emoji,
      category: combo.category,
    };

    addToCart(comboAsMenuItem);
  };

  const increaseQuantity = (id: number) => {
    setCart((currentCart) => {
      const updatedCart = currentCart.map((item) =>
        item.id === id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );

      localStorage.setItem("restaurant-cart", JSON.stringify(updatedCart));
      return updatedCart;
    });
  };

  const decreaseQuantity = (id: number) => {
    setCart((currentCart) => {
      const updatedCart = currentCart
        .map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0);

      localStorage.setItem("restaurant-cart", JSON.stringify(updatedCart));
      return updatedCart;
    });
  };

  const removeFromCart = (id: number) => {
    setCart((currentCart) => {
      const updatedCart = currentCart.filter((item) => item.id !== id);
      localStorage.setItem("restaurant-cart", JSON.stringify(updatedCart));
      return updatedCart;
    });
  };

  const subtotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [activeCoupons, setActiveCoupons] = useState<ActiveCoupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);

  // Load currently active coupons for customers.
  useEffect(() => {
    let mounted = true;

    const loadActiveCoupons = async () => {
      setCouponsLoading(true);

      const { data, error } = await supabase.rpc("get_active_coupons");

      if (!mounted) return;

      if (error) {
        console.error("Active coupons error:", error);
        setActiveCoupons([]);
      } else {
        setActiveCoupons(
          (data || []).map((coupon: any) => ({
            ...coupon,
            discount_value: Number(coupon.discount_value || 0),
            minimum_order_amount: Number(coupon.minimum_order_amount || 0),
            maximum_discount_amount:
              coupon.maximum_discount_amount === null
                ? null
                : Number(coupon.maximum_discount_amount),
            used_count: Number(coupon.used_count || 0),
          }))
        );
      }

      setCouponsLoading(false);
    };

    loadActiveCoupons();

    return () => {
      mounted = false;
    };
  }, []);

  const copyCouponCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCoupon(code);

      window.setTimeout(() => {
        setCopiedCoupon((current) => (current === code ? null : current));
      }, 1800);
    } catch {
      setCopiedCoupon(null);
    }
  };

  // Keep the Account button synced with Supabase login/logout
  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (mounted) {
        setUser(data.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0f0d0b] text-white">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0f0d0b]/95 backdrop-blur-md">
        <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 md:px-8">
          <div>
            <h1 className="text-lg font-black tracking-tight sm:text-2xl">
              YASH <span className="text-orange-500">SAINI</span>
            </h1>
            <p className="text-[9px] text-white/50 sm:text-xs">
              Fresh • Fast • Delicious
            </p>
          </div>

          <div className="hidden items-center gap-7 md:flex">
            <a
              href="#home"
              className="text-sm text-white/80 hover:text-orange-500"
            >
              Home
            </a>
            <a
              href="/menu"
              className="text-sm text-white/80 hover:text-orange-500"
            >
              Menu
            </a>
            <a
              href="#offers"
              className="text-sm text-white/80 hover:text-orange-500"
            >
              Offers
            </a>
            <a
              href="#about"
              className="text-sm text-white/80 hover:text-orange-500"
            >
              About
            </a>
            <a
              href="#contact"
              className="text-sm text-white/80 hover:text-orange-500"
            >
              Contact
            </a>

            {user && <NotificationBell />}

            <a
              href={user ? "/profile" : "/login"}
              className="rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-400 transition hover:bg-orange-500 hover:text-white"
            >
              {user ? "👤 Profile" : "👤 Login"}
            </a>
          </div>

          {/* MOBILE MENU BUTTON */}
          <button
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xl leading-none md:hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>

          {/* REAL CART BUTTON */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-400 transition hover:bg-orange-500 hover:text-white"
          >
            🛒 Cart
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </button>

          {mobileMenuOpen && (
            <div className="absolute left-0 right-0 top-full border-t border-white/10 bg-[#12100e] px-3 py-3 shadow-2xl shadow-black/30 md:hidden">
              <div className="mx-auto flex max-h-[calc(100vh-72px)] flex-col gap-1.5 overflow-y-auto sm:gap-2">
                <a
                  href="#home"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/5 hover:text-orange-500"
                >
                  Home
                </a>
                <a
                  href="/menu"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/5 hover:text-orange-500"
                >
                  Menu
                </a>
                <a
                  href="#offers"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/5 hover:text-orange-500"
                >
                  Offers
                </a>
                <a
                  href="#about"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/5 hover:text-orange-500"
                >
                  About
                </a>
                <a
                  href="#contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/5 hover:text-orange-500"
                >
                  Contact
                </a>

                {user && (
                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <NotificationBell />
                    <span className="text-sm font-semibold text-white/70">
                      Notifications
                    </span>
                  </div>
                )}

                <a
                  href={user ? "/profile" : "/login"}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-sm font-bold text-orange-400 hover:bg-orange-500/20"
                >
                  {user ? "👤 Profile" : "👤 Login"}
                </a>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section id="home" className="relative overflow-hidden">
        <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-orange-500/10 blur-3xl" />

        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 sm:gap-10 sm:py-16 md:grid-cols-2 md:px-8 md:py-24">
          <div className="relative">
            <div className="mb-4 inline-flex max-w-full rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-xs text-orange-400 sm:mb-5 sm:px-4 sm:text-sm">
              🔥 Delicious food, delivered fast
            </div>

            <h2 className="max-w-2xl text-4xl font-black leading-[1.02] tracking-tight sm:text-5xl md:text-7xl">
              Good food.
              <br />
              <span className="text-orange-500">Good mood.</span>
            </h2>

            <p className="mt-5 max-w-xl text-sm leading-6 text-white/60 sm:mt-6 sm:text-lg sm:leading-7">
              Enjoy delicious Chinese and fast food made fresh with quality
              ingredients and delivered straight to your doorstep.
            </p>

            <div className="mt-7 flex w-full flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
              <a
                href="#menu"
                className="w-full rounded-full bg-orange-500 px-6 py-3.5 text-center font-bold text-white transition hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/20 sm:w-auto sm:px-7"
              >
                Order Now →
              </a>

              <a
                href="#offers"
                className="w-full rounded-full border border-white/10 bg-white/5 px-6 py-3.5 text-center font-semibold text-white transition hover:border-orange-500/30 hover:bg-white/10 sm:w-auto sm:px-7"
              >
                View Offers
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-6 sm:mt-10 sm:gap-8">
              <div>
                <p className="text-2xl font-black">4.8★</p>
                <p className="text-xs text-white/40">Customer Rating</p>
              </div>
              <div>
                <p className="text-2xl font-black">30 min</p>
                <p className="text-xs text-white/40">Average Delivery</p>
              </div>
              <div>
                <p className="text-2xl font-black">100%</p>
                <p className="text-xs text-white/40">Fresh Food</p>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-5 rounded-[2rem] bg-orange-500/10 blur-2xl" />
            <div className="relative flex h-[300px] w-full items-center justify-center overflow-hidden rounded-[1.5rem] sm:h-[390px] sm:rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#241811] to-[#14100e] shadow-2xl">
              <img
                src="/menu-poster.png"
                alt="YASH SAINI RESTAURANT menu"
                className="h-full w-full object-cover object-center transition duration-500 hover:scale-[1.02]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="border-y border-white/5 bg-[#12100e] py-10 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-7 flex items-end justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-orange-500">
                Explore
              </p>
              <h3 className="mt-1 text-2xl font-black sm:text-3xl">
                Food Categories
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {categories.map((category) => (
              <button
                key={category.name}
                className="group rounded-2xl border border-white/5 bg-[#1a1714] p-5 text-center transition hover:-translate-y-1 hover:border-orange-500/30 hover:bg-[#211b17]"
              >
                <div className="mx-auto h-20 w-24 overflow-hidden rounded-2xl bg-white/5 transition group-hover:scale-105">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="mt-3 text-sm font-bold">
                  {category.name}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* BESTSELLERS */}
      <section
        id="menu"
        className="mx-auto max-w-7xl px-4 py-16 md:px-8"
      >
        <div className="mb-10">
          <p className="text-sm font-bold uppercase tracking-widest text-orange-500">
            Customer favourites
          </p>
          <h3 className="mt-2 text-4xl font-black">
            Bestsellers
          </h3>
          <p className="mt-3 text-white/50">
            The dishes our customers keep coming back for.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {bestsellers.map((item) => (
            <div
              key={item.name}
              className="group overflow-hidden rounded-3xl border border-white/10 bg-[#171411] transition hover:-translate-y-1 hover:border-orange-500/30"
            >
              <div className="h-56 overflow-hidden bg-[#14110f]">
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-xl font-black">
                    {item.name}
                  </h4>
                  <span className="whitespace-nowrap text-lg font-black text-orange-500">
                    ₹{item.price}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-white/50">
                  {item.description}
                </p>

                <button
                  onClick={() => addToCart(item)}
                  className="mt-6 w-full rounded-xl bg-orange-500 py-3 font-bold transition hover:bg-orange-600"
                >
                  + Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* OFFERS */}
      <section id="offers" className="relative overflow-hidden bg-[#12100e] py-16 md:py-20">
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-orange-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-orange-500">
                Deals you&apos;ll love
              </p>
              <h3 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
                Offers for You
              </h3>
              <p className="mt-3 max-w-2xl text-white/50">
                Pick your deal and get more from every order. These offers are made
                for our biggest cravings and best-value orders.
              </p>
            </div>

            <a
              href="/menu"
              className="hidden shrink-0 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-400 sm:inline-flex"
            >
              Explore Menu →
            </a>
          </div>

          {/* LIVE COUPONS FROM SUPABASE */}
          {(couponsLoading || activeCoupons.length > 0) && (
            <div className="mb-7">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">
                    Live from restaurant
                  </p>
                  <h4 className="mt-1 text-2xl font-black sm:text-3xl">
                    Discount Coupons
                  </h4>
                </div>
                <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-orange-300">
                  Active Offers
                </span>
              </div>

              {couponsLoading ? (
                <div className="flex gap-4 overflow-hidden">
                  {[1, 2].map((item) => (
                    <div
                      key={item}
                      className="min-w-[280px] flex-1 animate-pulse rounded-3xl border border-white/10 bg-[#1a1613] p-5 sm:min-w-[330px]"
                    >
                      <div className="h-5 w-28 rounded bg-white/10" />
                      <div className="mt-5 h-8 w-44 rounded bg-white/10" />
                      <div className="mt-3 h-4 w-full rounded bg-white/5" />
                      <div className="mt-6 h-11 w-full rounded-xl bg-white/5" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex snap-x gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {activeCoupons.map((coupon) => (
                    <article
                      key={coupon.id}
                      className="relative min-w-[280px] snap-start overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-[#21170f] via-[#18130f] to-[#14110f] p-5 shadow-xl shadow-black/20 sm:min-w-[330px]"
                    >
                      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-orange-500/10 blur-2xl" />

                      <div className="relative flex items-start justify-between gap-3">
                        <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-[11px] font-black tracking-wider text-orange-300">
                          🎟️ COUPON
                        </span>

                        {coupon.usage_limit !== null && (
                          <span className="text-xs font-semibold text-white/40">
                            {Math.max(
                              0,
                              Number(coupon.usage_limit) - coupon.used_count
                            )}{" "}
                            left
                          </span>
                        )}
                      </div>

                      <h4 className="relative mt-5 text-2xl font-black">
                        {coupon.title}
                      </h4>

                      {coupon.description && (
                        <p className="relative mt-2 min-h-10 text-sm leading-5 text-white/55">
                          {coupon.description}
                        </p>
                      )}

                      <div className="relative mt-4 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-3xl font-black text-orange-500">
                            {coupon.discount_type === "percentage"
                              ? `${coupon.discount_value}% OFF`
                              : `₹${coupon.discount_value} OFF`}
                          </p>

                          {coupon.minimum_order_amount > 0 && (
                            <p className="mt-1 text-xs text-white/45">
                              On orders ₹{coupon.minimum_order_amount}+
                            </p>
                          )}

                          {coupon.maximum_discount_amount !== null &&
                            coupon.maximum_discount_amount !== undefined && (
                              <p className="mt-1 text-xs text-white/35">
                                Max discount ₹
                                {coupon.maximum_discount_amount}
                              </p>
                            )}
                        </div>
                      </div>

                      <div className="relative mt-5 flex gap-2">
                        <button
                          type="button"
                          onClick={() => copyCouponCode(coupon.code)}
                          className="flex-1 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm font-black text-orange-300 transition hover:bg-orange-500/20"
                        >
                          {copiedCoupon === coupon.code
                            ? "✓ Copied!"
                            : `Copy ${coupon.code}`}
                        </button>

                        <a
                          href={`/checkout?coupon=${encodeURIComponent(coupon.code)}`}
                          className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-black transition hover:bg-orange-400"
                        >
                          Use →
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex snap-x gap-5 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {offers.map((offer) => (
              <article
                key={offer.title}
                className="group relative min-w-[280px] flex-1 snap-start overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#1a1613] shadow-2xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-orange-500/40 sm:min-w-[310px]"
              >
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={offer.image}
                    alt={offer.title}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f0d0b] via-black/20 to-black/10" />

                  <span className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 text-[10px] font-black tracking-widest text-white backdrop-blur-md">
                    {offer.badge}
                  </span>

                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-3xl font-black leading-none text-white">
                        {offer.title}
                      </p>
                      <p className="mt-2 text-xs font-bold uppercase tracking-wider text-orange-300">
                        {offer.accent}
                      </p>
                    </div>

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xl font-black text-black shadow-lg transition group-hover:rotate-6 group-hover:scale-110">
                      {offer.gift}
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <p className="min-h-12 text-sm leading-6 text-white/60">
                    {offer.subtitle}
                  </p>

                  <a
                    href="/menu"
                    className="mt-4 flex w-full items-center justify-center rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-black transition hover:bg-orange-400"
                  >
                    Order Now →
                  </a>
                </div>
              </article>
            ))}
          </div>

          <a
            href="/menu"
            className="mt-4 flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-bold text-white transition hover:border-orange-500/30 hover:bg-white/10 sm:hidden"
          >
            Explore Full Menu →
          </a>
        </div>
      </section>

      {/* POPULAR DISHES */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-orange-500">
              More to love
            </p>
            <h3 className="mt-2 text-4xl font-black">
              Popular Dishes
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {popularDishes.map((item) => (
            <div
              key={item.name}
              className="group min-w-0 rounded-2xl border border-white/10 bg-[#171411] p-3 sm:p-5 transition hover:-translate-y-1 hover:border-orange-500/30"
            >
              <div className="h-28 overflow-hidden rounded-xl bg-[#211b17] sm:h-32">
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <h4 className="font-bold">{item.name}</h4>
                <span className="font-black text-orange-500">
                  ₹{item.price}
                </span>
              </div>

              <button
                onClick={() => addToCart(item)}
                className="mt-4 w-full rounded-lg border border-white/10 py-2 text-sm font-semibold transition hover:border-orange-500 hover:text-orange-500"
              >
                Add +
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* COMBOS */}
      <section className="bg-[#12100e] py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-10 text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-orange-500">
              Save more
            </p>
            <h3 className="mt-2 text-4xl font-black">
              Perfect Combos
            </h3>
            <p className="mx-auto mt-3 max-w-xl text-white/50">
              Great food, great value. Pick a combo and make your meal
              complete.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {combos.map((combo) => (
              <div
                key={combo.name}
                className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-[#191613] p-4 sm:gap-6 sm:p-6 md:flex-row md:items-center"
              >
                <div className="h-24 w-full shrink-0 overflow-hidden rounded-2xl bg-orange-500/10 sm:h-28 sm:w-28">
                  <img
                    src={combo.image}
                    alt={combo.name}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="flex-1">
                  <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-400">
                    COMBO DEAL
                  </span>

                  <h4 className="mt-3 text-xl font-black">
                    {combo.name}
                  </h4>

                  <p className="mt-2 text-sm text-white/50">
                    {combo.description}
                  </p>

                  <div className="mt-4 flex items-center gap-3">
                    <span className="text-2xl font-black text-orange-500">
                      ₹{combo.price}
                    </span>

                    <span className="text-sm text-white/30 line-through">
                      ₹{combo.oldPrice}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => addComboToCart(combo)}
                  className="w-full rounded-xl bg-orange-500 px-5 py-3 font-bold transition hover:bg-orange-600 sm:w-auto"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="mb-10 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-orange-500">
            Why us
          </p>
          <h3 className="mt-2 text-4xl font-black">
            Why Choose Us?
          </h3>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-4">
          {[
            ["🥘", "Fresh Food", "Every order is prepared fresh."],
            ["⚡", "Fast Delivery", "Hot food delivered quickly."],
            ["💰", "Best Prices", "Great taste at fair prices."],
            ["❤️", "Made With Care", "Quality and taste come first."],
          ].map(([icon, title, text]) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-[#171411] p-6 text-center"
            >
              <div className="text-4xl">{icon}</div>
              <h4 className="mt-4 font-black">{title}</h4>
              <p className="mt-2 text-sm leading-6 text-white/45">
                {text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* RESTAURANT STORY */}
      <section id="about" className="bg-[#16120f] py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 md:grid-cols-2 md:px-8">
          <div className="overflow-hidden rounded-3xl border border-white/10">
            <img
              src="/images/hero-food.jpg"
              alt="Restaurant storefront"
              className="h-[280px] w-full object-cover sm:h-[380px]"
            />
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-orange-500">
              Our Story
            </p>

            <h3 className="mt-2 text-4xl font-black">
              Good food starts with passion.
            </h3>

            <p className="mt-5 leading-7 text-white/50">
              We believe great food should be delicious, fresh and
              affordable. Our goal is simple — serve food that makes
              every customer want to come back for more.
            </p>

            <p className="mt-4 leading-7 text-white/50">
              From quick snacks to filling meals, every order is
              prepared with attention to taste and quality.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm">
                ✓ Fresh Ingredients
              </span>

              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm">
                ✓ Quality Food
              </span>

              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm">
                ✓ Local Favourite
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="mb-10 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-orange-500">
            Customer love
          </p>
          <h3 className="mt-2 text-4xl font-black">
            What Customers Say
          </h3>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {reviews.map((review) => (
            <div
              key={review.name}
              className="rounded-3xl border border-white/10 bg-[#171411] p-6"
            >
              <div className="text-orange-500">
                {"★".repeat(review.rating)}
              </div>

              <p className="mt-5 leading-7 text-white/60">
                &quot;{review.review}&quot;
              </p>

              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10 font-bold text-orange-500">
                  {review.name.charAt(0)}
                </div>

                <div>
                  <p className="font-bold">{review.name}</p>
                  <p className="text-xs text-white/35">
                    Verified Customer
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CART DRAWER */}
      {cartOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/70"
          onClick={() => setCartOpen(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-[#171310] p-4 shadow-2xl sm:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black">Your Cart</h2>
                <p className="mt-1 text-sm text-white/50">
                  {cartCount} item{cartCount !== 1 ? "s" : ""}
                </p>
              </div>

              <button
                onClick={() => setCartOpen(false)}
                className="rounded-full bg-white/10 px-4 py-2 text-lg hover:bg-white/15"
              >
                ✕
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="flex min-h-[60vh] items-center justify-center text-center sm:min-h-[70vh]">
                <div>
                  <div className="text-6xl">🛒</div>
                  <h3 className="mt-5 text-xl font-bold">
                    Your cart is empty
                  </h3>
                  <p className="mt-2 text-sm text-white/50">
                    Add something delicious first.
                  </p>
                  <button
                    onClick={() => setCartOpen(false)}
                    className="mt-6 rounded-xl bg-orange-500 px-5 py-3 font-bold text-black hover:bg-orange-400"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-8 space-y-4">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex gap-3">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white/5">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-3xl">
                              {item.emoji}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between gap-3">
                            <div>
                              <h3 className="font-bold">{item.name}</h3>
                              <p className="text-sm text-white/50">
                                ₹{item.price} each
                              </p>
                            </div>

                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="text-sm text-red-400 hover:text-red-300"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => decreaseQuantity(item.id)}
                                className="h-8 w-8 rounded-lg bg-white/10 font-bold hover:bg-white/15"
                              >
                                −
                              </button>

                              <span className="w-5 text-center font-bold">
                                {item.quantity}
                              </span>

                              <button
                                onClick={() => increaseQuantity(item.id)}
                                className="h-8 w-8 rounded-lg bg-white/10 font-bold hover:bg-white/15"
                              >
                                +
                              </button>
                            </div>

                            <span className="font-bold">
                              ₹{item.price * item.quantity}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 border-t border-white/10 pt-6">
                  <div className="flex justify-between text-white/60">
                    <span>Subtotal</span>
                    <span>₹{subtotal}</span>
                  </div>

                  <div className="mt-2 flex justify-between text-lg font-black">
                    <span>Total</span>
                    <span className="text-orange-500">₹{subtotal}</span>
                  </div>

                  <a
                    href="/checkout"
                    className="mt-6 block w-full rounded-2xl bg-orange-500 px-5 py-4 text-center font-black text-black transition hover:bg-orange-400"
                  >
                    Proceed to Checkout →
                  </a>

                  <a
                    href="/menu"
                    className="mt-3 block w-full rounded-2xl border border-white/10 px-5 py-4 text-center font-bold text-white transition hover:bg-white/5"
                  >
                    View Full Menu
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* CTA */}
      <section className="px-4 py-16 md:px-8">
        <div className="mx-auto max-w-5xl rounded-3xl bg-orange-500 px-6 py-12 text-center sm:px-10">
          <h3 className="text-4xl font-black text-white sm:text-5xl">
            Hungry already?
          </h3>

          <p className="mx-auto mt-4 max-w-xl text-white/80">
            Order your favourite food today and enjoy fresh,
            delicious meals delivered to you.
          </p>

          <a
            href="#menu"
            className="mt-7 inline-block rounded-xl bg-[#0f0d0b] px-7 py-3.5 font-bold text-white transition hover:bg-black"
          >
            Explore Menu →
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        id="contact"
        className="border-t border-white/10 bg-[#0b0908]"
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-3 md:px-8">
          <div>
            <h4 className="text-2xl font-black">
              YASH <span className="text-orange-500">SAINI</span>
            </h4>

            <p className="mt-3 max-w-sm text-sm leading-6 text-white/40">
              Fresh, delicious and affordable Chinese and fast food
              for everyone.
            </p>
          </div>

          <div>
            <h5 className="font-bold">Quick Links</h5>

            <div className="mt-4 space-y-2 text-sm text-white/40">
              <a
                href="#home"
                className="block hover:text-orange-500"
              >
                Home
              </a>

              <a
                href="/menu"
                className="block hover:text-orange-500"
              >
                Menu
              </a>

              <a
                href="#offers"
                className="block hover:text-orange-500"
              >
                Offers
              </a>

              <a
                href="#about"
                className="block hover:text-orange-500"
              >
                About Us
              </a>
            </div>
          </div>

          <div>
            <h5 className="font-bold">Location</h5>

            <p className="mt-4 text-sm leading-6 text-white/40">
              B.B. Nagar,
              <br />
              Bulandshahr, Uttar Pradesh
            </p>
          </div>
        </div>

        <div className="border-t border-white/5 px-4 py-5 text-center text-xs text-white/30">
          © {new Date().getFullYear()} YASH SAINI RESTAURANT. All rights reserved.
        </div>
      </footer>
    </main>
  );
}