const express = require("express")
const userController = require("./../controller/userController")
const authController = require("./../controller/authController")

const router = express.Router()

router.post('/signup' ,authController.signup)
router.post('/login' ,authController.login)

router.patch('/resetPassword/:token' ,authController.resetPassword)
router.post('/forgotPassword' ,authController.forgotPassword)

router.use(authController.protect)

router.get('/role' ,authController.getUserRole)

router.patch('/updateMyPassword' ,authController.updatePassword)
router.patch('/updateMe' ,userController.updateMe)

router.delete('/deleteMe' ,userController.deleteMe)

router.use(authController.restrictTo("admin"))

router
    .route('/')
    .get(userController.getAllUsers)

router
    .route('/:id')
    .delete(userController.deleteUser)

module.exports = router