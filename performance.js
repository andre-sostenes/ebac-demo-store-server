import http from "k6/http";
import { check } from "k6";

const baseUrl = __ENV.BASE_URL || "http://localhost:3000/api";

export const options = {
  stages: [
    { duration: "30s", target: 5 },
    { duration: "1m", target: 5 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{endpoint:products}": ["p(95)<500"],
    "http_req_duration{endpoint:customers}": ["p(95)<500"],
  },
};

export function setup() {
  const response = http.post(
    `${baseUrl}/login`,
    JSON.stringify({
      username: __ENV.K6_USER,
      password: __ENV.K6_PASSWORD,
    }),
    { headers: { "Content-Type": "application/json" } }
  );

 if (response.status < 200 || response.status >= 300) {
    throw new Error(`Login falhou: HTTP ${response.status}`);
  }

  const token = response.json("accessToken");
  if (!token) {
    throw new Error("A resposta do login não contém accessToken.");
  }

  return { token };
}

export default function (data) {
  const headers = { Authorization: `Bearer ${data.token}` };

  const products = http.get(`${baseUrl}/products`, {
    headers,
    tags: { endpoint: "products" },
  });
  check(products, {
    "Produtos: HTTP 200": (response) => response.status === 200,
    "Produtos: resposta é uma lista": (response) =>
      Array.isArray(response.json()),
  });

  const customers = http.get(`${baseUrl}/customers`, {
    headers,
    tags: { endpoint: "customers" },
  });
  check(customers, {
    "Clientes: HTTP 200": (response) => response.status === 200,
    "Clientes: resposta é uma lista": (response) =>
      Array.isArray(response.json()),
  });
}