// decode and check the cookies' validity
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

export const protectRoute = async (req, res, next) => {
    try {
        const token = req.cookies.jwt; // get token from cookies
        if (!token) {
            return res
                .status(401)
                .json({ error: "Unauthorized: No token provided" });
        }

        // verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            return res
                .status(401)
                .json({ error: "Unauthorized: Invalid token" });
        }

        const user = await User.findById(decoded.userId).select("-password"); // return user but exclude password

        // check if user exists
        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }

        // attach user to request
        req.user = user;
        next();
    } catch (error) {
        console.log("Error in protectRoute middleware:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};
