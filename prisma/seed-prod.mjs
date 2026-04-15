import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const dbPath = dbUrl.startsWith("file:") ? dbUrl.slice(5) : dbUrl;
const resolvedPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);

const adapter = new PrismaBetterSqlite3({ url: resolvedPath });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Check if the default presentation already exists
  const existing = await prisma.presentation.findUnique({
    where: { roomCode: "4729" },
  });

  if (existing) {
    console.log(`Default presentation already exists: "${existing.title}" (room code: ${existing.roomCode})`);
    return;
  }

  const presentation = await prisma.presentation.create({
    data: {
      title: "Career Symposium",
      roomCode: "4729",
      questions: {
        create: [
          {
            type: "multiple_choice",
            title: "Are you deciding between academia and an alternative career path?",
            options: JSON.stringify([
              "Leaning towards academia",
              "Leaning towards industry",
              "Undecided",
            ]),
            order: 1,
          },
          {
            type: "word_cloud",
            title: "What do you hope to gain from this event?",
            order: 2,
          },
          {
            type: "rating_scale",
            title: "How confident are you in your career plan?",
            scaleMin: 1,
            scaleMax: 5,
            scaleMinLabel: "Not at all",
            scaleMaxLabel: "Very confident",
            order: 3,
          },
          {
            type: "word_cloud",
            title: "What is your biggest fear about job searching?",
            order: 4,
          },
          {
            type: "multiple_choice",
            title: "Are you currently looking for a job?",
            options: JSON.stringify([
              "Yes, I am actively searching and applying.",
              "No, but I will start looking soon.",
              "No, I have a year or more until I have to look for a job, but I am exploring options.",
            ]),
            order: 5,
          },
        ],
      },
    },
  });

  console.log(`Seeded presentation: "${presentation.title}" (room code: ${presentation.roomCode})`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
  })
  .finally(() => prisma.$disconnect());
