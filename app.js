// app.js

import express from "express";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import UsersRouter from "./routes/users.router.js";
import ResumesRouter from "./routes/resumes.router.js";
import LogMiddleware from "./middlewares/log.middleware.js";
import ErrorHandlingMiddleware from "./middlewares/error-handling.middleware.js";

const app = express();
const PORT = 3018;

app.use(LogMiddleware);
app.use(express.json());
app.use(cookieParser());
app.use("/api", [UsersRouter, ResumesRouter]);
app.use(ErrorHandlingMiddleware);

app.get("/", (req, res) => {
  return res.status(200).send("Hello Token!");
});

// app.post("/tokens", async);
app.listen(PORT, () => {
  console.log(PORT, "포트로 서버가 열렸어요!");
});
