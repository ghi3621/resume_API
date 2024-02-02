import express from "express";
import { prisma } from "../prisma/index.js";
// import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router(); // express.Router()를 이용해 라우터를 생성합니다.

/// 이력서 생성(create) API
//1. 이력서 제목, 자기소개 데이터를 **body**로 전달받는다.
//2. 이력서 데이터의 상태 APPLY, DROP, PASS, INTERVIEW1, INTERVIEW2, FINAL_PASS
//3. 이력서 등록 시 기본 상태는 APPLY (지원 완료)

router.post("/resumes", async (req, res, next) => {
  try {
    const { title, intro } = req.body;

    const resume = await prisma.resumes.create({
      data: {
        title: title,
        intro: intro,
      },
    });
    return res.status(201).json({ data: resume });
  } catch (err) {
    next(err);
  }
});

// 모든 이력서 목록 조회 (민감한정보는 제외)
//1. 이력서 ID, 이력서 제목, 자기소개, 작성자명, 이력서 상태, 작성 날짜 조회하기 (여러건)
//2. 이력서 목록은 QueryString으로 order 데이터를 받아서 정렬 방식을 결정함.
// orderKey, orderValue 를 넘겨받음.
// orderValue에 들어올 수 있는 값은 ASC, DESC 두가지 값으로 대소문자 구분을 하지 않음.
// ASC는 과거순, DESC는 최신순 그리고 둘 다 해당하지 않거나 값이 없는 경우에는 최신순으로 정렬함.
router.get("/resumes", async (req, res, next) => {
  const { orderKey, orderValue } = req.query;
  const resumes = await prisma.resumes.findMany({
    select: {
      resumeId: true,
      title: true,
      intro: true,
      author: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return res.status(200).json({ data: resumes });
});

// 이력서 상세 조회
//1. 이력서 ID, 이력서 제목, 자기소개, 작성자명, 이력서 상태, 작성 날짜 조회하기 (단건)
// 작성자명을 표시하기 위해서는 상품 테이블과 사용자 테이블의 JOIN이 필요
router.get("/resumes/:resumeId", async (req, res, next) => {
  const { resumeId } = req.params;

  const resume = await prisma.posts.findFirst({
    where: {
      resumeId: +resumeId, //schema.prisma를 보면 우리가 postId에 int 타입으로 해놓음.
      /// parseInt 대신 +를 붙이면 (+postId) 문자열을 숫자형태로 해줌.
    },
    select: {
      resumeId: true,
      title: true,
      intro: true,
      author: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return res.status(200).json({ data: resume });
});

/// 이력서 수정 * 미들웨어 활용
//1. 이력서 제목, 자기소개, 이력서 상태 데이터로 넘겨 이력서 수정을 요청.
//2. 수정할 이력서 정보는 본인이 작성한 이력서에 대해서만 수정되어야 합니다
//3. 선택한 이력서가 존재하지 않을 경우, 이력서 조회에 실패하였습니다. 메시지를 반환

router.put("/resumes/:resumeId", async (req, res, next) => {
  const { resumeId } = req.params;
  const { title, intro, password } = req.body;

  const resume = await prisma.resumes.findUnique({
    where: {
      resumeId: +resumeId,
    },
  });

  if (!resume)
    return res.status(404).json({ message: "게시글이 존재하지 않습니다." });
  if (resume.password !== password)
    return res.status(401).json({ message: "비밀번호가 일치하지 않습니다." });

  await prisma.resumes.update({
    data: {
      title: title,
      intro: intro,
    },
    where: {
      resumeId: +resumeId,
      password: password,
    },
  });

  return res.status(200).json({ data: "이력서가 수정되었습니다." });
});

/// 이력서 삭제 *미들웨어 활용
// 게시글 수정과 같은데 해당 아래 조건만 다르다!!!
//1. 권한 검증을 위한 password를 body로 전달받습니다.
//2. 게시글이 조회되었다면 해당하는 게시글의 password가 일치하는지 확인합니다.

router.delete("/resumes/:resumeId", async (req, res, next) => {
  const { resumeId } = req.params;
  const { password } = req.body;

  const resume = await prisma.resumes.findUnique({
    where: {
      resumeId: +resumeId,
    },
  });

  if (!resume)
    return res.status(404).json({ message: "게시글이 존재하지 않습니다." });
  if (resume.password !== password)
    return res.status(401).json({ message: "비밀번호가 일치하지 않습니다." });

  await prisma.resumes.delete({ where: { resumeId: +resumeId } });

  return res.status(200).json({ data: "게시글이 삭제되었습니다." });
});

export default router;
