import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";

export const getUserProfile = async (req, res) => {
    const { username } = req.params;

    try {
        const user = await User.findOne({ username }).select("-password"); // return user but exclude password

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
        console.log("Error in getUserProfile controller:", error.message);
    }
};

export const followUnfollowUser = async (req, res) => {
    try {
        const { id } = req.params;
        const userToModify = await User.findById(id);
        const currentUser = await User.findById(req.user._id);

        if (id === req.user._id.toString()) {
            // typecast id from ObjectId to string
            return res.status(400).json({ error: "You can't follow yourself" });
        }
        if (!userToModify || !currentUser) {
            return res.status(404).json({ error: "User not found" });
        }

        const isFollowing = currentUser.following.includes(id);

        if (isFollowing) {
            // unfollow a user
            await User.findByIdAndUpdate(id, {
                $pull: { followers: req.user._id },
            });

            await User.findByIdAndUpdate(req.user._id, {
                $pull: { following: id },
            });

            res.status(200).json({ message: "Unfollowed successfully" });
        } else {
            // follow a user
            await User.findByIdAndUpdate(id, {
                $push: { followers: req.user._id },
            });

            await User.findByIdAndUpdate(req.user._id, {
                $push: { following: id },
            });
            // send a notification
            const newNotification = new Notification({
                type: "follow",
                from: req.user._id,
                to: userToModify._id,
            });

            await newNotification.save();

            res.status(200).json({ message: "Followed successfully" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
        console.log("Error in followUnfollowUser controller:", error.message);
    }
};

export const getSuggestedUsers = async (req, res) => {
    try {
        const userId = req.user._id;
        const usersFollowedByMe = await User.findById(userId).select(
            "following"
        );

        const users = await User.aggregate([
            {
                $match: {
                    _id: { $ne: userId }, // exclude the current user
                },
            },
            { $sample: { size: 10 } }, // select 10 random users
        ]);

        // filter out users that the current user is following
        const filteredUsers = users.filter((user) => {
            return !usersFollowedByMe.following.includes(user._id);
        });
        // select the first 4 users
        const suggestedUsers = filteredUsers.slice(0, 4);

        suggestedUsers.forEach((user) => (user.password = null)); // exclude password

        res.status(200).json(suggestedUsers);
    } catch (error) {
        res.status(500).json({ error: error.message });
        console.log("Error in getSuggestedUsers controller:", error.message);
    }
};

export const updateUser = async (req, res) => {
    const {
        fullName,
        username,
        email,
        currentPassword,
        newPassword,
        bio,
        link,
    } = req.body;
    let { profileImg, coverImg } = req.body;

    const userId = req.user._id;

    try {
        let user = await User.findById(userId);
        // check if user exists
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        // check if both current and new password are provided
        if (
            (!newPassword && currentPassword) ||
            (!currentPassword && newPassword)
        ) {
            return res.status(400).json({
                error: "Please provide both current and new password",
            });
        }
        // check if current password is correct
        if (currentPassword && newPassword) {
            const isMatch = await bcrypt.compare(
                currentPassword,
                user.password
            );
            if (!isMatch) {
                return res
                    .status(401)
                    .json({ error: "Current password is incorrect" });
            }
            if (newPassword.length < 6) {
                return res.status(400).json({
                    error: "New password must be at least 6 characters long",
                });
            }
            // hash new password
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }
        // update profile image
        if (profileImg) {
            // remove the current image
            if (user.profileImg) {
                await cloudinary.uploader.destroy(
                    // split by "/", pop the last element, and then split by "." and get the first element
                    user.profileImg.split("/").pop().split(".")[0] // e.g. "abc/def/ghi/jkl.jpg" -> "jkl" extracted
                );
            }
            const uploadResponse = await cloudinary.uploader.upload(profileImg);
            profileImg = uploadResponse.secure_url;
        }

        // update cover image
        if (coverImg) {
            // remove the current image
            if (user.coverImg) {
                await cloudinary.uploader.destroy(
                    // split by "/", pop the last element, and then split by "." and get the first element
                    user.coverImg.split("/").pop().split(".")[0] // e.g. "abc/def/ghi/jkl.jpg" -> "jkl" extracted
                );
            }
            const uploadResponse = await cloudinary.uploader.upload(coverImg);
            coverImg = uploadResponse.secure_url;
        }

        // check all fields for updates
        user.fullName = fullName || user.fullName;
        user.username = username || user.username;
        user.email = email || user.email;
        user.profileImg = profileImg || user.profileImg;
        user.coverImg = coverImg || user.coverImg;
        user.bio = bio || user.bio;
        user.link = link || user.link;

        user = await user.save();

        user.password = null; // remove password after saving

        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
        console.log("Error in updateUser controller:", error.message);
    }
};
