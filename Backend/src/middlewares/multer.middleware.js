import multer from "multer"

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Vercel serverless functions are read-only EXCEPT for the /tmp directory!
        const uploadPath = process.env.VERCEL ? '/tmp' : './public/temp';
        cb(null, uploadPath)
    },
    filename: function(req, file, cb) {

        cb(null, file.originalname)

    }
})

export const upload = multer({
    storage,
})