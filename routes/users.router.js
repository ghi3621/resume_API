import express from "express";
import { prisma } from "../prisma/index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
// import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();
const tokenStorages = {};

/**회원가입 API **/
//1. 이멜, 비번, 비번확인, 이름 회원가입을 요청
//2. 유효성 체크 (HTTP Status Code) 에러 메세지 반환
// 이메일 : 다른 사용자와 중복될 수 없음 --> email @unique
// 비번: 최소 6자 이상이며, 비밀번호 확인과 일치해야함.
//3. 회원가입 성공시, 비밀번호를 제외 한 사용자의 정보를 반환.
router.post("/sign-up", async (req, res, next) => {
  try {
    const { email, pwd, checkedPwd, name, age } = req.body;

    if (!email || !pwd || !checkedPwd || !name) {
      return res
        .status(409)
        .json({ errorMessage: "필수사항을 모두 기입해주세요!!" });
    }

    const isExistUser = await prisma.users.findFirst({
      where: {
        email,
      },
    });

    if (isExistUser) {
      return res
        .status(409)
        .json({ message: "이미 존재하는 이메일입니다. 확인해주세요!!" });
    }

    if (pwd.length < 7) {
      return res.status(400).json({
        errorMessage: "비밀번호는 최소 6자리 이상이여야 합니다. 확인해주세요!!",
      });
    }

    if (pwd !== checkedPwd) {
      return res.status(400).json({
        errorMessage: "비밀번호가 일치하지 않습니다. 확인해주세요!! ",
      });
    }

    const hashedPwd = await bcrypt.hash(pwd, 12);

    // Users 테이블에 사용자를 추가.
    const user = await prisma.users.create({
      data: { email, password: hashedPwd },
    });

    // UserInfos 테이블에 사용자 정보를 추가.
    await prisma.userInfos.create({
      data: {
        userId: user.userId,
        name,
        age,
      },
    });

    return res
      .status(201)
      .json({ message: "회원가입이 성공적으로 완료되었습니다!" });
  } catch (err) {
    next(err);
  }
});

/** 로그인 API **/
//1.이멜, 비번으로 로그인 req
//2. 이멜 OR 비번 중 하나라도 일치하지 않는다면, 에러 메세지 반환
//3. 로그인 성공시 JWT 에세스 토큰을 생성반환.
// 에세스 토큰은 payLoad: userId , expiresIn: 12h
router.post("/sign-in", async (req, res, next) => {
  try {
    const { email, pwd } = req.body;

    const user = await prisma.users.findFirst({ where: { email } });

    if (!user)
      return res
        .status(401)
        .json({ errorMessage: "존재하지 않는 이메일입니다. 확인해주세요!!" });
    else if (!(await bcrypt.compare(pwd, user.password)))
      return res
        .status(401)
        .json({ errorMessage: "비밀번호가 일치하지 않습니다. 확인해주세요!!" });

    const accessToken = jwt.sign(
      {
        userId: user.userId,
      },
      process.env.ACCESS_TOKEN_SECRET_KEY,
      { expiresIn: "12h" },
    );

    const refreshToken = jwt.sign(
      { userId: user.userId },
      process.env.REFRESH_TOKEN_SECRET_KEY,
      { expiresIn: "7d" },
    );

    tokenStorages[refreshToken] = {
      userId: user.userId,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    };

    res.cookie("accessToken", accessToken, { httpOnly: true });
    res.cookie("refreshToken", refreshToken, { httpOnly: true });

    return res.status(200).json({ message: "로그인 성공 (^o^)" });
  } catch (err) {
    next(err);
  }
});

/** 엑세스 토큰 검증 API **/
router.get("/users", async (req, res) => {
  try {
    const { accessToken } = req.cookies;

    /** 엑세스 토큰이 존재하는지 확인한다. **/
    if (!accessToken) {
      return res
        .status(400)
        .json({ errorMessage: "Access Token이 존재하지 않습니다." });
    }

    const { userId } = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET_KEY,
    );

    const user = await prisma.users.findUnique({
      where: {
        userId: +userId,
      },
    });

    if (!user) {
      res.clearCookie("accessToken");

      return res
        .status(402)
        .json({ errorMessage: "사용자를 찾을 수 없습니다. 확인해주세요!!" });
    }

    return res.status(200).json({
      message: `${userId}의 Access Token 인증 성공 (^o^)`,
    });
  } catch (err) {
    res.clearCookie("accessToken");
    next(err);
    return res
      .status(401)
      .json({ errorMessage: "Access Token이 정상적이지 않습니다." });
  }
});
function jwt.verify(token, secretKey) {
  try {
    return jwt.verify(token, secretKey); // 인증에 성공 했을 때 payload가 반환이 되고 샐패했을땐 에러뜸.
  } catch (err) {
    return null;
  }
}

function createAccessToken(id) {
  return jwt.sign({ id }, ACCESS_TOKEN_SECRET_KEY, { expiresIn: "10s" });
}





/** 사용자 조회 API **/
// router.get("/users", authMiddleware, async (req, res, next) => {
//   const { userId } = req.user;

//   const user = await prisma.users.findFirst({
//     where: { userId: +userId },
//     select: {
//       userId: true,
//       email: true,
//       createdAt: true,
//       updatedAt: true,
//       userInfos: {
//         // 1:1 관계를 맺고있는 UserInfos 테이블을 조회합니다.
//         select: {
//           name: true,
//           age: true,
//         },
//       },
//     },
//   });

//   return res.status(200).json({ data: user });
// });

export default router;
