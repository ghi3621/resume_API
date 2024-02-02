// import express from "express";
// import cookieParser from "cookie-parser";
// import jwt from "jsonwebtoken";
// import { prisma } from "../prisma/index.js";
// import dotenv from 'dotenv'

// dotenv.config();

const tokenStorages = {}; // 리프레시 토큰을 관리할 객체

/**엑세스, 리프레시 토큰 발급 API **/
app.post("/tokens", async (req, res) => {
  // ID 전달
  const { id } = req.body;

  // 엑세스 토큰과 리프레시 토큰을 발급
  const accessToken = createAccessToken(id);

  const refreshToken = jwt.sign({ id: id }, REFRESH_TOKEN_SECRET_KEY, {
    expiresIn: "7d",
  });

  tokenStorages[refreshToken] = {
    id: id,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  };

  // 클라이언트에 쿠키(토큰)를 할당
  res.cookie("accessToken", accessToken);
  res.cookie("refreshToken", refreshToken);

  return res
    .status(200)
    .json({ message: "Token이 정상적으로 발급되었습니다." });
});

/** 엑세스 토큰 검증 API **/
app.get("/tokens/validate", async (req, res) => {
  const { accessToken } = req.cookies;

  /** 엑세스 토큰이 존재하는지 확인한다. **/
  if (!accessToken) {
    return res
      .status(400)
      .json({ errorMessage: "Access Token이 존재하지 않습니다." });
  }

  const payload = validateToken(accessToken, ACCESS_TOKEN_SECRET_KEY);
  if (!payload) {
    return res
      .status(401)
      .json({ errorMessage: "Access Token이 정상적이지 않습니다." });
  }

  const { id } = payload;
  return res.status(200).json({
    message: `${id}의 Payload를 가진 Token이 정상적으로 인증 되었습니다.`,
  });
});

// Token을 검증하고, Payload를 조회하기 위한 함수
function validateToken(token, secretKey) {
  try {
    return jwt.verify(token, secretKey); // 인증에 성공 했을 때 payload가 반환이 되고 샐패했을땐 에러뜸.
  } catch (err) {
    return null;
  }
}

function createAccessToken(id) {
  return jwt.sign({ id }, ACCESS_TOKEN_SECRET_KEY, { expiresIn: "10s" });
}

//** Refresh Token을 이용해서 엑세스 토큰을 재발급하는 API **//
app.post("/tokens/refresh", async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res
      .status(400)
      .json({ errorMessage: "Refresh Token이 존재하지 않습니다." });
  }

  const payload = validateToken(refreshToken, REFRESH_TOKEN_SECRET_KEY);
  if (!payload) {
    return res
      .status(401)
      .json({ errorMessage: "Refresh Token이 정상적이지 않습니다." });
  }

  const userInfo = tokenStorages[refreshToken]; // 객체가 아니라 DB면 DB안에 있는 정보를 조회하도록 수정해야함!!!!

  // 21번줄_ 서버가 재실행되서 초기화 되면서 실제로 tokenStorages가 비어있게 될수 있다.
  // 그래서 사용자의 정보가 다 사라져서 비어져 있을 수 있어서 조건문을 써줌!!!
  if (!userInfo) {
    return res.status(419).json({
      errorMessage: "Refresh Token의 정보가 서버에 존재하지 않습니다.",
    });
  }

  // !!! 84번줄을 치환.!!!!
  const newAccessToken = createAccessToken(userInfo.id);

  res.cookie("accessToken", newAccessToken);
  return res
    .status(200)
    .json({ message: "Access Token을 정상적으로 새롭게 발급했습니다." });
});
