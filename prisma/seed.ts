import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const INITIAL_TAGS = [
  "doctors", "animals", "marriage", "science", "programming",
  "school", "food", "politics", "sports", "kids",
  "work", "dad jokes", "lawyers", "money", "travel",
];

async function main() {
  console.log("🌱 Seeding initial tags...");

  for (const name of INITIAL_TAGS) {
    await prisma.tag.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }

  console.log(`✅ ${INITIAL_TAGS.length} tags created`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
