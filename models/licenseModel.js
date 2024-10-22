const mongoose = require('mongoose')
const AppError = require('../utils/appError')

const licenseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true , 'License must have a name']
    },
    issueDate: {
        type: Date,
        required: [true ,'issueDate is required']
    },
    expireDate: {
        type: Date,
        required: [true ,"expireDate is required"]
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User-license',
        required: [true, 'License must belong to a user']
    },
    active: {
        type: String,
        enum: ['active', 'expired'],
        default: 'active'
    },
    properties: {
        type: Map,
        of: String
    }
})

licenseSchema.index({ name: 1, user: 1 }, { unique: true });

licenseSchema.pre('save' ,function(next){
    if(this.issueDate > this.expireDate){
        return next(new AppError("issueDate cant be later than expireDate" ,400))
    }
    next()
})

licenseSchema.pre('findOneAndUpdate',async function(next) {
    const update = this.getUpdate();

    const licenseName = this.getFilter().name
    
    const license = await License.findOne({name: licenseName});
    
    const newIssueDate = new Date(update.issueDate);
    const existingExpireDate = new Date(license.expireDate);
    
    if (newIssueDate > existingExpireDate) {
        return next(new AppError("issueDate cant be later than expireDate" ,400));
    }

    next();
})


const License = mongoose.model("License" ,licenseSchema)

module.exports = License