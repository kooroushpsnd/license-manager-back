const express = require("express")
const authController = require("./../controller/authController")
const { showAllLicenses, createLicense, editLicense, deleteLicense, expiringLicenses } = require("../controller/licenseController")

const router = express.Router()

router.use(authController.protect)

router
    .route('/')
    .get(showAllLicenses)
    .post(createLicense)

router.get('/expiring' ,expiringLicenses)
router
    .route('/:name')
    .patch(editLicense)
    .delete(deleteLicense)

module.exports = router