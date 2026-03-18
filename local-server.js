const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

loadEnvFile(path.join(__dirname, ".env.local"));

const publicConfigHandler = require("./api/public-config");
const createOrderHandler = require("./api/create-order");
const orderStatusHandler = require("./api/order-status");

const PORT = Number(process.env.PORT || 3000);
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (requestUrl.pathname === "/api/public-config") {
      await publicConfigHandler(createApiRequest(req, requestUrl), createApiResponse(res));
      return;
    }

    if (requestUrl.pathname === "/api/create-order") {
      const body = await readBody(req);
      const apiReq = createApiRequest(req, requestUrl, body);
      await createOrderHandler(apiReq, createApiResponse(res));
      return;
    }

    if (requestUrl.pathname === "/api/order-status") {
      await orderStatusHandler(createApiRequest(req, requestUrl), createApiResponse(res));
      return;
    }

    await serveStaticFile(requestUrl.pathname, res);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: error.message || "Server error" }));
  }
});

server.listen(PORT, () => {
  console.log(`QuickBite local server running at http://localhost:${PORT}`);
});

function createApiRequest(req, requestUrl, body = undefined) {
  return {
    method: req.method,
    headers: req.headers,
    query: Object.fromEntries(requestUrl.searchParams.entries()),
    body,
    url: req.url,
  };
}

function createApiResponse(res) {
  return {
    status(code) {
      res.statusCode = code;
      return {
        json(payload) {
          if (!res.headersSent) {
            res.setHeader("Content-Type", "application/json; charset=utf-8");
          }
          res.end(JSON.stringify(payload));
        },
      };
    },
  };
}

async function serveStaticFile(requestPath, res) {
  const normalizedPath = requestPath === "/" ? "/index.html" : requestPath;
  const safePath = path.normalize(normalizedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(__dirname, safePath);

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
    });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const contents = fs.readFileSync(filePath, "utf8");
  contents.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      return;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
}
