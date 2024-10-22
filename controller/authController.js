const catchAsync = require("../utils/catchAsync")
const AppError = require('../utils/appError')
const User = require("../models/userModel")
const jwt = require("jsonwebtoken")
const { promisify } = require("util")
const sendEmail = require("../utils/email")
const crypto = require("crypto")

const signToken = id => {
    return jwt.sign({ id } ,process.env.JWT_SECRET ,{
        expiresIn: process.env.JWT_EXPIRES_IN
    })
}
exports.signToken = signToken

const createAndSendToken = (user ,statusCode ,res) => {
    const token = signToken(user._id)

    user.password = undefined

    res.status(statusCode).json({
        status: "success",
        token,
        role:user.role,
        data: {
            user
        }
    })
}

exports.signup = catchAsync(async(req ,res ,next) => {
    const {name ,email ,password ,passwordConfirm} = req.body

    if(!email || !password || !name || !passwordConfirm){
        return next(new AppError("Please provide name and email and password and passwordConfirm Field" ,400))
    }

    const newUser = await User.create({
        name ,
        email ,
        password ,
        passwordConfirm
    })

    createAndSendToken(newUser ,201 ,res)
})

exports.login = catchAsync(async(req ,res ,next) => {
    const { password ,email } = req.body

    if(!email || !password){
        return next(new AppError("Please provide email and password" ,400))
    }

    const user = await User.findOne({email}).select('+password')

    if(!user || !(await user.correctPassword(password ,user.password))){
        return next(new AppError("Incorrect email or password!" ,401))
    }

    createAndSendToken(user ,200 ,res)
})

exports.protect = catchAsync(async(req ,res ,next) => {
    let token
    if(
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ){
        token = req.headers.authorization.split(" ")[1]
    }
    if(!token){
        return next(new AppError("you are not logged in ,Please login to get access",401))
    }
     
    const decoded = await promisify(jwt.verify)(token ,process.env.JWT_SECRET)
    
    const fresUser = await User.findById(decoded.id)
    if(!fresUser){
        return next(new AppError("The use belonging to this token does no longer exist" ,401))
    }

    if(fresUser.changedPasswordAfter(decoded.iat)){
        return next(new AppError("User recently changed password Please log on again" ,401))
    }
    
    req.user = fresUser
    next()
})

exports.getUserRole = (req ,res) => {
    res.status(200).json({
        status: 'success',
        role: req.user.role,
        name: req.user.name,
        email: req.user.email
    })
}

exports.restrictTo = (...roles) => {
    return (req ,res ,next) => {
        if(!roles.includes(req.user.role)){
            return next(new AppError("You dont have premission to perform this action" ,403))
        }
        next()
    }
}

exports.resetPassword = catchAsync(async (req ,res ,next) => {
    const hashedToken = crypto
        .createHash("sha256")
        .update(req.params.token)
        .digest('hex')
    
    const user = await User.findOne({
        passwordResetToken : hashedToken ,
        passwordResetExpires: {$gt: Date.now()}
    })

    if(!user){
        return next(new AppError("Token is invalid or has expired" ,400))
    }

    user.password = req.body.password
    user.passwordConfirm = req.body.passwordConfirm
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    await user.save()

    createAndSendToken(user ,200 ,res)
})

exports.forgotPassword = catchAsync(async (req ,res ,next) => {
    const user = await User.findOne({email : req.body.email})
    if(!user){
        return next(new AppError('there is no user with email address' ,404))
    }

    const resetToken = user.createPasswordResetToken()
    await user.save({ validateBeforeSave: false})

    const resetURL = `${req.protocol}://${req.get('host')}/users/resetPassword/${resetToken}`

    const message = `Forgot your password?\nSubmit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nif you didnt forget your password, please ignore this email!`

    try{
        await sendEmail({
        email:user.email,
        subject: "Your password reset token (valid for 10 min)",
        message
        })

        res.status(200).json({
            status:"success",
            message: "Token sent to email"
        })
    }catch(err){
        user.passwordResetToken = undefined
        user.passwordResetExpires = undefined
        await user.save({ validateBeforeSave: false})

        return next(new AppError("There was an error sending the email ,Try again" ,500))
    }
    
})

exports.updatePassword = catchAsync(async (req ,res ,next) => {
    const user = await User.findById(req.user.id).select('+password')

    if(!(await user.correctPassword(req.body.passwordCurrent ,user.password))){
        return next(new AppError("Your current password is wrong" ,401))
    }

    user.password = req.body.password
    user.passwordConfirm = req.body.passwordConfirm
    await user.save()

    createAndSendToken(user ,200 ,res)
})