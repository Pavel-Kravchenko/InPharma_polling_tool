import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const dbUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const dbPath = dbUrl.startsWith("file:") ? dbUrl.slice(5) : dbUrl;
const resolvedPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);
const adapter = new PrismaBetterSqlite3({ url: resolvedPath });
const prisma = new PrismaClient({ adapter });

async function main() {
  const presentation = await prisma.presentation.upsert({
    where: { roomCode: "4729" },
    update: {},
    create: {
      title: "Career Symposium",
      roomCode: "4729",
      questions: {
        create: [
          {
            type: "multiple_choice",
            title: "Are you deciding between academia and an alternative career path?",
            options: JSON.stringify([
              "Leaning towards academia",
              "Leaning towards an alternative career",
              "Undecided",
              "I have already decided",
            ]),
            order: 1,
          },
          {
            type: "word_cloud",
            title: "What do you hope to gain from this symposium?",
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
        ],
      },
    },
  });

  console.log(`Seeded presentation: "${presentation.title}" (room code: ${presentation.roomCode})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
