import { syncAllFromZoho } from "../src/lib/zoho";

async function main() {
  console.log("Starting full Zoho Books sync...\n");
  const result = await syncAllFromZoho("seed-office");
  console.log("\n=== SYNC RESULT ===");
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
