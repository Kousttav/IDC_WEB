const multer = require('multer');

const path = require('path');

const fs = require('fs');


/* =========================
   CREATE uploads FOLDER
========================= */

const uploadPath =
  path.join(__dirname, '../uploads');


if (!fs.existsSync(uploadPath)) {

  fs.mkdirSync(uploadPath, {
    recursive: true
  });

}


/* =========================
   MULTER STORAGE
========================= */

const storage =
  multer.diskStorage({

    destination:
      (req, file, cb) => {

        cb(null, uploadPath);

      },

    filename:
      (req, file, cb) => {

        const uniqueName =

          Date.now() +

          '-' +

          Math.round(
            Math.random() * 1E9
          ) +

          path.extname(
            file.originalname
          );

        cb(null, uniqueName);

      }

  });


/* =========================
   MULTER INSTANCE
========================= */

const upload = multer({

  storage,

  limits: {

    fileSize:
      50 * 1024 * 1024

  }

});


module.exports = upload;