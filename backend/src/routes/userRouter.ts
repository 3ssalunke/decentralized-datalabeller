import { Prisma, PrismaClient } from "@prisma/client";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { DefaultArgs } from "@prisma/client/runtime/library";
import { S3Client } from "@aws-sdk/client-s3";
import { authMiddleware } from "../middlewares";
import { AWS_BUCKET_NAME, TOTAL_DECIMALS, USER_JWT_SECRET } from "../config";
import { createTaskInput } from "../validators";

export default function (
  prismaClient: PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>,
  s3Client: S3Client
) {
  const router = Router();

  router.get("/task", authMiddleware(prismaClient), async (req, res) => {
    // @ts-ignore
    const user = req.user;
    const taskId = req.query.taskId;

    const task = await prismaClient.task.findFirst({
      where: {
        id: Number(taskId),
        user_id: user.id,
      },
      select: {
        options: true,
        title: true,
      },
    });
    if (!task) {
      return res.status(400).json({
        message:
          "the task does not exist or you don't have access to this task",
      });
    }

    const submissions = await prismaClient.submission.findMany({
      where: {
        task_id: Number(taskId),
      },
      include: {
        option: true,
      },
    });

    const result: Record<
      string,
      {
        count: number;
        option: {
          imageUrl: string;
          optionId: number;
        };
      }
    > = {};

    task.options.forEach((opt) => {
      result[opt.id] = {
        count: 0,
        option: {
          imageUrl: opt.image_url,
          optionId: opt.option_id,
        },
      };
    });

    submissions.forEach((sub) => {
      result[sub.option_id].count++;
    });

    return res.json({
      result,
      task,
    });
  });

  router.post("/task", authMiddleware(prismaClient), async (req, res) => {
    // @ts-ignore
    const user = req.user;
    const inputs = req.body;
    console.log(inputs);

    const parsedInputs = createTaskInput.safeParse(inputs);
    if (!parsedInputs.success) {
      return res.status(411).json({
        message: "you have sent wrong inputs",
        error: parsedInputs.error,
      });
    }

    const task = await prismaClient.$transaction(async (txn) => {
      const task = await txn.task.create({
        data: {
          title: parsedInputs.data.title,
          payment: 1 * TOTAL_DECIMALS,
          signature: parsedInputs.data.signature,
          user_id: user.id,
        },
      });

      await txn.option.createMany({
        data: parsedInputs.data.options.map((option, index) => ({
          image_url: option.imageUrl,
          task_id: task.id,
          option_id: index + 1,
        })),
      });

      return task;
    });

    return res.json({
      id: task.id,
    });
  });

  router.get(
    "/presignedurl",
    authMiddleware(prismaClient),
    async (req, res) => {
      //@ts-ignore
      const user = req.user;

      const { url, fields } = await createPresignedPost(s3Client, {
        Bucket: AWS_BUCKET_NAME,
        Key: `${user.id}/${Math.floor(Math.random() * 100000)}/image.jpg`,
        Conditions: [["content-length-range", 0, 5 * 1024 * 1024]],
        Expires: 3600,
      });

      return res.json({
        presignedUrl: url,
        fields,
      });
    }
  );

  router.post("/signin", async (_, res) => {
    const hardcodeWalletAddress = "0x12844DaEa89F6eF45F6C822eF596577ba722a3B6";

    const exitstingUser = await prismaClient.user.findFirst({
      where: {
        address: hardcodeWalletAddress,
      },
    });
    if (exitstingUser) {
      const token = jwt.sign(
        {
          userId: exitstingUser.id,
        },
        USER_JWT_SECRET
      );

      return res.json({ token });
    } else {
      const user = await prismaClient.user.create({
        data: {
          address: hardcodeWalletAddress,
        },
      });
      const token = jwt.sign(
        {
          userId: user.id,
        },
        USER_JWT_SECRET
      );

      return res.json({ token });
    }
  });

  return router;
}
