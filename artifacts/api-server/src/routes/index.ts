import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import hazardsRouter from "./hazards";
import profileRouter from "./profile";
import uploadsRouter from "./uploads";
import vetsRouter from "./vets";
import placesRouter from "./places";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(hazardsRouter);
router.use(profileRouter);
router.use(uploadsRouter);
router.use(vetsRouter);
router.use(placesRouter);

export default router;
