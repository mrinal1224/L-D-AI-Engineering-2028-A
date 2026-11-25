/**
 * SECTION 05 — Build an AI chatbot REST API with LangChain
 *
 * Teach:
 * - Client -> Express -> LangChain -> Gemini -> JSON
 * - Server-side API keys, input validation, async/await.
 *
 * Run: node sections/05-langchain-chatbot-api.js
 *
 * POST http://localhost:8083/chat
 * JSON: {"prompt":"Show me products between $40 and $150"}
 */

import express from "express";
import { llm } from "./04-LangChain.js";

import { createAgent } from "langchain";
import { tool } from "@langchain/core/tools";

import { z } from "zod";

const app = express();

// STEP 1 — Enable JSON request body parsing.
app.use(express.json());

const products = [
  {
    id: "prod_101",
    name: "Minimalist Mechanical Keyboard 75%",
    slug: "minimalist-mechanical-keyboard-75",
    category: "Electronics",
    brand: "KeyCraft",
    price: 129.99,
    currency: "USD",
    stock: 42,
    rating: 4.8,
    reviewCount: 214,
    isFeatured: true,
    tags: ["wireless", "hot-swappable", "desk-setup"],
    image: "https://example.com/images/keyboard-75.jpg",
    description:
      "Compact wireless mechanical keyboard with tactile switches, aluminum frame, and customizable RGB backlighting.",
  },
  {
    id: "prod_102",
    name: "Insulated Stainless Steel Water Bottle (32oz)",
    slug: "insulated-stainless-steel-water-bottle-32oz",
    category: "Home & Outdoors",
    brand: "PeakSip",
    price: 34.5,
    currency: "USD",
    stock: 128,
    rating: 4.6,
    reviewCount: 589,
    isFeatured: false,
    tags: ["hydration", "bpa-free", "hiking"],
    image: "https://example.com/images/water-bottle-32oz.jpg",
    description:
      "Double-wall vacuum-insulated bottle that keeps drinks icy cold for 24 hours or piping hot for 12 hours.",
  },
  {
    id: "prod_103",
    name: "Merino Wool Crewneck Sweater",
    slug: "merino-wool-crewneck-sweater",
    category: "Apparel",
    brand: "Alder & Loom",
    price: 98.0,
    currency: "USD",
    stock: 19,
    rating: 4.7,
    reviewCount: 93,
    isFeatured: true,
    tags: ["winter", "merino-wool", "knitwear"],
    image: "https://example.com/images/merino-sweater.jpg",
    description:
      "Soft, breathable fine-gauge merino wool sweater designed for everyday layering without bulk.",
  },
  {
    id: "prod_104",
    name: "Ceramic Pour-Over Coffee Dripper Set",
    slug: "ceramic-pour-over-coffee-dripper-set",
    category: "Kitchen",
    brand: "RoastLab",
    price: 46.0,
    currency: "USD",
    stock: 64,
    rating: 4.9,
    reviewCount: 162,
    isFeatured: false,
    tags: ["coffee", "pour-over", "ceramic"],
    image: "https://example.com/images/pour-over-set.jpg",
    description:
      "Hand-glazed ceramic coffee dripper paired with a matching glass carafe for clean, balanced brewing.",
  },
  {
    id: "prod_105",
    name: "Ergonomic Mesh Task Chair",
    slug: "ergonomic-mesh-task-chair",
    category: "Furniture",
    brand: "ErgoForm",
    price: 279.0,
    currency: "USD",
    stock: 11,
    rating: 4.5,
    reviewCount: 341,
    isFeatured: true,
    tags: ["office", "ergonomic", "lumbar-support"],
    image: "https://example.com/images/mesh-chair.jpg",
    description:
      "Breathable mesh office chair featuring adjustable lumbar support, 4D armrests, and smooth-glide casters.",
  },
  {
    id: "prod_106",
    name: "Waterproof Everyday Sling Bag (6L)",
    slug: "waterproof-everyday-sling-bag-6l",
    category: "Accessories",
    brand: "Trailward",
    price: 68.0,
    currency: "USD",
    stock: 77,
    rating: 4.7,
    reviewCount: 128,
    isFeatured: false,
    tags: ["travel", "crossbody", "weatherproof"],
    image: "https://example.com/images/sling-bag-6l.jpg",
    description:
      "Lightweight weather-resistant sling bag with quick-access pockets and a padded sleeve for daily essentials.",
  },
];

