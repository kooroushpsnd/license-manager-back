const mongoose = require('mongoose');
const mockUserId = new mongoose.Types.ObjectId()

jest.mock("../models/licenseModel.js")
jest.mock('../controller/authController', () => {
    const actualAuthController = jest.requireActual('../controller/authController');
    
    return {
        ...actualAuthController,
        protect: (req, res, next) =>{
            req.user = { id: mockUserId };
            next();
        },
        restrictTo: () => (req, res, next) => next()
    };
})

const License = require('../models/licenseModel')
const request = require('supertest')
const app = require('../app');

require("dotenv").config()

const mockLicenseCreate = (overrides = {}) => {
    const defaultUser = {
        name: 'windows',
        issueDate: '2024-10-10',
        expireDate: '2024-11-10'
    };

    License.create.mockResolvedValue({ ...defaultUser, ...overrides });
};

const mockLicenseFindOneAndUpdate = (overrides = {}) => {
    License.findOneAndUpdate.mockResolvedValue({
        name: "windows 1",
        ...overrides
    });
};

const mockLicenseFindOne = (overrides = {}) => {
    License.findOne.mockResolvedValue({
        name: "windows",
        ...overrides
    });
};
const mockLicenseFind = (overrides = {}) => {
    License.find.mockReturnValue({
        select: jest.fn().mockResolvedValue({
            name: "windows",
            ...overrides
        })
    });
};

const mockLicenseDeleteOne = (overrides = {}) => {
    License.deleteOne.mockResolvedValue({
        name: "windows",
        ...overrides
    });
};

describe("create License" ,() => {
    it('should return 400 for not providing enough requirements', async() => {
        const res = await request(app).post('/license')

        expect(res.status).toBe(400)
        expect(res.body.message).toBe("Please provide name and issueDate and password and expireDate")
    });

    it('should return 201 for creating a license', async() => {
        mockLicenseCreate()

        const res = await request(app)
            .post('/license')
            .send({
                name: 'windows',
                issueDate: '2024-10-10',
                expireDate: "2024-11-10"
            })
        
        expect(res.status).toBe(201)
        expect(res.body).toHaveProperty('license')
    });
})

describe("edit License" ,() => {
    it('should return 400 for not founding any license', async() => {
        mockLicenseCreate()

        const res = await request(app)
            .patch('/license/window')
        
        expect(res.status).toBe(400)
        expect(res.body.message).toBe('no License with window name')
    });

    it('should return 200 for success edit', async() => {
        mockLicenseCreate()
        mockLicenseFindOneAndUpdate()

        const res = await request(app)
            .patch('/license/windows')
            .send({
                name: 'windows 1'
            })

        expect(res.status).toBe(200)
    });
})

describe("delete License" ,() => {
    it('should return 404 for no License found', async() => {
        const res = await request(app)
            .delete('/license/windows')

        expect(res.status).toBe(404)
        expect(res.body.message).toBe('no License found')
    });

    it('should return 200', async() => {
        mockLicenseFindOne()
        mockLicenseDeleteOne()

        const res = await request(app)
            .delete('/license/windows')

        expect(res.status).toBe(200)
        expect(res.body.license).toBe('windows')
    });
})

describe("showAll License" ,() => {
    it('should return 200', async() => {
        mockLicenseFind()

        const res = await request(app)
            .get('/license')
        
        expect(res.status).toBe(200)
    });

    it('should return 200 but with a message of no License exist', async() => {
        mockLicenseFind({message: 'no License exist'})
        const res = await request(app)
            .get('/license')
        
        
        expect(res.status).toBe(200)
        expect(res.body.licenses.message).toBe('no License exist')
    });
})