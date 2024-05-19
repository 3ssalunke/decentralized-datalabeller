import { Prisma, PrismaClient } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";

export function getWorkerNextTask(
  prismaClient: PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>,
  workerId: number
) {
  return prismaClient.task.findFirst({
    where: {
      Submission: {
        none: {
          worker_id: workerId,
        },
      },
      done: false,
    },
    select: {
      id: true,
      title: true,
      payment: true,
      options: true,
    },
  });
}
