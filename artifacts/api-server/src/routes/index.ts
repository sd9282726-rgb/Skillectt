import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profilesRouter from "./profiles";
import postsRouter from "./posts";
import projectsRouter from "./projects";
import communitiesRouter from "./communities";
import conversationsRouter from "./conversations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profilesRouter);
router.use(postsRouter);
router.use(projectsRouter);
router.use(communitiesRouter);
router.use(conversationsRouter);

export default router;
