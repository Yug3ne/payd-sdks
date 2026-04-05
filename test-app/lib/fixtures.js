import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "../../shared/fixtures");

function loadJson(relativePath) {
  try {
    return JSON.parse(readFileSync(join(fixturesDir, relativePath), "utf-8"));
  } catch {
    return {};
  }
}

export const fixtures = {
  collections: {
    mpesaRequest: loadJson("collections/mpesa-request.json"),
    cardRequest: loadJson("collections/card-request.json"),
    panAfricanRequest: loadJson("collections/pan-african-request.json"),
  },
  payouts: {
    mpesaRequest: loadJson("payouts/mpesa-request.json"),
    panAfricanRequest: loadJson("payouts/pan-african-request.json"),
    merchantRequest: loadJson("payouts/merchant-request.json"),
  },
  transfers: {
    request: loadJson("transfers/request.json"),
  },
  webhooks: {
    kenyaSuccess: loadJson("webhooks/kenya-success.json"),
    kenyaFailure: loadJson("webhooks/kenya-failure.json"),
    panAfricanSuccess: loadJson("webhooks/pan-african-success.json"),
    panAfricanFailure: loadJson("webhooks/pan-african-failure.json"),
  },
};
