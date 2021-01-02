import { seedQuestion } from '../prisma/seed/appConfig.seed'
import { prisma } from './server'
import faker from 'faker/locale/vi';

export function devSeed(app: any) {
  app.get('/seed-question', async (_: any, res: any) => {
    await seedQuestion();
    res.sendStatus(200);
  });
  app.get('/seed-userImage', async (_: any, res: any) => {
    const allQuestion = await prisma.question.findMany();
    const allUser = await prisma.user.findMany();
    await prisma.$transaction(
      allUser.map(e => prisma.userImage.create({
        data: {
          user: { connect: { id: e.id } },
          image: { create: { type: 'image', url: getRandomImage() } },
          ...(faker.random.boolean ? {
            userAnswer: {
              create: {
                content: faker.lorem.sentence(),
                createBy: { connect: { id: e.id } },
                question: { connect: { id: allQuestion[faker.random.number(allQuestion.length - 1)].id } },
              }
            }
          } : {})
        }
      }))
    )
    res.sendStatus(200);
  });
  app.get('/delte-all-userImage-question-answer', async (_: any, res: any) => {
    await prisma.$transaction([
      prisma.userAnswer.deleteMany({}),
      prisma.question.deleteMany({}),
      prisma.userImage.deleteMany({}),
    ]
    )
    res.sendStatus(200);
  });
}

function getRandomSubarray<T>(arr: T[], size: number): T[] {
  var shuffled = arr.slice(0), i = arr.length, min = i - size, temp, index;
  while (i-- > min) {
    index = Math.floor((i + 1) * Math.random());
    temp = shuffled[index];
    shuffled[index] = shuffled[i];
    shuffled[i] = temp;
  }
  return shuffled.slice(min);
}

function getRandomImage(scale: number = 1): string {
  const height = faker.random.number({ min: 640 * scale, max: 1280 * scale });
  const width = faker.random.number({ min: 640 * scale, max: 1280 * scale });
  return `https://loremflickr.com/${height}/${width}/girl?lock=${faker.random.number(10000)}`
}