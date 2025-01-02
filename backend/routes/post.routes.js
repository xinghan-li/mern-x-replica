import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
    getAllPosts,
    getFollowingPosts,
    getLikedPosts,
    getUserPosts,
    createPost,
    likeUnlikePost,
    commentOnPost,
    deletePost,
} from "../controllers/post.controller.js";

const router = express.Router();

// get routes
router.get("/all", protectRoute, getAllPosts);
router.get("/following", protectRoute, getFollowingPosts);
router.get("/likes/:id", protectRoute, getLikedPosts);
router.get("/user/:username", protectRoute, getUserPosts);

// post routes
router.post("/create", protectRoute, createPost);
router.post("/like/:id", protectRoute, likeUnlikePost);
router.post("/comment/:id", protectRoute, commentOnPost);
router.delete("/:id", protectRoute, deletePost);

export default router;
