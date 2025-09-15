// src/components/Footer.tsx
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "../ui/use-toast";

const links = {
  shop: [
    { id: "men", label: "Men", path: "/shop/listing" },
    { id: "women", label: "Women", path: "/shop/listing" },
    { id: "footwear", label: "Footwear", path: "/shop/listing" },
    // { label: "New Arrivals", path: "/shop/listing" },
    { label: "Best Sellers", path: "/shop/listing" },
  ],
  help: [
    { label: "Track Order", path: "/orders/track" },
    { label: "Shipping & Delivery", path: "/help/shipping" },
    // { label: "Returns & Refunds", path: "/help/returns" },
    // { label: "Size Guide", path: "/help/size-guide" },
    // { label: "Contact Us", path: "/contact" },
  ],
  company: [
    { label: "About Us", path: "/about" },
    // { label: "Careers", path: "/careers" },
    // { label: "Blogs", path: "/blog" },
    // { label: "Affiliates", path: "/affiliates" },
    // { label: "Press", path: "/press" },
  ],
};

export default function Footer() {

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleSubscribe = (e) => {
    e.preventDefault();
    e.target.reset();
    toast({
      title: "Subscribed!",
      description: "Thank you for subscribing to our newsletter.",
      duration: 3000,
    });
  }

  function handleNavigate(getCurrentMenuItem) {
    console.log(getCurrentMenuItem);
    sessionStorage.removeItem("filters");
    const currentFilter =
      getCurrentMenuItem.id !== "home" &&
        getCurrentMenuItem.id !== "products" &&
        getCurrentMenuItem.id !== "search"
        ? {
          category: [getCurrentMenuItem.id],
        }
        : null;

    sessionStorage.setItem("filters", JSON.stringify(currentFilter));

    location.pathname.includes("listing") && currentFilter !== null
      ? setSearchParams(
        new URLSearchParams(`?category=${getCurrentMenuItem.id}`)
      )
      : navigate(getCurrentMenuItem.path);
  }

  return (
    <footer className="border-t bg-white text-zinc-700">
      {/* Top: CTA / Newsletter */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <section className="flex flex-col items-center justify-between gap-6 py-10 md:flex-row">
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-semibold text-zinc-900">
              Join the Club & get 10% off
            </h3>
            <p className="mt-1 text-sm text-zinc-600">
              Be the first to know about new drops, exclusive offers, and more.
            </p>
          </div>

          <form
            className="flex w-full max-w-md items-center rounded-2xl border border-zinc-200 bg-zinc-50 p-1 focus-within:ring-2 focus-within:ring-zinc-900"
            onSubmit={handleSubscribe}
          >
            <input
              type="email"
              placeholder="Enter your email"
              className="h-11 flex-1 rounded-xl bg-transparent px-4 text-sm outline-none placeholder:text-zinc-400"
              required
            />
            <button
              type="submit"
              className="h-11 rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white transition hover:opacity-90"
            >
              Subscribe
            </button>
          </form>
        </section>
      </div>

      {/* Middle: Columns */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-10">
        <div className="grid grid-cols-1 gap-10 border-t border-zinc-100 pt-10 sm:grid-cols-2 lg:grid-cols-6">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200">
                {/* simple bag icon */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5 stroke-zinc-900"
                >
                  <path
                    d="M7 7V6a5 5 0 0 1 10 0v1"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M5 7h14l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7Z"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="text-xl font-semibold text-zinc-900">
                Ecommerce
              </span>
            </Link>

            <p className="mt-4 max-w-sm text-sm text-zinc-600">
              Premium fashion & essentials curated with care. Free returns,
              secure checkout, and fast delivery on every order.
            </p>

            <div className="mt-6 flex items-center gap-3">
              {/* Socials */}
              {[
                {
                  name: "Instagram",
                  href: "https://instagram.com",
                  path: "M12 7.5a4.5 4.5 0 1 0 0 9a4.5 4.5 0 0 0 0-9Z",
                  extra:
                    "M16.5 7.5h.01M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Z",
                },
                {
                  name: "Twitter",
                  href: "https://x.com",
                  path: "M4 20l8-8m8-8l-8 8m0 0l6 8M12 12L6 4",
                  extra: "",
                },
                {
                  name: "YouTube",
                  href: "https://youtube.com",
                  path: "M3 8.7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v6.6a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8.7Z",
                  extra: "M10 9.5v4.9L15 12l-5-2.5Z",
                },
              ].map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  aria-label={s.name}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white transition hover:border-zinc-300"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5 stroke-zinc-900 fill-none"
                  >
                    {s.extra && (
                      <path d={s.extra} strokeWidth="1.5" strokeLinecap="round" />
                    )}
                    <path
                      d={s.path}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              ))}
            </div>

            {/* Payment badges (placeholder SVGs) */}
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {["Visa", "Mastercard", "UPI", "Rupay"].map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700"
                >
                  <span className="h-3 w-5 rounded bg-zinc-900/80" />
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-900">
              Shop
            </h4>
            <ul className="mt-4 space-y-3 text-sm">
              {links.shop.map((l) => (
                <li key={l.label}>
                  <p
                    onClick={() => { handleNavigate(l) }}
                    className="text-zinc-600 transition hover:text-zinc-900 cursor-pointer"
                  >
                    {l.label}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-900">
              Help
            </h4>
            <ul className="mt-4 space-y-3 text-sm">
              {links.help.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.path}
                    className="text-zinc-600 transition hover:text-zinc-900"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-900">
              Company
            </h4>
            <ul className="mt-4 space-y-3 text-sm">
              {links.company.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.path}
                    className="text-zinc-600 transition hover:text-zinc-900"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-zinc-100">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-sm text-zinc-500 sm:flex-row sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Ecommerce. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4">
            {/* <Link to="/legal/privacy" className="hover:text-zinc-800">
              Privacy Policy
            </Link>
            <span className="text-zinc-300">•</span>
            <Link to="/legal/terms" className="hover:text-zinc-800">
              Terms of Service
            </Link>
            <span className="text-zinc-300">•</span>
            <Link to="/sitemap" className="hover:text-zinc-800">
              Sitemap
            </Link> */}
          </div>
        </div>
      </div>
    </footer>
  );
}
