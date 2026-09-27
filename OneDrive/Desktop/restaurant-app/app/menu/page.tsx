"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type MenuItem = {
  id: number;
  name: string;
  price: number;
  emoji: string;
  category: string;
  image: string;
};

type CartItem = MenuItem & {
  quantity: number;
};

type User = {
  id: string;
};

const fallbackCategories = [
  "All",
  "Chinese",
  "Noodles",
  "Momos",
  "Burgers",
  "Pizza",
  "Snacks",
  "Drinks",
  "Main Course",
  "Combos",
  "Desserts",
];

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

const getFoodImage = (name: string) => foodImages[name] || "";

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState("");

  const [user, setUser] = useState<User | null>(null);
  const [favouriteIds, setFavouriteIds] = useState<number[]>([]);
  const [favouriteLoading, setFavouriteLoading] = useState<number | null>(
    null
  );

  useEffect(() => {
    const fetchMenuItems = async () => {
      setMenuLoading(true);
      setMenuError("");

      const { data, error } = await supabase
        .from("menu_items")
        .select("id, name, price, emoji, category")
        .eq("available", true)
        .order("id", { ascending: true });

      if (error) {
        console.error("Menu fetch error:", error);
        setMenuError("Menu load nahi ho paaya. Please refresh.");
        setMenuItems([]);
      } else {
        setMenuItems(
          (data || []).map((item) => ({
            id: Number(item.id),
            name: item.name,
            price: Number(item.price),
            emoji: item.emoji,
            category: item.category,
            image: getFoodImage(item.name),
          }))
        );
      }

      setMenuLoading(false);
    };

    fetchMenuItems();
  }, []);

  useEffect(() => {
    const loadUserAndFavourites = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUser(null);
        setFavouriteIds([]);
        return;
      }

      setUser({ id: user.id });

      const { data, error } = await supabase
        .from("favourite_items")
        .select("menu_item_id")
        .eq("user_id", user.id);

      if (error) {
        console.error("Favourite fetch error:", error);
        return;
      }

      setFavouriteIds(
        (data || []).map((item) => Number(item.menu_item_id))
      );
    };

    loadUserAndFavourites();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        setFavouriteIds([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const savedCart = localStorage.getItem("restaurant-cart");

    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart) as CartItem[];

        setCart(
          parsed.map((item) => ({
            ...item,
            image: item.image || getFoodImage(item.name),
          }))
        );
      } catch {
        localStorage.removeItem("restaurant-cart");
      }
    }

    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem("restaurant-cart", JSON.stringify(cart));
    }
  }, [cart, loaded]);

  const addToCart = (item: MenuItem) => {
    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (cartItem) => cartItem.id === item.id
      );

      if (existingItem) {
        return currentCart.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }

      return [...currentCart, { ...item, quantity: 1 }];
    });
  };

  const increaseQuantity = (id: number) => {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  const decreaseQuantity = (id: number) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id: number) => {
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== id)
    );
  };

  const toggleFavourite = async (item: MenuItem) => {
    if (!user) {
      alert("❤️ Please login to save favourite items.");
      window.location.href = "/login";
      return;
    }

    setFavouriteLoading(item.id);

    const isFavourite = favouriteIds.includes(item.id);

    if (isFavourite) {
      const { error } = await supabase
        .from("favourite_items")
        .delete()
        .eq("user_id", user.id)
        .eq("menu_item_id", item.id);

      if (error) {
        console.error("Remove favourite error:", error);
        alert("Could not remove favourite.");
        setFavouriteLoading(null);
        return;
      }

      setFavouriteIds((current) =>
        current.filter((id) => id !== item.id)
      );
    } else {
      const { error } = await supabase
        .from("favourite_items")
        .insert({
          user_id: user.id,
          menu_item_id: item.id,
        });

      if (error) {
        console.error("Add favourite error:", error);
        alert("Could not save favourite.");
        setFavouriteLoading(null);
        return;
      }

      setFavouriteIds((current) => [...current, item.id]);
    }

    setFavouriteLoading(null);
  };

  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const subtotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const categories = [
    "All",
    ...Array.from(new Set(menuItems.map((item) => item.category))),
    ...fallbackCategories.filter(
      (category) =>
        category !== "All" &&
        !menuItems.some((item) => item.category === category)
    ),
  ];

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory =
      activeCategory === "All" || item.category === activeCategory;

    const matchesSearch = item.name
      .toLowerCase()
      .includes(search.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <main className="min-h-screen bg-[#0f0d0b] text-white">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-[#0f0d0b]/95 px-4 py-4 backdrop-blur md:px-12">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <a
            href="/"
            className="text-2xl font-black tracking-tight text-orange-500"
          >
            YASH <span className="text-white">SAINI</span>
          </a>

          <div className="hidden items-center gap-8 md:flex">
            <a
              href="/"
              className="text-sm text-white/70 hover:text-white"
            >
              Home
            </a>

            <a href="/menu" className="text-sm text-orange-500">
              Menu
            </a>

            <a
              href="/#offers"
              className="text-sm text-white/70 hover:text-white"
            >
              Offers
            </a>

            <a
              href="/#about"
              className="text-sm text-white/70 hover:text-white"
            >
              About
            </a>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={user ? "/profile" : "/login"}
              className="hidden rounded-full border border-white/10 px-4 py-2.5 text-sm font-bold text-white/70 transition hover:border-orange-500/30 hover:text-orange-500 sm:block"
            >
              {user ? "👤 Profile" : "👤 Login"}
            </a>

            <button
              onClick={() => setCartOpen(true)}
              className="rounded-full bg-orange-500 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400"
            >
              🛒 Cart ({cartCount})
            </button>
          </div>
        </div>
      </nav>

      {/* MENU HEADER + SEARCH */}
      <section className="mx-auto max-w-7xl px-4 pb-8 pt-10 md:px-12">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-orange-500/15 via-white/[0.03] to-transparent p-6 md:p-10">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-orange-500">
            Fresh • Hot • Delicious
          </p>

          <h1 className="text-4xl font-black tracking-tight md:text-6xl">
            Our <span className="text-orange-500">Menu</span>
          </h1>

          <p className="mt-4 max-w-2xl text-white/60">
            Real food photos, fresh flavours and your favourites — all in
            one place.
          </p>

          <div className="mt-7 max-w-2xl">
            <input
              type="text"
              placeholder="🔎 Search food..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none placeholder:text-white/30 focus:border-orange-500"
            />
          </div>
        </div>

        {/* CATEGORIES */}
        <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                activeCategory === category
                  ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20"
                  : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      {/* MENU CARDS */}
      <section className="mx-auto max-w-7xl px-4 pb-20 md:px-12">
        {menuLoading ? (
          <div className="py-20 text-center">
            <div className="text-5xl">🍽️</div>

            <p className="mt-5 text-lg text-white/60">
              Loading menu...
            </p>
          </div>
        ) : menuError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
            <p className="text-red-400">{menuError}</p>

            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-orange-500 px-5 py-2.5 font-bold text-black"
            >
              Refresh
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredItems.map((item) => {
                const isFavourite = favouriteIds.includes(item.id);

                const isFavouriteLoading =
                  favouriteLoading === item.id;

                return (
                  <article
                    key={item.id}
                    className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] transition duration-300 hover:-translate-y-1 hover:border-orange-500/40 hover:bg-white/[0.07] hover:shadow-2xl hover:shadow-orange-950/30"
                  >
                    {/* FAVOURITE */}
                    <button
                      type="button"
                      onClick={() => toggleFavourite(item)}
                      disabled={isFavouriteLoading}
                      aria-label={
                        isFavourite
                          ? `Remove ${item.name} from favourites`
                          : `Add ${item.name} to favourites`
                      }
                      className={`absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border text-lg backdrop-blur transition ${
                        isFavourite
                          ? "border-red-500/30 bg-red-500/20 text-red-400"
                          : "border-white/10 bg-black/50 text-white/70 hover:border-red-500/30 hover:text-red-400"
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {isFavouriteLoading
                        ? "..."
                        : isFavourite
                        ? "❤️"
                        : "♡"}
                    </button>

                    {/* FOOD IMAGE */}
                    <div className="relative h-56 overflow-hidden bg-white/[0.04]">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-7xl">
                          {item.emoji}
                        </div>
                      )}

                      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent" />

                      <div className="absolute bottom-3 left-4 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                        🟢 Veg
                      </div>
                    </div>

                    {/* DETAILS */}
                    <div className="p-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-orange-500">
                        {item.category}
                      </p>

                      <h2 className="mt-1 pr-8 text-xl font-black">
                        {item.name}
                      </h2>

                      <div className="mt-5 flex items-center justify-between gap-3">
                        <span className="text-xl font-black text-orange-500">
                          ₹{item.price}
                        </span>

                        <button
                          onClick={() => addToCart(item)}
                          className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-black text-black transition hover:bg-orange-400 active:scale-95"
                        >
                          Add +
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {filteredItems.length === 0 && (
              <div className="py-20 text-center">
                <p className="text-lg text-white/50">
                  No food found 😕
                </p>
              </div>
            )}
          </>
        )}
      </section>

      {/* CART */}
      {cartOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          onClick={() => setCartOpen(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-[#171310] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black">
                  Your Cart
                </h2>

                <p className="mt-1 text-sm text-white/50">
                  {cartCount} item
                  {cartCount !== 1 ? "s" : ""}
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
              <div className="flex min-h-[70vh] items-center justify-center text-center">
                <div>
                  <div className="text-6xl">🛒</div>

                  <h3 className="mt-5 text-xl font-bold">
                    Your cart is empty
                  </h3>

                  <p className="mt-2 text-sm text-white/50">
                    Add something delicious first.
                  </p>
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
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/5">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-3xl">
                              {item.emoji}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between gap-3">
                            <div>
                              <h3 className="font-bold">
                                {item.name}
                              </h3>

                              <p className="text-sm text-white/50">
                                ₹{item.price} each
                              </p>
                            </div>

                            <button
                              onClick={() =>
                                removeFromCart(item.id)
                              }
                              className="text-sm text-red-400 hover:text-red-300"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() =>
                                  decreaseQuantity(item.id)
                                }
                                className="h-8 w-8 rounded-lg bg-white/10 font-bold hover:bg-white/15"
                              >
                                −
                              </button>

                              <span className="w-5 text-center font-bold">
                                {item.quantity}
                              </span>

                              <button
                                onClick={() =>
                                  increaseQuantity(item.id)
                                }
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

                    <span className="text-orange-500">
                      ₹{subtotal}
                    </span>
                  </div>

                  <a
                    href="/checkout"
                    className="mt-6 block w-full rounded-2xl bg-orange-500 px-5 py-4 text-center font-black text-black transition hover:bg-orange-400"
                  >
                    Proceed to Checkout →
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}