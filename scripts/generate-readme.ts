import "dotenv/config";
import fs from "fs";
import { fetchItems, mapPromptForLocale } from "./utils/d1-client.js";
import {
  generateMarkdown,
  SUPPORTED_LANGUAGES,
} from "./utils/markdown-generator.js";

async function main() {
  try {
    console.log(`  📥 Fetching prompts from D1 API...`);
    const { items, total } = await fetchItems();
    console.log(`  ✅ Fetched ${items.length} items (total: ${total})`);

    for (const lang of SUPPORTED_LANGUAGES) {
      console.log(`\n🌐 Processing language: ${lang.name} (${lang.code})...`);

      const prompts = items.map((item) => mapPromptForLocale(item, lang.code));

      console.log("  📝 Generating README...");
      const markdown = generateMarkdown(prompts, total, lang.code);

      console.log(`  💾 Writing ${lang.readmeFileName}...`);
      fs.writeFileSync(lang.readmeFileName, markdown, "utf-8");

      console.log(`  ✅ ${lang.readmeFileName} updated successfully!`);
      console.log(`  📊 Stats: ${prompts.length} prompts`);
    }

    console.log("\n✨ All languages processed successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
