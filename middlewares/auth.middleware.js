// dotenv.config();
import jwt from "jsonwebtoken";
import { prisma } from "../prisma/index.js";

export default async function(req, res, next) {
  try {
    //헤더에서 엑세스 토큰 가져오기
    const authorization = req.headers.authorization;
    if (!authorization)
      throw new Error("인증 정보가 올바르지 않습니다. 확인해주세요!!");

    // 엑세스 토큰의 인증방식이 올바른가?
    const [tokenType, tokenValue] = authorization.split(" ");

    if (tokenType !== "Bearer")
      throw new Error("인증 정보가 올바르지 않습니다. 확인해주세요!!");

    if (!tokenValue)
      throw new Error("인증 정보가 올바르지 않습니다. 확인해주세요!!");

    const token = jwt.verify(tokenValue, "accessToken");

    if (!token.userId)
      throw new Error("인증 정보가 올바르지 않습니다. 확인해주세요!!");

    const user = await prisma.users.findFirst({
      where: { userId: +token.userId },
    });

    if (!user) {
      //res.clearCookie("authorization");
      throw new Error("토큰 사용자가 존재하지 않습니다.");
    }

    // req.locals.user에 사용자 정보를 저장합니다.
    res.locals.user = user;

    next();
  } catch (error) {
    //res.clearCookie("authorization");
    return res.status(400).json({
      success: false,
      message: error.message,
    });
    //토큰이 만료되었거나, 조작되었을 때, 에러 메시지를 다르게 출력합니다.
    // switch (error.name) {
    //   case "TokenExpiredError":
    //     return res.status(401).json({ message: "토큰이 만료되었습니다." });
    //   case "JsonWebTokenError":
    //     return res.status(401).json({ message: "토큰이 조작되었습니다." });
    //   default:
    //     return res
    //       .status(401)
    //       .json({ message: error.message ?? "비정상적인 요청입니다." });
    // }
  }
}
//-------------------------------------
/** 엑세스 토큰 검증 API **/
// const jwtValidate= (req, res) => {
//   try{
//   const { accessToken } = req.cookies;

//   /** 엑세스 토큰이 존재하는지 확인한다. **/
//   if (!accessToken) {
//     return res
//       .status(400)
//       .json({ errorMessage: "Access Token이 존재하지 않습니다." });
//   }

//   const payload = validateToken(accessToken, ACCESS_TOKEN_SECRET_KEY);
//   if (!payload) {
//     return res
//       .status(401)
//       .json({ errorMessage: "Access Token이 정상적이지 않습니다." });
//   }

//   const { userId } = payload;
//   return res.status(200).json({
//     message: `${userId}의 Payload를 가진 Token이 정상적으로 인증 되었습니다.`,
//   });
// } catch (err) {
//   next(err);
// }
// };

// // Token을 검증하고, Payload를 조회하기 위한 함수
// function validateToken(token, secretKey) {
//   try {
//     return jwt.verify(token, secretKey); // 인증에 성공 했을 때 payload가 반환이 되고 샐패했을땐 에러뜸.
//   } catch (err) {
//     return null;
//   }
// }

// function createAccessToken(id) {
//   return jwt.sign({ id }, ACCESS_TOKEN_SECRET_KEY, { expiresIn: "10s" });
// }

// //** Refresh Token을 이용해서 엑세스 토큰을 재발급하는 API **//
// router.post("/tokens/refresh", async (req, res) => {
//   const { refreshToken } = req.cookies;

//   if (!refreshToken) {
//     return res
//       .status(400)
//       .json({ errorMessage: "Refresh Token이 존재하지 않습니다." });
//   }

//   const payload = validateToken(refreshToken, REFRESH_TOKEN_SECRET_KEY);
//   if (!payload) {
//     return res
//       .status(401)
//       .json({ errorMessage: "Refresh Token이 정상적이지 않습니다." });
//   }

//   const userInfo = tokenStorages[refreshToken]; // 객체가 아니라 DB면 DB안에 있는 정보를 조회하도록 수정해야함!!!!

//   // 21번줄_ 서버가 재실행되서 초기화 되면서 실제로 tokenStorages가 비어있게 될수 있다.
//   // 그래서 사용자의 정보가 다 사라져서 비어져 있을 수 있어서 조건문을 써줌!!!
//   if (!userInfo) {
//     return res.status(419).json({
//       errorMessage: "Refresh Token의 정보가 서버에 존재하지 않습니다.",
//     });
//   }

//   // !!! 84번줄을 치환.!!!!
//   const newAccessToken = createAccessToken(userInfo.id);

//   res.cookie("accessToken", newAccessToken);
//   return res
//     .status(200)
//     .json({ message: "Access Token을 정상적으로 새롭게 발급했습니다." });
// });
