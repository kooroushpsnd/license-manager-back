const License = require('../models/licenseModel')
const AppError = require('../utils/appError')
const catchAsync = require('../utils/catchAsync')

const filterObj = (Obj , ...allowedFields) => {
    const newObj = {}
    Object.keys(Obj).forEach(el => {
        if (allowedFields.includes(el)) newObj[el] = Obj[el]
    })
    return newObj
}

exports.createLicense = catchAsync(async(req ,res ,next) => {
    const { name ,issueDate ,expireDate ,properties } = req.body

    if(!name || !issueDate || !expireDate ){
        return next(new AppError("Please provide name and issueDate and password and expireDate" ,400))
    }

    const licenseData = {
        name,
        issueDate,
        expireDate,
        user: req.user.id
    };

    if (properties) {
        licenseData.properties = {
            type: properties.type,
            serialNumber: properties.serialNumber
        };
    }

    const license = await License.create(licenseData)

    res.status(201).json({
        status: 'success',
        license
    })
})

exports.deleteLicense = catchAsync(async(req,res ,next) => {
    const result = await License.findOne({name: req.params.name})
    if(result){
        await License.deleteOne({name: req.params.name ,user: req.user.id})
        res.status(200).json({
            status: "success",
            license : result.name
        })
    }else{
        return next(new AppError("no License found" ,404))
    }
})

exports.editLicense = catchAsync(async(req ,res ,next) => {
    const filteredBody = filterObj(req.body ,"name" ,"issueDate" ,"expireDate" ,"active" ,"properties")
    let license;
    if(Object.keys(filteredBody).length > 0){
        license = await License.findOneAndUpdate(
        {name : req.params.name ,user: req.user.id} ,filteredBody ,{new: true ,runValidators: true}
    )}
    
    if(!license) return next(new AppError(`no License with ${req.params.name} name` ,400))

    res.status(200).json({
        status:'success',
        data: {
            license
        }
    })
})

exports.showAllLicenses = catchAsync(async(req ,res) => {
    let licenses = await License.find({user : req.user.id}).select('-__v -user -_id')
    if (licenses.length == 0) licenses = "no License exist"
    res.status(200).json({
        status: "success",
        licenses
    })
})

exports.expiringLicenses = catchAsync(async(req ,res) => {
    const date = new Date(req.query.date);
    const nextDays = new Date(date);
    nextDays.setDate(date.getDate() + 1);
    const next10Days = new Date(date);
    next10Days.setDate(date.getDate() + 10);
    const next9Days = new Date(date);
    next9Days.setDate(date.getDate() + 9);

    const licenses1 = await License.find({
        user: req.user._id,
        expireDate: { $gte: date, $lt: nextDays }
    });

    const licenses10 = await License.find({
        user: req.user._id,
        expireDate: { $gte: next9Days, $lt: next10Days }
    });

    res.status(200).json({
        status: 'success',
        licenses1,
        licenses10
    });
})