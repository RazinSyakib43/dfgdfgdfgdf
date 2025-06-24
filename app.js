var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const http = require("http");
const cluster = require("cluster");
const os = require("os");

// middleware
var authorization = require("./middleware/authorization");

// consumer
var authConsumerRouter = require("./routes/consumer/auth");
var fishConsumerRouter = require("./routes/consumer/fish");
var cartConsumerRouter = require("./routes/consumer/cart");
var orderConsumerRouter = require("./routes/consumer/order");

// seller
var authSellerRouter = require("./routes/seller/auth");
var orderSellerRouter = require("./routes/seller/order");

// transaction
var transactionRouter = require("./routes/transaction/transaction");

const port = 3000;

var app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// auth routes
app.use("/auth/consumer", authConsumerRouter);
app.use("/auth/seller", authSellerRouter);

// consumer routes
app.use("/consumer/fish", fishConsumerRouter);
app.use("/consumer/cart", authorization, cartConsumerRouter);
app.use("/consumer/order", authorization, orderConsumerRouter);

// transaction routes
app.use("/transaction", authorization, transactionRouter);

// seller routes
app.use("/seller/order", authorization, orderSellerRouter);

const server = http.createServer(app);

server.keepAliveTimeout = 5000; // waktu idle koneksi tetap terbuka (ms)
server.headersTimeout = 6000;   // harus lebih besar dari keepAliveTimeout
server.maxConnections = 10000;  // batas koneksi aktif simultan

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = app;