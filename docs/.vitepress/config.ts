import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Payd Node SDK",
  description:
    "Official Node.js SDK for Payd — collect payments, send payouts, and manage transactions across Africa.",
  base: "/payd-sdks/",
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/payd-sdks/logo.svg" }],
    ["meta", { name: "theme-color", content: "#10b981" }],
    [
      "meta",
      {
        name: "og:description",
        content:
          "Official Node.js SDK for Payd — collect payments, send payouts, and manage transactions across Africa.",
      },
    ],
    ["meta", { name: "og:type", content: "website" }],
  ],
  themeConfig: {
    logo: "/logo.svg",
    siteTitle: "Payd SDK",
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "API Reference", link: "/api/client" },
      { text: "Examples", link: "/examples/quick-recipes" },
      {
        text: "v0.1.2",
        items: [
          {
            text: "Changelog",
            link: "https://github.com/Yug3ne/payd-sdks/releases",
          },
          {
            text: "npm",
            link: "https://www.npmjs.com/package/payd-node-sdk",
          },
        ],
      },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Introduction",
          items: [
            { text: "Getting Started", link: "/guide/getting-started" },
            { text: "Configuration", link: "/guide/configuration" },
            { text: "Authentication", link: "/guide/authentication" },
          ],
        },
        {
          text: "Collecting Payments",
          items: [
            { text: "M-Pesa STK Push", link: "/guide/collections-mpesa" },
            { text: "Card Payments", link: "/guide/collections-card" },
            {
              text: "Pan-African Mobile & Bank",
              link: "/guide/collections-pan-african",
            },
          ],
        },
        {
          text: "Sending Payouts",
          items: [
            { text: "M-Pesa Payout", link: "/guide/payouts-mpesa" },
            {
              text: "Pan-African Payout",
              link: "/guide/payouts-pan-african",
            },
            { text: "Merchant (Paybill/Till)", link: "/guide/payouts-merchant" },
          ],
        },
        {
          text: "Other Operations",
          items: [
            { text: "Transfers (P2P)", link: "/guide/transfers" },
            { text: "Network Discovery", link: "/guide/networks" },
            { text: "Transaction Status", link: "/guide/transactions" },
            { text: "Account Balances", link: "/guide/balances" },
          ],
        },
        {
          text: "Webhooks & Errors",
          items: [
            { text: "Webhooks", link: "/guide/webhooks" },
            { text: "Error Handling", link: "/guide/error-handling" },
          ],
        },
      ],
      "/api/": [
        {
          text: "API Reference",
          items: [
            { text: "PaydClient", link: "/api/client" },
            { text: "Collections", link: "/api/collections" },
            { text: "Payouts", link: "/api/payouts" },
            { text: "Transfers", link: "/api/transfers" },
            { text: "Networks", link: "/api/networks" },
            { text: "Transactions", link: "/api/transactions" },
            { text: "Balances", link: "/api/balances" },
            { text: "Webhooks", link: "/api/webhooks" },
            { text: "Errors", link: "/api/errors" },
            { text: "Validators", link: "/api/validators" },
            { text: "Types", link: "/api/types" },
          ],
        },
      ],
      "/examples/": [
        {
          text: "Examples",
          items: [
            { text: "Quick Recipes", link: "/examples/quick-recipes" },
            { text: "Express Integration", link: "/examples/express" },
            { text: "Next.js Integration", link: "/examples/nextjs" },
            { text: "Pan-African Flows", link: "/examples/pan-african" },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: "github", link: "https://github.com/Yug3ne/payd-sdks" },
    ],

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright 2024-present Payd",
    },

    search: {
      provider: "local",
    },

    editLink: {
      pattern: "https://github.com/Yug3ne/payd-sdks/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },

    outline: {
      level: [2, 3],
    },
  },
  markdown: {
    lineNumbers: true,
  },
});
