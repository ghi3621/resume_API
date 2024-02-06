import express from "express";
import { prisma } from "../prisma/index.js";
import jwt from "jsonwebtoken";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router(); // express.Router()를 이용해 라우터를 생성합니다.

// 모든 이력서 목록 조회 (민감한정보는 제외)
//1. 이력서 ID, 이력서 제목, 자기소개, 작성자명, 이력서 상태, 작성 날짜 조회하기 (여러건)
//2. 이력서 목록은 QueryString으로 order 데이터를 받아서 정렬 방식을 결정함.
// orderKey, orderValue 를 넘겨받음.
// orderValue에 들어올 수 있는 값은 ASC, DESC 두가지 값으로 대소문자 구분을 하지 않음.
// ASC는 과거순, DESC는 최신순 그리고 둘 다 해당하지 않거나 값이 없는 경우에는 최신순으로 정렬함.
router.get("/resumes", async (req, res, next) => {
  try {
    //const { orderKey, orderValue } = req.query;

    const orderKey = req.query.orderKey ?? "resumeId";
    const orderValue = req.query.orderValue ?? "desc";

    if (!["resumeId", "status"].includes(orderKey)) {
      return res.status(400).json({
        errorMessage: "Order Key가 올바르지 않습니다. 확인해주세요!!",
      });
    }

    if (!["asc", "desc"].includes(orderValue.toLowerCase())) {
      return res.status(400).json({
        errorMessage: "Order Value가 올바르지 않습니다. 확인해주세요!!",
      });
    }

    const resumes = await prisma.resumes.findMany({
      select: {
        resumeId: true,
        title: true,
        intro: true,
        status: true,
        author: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        {
          [orderKey]: orderValue.toLowerCase(),
        },
      ],
    });

    return res.status(200).json({ data: resumes });
  } catch (err) {
    next(err);
  }
});

// 이력서 상세 조회
//1. 이력서 ID, 이력서 제목, 자기소개, 작성자명, 이력서 상태, 작성 날짜 조회하기 (단건)
// 작성자명을 표시하기 위해서는 이력서 테이블과 사용자 테이블의 JOIN이 필요
router.get("/resumes/:resumeId", async (req, res, next) => {
  try {
    const { resumeId } = req.params;
    if (!resumeId) {
      return res
        .status(400)
        .json({ errorMessage: "이력서 Id는 필수 값 입니다. 확인해주세요!!" });
    }

    const resume = await prisma.resumes.findFirst({
      where: {
        resumeId: +resumeId,
      },
      select: {
        resumeId: true,
        title: true,
        intro: true,
        status: true,
        author: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!resume) {
      return res.json({ data: {} });
    }
    return res.status(200).json({ data: resume });
  } catch (err) {
    next(err);
  }
});

/// 이력서 생성(create) API
//1. 이력서 제목, 자기소개 데이터를 **body**로 전달받는다.
//2. 이력서 데이터의 상태 APPLY, DROP, PASS, INTERVIEW1, INTERVIEW2, FINAL_PASS
//3. 이력서 등록 시 기본 상태는 APPLY (지원 완료)

router.post("/resumes", authMiddleware, async (req, res, next) => {
  try {
    const user = res.locals.user;
    const { title, intro, name } = req.body;
    if (!title || !intro || !name) {
      return res
        .status(400)
        .json({ errorMessage: "필수사항을 모두 작성해주세요!!" });
    }
    const userInfo = await prisma.userInfos.findFirst({
      where: {
        name,
      },
    });

    if (!userInfo) {
      return res.status(400).json({
        errorMessage: "등록된 사용자 정보와 일치하지 않습니다. 확인해주세요!!",
      });
    }
    await prisma.resumes.create({
      data: {
        title: title,
        intro: intro,
        status: "APPLY",
        userId: user.userId,
        author: userInfo.name,
      },
    });
    return res
      .status(200)
      .json({ message: "지원 완료. 합격을 기원합니다 (^o^) " });
  } catch (err) {
    next(err);
  }
});
/// 이력서 수정 * 미들웨어 활용
//1. 이력서 제목, 자기소개, 이력서 상태 데이터로 넘겨 이력서 수정을 요청.
//2. 수정할 이력서 정보는 본인이 작성한 이력서에 대해서만 수정되어야 합니다
//3. 선택한 이력서가 존재하지 않을 경우, 이력서 조회에 실패하였습니다. 메시지를 반환

router.patch("/resumes/:resumeId", authMiddleware, async (req, res, next) => {
  try {
    const user = res.locals.user;
    const { resumeId } = req.params;
    const { title, intro, status } = req.body;

    if (!resumeId || !title || !intro || !status) {
      return res
        .status(400)
        .json({ errorMessage: "필수사항을 모두 작성해주세요!!" });
    }

    //schema.prisma에 enum 지정 해놨는데..음ㅁㅁ
    if (
      ![
        "APPLY",
        "DROP",
        "PASS",
        "INTERVIEW1",
        "INTERVIEW2",
        "FINAL_PASS",
      ].includes(status)
    ) {
      return res
        .status(400)
        .json({ errorMessage: "올바르지 않은 상태값 입니다." });
    }

    const resume = await prisma.resumes.findFirst({
      where: {
        resumeId: +resumeId,
      },
    });

    if (!resume) {
      return res
        .status(400)
        .json({ errorMessage: "존재하지 않는 이력서입니다. 확인해주세요!!" });
    }
    if (resume.userId !== user.userId) {
      return res
        .status(400)
        .json({ errorMessage: "올바르지 않은 접근입니다. 확인해주세요!!" });
    }
    await prisma.resumes.update({
      where: {
        resumeId: +resumeId,
      },
      data: {
        title,
        intro,
        status,
      },
    });

    return res.status(200).json({ message: "이력서가 수정되었습니다. (^o^)" });
  } catch (err) {
    next(err);
  }
});

/// 이력서 삭제 *미들웨어 활용
//1. 이력서 ID를 데이터로 넘겨 이력서를 삭제 요청
//2. 본인이 생성한 이력서 데이터만 삭제되어야함. --> resumeId, userId, name, pwd?..
//3. 선택한 이력서가 존재하지 않을 경우, 이력서 조회에 실패하였습니다 에러문 반환.

router.delete("/resumes/:resumeId", authMiddleware, async (req, res, next) => {
  try {
    const user = res.locals.user;
    const { resumeId } = req.params;
    //const { password } = req.body;

    const resume = await prisma.resumes.findUnique({
      where: {
        resumeId: +resumeId,
      },
    });

    if (!resume) {
      return res
        .status(400)
        .json({ errorMessage: "존재하지 않는 이력서 입니다. 확인해주세요!!" });
    }
    if (resume.userId !== user.userId) {
      return res
        .status(401)
        .json({ message: "올바르지 않은 접근입니다. 확인해주세요!!" });
    }
    await prisma.resumes.delete({ where: { resumeId: +resumeId } });

    return res.status(200).json({ message: "이력서가 삭제되었습니다. (^o^)" });
  } catch (err) {
    next(err);
  }
});

export default router;
