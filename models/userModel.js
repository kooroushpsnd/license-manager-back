const mongoose = require("mongoose")
const validator = require("validator")
const bcrypt = require('bcryptjs')
const crypto = require("crypto")

const userSchema = new mongoose.Schema({
    name: {
        type : String,
        require : [true ,"a User must have a Name"]
    },
    email: {
        type: String,
        require: [true ,"a User must have a Price"],
        unique: true,
        lowercase: true,
        validator: [validator.isEmail ,"Please provide a valid Email"]
    },
    role:{
        type: String,
        enum:['admin' ,"user"],
        default: 'user'
    },
    password: {
        type: String,
        require: [true ,"Please provide a Password"],
        minlength:8,
        select: false
    },
    passwordConfirm: {
        type: String,
        require: [true ,"Please confirm your password"],
        validate: {
            validator: function(el){
                return el === this.password
            },
            message: "password is not the same"
        }
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        default:true,
        select: false
    }
})

userSchema.set('toJSON', {
    transform: function(doc, ret, options) {
      delete ret.__v;
      return ret;
    }
});

userSchema.pre(/^find/ ,function(next){
    this.find({active: { $ne: false }})
    next()
})

userSchema.pre('save' ,async function(next){
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password ,12)
    this.passwordConfirm = undefined
    next()
})

userSchema.pre("save" ,function(next){
    if(!this.isModified('password') || this.isNew) return next()
    this.passwordChangedAt = Date.now() - 1000
    next()
})

userSchema.methods.correctPassword = async function(candidatePassword ,userPassword){
    return await bcrypt.compare(candidatePassword ,userPassword)
}

userSchema.methods.changedPasswordAfter = function(JWTTimestamp){
    if(this.passwordChangedAt){
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000,10)

        return JWTTimestamp < changedTimestamp
    }
    
    return false
}

userSchema.methods.createPasswordResetToken = function(){
    const resetToken = crypto.randomBytes(32).toString('hex')

    this.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest('hex')

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000

    return resetToken
}

const User = mongoose.model("User-license" ,userSchema)

module.exports = User