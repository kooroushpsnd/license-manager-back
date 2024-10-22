const User = require('../models/userModel')
const AppError = require('../utils/appError')
const catchAsync = require('../utils/catchAsync')

const filterObj = (Obj , ...allowedFields) => {
    const newObj = {}
    Object.keys(Obj).forEach(el => {
        if (allowedFields.includes(el)) newObj[el] = Obj[el]
    })
    return newObj
}

exports.getAllUsers = catchAsync(async(res) => {
    const users = await User.find()

    res.status(200).json({
        status: "success",
        results: users.length,
        data:{
            users
        }
    })
})

exports.deleteUser = catchAsync(async(req ,res) => {
    await User.findByIdAndDelete(req.params.id)

    res.status(204).json({
        status: "success",
        data: null
    })
})

exports.updateMe = catchAsync(async(req ,res ,next) => {
    if(req.body.password){
        return next(new AppError("This route is not for password updates ,Please use /updateMyPassword " ,400))
    }
    const filteredBody = filterObj(req.body ,"name" ,"email")
    const updatedUser = await User.findByIdAndUpdate(
        req.user.id ,filteredBody ,{new: true ,runValidators:true}
    )

    res.status(200).json({
        status:'success',
        data: {
            user: updatedUser
        }
    })
})

exports.deleteMe = catchAsync(async(req ,res ) => {
    await User.findByIdAndUpdate(req.user.id ,{ active: false })

    res.status(204).json({
        status: "success",
        data: null
    })
})