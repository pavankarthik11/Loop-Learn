import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
    
}

// Helper to send email using nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    },
    // Adding 5-second timeouts to PREVENT infinite hanging on blocked servers!
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000
});

const sendEmail = async ({ to, subject, text, html }) => {
    const mailOptions = {
        from: process.env.GMAIL_USER,
        to,
        subject,
        text,
        html
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent successfully:", info.messageId);
        return { success: true };
    } catch (error) {
        console.error("Nodemailer email error:", error.message);
        return { success: false, message: error.message };
    }
};

const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudnary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    const {fullName, email, username, password,phone} = req.body
    // console.log("email : " ,email);

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }
    
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        if (!existedUser.isVerified) {
            // User exists but unverified -> Generate new OTP and resend
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            existedUser.otp = otp;
            existedUser.otpExpiry = Date.now() + 10 * 60 * 1000;
            await existedUser.save();
            
            try {
              // Send WITH await so it returns the true error to frontend
              await sendEmail({
                to: existedUser.email,
                subject: 'LoopLearn - Registration OTP',
                text: `Hi ${existedUser.fullName}, your registration OTP is: ${otp}`,
                html: `<p>Hi ${existedUser.fullName},</p><p>Your registration OTP is: <strong>${otp}</strong>. It expires in 10 minutes.</p>`
              });
            } catch (error) {
              console.log('OTP email failed to send:', error.message);
              // We do not throw 500 here so the user can still bypass via devOtp
            }
            // Include devOtp so you can test it even if Render blocks the email
            return res.status(200).json(new ApiResponse(200, { devOtp: otp }, "Unverified user. Verification OTP sent again."));
        }
        throw new ApiError(409, "User with email or username already exists");
    }

    // const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let avatarLocalPath;
    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files.avatar[0].path
    }
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar field is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.ulr || "",
        email,
        phone,
        password,
        username: username.toLowerCase()
    })
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    user.isVerified = false; // Require verification

    await user.save();

    // Try to send OTP email
    let emailStatus = {};
    try {
      emailStatus = await sendEmail({
        to: user.email,
        subject: 'LoopLearn - Registration OTP',
        text: `Hi ${user.fullName}, your registration OTP is: ${otp}`,
        html: `<p>Hi ${user.fullName},</p><p>Your registration OTP is: <strong>${otp}</strong>. It expires in 10 minutes.</p>`
      });
    } catch (emailErr) {
      console.log('OTP email failed to send:', emailErr.message);
      emailStatus = { success: false, message: emailErr.message };
    }

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    // Attach the OTP in the API Response for Testing/Demo purposes
    return res.status(201).json(
        new ApiResponse(200, { user: createdUser, devOtp: otp, emailResult: emailStatus }, "User registered Successfully")
    )


} )

const loginUser = asyncHandler( async (req, res) => {
    // req body -> data
    // username or email
    // find the user
    // password check
    // access and refresh token
    // send cookie

    const {email, username, password} = req.body
    console.log(email);
    

    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }
    
    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email before logging in.' });
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }
    
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In successfully"
        )
    )

} )

const logoutUser = asyncHandler( async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))

} )

const refreshAccessToken = asyncHandler( async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unanthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
        
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
} )

const changeCurrentPassword = asyncHandler( async (req, res) => {
    const {oldPassword, newPassword} = req.body


    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))

} )

const getCurrentUser = asyncHandler( async (req, res) => {
    const user = await User.findById(req.user._id).populate('skillsOffered');
    return res
    .status(200)
    .json(new ApiResponse(200, user, "current user fetched successfully"))
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email, phone, location, bio, socialLinks } = req.body;

  // Build an update object dynamically
  const updateData = {};
  if (fullName) updateData.fullName = fullName;
  if (email) updateData.email = email;
  if (phone) updateData.phone = phone;
  if (location) updateData.location = location;
  if (bio) updateData.bio = bio;
  if (socialLinks) updateData.socialLinks = socialLinks;

  if (Object.keys(updateData).length === 0) {
    throw new ApiError(400, "No data provided to update");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updateData },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});


const updateUserAvatar = asyncHandler( async (req, res) => {

    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate
    (
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(200, user, "Avatar updated successfully")

} )

const getUserByUsername = asyncHandler(async (req, res) => {
    const { username } = req.params;

    const user = await User.findOne({ username })
        .select("-password -refreshToken")
        .populate("skillsOffered");

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res.status(200).json(new ApiResponse(200, user, "User profile fetched"));
});

const addSkillWanted = asyncHandler(async (req, res) => {
    const { skill } = req.body;

    if (!skill) throw new ApiError(400, "Skill is required");

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $addToSet: { skillsWanted: skill } },
        { new: true }
    ).select("-password");

    return res.status(200).json(new ApiResponse(200, user, "Skill added to wanted list"));
});

const removeSkillWanted = asyncHandler(async (req, res) => {
    const { skill } = req.body;

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $pull: { skillsWanted: skill } },
        { new: true }
    ).select("-password");

    return res.status(200).json(new ApiResponse(200, user, "Skill removed from wanted list"));
});

// Could be in SkillOffer or User Controller
const getMyTeachings = asyncHandler(async (req, res) => {
    const skills = await SkillOffer.find({ user: req.user._id });

    return res.status(200).json(new ApiResponse(200, skills, "Your teaching skills fetched"));
});

// Could be in MatchRequest or User Controller
const getMyLearnings = asyncHandler(async (req, res) => {
    const requests = await MatchRequest.find({ sender: req.user._id, status: 'accepted' })
        .populate("receiverSkill");

    return res.status(200).json(new ApiResponse(200, requests, "Your learning sessions fetched"));
});

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password -refreshToken").populate("skillsOffered");
  return res.status(200).json(new ApiResponse(200, users, "All users fetched successfully"));
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: Date.now() }
  });
  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired token' });
  }
  user.isVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();
  res.json({ message: 'Email verified successfully' });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  if (!user.otp || !user.otpExpiry || user.otp !== otp || user.otpExpiry < Date.now()) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  user.isVerified = true;
  user.otp = undefined;
  user.otpExpiry = undefined;
  await user.save();

  res.json({ message: 'Email verified successfully' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.otp = otp;
  user.otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save();
  // Send OTP via nodemailer (Gmail)
  await sendEmail({
    to: user.email,
    subject: 'Your Password Reset OTP',
    text: `Your OTP for password reset is: ${otp}`,
  });
  res.json({ message: 'OTP sent to your email.' });
});

export const resetPasswordWithOtp = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  if (!user.otp || !user.otpExpiry || user.otp !== otp || user.otpExpiry < Date.now()) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }
  user.password = newPassword;
  user.otp = undefined;
  user.otpExpiry = undefined;
  await user.save();
  res.json({ message: 'Password reset successfully' });
});

export const cleanupUnverifiedUsers = asyncHandler(async (req, res) => {
  const now = Date.now();
  const result = await User.deleteMany({
    isVerified: false,
    otpExpiry: { $lt: now }
  });
  res.json({ message: 'Cleanup complete', deletedCount: result.deletedCount });
});

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    getUserByUsername,
    addSkillWanted,
    removeSkillWanted,
    getMyTeachings,
    getMyLearnings,
    getAllUsers
 }
