const express = require('express')
const AppError = require('./utils/appError')
const errorController = require('./controller/errorController')
const userRouter = require('./routes/userRoutes')
const licenseRouter = require('./routes/licenseRoutes')
const helmet = require("helmet")
const mongoSanitize = require("express-mongo-sanitize")
const XSS = require("xss-clean")
const HPP = require("hpp")
const bodyparser = require("body-parser")
const cors = require('cors')

const app = express()

app.use(cors())
app.options('*' ,cors())

app.use(helmet())
app.use(express.json({limit : '10kb'}))

app.use(mongoSanitize())
app.use(XSS())
app.use(HPP())

app.use(bodyparser.json())
app.use(bodyparser.urlencoded({extended: false}))

app.use('/license' ,licenseRouter)
app.use('/users' , userRouter)

app.all('*' , (req ,res ,next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!` ,404))
})

app.use(errorController)

module.exports = app;