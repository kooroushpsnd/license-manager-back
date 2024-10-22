jest.mock("../models/userModel")
jest.mock('jsonwebtoken')

const TelegramBot = require('node-telegram-bot-api')
const jwt = require('jsonwebtoken')
const request = require('supertest')
const app = require('../app')
const User =require('../models/userModel')
const authController = require("./authController")
const bcrypt = require('bcryptjs/dist/bcrypt')

require("dotenv").config()

jest.mock('node-telegram-bot-api')

const mockSendMessage = jest.fn()
TelegramBot.prototype.sendMessage = mockSendMessage

let hashedPassword

const mockUserCreate = (overrides = {}) => {
    const defaultUser = {
        _id: 'user_id',
        name: 'test user',
        email: 'testuser@example.com',
        password: hashedPassword,
        role: 'user',
    };

    User.create.mockResolvedValue({ ...defaultUser, ...overrides });
};

const mockUserFindOne = (overrides = {}) => {
    User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({
            _id: 'user_id',
            email: 'testuser@example.com',
            password: hashedpass,
            correctPassword: jest.fn().mockResolvedValue(true),
            role: 'user',
            ...overrides
        })
    });
};

beforeAll(async() => {
        hashedpass = await bcrypt.hash("password123" ,12)
    }
)

describe("Signup Controller" ,() => {
    
    it("Should create a fake JWT Token" ,async () => {
        jwt.sign.mockReturnValue('fake-token')

        const token = authController.signToken("12345")

        expect(jwt.sign).toHaveBeenCalledWith({id: '12345'} ,process.env.JWT_SECRET ,{
            expiresIn: process.env.JWT_EXPIRES_IN
        })
        expect(token).toBe('fake-token')
    })

    it('should throw status code 400 for not providing enough requirments', async() => {
        const res = await request(app)
            .post('/users/signup')
        
        expect(res.status).toBe(400)
        expect(res.body.message).toBe("Please provide name and email and password and passwordConfirm Field")
    });

    it('should signup successfuly', async() => {
        mockUserCreate()
 
        const res = await request(app)
            .post('/users/signup')
            .send({
                name: "test user" ,email: "testuser@example.com",
                password: "password123" ,passwordConfirm: "password123"
            })

        expect(res.status).toBe(201) 
    });
})

describe("Login Controller" ,() => { 
    it("Should return 400 for not providing email or password" ,async() => {
        const res = await request(app)
            .post('/users/login')

        expect(res.status).toBe(400)
        expect(res.body.message).toBe("Please provide email and password")
    })
    it("Should return 401 for providing wrong email or password" ,async() => {
        User.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue({
                email: "test@example.com" ,
                password:"test123",
                correctPassword: jest.fn().mockResolvedValue(false)
            })
        })

        const res = await request(app)
            .post('/users/login')
            .send({email: 'tesdt@example.com' ,password: "test12354"})
        
        
        expect(res.status).toBe(401)
        expect(res.body.message).toBe("Incorrect email or password!")
    })

    it('should return 200 and log in user', async() => {
        mockUserFindOne() 

        const response = await request(app)
            .post('/users/login')
            .send({
                email: 'testuser@example.com',
                password: 'password123'
            });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'success');
        expect(response.body.data.user).toHaveProperty('email', 'testuser@example.com');
        expect(response.body.data.user).toHaveProperty('role', 'user');
    });
})

describe("protected Routes" ,() => {
    let token

    beforeEach(() => {
        token = jwt.sign({id: "mockUserId"} ,process.env.JWT_SECRET)
        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(null, { id: "mockUserId" });
          })
    })

    afterEach(() => {
        jest.clearAllMocks()
    })
    it('should return 401 if no token is provided ', async() => {
        const res =await request(app).get('/users')

        expect(res.status).toBe(401)
        expect(res.body.message).toBe("you are not logged in ,Please login to get access")
    });

    it('should return 401 if user no longer exists ', async() => {
        User.findById.mockResolvedValue(null)
        const res = await request(app)
            .get('/users/role')
            .set("Authorization" ,`Bearer ${token}`)

        expect(res.status).toBe(401);
        expect(res.body.message).toBe("The use belonging to this token does no longer exist")   
    });

    it("should return 401 if user changed password after token was issued", async () => {
        User.findById.mockResolvedValue({
          changedPasswordAfter: jest.fn().mockReturnValue(true),
        });
    
        const res = await request(app)
          .get("/users/role")
          .set("Authorization", `Bearer ${token}`);
    
        expect(res.status).toBe(401);
        expect(res.body.message).toBe("User recently changed password Please log on again");
    });

    it("should grant access if token and user are valid", async () => {
        User.findById.mockResolvedValue({
          _id: "mockUserId",
          changedPasswordAfter: jest.fn().mockReturnValue(false),
        });
    
        const res = await request(app)
          .get("/users/role")
          .set("Authorization", `Bearer ${token}`);
    
        expect(res.status).toBe(200)
      });
})