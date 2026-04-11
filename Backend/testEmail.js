import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

console.log("Testing email to a dummy address...");

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    }
});

const sendEmail = async () => {
    const mailOptions = {
        from: process.env.GMAIL_USER,
        to: process.env.GMAIL_USER, // send to self
        subject: 'LoopLearn - Registration OTP',
        text: `Hi user, your registration OTP is 123456`,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent successfully:", info.messageId);
        process.exit(0);
    } catch (error) {
        console.error("Nodemailer email error:", error.message);
        process.exit(1);
    }
};

sendEmail();
