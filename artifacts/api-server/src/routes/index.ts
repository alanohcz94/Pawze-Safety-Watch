import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import hazardsRouter from "./hazards";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(hazardsRouter);

export default router;
