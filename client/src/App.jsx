import { Route, Routes } from "react-router-dom";
import AuthLayout from "./components/auth/layout";
import AuthLogin from "./pages/auth/login";
import AuthRegister from "./pages/auth/register";
import AdminLayout from "./components/admin-view/layout";
import AdminDashboard from "./pages/admin-view/dashboard";
import AdminProducts from "./pages/admin-view/products";
import AdminOrders from "./pages/admin-view/orders";
import AdminFeatures from "./pages/admin-view/features";
import ShoppingLayout from "./components/shopping-view/layout";
import NotFound from "./pages/not-found";
import ShoppingHome from "./pages/shopping-view/home";
import ShoppingListing from "./pages/shopping-view/listing";
import ShoppingCheckout from "./pages/shopping-view/checkout";
import ShoppingAccount from "./pages/shopping-view/account";
import CheckAuth from "./components/common/check-auth";
import UnauthPage from "./pages/unauth-page";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { checkAuth } from "./store/auth-slice";
import { Skeleton } from "@/components/ui/skeleton";
import PaypalReturnPage from "./pages/shopping-view/paypal-return";
import PaymentSuccessPage from "./pages/shopping-view/payment-success";
import SearchProducts from "./pages/shopping-view/search";

import RequireAuth from "./components/common/RequireAuth";
import RequireAdmin from "./components/common/RequireAdmin";
import { RingLoader } from "./components/ui/RingLoader";
import Location from "./pages/Location";

function App() {
  const { user, isAuthenticated, isLoading } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  if (isLoading)
    return (
      <Skeleton className="w-screen h-screen grid place-items-center bg-white border border-zinc-200">
        <RingLoader /> {/* or <DotsLoader /> */}
      </Skeleton>
    );

  return (
    <div className="flex flex-col overflow-hidden bg-white">
      <Routes>
        {/* Root redirect handled by CheckAuth */}
        <Route
          path="/"
          element={<CheckAuth isAuthenticated={isAuthenticated} user={user} />}
        />

        {/* Auth pages: visible if not logged in; auto-redirect if logged in */}
        <Route
          path="/auth"
          element={
            <CheckAuth isAuthenticated={isAuthenticated} user={user}>
              <AuthLayout />
            </CheckAuth>
          }
        >
          <Route path="login" element={<AuthLogin />} />
          <Route path="register" element={<AuthRegister />} />
        </Route>

        {/* Admin: always protected + admin-only */}
        <Route
          path="/admin"
          element={
            <RequireAdmin isAuthenticated={isAuthenticated} user={user}>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="features" element={<AdminFeatures />} />
        </Route>

        {/* Shop: public by default */}
        <Route
          path="/shop"
          element={
            <CheckAuth isAuthenticated={isAuthenticated} user={user}>
              <ShoppingLayout />
            </CheckAuth>
          }
        >
          {/* PUBLIC pages */}
          {/* <Route path="pic" element={<Location />} /> */}
          <Route path="home" element={<ShoppingHome />} />
          <Route path="listing" element={<ShoppingListing />} />
          <Route path="search" element={<SearchProducts />} />

          {/* PROTECTED pages */}
          <Route
            path="checkout"
            element={
              <RequireAuth isAuthenticated={isAuthenticated}>
                <ShoppingCheckout />
              </RequireAuth>
            }
          />
          <Route
            path="account"
            element={
              <RequireAuth isAuthenticated={isAuthenticated}>
                <ShoppingAccount />
              </RequireAuth>
            }
          />
          <Route
            path="paypal-return"
            element={
              <RequireAuth isAuthenticated={isAuthenticated}>
                <PaypalReturnPage />
              </RequireAuth>
            }
          />
          <Route
            path="payment-success"
            element={
              <RequireAuth isAuthenticated={isAuthenticated}>
                <PaymentSuccessPage />
              </RequireAuth>
            }
          />
        </Route>

        <Route path="/unauth-page" element={<UnauthPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;
