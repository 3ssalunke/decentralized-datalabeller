import { Prisma, PrismaClient } from "@prisma/client";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { DefaultArgs } from "@prisma/client/runtime/library";
import { S3Client } from "@aws-sdk/client-s3";
import { authMiddleware } from "../middlewares";
import {
  AWS_BUCKET_NAME,
  PARENT_WALLET_ADDRESS,
  RPC_URL,
  TOTAL_DECIMALS,
  USER_JWT_SECRET,
} from "../config";
import { createTaskInput, signinInput } from "../validators";
import nacl from "tweetnacl";
import { Connection, PublicKey } from "@solana/web3.js";

const connection = new Connection(RPC_URL);

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

    const parsedInputs = createTaskInput.safeParse(inputs);
    if (!parsedInputs.success) {
      return res.status(411).json({
        message: "you have sent wrong inputs",
        error: parsedInputs.error,
      });
    }

    const transaction = await connection.getTransaction(
      parsedInputs.data.signature,
      {
        maxSupportedTransactionVersion: 1,
      }
    );

    if (
      (transaction?.meta?.postBalances[1] ?? 0) -
        (transaction?.meta?.preBalances[1] ?? 0) !==
      100000000
    ) {
      return res.status(411).json({
        message: "Transaction signature/amount incorrect",
      });
    }

    if (
      transaction?.transaction.message.getAccountKeys().get(1)?.toString() !==
      PARENT_WALLET_ADDRESS
    ) {
      return res.status(411).json({
        message: "Transaction sent to wrong address",
      });
    }

    if (
      transaction?.transaction.message.getAccountKeys().get(0)?.toString !==
      user.wallet
    ) {
      return res.status(411).json({
        message: "Transaction sent from wrong address",
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

  router.post("/signin", async (req, res) => {
    const inputs = req.body;
    const parsedInputs = signinInput.safeParse(inputs);
    if (!parsedInputs.success) {
      return res.status(411).json({
        message: "you have sent wrong inputs",
        error: parsedInputs.error,
      });
    }

    const { message, signature, publicKey } = parsedInputs.data;
    const _message = Uint8Array.from(message);
    const _signature = Uint8Array.from(signature);
    const _publicKey = new PublicKey(publicKey).toBytes();

    const result = nacl.sign.detached.verify(_message, _signature, _publicKey);
    if (!result) {
      return res.status(411).json({
        message: "incorrect signature",
      });
    }

    const exitstingUser = await prismaClient.user.findFirst({
      where: {
        address: publicKey,
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
          address: publicKey,
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
