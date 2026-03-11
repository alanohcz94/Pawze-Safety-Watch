import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import hazardsRouter from "./hazards";
import uploadsRouter from "./uploads";
import vetsRouter from "./vets";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(hazardsRouter);
router.use(uploadsRouter);
router.use(vetsRouter);

export default router;