// Filter products by optional keyword, category, and inclusive price range
function filterProducts({ productName, query, category, minPrice, maxPrice }) {
  const searchTerm = (query || productName || "").trim().toLowerCase();

  return products.filter((p) => {
    const matchesText =
      !searchTerm ||
      p.name.toLowerCase().includes(searchTerm) ||
      p.category.toLowerCase().includes(searchTerm) ||
      p.brand.toLowerCase().includes(searchTerm) ||
      p.description.toLowerCase().includes(searchTerm) ||
      p.tags.some((tag) => tag.toLowerCase().includes(searchTerm));

    const matchesCategory =
      !category || p.category.toLowerCase() === category.trim().toLowerCase();

    const matchesMin = minPrice === undefined || p.price >= minPrice;
    const matchesMax = maxPrice === undefined || p.price <= maxPrice;

    return matchesText && matchesCategory && matchesMin && matchesMax;
  });
}

const productTool = tool(
  async (input) => {
    console.log("Custom Tool Called:", input);

    if (input.minPrice !== undefined && input.maxPrice !== undefined && input.minPrice > input.maxPrice) {
      return JSON.stringify({
        error: `Invalid price range: minPrice (${input.minPrice}) cannot be greater than maxPrice (${input.maxPrice}).`,
      });
    }

    const matches = filterProducts(input);

    if (!matches.length) {
      return JSON.stringify({
        count: 0,
        products: [],
        message: "No products matched your criteria.",
      });
    }

    return JSON.stringify({
      count: matches.length,
      products: matches,
    });
  },
  {
    name: "product_catalog",
    description: `
      Search and filter products in our store catalog. All prices are in USD.
      Use minPrice and maxPrice to find products within a price range (inclusive).
      You can also filter by productName, query, or category.
    `.trim(),
    schema: z.object({
      productName: z.string().optional().describe("Exact or partial product name"),
      query: z.string().optional().describe("Keyword matching name, brand, category, tags, or description"),
      category: z
        .string()
        .optional()
        .describe("Category name: Electronics, Home & Outdoors, Apparel, Kitchen, Furniture, or Accessories"),
      minPrice: z.number().nonnegative().optional().describe("Minimum price in USD (inclusive)"),
      maxPrice: z.number().nonnegative().optional().describe("Maximum price in USD (inclusive)"),
    }),
  },
);

const agent = createAgent({
  model: llm,
  tools: [productTool],
  systemPrompt: `You are a helpful e-commerce shopping assistant.
Use the product_catalog tool whenever a user asks about products, prices, price ranges, categories, or availability.
If a user gives a price range (e.g., "between $50 and $150"), pass both minPrice and maxPrice to product_catalog.
Always format prices clearly in USD and only state facts returned by the tool.`,
});

// STEP 2 — Create our chatbot endpoint.
app.post("/chat", async (req, res) => {
  const { prompt } = req.body ?? {};

  // STEP 3 — Validate incoming input.
  if (typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({
      error: "A non-empty prompt is required",
    });
  }

  try {
    const result = await agent.invoke({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const reply = result.messages.at(-1)?.content ?? "";
    return res.json({ reply });
  } catch (error) {
    console.error("LangChain call failed:", error.message);

    return res.status(502).json({
      error: "AI service failed",
    });
  }
});

// STEP 7 — Start the Express server.
const PORT = process.env.PORT || 8083;

app.listen(PORT, () => {
  console.log(`LangChain chatbot running on port ${PORT}`);
});