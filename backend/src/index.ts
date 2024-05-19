import express from "express";
import { PrismaClient } from "@prisma/client";
import { S3Client } from "@aws-sdk/client-s3";
import cors from "cors";
import userRouter from "./routes/userRouter";
import workerRouter from "./routes/workerRouter";
import { AWS_ACCESS_KEY, AWS_SECRET_KEY } from "./config";

const prismaClient = new PrismaClient();
const s3Client = new S3Client({
  credentials: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_KEY,
  },
});

const app = express();
app.use(express.json());
app.use(cors());

app.use("/api/v1/user", userRouter(prismaClient, s3Client));
app.use("/api/v1/worker", workerRouter(prismaClient));

app.listen(3000, () => {
  console.log("server started running on port 3000");
});
